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
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebaseConfig'
import type { Story, StoryView, Profile, AudioTrack } from '../../types/database.types'
import { closeFriendsService } from '../closeFriendsService'
import { notificationServiceFirebase } from './notificationService.firebase'

export interface CreateStoryParams {
  authorId: string
  file?: File | null
  mediaUrl?: string | null
  mediaType?: 'image' | 'video'
  caption?: string
  isCloseFriends?: boolean
  audioTrack?: AudioTrack | null
  filter?: string | null
  textOverlay?: string | null
  stickers?: any[] | null
  isAiLabeled?: boolean
  isPaidPartnership?: boolean
}

export interface StoryGroup {
  authorId: string
  author: Profile
  stories: Story[]
  hasUnviewed: boolean
}

export const storyServiceFirebase = {
  async getActiveStories(currentUserId?: string): Promise<StoryGroup[]> {
    if (!isFirebaseConfigured()) return []

    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 200)),
        ])
      } catch {
        // Continue
      }
    }

    const activeUserId = currentUserId || auth.currentUser?.uid

    try {
      const storiesRef = collection(db, 'stories')
      let snap
      try {
        const q = query(storiesRef, orderBy('createdAt', 'desc'), firestoreLimit(50))
        snap = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2500)
          ),
        ])
      } catch (queryErr: any) {
        if (queryErr?.code === 'permission-denied' || queryErr?.message?.includes('insufficient permissions')) {
          console.warn('Stories query blocked by Firestore security rules. Publish firestore.rules to Firebase Console to enable.')
          return []
        }
        if (queryErr?.message === 'timeout') {
          return []
        }
        console.warn('Ordered stories query failed, falling back to direct collection fetch:', queryErr)
        snap = await Promise.race([
          getDocs(storiesRef),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2000)
          ),
        ]).catch(() => null)
        if (!snap) return []
      }

      const nowTime = Date.now()
      const candidateStories: Array<{ id: string; data: any }> = []

      snap.forEach((docSnap) => {
        const data = docSnap.data()
        const expiresTime = data.expiresAt ? new Date(data.expiresAt).getTime() : 0
        // Exclude stories older than 24 hours
        if (expiresTime > nowTime) {
          const hiddenUsers = Array.isArray(data.hiddenUsers) ? data.hiddenUsers : []
          if (!activeUserId || !hiddenUsers.includes(activeUserId)) {
            candidateStories.push({ id: docSnap.id, data })
          }
        }
      })

      // Filter out close friends stories if viewer is not author and not on author's close friends list
      const validStories: Array<{ id: string; data: any }> = []
      await Promise.all(
        candidateStories.map(async (item) => {
          const isCF = Boolean(item.data.isCloseFriends)
          if (!isCF) {
            validStories.push(item)
            return
          }
          if (!activeUserId) return // Guests cannot see close friends stories
          if (activeUserId === item.data.authorId) {
            validStories.push(item)
            return
          }
          const isFriend = await closeFriendsService.isCloseFriend(item.data.authorId, activeUserId)
          if (isFriend) {
            validStories.push(item)
          }
        })
      )

      if (validStories.length === 0) return []

      // Check view and like status for each story if activeUserId is present
      const viewedStoryIds = new Set<string>()
      const likedStoryIds = new Set<string>()
      if (activeUserId) {
        await Promise.all(
          validStories.map(async ({ id }) => {
            try {
              const viewRef = doc(db, 'stories', id, 'views', activeUserId)
              const likeRef = doc(db, 'stories', id, 'likes', activeUserId)
              const [viewSnap, likeSnap] = await Promise.all([
                getDoc(viewRef).catch(() => null),
                getDoc(likeRef).catch(() => null),
              ])
              if (viewSnap && viewSnap.exists()) {
                viewedStoryIds.add(id)
              }
              if (likeSnap && likeSnap.exists()) {
                likedStoryIds.add(id)
              }
            } catch {
              // Ignore view read permission error if any
            }
          })
        )
      }

      // Group stories by authorId
      const groupMap = new Map<string, StoryGroup>()

      for (const { id, data } of validStories) {
        const isViewed = viewedStoryIds.has(id)
        const isLiked = likedStoryIds.has(id)
        const authorProfile: Profile = {
          id: data.authorId,
          username: data.authorUsername || 'user',
          full_name: data.authorDisplayName || data.authorUsername || 'User',
          avatar_url: data.authorAvatarUrl || null,
          bio: '',
          website: '',
          is_verified: Boolean(data.authorIsVerified),
          created_at: data.createdAt,
          updated_at: data.createdAt,
        }

        const storyItem: Story = {
          id,
          author_id: data.authorId,
          media_url: data.mediaUrl,
          media_type: data.mediaType || 'image',
          caption: data.caption || '',
          created_at: data.createdAt,
          expires_at: data.expiresAt,
          author: authorProfile,
          viewed: isViewed,
          is_close_friends: Boolean(data.isCloseFriends),
          audio_track: data.audioTrack || null,
          filter: data.filter || null,
          text_overlay: data.textOverlay || null,
          stickers: data.stickers || null,
          is_ai_labeled: Boolean(data.isAiLabeled),
          is_paid_partnership: Boolean(data.isPaidPartnership),
          is_liked_by_me: isLiked,
        }

        if (!groupMap.has(data.authorId)) {
          groupMap.set(data.authorId, {
            authorId: data.authorId,
            author: authorProfile,
            stories: [storyItem],
            hasUnviewed: !isViewed,
          })
        } else {
          const entry = groupMap.get(data.authorId)!
          entry.stories.push(storyItem)
          if (!isViewed) {
            entry.hasUnviewed = true
          }
        }
      }

      // Sort stories within each group chronologically (oldest first for progression)
      for (const group of groupMap.values()) {
        group.stories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }

      return Array.from(groupMap.values())
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
        console.warn('Stories query blocked by Firestore security rules. Publish firestore.rules to Firebase Console to enable.')
      } else {
        console.error('Error fetching active stories from Firebase:', err)
      }
      return []
    }
  },

  async createStory({
    authorId,
    file,
    mediaUrl,
    mediaType = 'image',
    caption,
    isCloseFriends,
    audioTrack,
    filter,
    textOverlay,
    stickers,
    isAiLabeled,
    isPaidPartnership,
  }: CreateStoryParams): Promise<Story> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Author identity mismatch. You can only create stories for your authenticated account.')
    }

    if (file && !mediaUrl) {
      throw new Error(
        'Direct file uploads to Firebase Storage are disabled on the Spark free plan. Please choose a sample preset or provide an external image/video URL.'
      )
    }

    if (!mediaUrl || !mediaUrl.trim()) {
      throw new Error('Please select a media preset or provide an external image/video URL.')
    }

    const trimmedUrl = mediaUrl.trim()
    const isValidUrl =
      trimmedUrl.startsWith('data:image/') ||
      trimmedUrl.startsWith('data:video/') ||
      trimmedUrl.startsWith('blob:') ||
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://')

    if (!isValidUrl) {
      throw new Error('Invalid media format. Please upload a photo or use a valid web link with http:// or https://.')
    }

    // Lookup author profile to denormalize
    let username = 'user'
    let fullName = 'User'
    let avatarUrl: string | null = null
    let isVerified = false

    let hiddenUsers: string[] = []

    try {
      const userDoc = await getDoc(doc(db, 'users', authorId))
      if (userDoc.exists()) {
        const udata = userDoc.data()
        username = udata.username || username
        fullName = udata.full_name || fullName
        avatarUrl = udata.avatar_url || null
        isVerified = Boolean(udata.is_verified)
        hiddenUsers = Array.isArray(udata.settings?.hidden_story_users) ? udata.settings.hidden_story_users : []
      }
    } catch (profileErr) {
      console.warn('Could not fetch user profile for story denormalization:', profileErr)
    }

    const storyDocRef = doc(collection(db, 'stories'))
    const now = new Date()
    const createdAt = now.toISOString()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const detectedType =
      mediaType ||
      (trimmedUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? 'video' : 'image')

    const storyData: any = {
      id: storyDocRef.id,
      authorId,
      authorUsername: username,
      authorDisplayName: fullName,
      authorAvatarUrl: avatarUrl,
      authorIsVerified: isVerified,
      mediaUrl: trimmedUrl,
      mediaType: detectedType,
      caption: caption?.trim() || '',
      hiddenUsers,
      isCloseFriends: Boolean(isCloseFriends),
      createdAt,
      expiresAt,
    }

    if (audioTrack) {
      storyData.audioTrack = audioTrack
    }
    if (filter) {
      storyData.filter = filter
    }
    if (textOverlay) {
      storyData.textOverlay = textOverlay
    }
    if (stickers && stickers.length > 0) {
      storyData.stickers = stickers
    }
    if (isAiLabeled) {
      storyData.isAiLabeled = true
    }
    if (isPaidPartnership) {
      storyData.isPaidPartnership = true
    }

    await setDoc(storyDocRef, storyData)

    // Notify mentioned users from story stickers or caption/overlay
    try {
      const explicitUserIds: string[] = []
      if (Array.isArray(stickers)) {
        stickers.forEach((s: any) => {
          if (s.type === 'mention' && s.data?.userId) {
            explicitUserIds.push(s.data.userId)
          }
        })
      }
      const mentionText = [caption, textOverlay].filter(Boolean).join(' ')
      if (mentionText || explicitUserIds.length > 0) {
        notificationServiceFirebase.notifyMentionedUsers({
          text: mentionText,
          actorId: authorId,
          resourceId: storyDocRef.id,
          resourceType: 'story',
          explicitUserIds,
        }).catch(() => {})
      }
    } catch (e) {
      // Non-blocking mention notifications
    }

    const authorProfile: Profile = {
      id: authorId,
      username,
      full_name: fullName,
      avatar_url: avatarUrl,
      bio: '',
      website: '',
      is_verified: isVerified,
      created_at: createdAt,
      updated_at: createdAt,
    }

    return {
      id: storyDocRef.id,
      author_id: authorId,
      media_url: trimmedUrl,
      media_type: detectedType,
      caption: caption?.trim() || '',
      created_at: createdAt,
      expires_at: expiresAt,
      author: authorProfile,
      viewed: false,
      is_close_friends: Boolean(isCloseFriends),
      audio_track: audioTrack || null,
      filter: filter || null,
      text_overlay: textOverlay || null,
      stickers: stickers || null,
      is_ai_labeled: Boolean(isAiLabeled),
      is_paid_partnership: Boolean(isPaidPartnership),
    }
  },

  async markStoryViewed(storyId: string, viewerId: string): Promise<void> {
    if (!isFirebaseConfigured() || !storyId || !viewerId) return

    try {
      const viewRef = doc(db, 'stories', storyId, 'views', viewerId)
      // Read current user to denormalize viewer details if possible
      let viewerUsername = 'user'
      let viewerAvatarUrl: string | null = null

      try {
        const userDoc = await getDoc(doc(db, 'users', viewerId))
        if (userDoc.exists()) {
          const udata = userDoc.data()
          viewerUsername = udata.username || viewerUsername
          viewerAvatarUrl = udata.avatar_url || null
        }
      } catch {
        // Continue
      }

      await setDoc(
        viewRef,
        {
          viewerId,
          storyId,
          viewerUsername,
          viewerAvatarUrl,
          viewedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (err) {
      console.warn('Could not mark story as viewed:', err)
    }
  },

  async getStoryViewers(storyId: string): Promise<StoryView[]> {
    if (!isFirebaseConfigured() || !storyId) return []

    try {
      const viewsRef = collection(db, 'stories', storyId, 'views')
      const snap = await getDocs(viewsRef)
      const viewers: StoryView[] = []

      snap.forEach((docSnap) => {
        const data = docSnap.data()
        viewers.push({
          story_id: storyId,
          viewer_id: data.viewerId || docSnap.id,
          viewed_at: data.viewedAt || new Date().toISOString(),
          viewer: {
            id: data.viewerId || docSnap.id,
            username: data.viewerUsername || 'user',
            full_name: data.viewerUsername || 'User',
            avatar_url: data.viewerAvatarUrl || null,
            bio: '',
            website: '',
            is_verified: false,
            created_at: data.viewedAt || new Date().toISOString(),
            updated_at: data.viewedAt || new Date().toISOString(),
          },
        })
      })

      return viewers.sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
    } catch (err) {
      console.error('Error fetching story viewers:', err)
      return []
    }
  },

  async deleteStory(storyId: string, authorId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== authorId) {
      throw new Error('Permission denied: You can only delete your own stories.')
    }

    const storyRef = doc(db, 'stories', storyId)
    const storySnap = await getDoc(storyRef)
    if (!storySnap.exists()) {
      return
    }

    const data = storySnap.data()
    if (data.authorId !== authorId) {
      throw new Error('Permission denied: You can only delete your own stories.')
    }

    await deleteDoc(storyRef)
  },

  async getArchivedStories(authorId: string): Promise<Story[]> {
    if (!isFirebaseConfigured() || !authorId) return []
    try {
      const storiesRef = collection(db, 'stories')
      const snap = await getDocs(storiesRef)
      if (snap.empty) return []

      const userDocs = snap.docs
        .filter((d) => d.data().authorId === authorId)
        .sort((a, b) => new Date(b.data().createdAt || 0).getTime() - new Date(a.data().createdAt || 0).getTime())

      return userDocs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          author_id: data.authorId,
          media_url: data.mediaUrl,
          media_type: data.mediaType || 'image',
          caption: data.caption || '',
          created_at: data.createdAt,
          expires_at: data.expiresAt,
          viewed: true,
        }
      })
    } catch (err) {
      console.error('Error fetching archived stories:', err)
      return []
    }
  },

  async toggleLikeStory(storyId: string, userId: string, authorId: string, isHeld?: boolean): Promise<boolean> {
    if (!isFirebaseConfigured() || !storyId || !userId) return false

    const currentUser = auth.currentUser
    if (currentUser && currentUser.uid !== userId) {
      throw new Error('Unauthorized like operation.')
    }

    try {
      const likeRef = doc(db, 'stories', storyId, 'likes', userId)
      const likeSnap = await getDoc(likeRef).catch(() => null)

      if (likeSnap && likeSnap.exists()) {
        if (isHeld) {
          // Keep liked, refresh notification for the story author
          if (authorId && authorId !== userId) {
            await notificationServiceFirebase.createNotification({
              recipientId: authorId,
              actorId: userId,
              type: 'like_story',
              resourceId: storyId,
              resourceType: 'story',
            })
          }
          return true
        }

        // Unlike
        await deleteDoc(likeRef)
        if (authorId && authorId !== userId) {
          await notificationServiceFirebase.deleteNotification(authorId, `like_story_${userId}_${storyId}`)
        }
        return false
      } else {
        // Like
        await setDoc(likeRef, {
          userId,
          storyId,
          isHeld: Boolean(isHeld),
          createdAt: new Date().toISOString(),
        })

        if (authorId && authorId !== userId) {
          await notificationServiceFirebase.createNotification({
            recipientId: authorId,
            actorId: userId,
            type: 'like_story',
            resourceId: storyId,
            resourceType: 'story',
          })
        }
        return true
      }
    } catch (err) {
      console.warn('Error in toggleLikeStory:', err)
      const storageKey = `vibesocial_story_like_${storyId}_${userId}`
      const isCurrentlyLiked = typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'true'
      if (isCurrentlyLiked && !isHeld) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey)
        return false
      } else {
        if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, 'true')
        if (authorId && authorId !== userId) {
          notificationServiceFirebase.createNotification({
            recipientId: authorId,
            actorId: userId,
            type: 'like_story',
            resourceId: storyId,
            resourceType: 'story',
          }).catch(() => {})
        }
        return true
      }
    }
  },

  async isStoryLiked(storyId: string, userId: string): Promise<boolean> {
    if (!isFirebaseConfigured() || !storyId || !userId) return false
    try {
      const likeRef = doc(db, 'stories', storyId, 'likes', userId)
      const snap = await getDoc(likeRef)
      if (snap.exists()) return true
    } catch {
      // Fallback
    }
    const storageKey = `vibesocial_story_like_${storyId}_${userId}`
    return typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'true'
  },

  async getStoryLikes(storyId: string): Promise<string[]> {
    if (!isFirebaseConfigured() || !storyId) return []
    try {
      const likesRef = collection(db, 'stories', storyId, 'likes')
      const snap = await getDocs(likesRef)
      return snap.docs.map((d) => d.id || d.data().userId)
    } catch {
      return []
    }
  },
}

