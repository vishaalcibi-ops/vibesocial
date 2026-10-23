import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  runTransaction,
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebaseConfig'
import type { Post, Comment, PostMedia, Profile, AudioTrack } from '../../types/database.types'
import { notificationServiceFirebase } from './notificationService.firebase'
import { closeFriendsService } from '../closeFriendsService'

export interface CreatePostParams {
  authorId: string
  caption: string
  location?: string
  location_lat?: number | null
  location_lng?: number | null
  visibility?: 'public' | 'close_friends'
  is_close_friends?: boolean
  files?: File[]
  mediaUrl?: string | null
  mediaType?: 'text' | 'image' | 'video'
  audioTrack?: AudioTrack | null
}

const mapDocToPost = (
  id: string,
  data: any,
  isLikedByMe = false,
  isSavedByMe = false
): Post => {
  const mediaList: PostMedia[] = []
  if (data.mediaUrl && (data.mediaType === 'image' || data.mediaType === 'video')) {
    mediaList.push({
      id: `${id}_m0`,
      post_id: id,
      storage_path: data.mediaUrl,
      media_type: data.mediaType,
      media_order: 0,
    })
  }

  const authorProfile: Profile = {
    id: data.authorId,
    username: data.authorUsername || 'user',
    full_name: data.authorDisplayName || data.authorUsername || 'User',
    avatar_url: data.authorAvatarUrl || null,
    bio: '',
    website: '',
    is_verified: Boolean(data.authorIsVerified),
    created_at: data.createdAt || new Date().toISOString(),
    updated_at: data.updatedAt || new Date().toISOString(),
  }

  return {
    id,
    author_id: data.authorId,
    caption: data.caption || '',
    location: data.location || null,
    location_lat: data.location_lat ?? null,
    location_lng: data.location_lng ?? null,
    visibility: data.visibility || (data.is_close_friends ? 'close_friends' : 'public'),
    is_close_friends: Boolean(data.is_close_friends || data.visibility === 'close_friends'),
    created_at: data.createdAt || new Date().toISOString(),
    updated_at: data.updatedAt || data.createdAt || new Date().toISOString(),
    likes_count: Number(data.likeCount) || 0,
    comments_count: Number(data.commentCount) || 0,
    is_liked_by_me: isLikedByMe,
    is_saved_by_me: isSavedByMe,
    is_archived: Boolean(data.isArchived),
    author: authorProfile,
    media: mediaList,
    audio_track: data.audioTrack || data.audio_track || null,
  }
}

export const postServiceFirebase = {
  async getFeedPosts({
    limit = 15,
    currentUserId,
  }: {
    limit?: number
    offset?: number
    currentUserId?: string
  }): Promise<Post[]> {
    if (!isFirebaseConfigured()) return []

    // Ensure Firebase auth session is restored if available
    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 200)),
        ])
      } catch {
        // Continue with current auth state
      }
    }

    const activeUserId = currentUserId || auth.currentUser?.uid

    try {
      const postsRef = collection(db, 'posts')
      let snap
      try {
        const q = query(postsRef, orderBy('createdAt', 'desc'), firestoreLimit(limit))
        snap = await getDocs(q)
      } catch (queryErr) {
        console.warn('Ordered posts query failed, falling back to direct collection fetch:', queryErr)
        snap = await getDocs(postsRef)
      }

      if (snap.empty) return []

      const unarchivedDocs = snap.docs.filter((d) => !d.data().isArchived)

      // Filter out close friends posts if the viewer is not the author and not on their close friends list
      const filteredDocs = await Promise.all(
        unarchivedDocs.map(async (docSnap) => {
          const data = docSnap.data()
          const isCF = Boolean(data.is_close_friends || data.visibility === 'close_friends')
          if (!isCF) return docSnap
          if (!activeUserId) return null // Guests cannot see close friends posts
          if (activeUserId === data.authorId) return docSnap // Author can always see their own
          const allowed = await closeFriendsService.isCloseFriend(data.authorId, activeUserId)
          return allowed ? docSnap : null
        })
      )
      const visibleDocs = filteredDocs.filter((d): d is NonNullable<typeof d> => d !== null)

      const posts = await Promise.all(
        visibleDocs.map(async (docSnap) => {
          const data = docSnap.data()
          let isLiked = false
          let isSaved = false

          if (activeUserId) {
            try {
              const [likeDoc, saveDoc] = await Promise.all([
                getDoc(doc(db, 'posts', docSnap.id, 'likes', activeUserId)),
                getDoc(doc(db, 'users', activeUserId, 'savedPosts', docSnap.id)),
              ])
              isLiked = likeDoc.exists()
              isSaved = saveDoc.exists()
            } catch {
              // Non-blocking like/save state check
            }
          }

          return mapDocToPost(docSnap.id, data, isLiked, isSaved)
        })
      )

      return posts.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } catch (error: any) {
      console.error('Error fetching Firestore feed posts:', error)
      if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
        throw new Error('Missing or insufficient permissions. Please publish firestore.rules in Firebase Console.')
      }
      return []
    }
  },

  async getExplorePosts({
    limit = 30,
    currentUserId,
  }: {
    limit?: number
    offset?: number
    currentUserId?: string
  }): Promise<Post[]> {
    return this.getFeedPosts({ limit, currentUserId })
  },

  async getProfilePosts(authorId: string, currentUserId?: string): Promise<Post[]> {
    if (!isFirebaseConfigured() || !authorId) return []

    try {
      // Query without composite index requirement, sorting in memory
      const postsRef = collection(db, 'posts')
      const snap = await getDocs(postsRef)

      if (snap.empty) return []

      const userDocs = snap.docs
        .filter((d) => d.data().authorId === authorId && !d.data().isArchived)
        .sort((a, b) => {
          const dateA = new Date(a.data().createdAt || 0).getTime()
          const dateB = new Date(b.data().createdAt || 0).getTime()
          return dateB - dateA
        })

      const posts = await Promise.all(
        userDocs.map(async (docSnap) => {
          const data = docSnap.data()
          let isLiked = false
          let isSaved = false

          if (currentUserId) {
            try {
              const [likeDoc, saveDoc] = await Promise.all([
                getDoc(doc(db, 'posts', docSnap.id, 'likes', currentUserId)),
                getDoc(doc(db, 'users', currentUserId, 'savedPosts', docSnap.id)),
              ])
              isLiked = likeDoc.exists()
              isSaved = saveDoc.exists()
            } catch {
              // Ignore like/save lookup error
            }
          }

          return mapDocToPost(docSnap.id, data, isLiked, isSaved)
        })
      )

      return posts
    } catch (error) {
      console.error('Error fetching Firestore profile posts:', error)
      return []
    }
  },

  async createPost({
    authorId,
    caption,
    location,
    location_lat,
    location_lng,
    visibility,
    is_close_friends,
    files,
    mediaUrl,
    mediaType = 'text',
    audioTrack,
  }: CreatePostParams): Promise<Post> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    // 1. Verify authenticated user identity
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('You must be signed in to publish a post.')
    }
    if (currentUser.uid !== authorId) {
      throw new Error('Author identity mismatch. You can only create posts for your authenticated account.')
    }

    // 2. Spark free-plan binary upload protection
    if (files && files.length > 0 && !mediaUrl) {
      throw new Error(
        'Media file uploads are disabled on the Firebase Spark free plan to guarantee zero billing. Please enter an Image/Video URL or select a sample preset.'
      )
    }

    const cleanCaption = caption ? caption.trim() : ''
    const cleanMediaUrl = mediaUrl ? mediaUrl.trim() : null

    if (!cleanCaption && !cleanMediaUrl) {
      throw new Error('Please provide either a caption or a media URL for your post.')
    }

    // 3. Fetch author profile metadata from Firestore users collection
    let authorUsername = currentUser.email?.split('@')[0] || 'user'
    let authorDisplayName = currentUser.displayName || 'User'
    let authorAvatarUrl: string | null = null
    let authorIsVerified = false

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists()) {
        const udata = userDoc.data()
        authorUsername = udata.username || authorUsername
        authorDisplayName = udata.full_name || authorDisplayName
        authorAvatarUrl = udata.avatar_url || null
        authorIsVerified = Boolean(udata.is_verified)
      }
    } catch {
      // Fallback to Firebase Auth user metadata
    }

    // 4. Generate post document
    const postsColl = collection(db, 'posts')
    const postDocRef = doc(postsColl)
    const timestamp = new Date().toISOString()

    const detectedMediaType = cleanMediaUrl ? (mediaType === 'video' ? 'video' : 'image') : 'text'
    const isCF = Boolean(is_close_friends || visibility === 'close_friends')

    const postData = {
      authorId: currentUser.uid,
      authorUsername,
      authorDisplayName,
      authorAvatarUrl,
      authorIsVerified,
      caption: cleanCaption,
      location: location ? location.trim() : null,
      location_lat: location_lat ?? null,
      location_lng: location_lng ?? null,
      visibility: isCF ? 'close_friends' : 'public',
      is_close_friends: isCF,
      mediaType: detectedMediaType,
      mediaUrl: cleanMediaUrl,
      audioTrack: audioTrack
        ? {
            id: audioTrack.id || '',
            title: audioTrack.title,
            artist: audioTrack.artist,
            audio_url: audioTrack.audio_url,
            artwork_url: audioTrack.artwork_url || '',
            duration: audioTrack.duration || 30,
            spotify_url: audioTrack.spotify_url || '',
            spotify_id: audioTrack.spotify_id || '',
            source: audioTrack.source || 'spotify',
          }
        : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      likeCount: 0,
      commentCount: 0,
    }

    await setDoc(postDocRef, postData)

    // Notify mentioned users in post caption
    if (cleanCaption && cleanCaption.includes('@')) {
      notificationServiceFirebase.notifyMentionedUsers({
        text: cleanCaption,
        actorId: currentUser.uid,
        resourceId: postDocRef.id,
        resourceType: 'post',
      }).catch(() => {})
    }

    return mapDocToPost(postDocRef.id, postData, false, false)
  },

  async deletePost(postId: string, authorId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('You can only delete your own posts.')
    }

    const postRef = doc(db, 'posts', postId)
    await deleteDoc(postRef)
  },

  async toggleLikePost(postId: string, userId: string): Promise<boolean> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Unauthorized like operation. Please sign in.')
    }

    const likeRef = doc(db, 'posts', postId, 'likes', userId)
    const postRef = doc(db, 'posts', postId)
    const now = new Date().toISOString()

    try {
      let postAuthorId: string | null = null

      const isLiked = await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeRef)
        const postSnap = await tx.get(postRef)

        if (!postSnap.exists()) {
          throw new Error('Post does not exist or was deleted.')
        }

        const postData = postSnap.data()
        postAuthorId = postData.authorId || null
        const currentLikeCount = Number(postData.likeCount) || 0

        if (likeSnap.exists()) {
          // Unlike: atomically delete like document and decrement counter
          tx.delete(likeRef)
          tx.update(postRef, {
            likeCount: Math.max(0, currentLikeCount - 1),
            updatedAt: now,
          })
          return false
        } else {
          // Like: atomically set like document with userId and increment counter
          tx.set(likeRef, {
            userId,
            createdAt: now,
          })
          tx.update(postRef, {
            likeCount: currentLikeCount + 1,
            updatedAt: now,
          })
          return true
        }
      })

      // Send notification or clean up
      if (postAuthorId && postAuthorId !== userId) {
        if (isLiked) {
          await notificationServiceFirebase.createNotification({
            recipientId: postAuthorId,
            actorId: userId,
            type: 'like_post',
            resourceId: postId,
            resourceType: 'post',
          })
        } else {
          await notificationServiceFirebase.deleteNotification(postAuthorId, `like_post_${userId}_${postId}`)
        }
      }

      return isLiked
    } catch (err: any) {
      console.error('Error in toggleLikePost:', err)
      throw new Error(err.message || 'Failed to update like status.')
    }
  },

  async toggleSavePost(postId: string, userId: string): Promise<boolean> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Unauthorized save operation.')
    }

    const saveRef = doc(db, 'users', userId, 'savedPosts', postId)
    const saveSnap = await getDoc(saveRef)

    if (saveSnap.exists()) {
      await deleteDoc(saveRef)
      return false
    } else {
      await setDoc(saveRef, {
        postId,
        savedAt: new Date().toISOString(),
      })
      return true
    }
  },

  async getSavedPosts(userId: string): Promise<Post[]> {
    if (!isFirebaseConfigured() || !userId) return []

    try {
      const savedColl = collection(db, 'users', userId, 'savedPosts')
      const snap = await getDocs(savedColl)
      if (snap.empty) return []

      const postIds = snap.docs.map((d) => d.data().postId || d.id)
      const posts: Post[] = []

      for (const pid of postIds) {
        try {
          const postDoc = await getDoc(doc(db, 'posts', pid))
          if (postDoc.exists()) {
            posts.push(mapDocToPost(postDoc.id, postDoc.data(), false, true))
          }
        } catch {
          // Skip missing posts
        }
      }

      return posts
    } catch (error) {
      console.error('Error fetching saved posts from Firestore:', error)
      return []
    }
  },

  async getPostComments(postId: string): Promise<Comment[]> {
    if (!isFirebaseConfigured() || !postId) return []

    try {
      const commentsColl = collection(db, 'posts', postId, 'comments')
      const snap = await getDocs(commentsColl)

      if (snap.empty) return []

      const comments: Comment[] = snap.docs
        .map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            post_id: postId,
            author_id: data.authorId,
            parent_comment_id: data.parentCommentId || null,
            content: data.content || '',
            created_at: data.createdAt || new Date().toISOString(),
            author: {
              id: data.authorId,
              username: data.authorUsername || 'user',
              full_name: data.authorDisplayName || 'User',
              avatar_url: data.authorAvatarUrl || null,
              bio: '',
              website: '',
              is_verified: false,
              created_at: data.createdAt || new Date().toISOString(),
              updated_at: data.createdAt || new Date().toISOString(),
            },
          }
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      return comments
    } catch (error) {
      console.error('Error fetching comments from Firestore:', error)
      return []
    }
  },

  async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentCommentId?: string
  ): Promise<Comment> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Unauthorized comment action.')
    }

    const cleanContent = content.trim()
    if (!cleanContent) {
      throw new Error('Comment cannot be empty.')
    }
    if (cleanContent.length > 500) {
      throw new Error('Comment must not exceed 500 characters.')
    }

    // Fetch commenter profile metadata
    let authorUsername = currentUser.email?.split('@')[0] || 'user'
    let authorDisplayName = currentUser.displayName || 'User'
    let authorAvatarUrl: string | null = null

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists()) {
        const udata = userDoc.data()
        authorUsername = udata.username || authorUsername
        authorDisplayName = udata.full_name || authorDisplayName
        authorAvatarUrl = udata.avatar_url || null
      }
    } catch {
      // Fallback
    }

    const commentsColl = collection(db, 'posts', postId, 'comments')
    const commentRef = doc(commentsColl)
    const postRef = doc(db, 'posts', postId)
    const timestamp = new Date().toISOString()

    const commentData = {
      authorId: currentUser.uid,
      authorUsername,
      authorDisplayName,
      authorAvatarUrl,
      content: cleanContent,
      parentCommentId: parentCommentId || null,
      createdAt: timestamp,
    }

    try {
      let postAuthorId: string | null = null

      const commentResult = await runTransaction(db, async (tx) => {
        const postSnap = await tx.get(postRef)
        if (!postSnap.exists()) {
          throw new Error('Post not found.')
        }

        const postData = postSnap.data()
        postAuthorId = postData.authorId || null
        const currentCount = Number(postData.commentCount) || 0

        tx.set(commentRef, commentData)
        tx.update(postRef, {
          commentCount: currentCount + 1,
          updatedAt: timestamp,
        })

        return {
          id: commentRef.id,
          post_id: postId,
          author_id: currentUser.uid,
          parent_comment_id: parentCommentId || null,
          content: cleanContent,
          created_at: timestamp,
          author: {
            id: currentUser.uid,
            username: authorUsername,
            full_name: authorDisplayName,
            avatar_url: authorAvatarUrl,
            bio: '',
            website: '',
            is_verified: false,
            created_at: timestamp,
            updated_at: timestamp,
          },
        }
      })

      if (postAuthorId && postAuthorId !== currentUser.uid) {
        await notificationServiceFirebase.createNotification({
          recipientId: postAuthorId,
          actorId: currentUser.uid,
          type: 'comment_post',
          resourceId: postId,
          resourceType: 'post',
        })
      }

      // Notify users mentioned in comments
      if (cleanContent.includes('@')) {
        notificationServiceFirebase.notifyMentionedUsers({
          text: cleanContent,
          actorId: currentUser.uid,
          resourceId: postId,
          resourceType: 'post_comment',
        }).catch(() => {})
      }

      return commentResult
    } catch (err: any) {
      console.error('Error adding comment:', err)
      throw new Error(err.message || 'Failed to post comment. Please try again.')
    }
  },

  async deleteComment(commentId: string, authorId: string, postId?: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Unauthorized comment deletion.')
    }

    if (!postId) {
      throw new Error('Post ID is required for comment deletion.')
    }

    const commentRef = doc(db, 'posts', postId, 'comments', commentId)
    const postRef = doc(db, 'posts', postId)
    const timestamp = new Date().toISOString()

    try {
      await runTransaction(db, async (tx) => {
        const postSnap = await tx.get(postRef)
        if (postSnap.exists()) {
          const currentCount = Number(postSnap.data().commentCount) || 0
          tx.update(postRef, {
            commentCount: Math.max(0, currentCount - 1),
            updatedAt: timestamp,
          })
        }
        tx.delete(commentRef)
      })
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      throw new Error(err.message || 'Failed to delete comment.')
    }
  },

  async getPostById(postId: string, currentUserId?: string): Promise<Post | null> {
    if (!isFirebaseConfigured() || !postId) return null

    try {
      const postRef = doc(db, 'posts', postId)
      const postSnap = await getDoc(postRef)
      if (!postSnap.exists()) return null

      const data = postSnap.data()
      const activeUserId = currentUserId || auth.currentUser?.uid
      let isLiked = false
      let isSaved = false

      if (activeUserId) {
        try {
          const [likeDoc, saveDoc] = await Promise.all([
            getDoc(doc(db, 'posts', postId, 'likes', activeUserId)),
            getDoc(doc(db, 'users', activeUserId, 'savedPosts', postId)),
          ])
          isLiked = likeDoc.exists()
          isSaved = saveDoc.exists()
        } catch {
          // ignore error
        }
      }

      return mapDocToPost(postId, data, isLiked, isSaved)
    } catch (error) {
      console.error('Error fetching post by ID:', error)
      return null
    }
  },

  async updatePost(
    postId: string,
    authorId: string,
    updates: { caption?: string; location?: string }
  ): Promise<Post> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Unauthorized: You can only edit your own posts.')
    }

    const postRef = doc(db, 'posts', postId)
    const postSnap = await getDoc(postRef)
    if (!postSnap.exists()) {
      throw new Error('Post not found.')
    }

    const postData = postSnap.data()
    if (postData.authorId !== currentUser.uid) {
      throw new Error('Unauthorized: You can only edit your own posts.')
    }

    const timestamp = new Date().toISOString()
    const updatePayload: Record<string, any> = {
      updatedAt: timestamp,
    }

    if (updates.caption !== undefined) {
      updatePayload.caption = updates.caption.trim()
    }
    if (updates.location !== undefined) {
      updatePayload.location = updates.location ? updates.location.trim() : null
    }

    await updateDoc(postRef, updatePayload)

    const updatedSnap = await getDoc(postRef)
    return mapDocToPost(postId, updatedSnap.data(), false, false)
  },

  async getUserActivity(userId: string): Promise<{ likedPosts: Post[]; userPosts: Post[] }> {
    if (!isFirebaseConfigured() || !userId) {
      return { likedPosts: [], userPosts: [] }
    }

    try {
      // 1. Fetch user's own posts
      const userPosts = await this.getProfilePosts(userId, userId)

      // 2. Fetch liked posts: query recent posts to check if liked
      const recentPosts = await this.getFeedPosts({ limit: 40, currentUserId: userId })
      const likedPosts = recentPosts.filter((p) => p.is_liked_by_me)

      return { likedPosts, userPosts }
    } catch (error) {
      console.error('Error fetching user activity:', error)
      return { likedPosts: [], userPosts: [] }
    }
  },

  async reportContent(
    reporterId: string,
    targetId: string,
    targetType: 'post' | 'user' | 'reel',
    reason: string,
    details?: string
  ): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== reporterId) {
      throw new Error('You must be signed in to submit a report.')
    }

    const reportColl = collection(db, 'reports')
    const reportDoc = doc(reportColl)
    const timestamp = new Date().toISOString()

    await setDoc(reportDoc, {
      id: reportDoc.id,
      reporterId,
      targetId,
      targetType,
      reason: reason.trim(),
      details: details ? details.trim() : '',
      status: 'pending',
      createdAt: timestamp,
    })
  },

  async archivePost(postId: string, authorId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Unauthorized: You can only archive your own posts.')
    }
    const postRef = doc(db, 'posts', postId)
    await updateDoc(postRef, {
      isArchived: true,
      updatedAt: new Date().toISOString(),
    })
  },

  async unarchivePost(postId: string, authorId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Unauthorized: You can only unarchive your own posts.')
    }
    const postRef = doc(db, 'posts', postId)
    await updateDoc(postRef, {
      isArchived: false,
      updatedAt: new Date().toISOString(),
    })
  },

  async getArchivedPosts(authorId: string): Promise<Post[]> {
    if (!isFirebaseConfigured() || !authorId) return []
    try {
      const postsRef = collection(db, 'posts')
      const snap = await getDocs(postsRef)
      if (snap.empty) return []
      const userDocs = snap.docs
        .filter((d) => d.data().authorId === authorId && Boolean(d.data().isArchived))
        .sort((a, b) => {
          const dateA = new Date(a.data().createdAt || 0).getTime()
          const dateB = new Date(b.data().createdAt || 0).getTime()
          return dateB - dateA
        })

      return userDocs.map((docSnap) => mapDocToPost(docSnap.id, docSnap.data(), false, false))
    } catch (error) {
      console.error('Error fetching archived posts:', error)
      return []
    }
  },
}

