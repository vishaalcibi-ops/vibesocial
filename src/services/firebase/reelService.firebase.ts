import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  runTransaction,
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebaseConfig'
import type { Reel, ReelComment, Profile } from '../../types/database.types'
import { notificationServiceFirebase } from './notificationService.firebase'

export interface CreateReelParams {
  authorId: string
  videoFile?: File | null
  videoUrl?: string | null
  caption?: string
  audioTitle?: string
}

export const reelServiceFirebase = {
  async getReels({
    limit = 20,
    currentUserId,
  }: {
    limit?: number
    offset?: number
    currentUserId?: string
  }): Promise<Reel[]> {
    if (!isFirebaseConfigured()) return []

    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await auth.authStateReady()
      } catch {
        // Continue
      }
    }

    const activeUserId = currentUserId || auth.currentUser?.uid

    try {
      const reelsRef = collection(db, 'reels')
      let snap
      try {
        const q = query(reelsRef, orderBy('createdAt', 'desc'), firestoreLimit(limit))
        snap = await getDocs(q)
      } catch (queryErr: any) {
        if (queryErr?.code === 'permission-denied' || queryErr?.message?.includes('insufficient permissions')) {
          console.warn('Reels query blocked by Firestore security rules. Publish firestore.rules to Firebase Console to enable.')
          return []
        }
        console.warn('Ordered reels query failed, falling back to direct collection fetch:', queryErr)
        snap = await getDocs(reelsRef)
      }

      if (snap.empty) return []

      const rawReels: Array<{ id: string; data: any }> = []
      snap.forEach((docSnap) => {
        rawReels.push({ id: docSnap.id, data: docSnap.data() })
      })

      // Sort client-side in case direct collection fetch was used
      rawReels.sort((a, b) => new Date(b.data.createdAt || 0).getTime() - new Date(a.data.createdAt || 0).getTime())

      // Check liked status in parallel
      const likedSet = new Set<string>()
      if (activeUserId) {
        await Promise.all(
          rawReels.map(async ({ id }) => {
            try {
              const likeDoc = await getDoc(doc(db, 'reels', id, 'likes', activeUserId))
              if (likeDoc.exists()) {
                likedSet.add(id)
              }
            } catch {
              // Ignore like check failure
            }
          })
        )
      }

      return rawReels.map(({ id, data }) => {
        const authorProfile: Profile = {
          id: data.authorId,
          username: data.authorUsername || 'creator',
          full_name: data.authorDisplayName || data.authorUsername || 'Creator',
          avatar_url: data.authorAvatarUrl || null,
          bio: '',
          website: '',
          is_verified: Boolean(data.authorIsVerified),
          created_at: data.createdAt,
          updated_at: data.updatedAt || data.createdAt,
        }

        return {
          id,
          author_id: data.authorId,
          video_url: data.videoUrl,
          caption: data.caption || '',
          audio_title: data.audioTitle || 'Original Audio',
          duration_sec: data.durationSec || null,
          created_at: data.createdAt || new Date().toISOString(),
          author: authorProfile,
          likes_count: Number(data.likeCount) || 0,
          comments_count: Number(data.commentCount) || 0,
          is_liked_by_me: likedSet.has(id),
        }
      })
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
        console.warn('Reels query blocked by Firestore security rules. Publish firestore.rules to Firebase Console to enable.')
      } else {
        console.error('Error fetching reels from Firebase:', err)
      }
      return []
    }
  },

  async createReel({
    authorId,
    videoFile,
    videoUrl,
    caption,
    audioTitle = 'Original Audio',
  }: CreateReelParams): Promise<Reel> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Author identity mismatch. You can only create reels for your authenticated account.')
    }

    if (videoFile && !videoUrl) {
      throw new Error(
        'Direct video uploads to Firebase Storage are disabled on the Spark free plan. Please choose a sample preset or provide an external MP4/WebM video URL.'
      )
    }

    if (!videoUrl || !videoUrl.trim()) {
      throw new Error('Please select a video preset or enter a direct video URL.')
    }

    const trimmedUrl = videoUrl.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      throw new Error('Video URL must start with http:// or https://')
    }

    // Lookup creator profile
    let username = 'creator'
    let fullName = 'Creator'
    let avatarUrl: string | null = null
    let isVerified = false

    try {
      const userDoc = await getDoc(doc(db, 'users', authorId))
      if (userDoc.exists()) {
        const udata = userDoc.data()
        username = udata.username || username
        fullName = udata.full_name || fullName
        avatarUrl = udata.avatar_url || null
        isVerified = Boolean(udata.is_verified)
      }
    } catch (profileErr) {
      console.warn('Could not fetch user profile for reel denormalization:', profileErr)
    }

    const reelDocRef = doc(collection(db, 'reels'))
    const nowIso = new Date().toISOString()

    const reelData = {
      id: reelDocRef.id,
      authorId,
      authorUsername: username,
      authorDisplayName: fullName,
      authorAvatarUrl: avatarUrl,
      authorIsVerified: isVerified,
      videoUrl: trimmedUrl,
      caption: caption?.trim() || '',
      audioTitle: audioTitle.trim() || 'Original Audio',
      likeCount: 0,
      commentCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    await setDoc(reelDocRef, reelData)

    const authorProfile: Profile = {
      id: authorId,
      username,
      full_name: fullName,
      avatar_url: avatarUrl,
      bio: '',
      website: '',
      is_verified: isVerified,
      created_at: nowIso,
      updated_at: nowIso,
    }

    return {
      id: reelDocRef.id,
      author_id: authorId,
      video_url: trimmedUrl,
      caption: caption?.trim() || '',
      audio_title: audioTitle.trim() || 'Original Audio',
      duration_sec: null,
      created_at: nowIso,
      author: authorProfile,
      likes_count: 0,
      comments_count: 0,
      is_liked_by_me: false,
    }
  },

  async toggleLikeReel(reelId: string, userId: string): Promise<boolean> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const reelRef = doc(db, 'reels', reelId)
    const likeRef = doc(db, 'reels', reelId, 'likes', userId)

    let reelAuthorId: string | null = null

    const isLiked = await runTransaction(db, async (transaction) => {
      const reelSnap = await transaction.get(reelRef)
      if (!reelSnap.exists()) {
        throw new Error('Reel does not exist.')
      }

      const reelData = reelSnap.data()
      reelAuthorId = reelData.authorId || null
      const likeSnap = await transaction.get(likeRef)
      const isCurrentlyLiked = likeSnap.exists()
      const currentCount = Number(reelData.likeCount) || 0

      if (isCurrentlyLiked) {
        transaction.delete(likeRef)
        transaction.update(reelRef, {
          likeCount: Math.max(0, currentCount - 1),
          updatedAt: new Date().toISOString(),
        })
        return false
      } else {
        transaction.set(likeRef, {
          userId,
          reelId,
          createdAt: new Date().toISOString(),
        })
        transaction.update(reelRef, {
          likeCount: currentCount + 1,
          updatedAt: new Date().toISOString(),
        })
        return true
      }
    })

    if (reelAuthorId && reelAuthorId !== userId) {
      if (isLiked) {
        await notificationServiceFirebase.createNotification({
          recipientId: reelAuthorId,
          actorId: userId,
          type: 'like_reel',
          resourceId: reelId,
          resourceType: 'reel',
        })
      } else {
        await notificationServiceFirebase.deleteNotification(reelAuthorId, `like_reel_${userId}_${reelId}`)
      }
    }

    return isLiked
  },

  async getReelComments(reelId: string): Promise<ReelComment[]> {
    if (!isFirebaseConfigured() || !reelId) return []

    try {
      const commentsRef = collection(db, 'reels', reelId, 'comments')
      let snap
      try {
        const q = query(commentsRef, orderBy('createdAt', 'asc'))
        snap = await getDocs(q)
      } catch (err) {
        snap = await getDocs(commentsRef)
      }

      const comments: ReelComment[] = []
      snap.forEach((docSnap) => {
        const data = docSnap.data()
        comments.push({
          id: docSnap.id,
          reel_id: reelId,
          author_id: data.authorId,
          content: data.content,
          created_at: data.createdAt || new Date().toISOString(),
          author: {
            id: data.authorId,
            username: data.authorUsername || 'user',
            full_name: data.authorDisplayName || data.authorUsername || 'User',
            avatar_url: data.authorAvatarUrl || null,
            bio: '',
            website: '',
            is_verified: Boolean(data.authorIsVerified),
            created_at: data.createdAt,
            updated_at: data.createdAt,
          },
        })
      })

      comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return comments
    } catch (err) {
      console.error('Error fetching reel comments:', err)
      return []
    }
  },

  async addReelComment(reelId: string, authorId: string, content: string): Promise<ReelComment> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const trimmed = content.trim()
    if (!trimmed) throw new Error('Comment cannot be empty.')
    if (trimmed.length > 500) throw new Error('Comment cannot exceed 500 characters.')

    // Fetch author details
    let username = 'user'
    let fullName = 'User'
    let avatarUrl: string | null = null
    let isVerified = false

    try {
      const userDoc = await getDoc(doc(db, 'users', authorId))
      if (userDoc.exists()) {
        const udata = userDoc.data()
        username = udata.username || username
        fullName = udata.full_name || fullName
        avatarUrl = udata.avatar_url || null
        isVerified = Boolean(udata.is_verified)
      }
    } catch {
      // Continue
    }

    const reelRef = doc(db, 'reels', reelId)
    const commentRef = doc(collection(db, 'reels', reelId, 'comments'))
    const nowIso = new Date().toISOString()

    const commentData = {
      id: commentRef.id,
      reelId,
      authorId,
      authorUsername: username,
      authorDisplayName: fullName,
      authorAvatarUrl: avatarUrl,
      authorIsVerified: isVerified,
      content: trimmed,
      createdAt: nowIso,
    }

    let reelAuthorId: string | null = null

    await runTransaction(db, async (transaction) => {
      const reelSnap = await transaction.get(reelRef)
      if (!reelSnap.exists()) {
        throw new Error('Reel not found.')
      }

      const reelData = reelSnap.data()
      reelAuthorId = reelData.authorId || null
      const currentCount = Number(reelData.commentCount) || 0
      transaction.set(commentRef, commentData)
      transaction.update(reelRef, {
        commentCount: currentCount + 1,
        updatedAt: nowIso,
      })
    })

    if (reelAuthorId && reelAuthorId !== authorId) {
      await notificationServiceFirebase.createNotification({
        recipientId: reelAuthorId,
        actorId: authorId,
        type: 'comment_post',
        resourceId: reelId,
        resourceType: 'reel',
      })
    }

    return {
      id: commentRef.id,
      reel_id: reelId,
      author_id: authorId,
      content: trimmed,
      created_at: nowIso,
      author: {
        id: authorId,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        bio: '',
        website: '',
        is_verified: isVerified,
        created_at: nowIso,
        updated_at: nowIso,
      },
    }
  },

  async deleteReelComment(reelId: string, commentId: string, authorId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const reelRef = doc(db, 'reels', reelId)
    const commentRef = doc(db, 'reels', reelId, 'comments', commentId)

    await runTransaction(db, async (transaction) => {
      const reelSnap = await transaction.get(reelRef)
      const commentSnap = await transaction.get(commentRef)

      if (!commentSnap.exists()) return

      const commentData = commentSnap.data()
      const reelAuthorId = reelSnap.exists() ? reelSnap.data().authorId : null

      // Only comment author or reel owner can delete
      if (commentData.authorId !== authorId && reelAuthorId !== authorId) {
        throw new Error('Permission denied: You can only delete your own comment.')
      }

      const currentCount = reelSnap.exists() ? Number(reelSnap.data().commentCount) || 0 : 0
      transaction.delete(commentRef)
      if (reelSnap.exists()) {
        transaction.update(reelRef, {
          commentCount: Math.max(0, currentCount - 1),
          updatedAt: new Date().toISOString(),
        })
      }
    })
  },

  async deleteReel(reelId: string, authorId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Permission denied: You can only delete your own reel.')
    }

    const reelRef = doc(db, 'reels', reelId)
    const reelSnap = await getDoc(reelRef)
    if (!reelSnap.exists()) return

    const data = reelSnap.data()
    if (data.authorId !== authorId) {
      throw new Error('Permission denied: You can only delete your own reel.')
    }

    await deleteDoc(reelRef)
  },

  async getUserReels(userId: string, currentUserId?: string): Promise<Reel[]> {
    if (!isFirebaseConfigured() || !userId) return []

    try {
      const allReels = await this.getReels({ limit: 50, currentUserId })
      return allReels.filter((r) => r.author_id === userId)
    } catch (error) {
      console.error('Error fetching user reels:', error)
      return []
    }
  },
}
