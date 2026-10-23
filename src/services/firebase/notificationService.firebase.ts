import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebaseConfig'
import type { Notification, Profile } from '../../types/database.types'

export interface CreateNotificationParams {
  recipientId: string
  actorId: string
  type: 'follow' | 'like_post' | 'comment_post' | 'like_reel' | 'message' | 'follow_request' | 'follow_request_accepted' | 'like_story' | 'mention'
  resourceId?: string | null
  resourceType?: string | null
}

export const notificationServiceFirebase = {
  /**
   * Fetch all notifications for a specific user from /users/{userId}/notifications
   */
  async getUserNotifications(userId: string, limitCount = 50): Promise<Notification[]> {
    if (!isFirebaseConfigured() || !userId) return []

    try {
      const notifsRef = collection(db, 'users', userId, 'notifications')
      let snap
      try {
        const q = query(notifsRef, orderBy('created_at', 'desc'), firestoreLimit(limitCount))
        snap = await getDocs(q)
      } catch (err) {
        console.warn('Ordered notifications query failed, falling back to direct collection fetch:', err)
        snap = await getDocs(notifsRef)
      }

      if (snap.empty) return []

      const rawNotifs: Array<{ id: string; data: any }> = []
      snap.forEach((docSnap) => {
        rawNotifs.push({ id: docSnap.id, data: docSnap.data() })
      })

      // In-memory sort by created_at desc in case index was bypassed
      rawNotifs.sort(
        (a, b) => new Date(b.data.created_at || 0).getTime() - new Date(a.data.created_at || 0).getTime()
      )

      // Fetch actor profiles in parallel with memoization
      const actorCache = new Map<string, Profile | null>()
      const uniqueActorIds = Array.from(new Set(rawNotifs.map((n) => n.data.actor_id).filter(Boolean)))

      await Promise.all(
        uniqueActorIds.map(async (actorId) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', actorId))
            if (userSnap.exists()) {
              actorCache.set(actorId, userSnap.data() as Profile)
            } else {
              actorCache.set(actorId, null)
            }
          } catch {
            actorCache.set(actorId, null)
          }
        })
      )

      return rawNotifs.map(({ id, data }) => ({
        id,
        recipient_id: data.recipient_id || userId,
        actor_id: data.actor_id,
        type: data.type,
        resource_id: data.resource_id || null,
        resource_type: data.resource_type || null,
        is_read: Boolean(data.is_read),
        created_at: data.created_at || new Date().toISOString(),
        actor: data.actor_id ? actorCache.get(data.actor_id) || undefined : undefined,
      }))
    } catch (error) {
      console.error('Error fetching Firestore notifications:', error)
      return []
    }
  },

  /**
   * Mark a single notification as read
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    if (!isFirebaseConfigured() || !userId || !notificationId) return

    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId)
      await updateDoc(notifRef, { is_read: true })
    } catch (error) {
      console.warn('Error marking notification as read:', error)
    }
  },

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    if (!isFirebaseConfigured() || !userId) return

    try {
      const notifsRef = collection(db, 'users', userId, 'notifications')
      const q = query(notifsRef, where('is_read', '==', false))
      const snap = await getDocs(q)

      if (snap.empty) return

      const batch = writeBatch(db)
      snap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { is_read: true })
      })
      await batch.commit()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  },

  /**
   * Get total unread count for badge indicators
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!isFirebaseConfigured() || !userId) return 0

    try {
      const notifsRef = collection(db, 'users', userId, 'notifications')
      const q = query(notifsRef, where('is_read', '==', false))
      const snap = await getDocs(q)
      return snap.size
    } catch {
      return 0
    }
  },

  /**
   * Real-time listener for user's notifications subcollection
   */
  subscribeToNotifications(
    userId: string,
    onNewNotification: (notif: Notification) => void
  ): { unsubscribe: () => void } {
    if (!isFirebaseConfigured() || !userId) {
      return { unsubscribe: () => {} }
    }

    let initialLoadComplete = false
    const notifsRef = collection(db, 'users', userId, 'notifications')

    const unsubscribe = onSnapshot(
      notifsRef,
      async (snapshot) => {
        if (!initialLoadComplete) {
          initialLoadComplete = true
          return
        }

        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const data = change.doc.data()
            let actorProfile: Profile | undefined

            if (data.actor_id) {
              try {
                const userSnap = await getDoc(doc(db, 'users', data.actor_id))
                if (userSnap.exists()) {
                  actorProfile = userSnap.data() as Profile
                }
              } catch {
                // Continue without actor profile
              }
            }

            onNewNotification({
              id: change.doc.id,
              recipient_id: data.recipient_id || userId,
              actor_id: data.actor_id,
              type: data.type,
              resource_id: data.resource_id || null,
              resource_type: data.resource_type || null,
              is_read: Boolean(data.is_read),
              created_at: data.created_at || new Date().toISOString(),
              actor: actorProfile,
            })
          }
        }
      },
      (error) => {
        console.warn('Realtime notifications listener error:', error)
      }
    )

    return { unsubscribe }
  },

  /**
   * Securely create a notification in recipient's subcollection.
   * Uses deterministic IDs to prevent duplicate spamming when actions are repeated.
   */
  async createNotification({
    recipientId,
    actorId,
    type,
    resourceId = null,
    resourceType = null,
  }: CreateNotificationParams): Promise<void> {
    if (!isFirebaseConfigured()) return
    // Prevent self-notifications
    if (!recipientId || !actorId || recipientId === actorId) return

    // Ensure caller is the authenticated actor to comply with security rules
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== actorId) {
      console.warn('Notification creation blocked: authenticated user does not match actorId')
      return
    }

    try {
      // Deterministic ID prevents duplicate notifications for repeated actions
      let notifId: string
      switch (type) {
        case 'follow':
          notifId = `follow_${actorId}`
          break
        case 'like_post':
          notifId = `like_post_${actorId}_${resourceId || 'p'}`
          break
        case 'comment_post':
          notifId = `comment_${resourceId || Date.now()}`
          break
        case 'like_reel':
          notifId = `like_reel_${actorId}_${resourceId || 'r'}`
          break
        case 'like_story':
          notifId = `like_story_${actorId}_${resourceId || 's'}`
          break
        case 'mention':
          notifId = `mention_${actorId}_${resourceId || Date.now()}`
          break
        case 'message':
          notifId = `msg_${resourceId || 'dm'}_${actorId}`
          break
        default:
          notifId = `${type}_${actorId}_${Date.now()}`
      }

      const notifRef = doc(db, 'users', recipientId, 'notifications', notifId)
      const timestamp = new Date().toISOString()

      await setDoc(notifRef, {
        id: notifId,
        recipient_id: recipientId,
        actor_id: actorId,
        type,
        resource_id: resourceId || null,
        resource_type: resourceType || null,
        is_read: false,
        created_at: timestamp,
      })
    } catch (err) {
      console.warn('Non-blocking error creating notification in Firestore:', err)
    }
  },

  /**
   * Delete notification (e.g., when an unlike or unfollow occurs)
   */
  async deleteNotification(recipientId: string, notifId: string): Promise<void> {
    if (!isFirebaseConfigured() || !recipientId || !notifId) return
    try {
      const notifRef = doc(db, 'users', recipientId, 'notifications', notifId)
      await deleteDoc(notifRef)
    } catch {
      // Non-blocking
    }
  },

  /**
   * Automatically resolve @mentions in text and explicit user IDs to send mention notifications
   */
  async notifyMentionedUsers({
    text,
    actorId,
    resourceId = null,
    resourceType = 'post',
    explicitUserIds = [],
  }: {
    text?: string
    actorId: string
    resourceId?: string | null
    resourceType?: string
    explicitUserIds?: string[]
  }): Promise<void> {
    if (!actorId) return

    const recipientIds = new Set<string>(
      (explicitUserIds || []).filter((id) => id && id !== actorId)
    )

    if (text) {
      const matches = text.match(/@([a-zA-Z0-9_.]+)/g)
      if (matches && matches.length > 0) {
        for (const rawMatch of matches) {
          const cleanUsername = rawMatch.replace(/^@/, '').toLowerCase().trim()
          if (!cleanUsername) continue

          try {
            const usersRef = collection(db, 'users')
            const q = query(usersRef, where('username', '==', cleanUsername), firestoreLimit(1))
            const snap = await getDocs(q)
            if (!snap.empty) {
              const targetUserId = snap.docs[0].id
              if (targetUserId && targetUserId !== actorId) {
                recipientIds.add(targetUserId)
              }
            }
          } catch {
            // Non-blocking query
          }
        }
      }
    }

    for (const recipientId of recipientIds) {
      await this.createNotification({
        recipientId,
        actorId,
        type: 'mention',
        resourceId,
        resourceType,
      })
    }
  },
}
