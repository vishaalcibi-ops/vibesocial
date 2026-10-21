import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebaseConfig'
import type { Conversation, Message, Profile } from '../../types/database.types'
import { notificationServiceFirebase } from './notificationService.firebase'

export const messageServiceFirebase = {
  /**
   * Deterministically derive a unique conversation ID for two users.
   * Both participants get the exact same ID, preventing duplicate threads.
   */
  getStableDirectConversationId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort()
    return `dm_${sorted[0]}_${sorted[1]}`
  },

  /**
   * Get or create a 1-to-1 conversation between current user and target user
   */
  async getOrCreateDirectConversation(currentUserId: string, targetUserId: string): Promise<string> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    if (!currentUserId || !targetUserId) {
      throw new Error('Both user IDs are required to start a conversation.')
    }
    if (currentUserId === targetUserId) {
      throw new Error('You cannot start a conversation with yourself.')
    }

    const conversationId = this.getStableDirectConversationId(currentUserId, targetUserId)
    const convRef = doc(db, 'conversations', conversationId)

    try {
      let docExists = false
      try {
        const convSnap = await getDoc(convRef)
        docExists = convSnap.exists()
      } catch (readErr: any) {
        // If read fails with permission-denied because document does not exist yet under rules,
        // we can safely proceed to create the conversation document
        if (
          readErr?.code === 'permission-denied' ||
          (typeof readErr?.message === 'string' &&
            (readErr.message.includes('permission') ||
              readErr.message.includes('insufficient')))
        ) {
          docExists = false
        } else {
          throw readErr
        }
      }

      if (!docExists) {
        const timestamp = new Date().toISOString()
        const sortedMembers = [currentUserId, targetUserId].sort()

        await setDoc(
          convRef,
          {
            id: conversationId,
            memberIds: sortedMembers,
            participantIds: sortedMembers,
            is_group: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastMessageText: '',
            lastMessageAt: timestamp,
            lastMessageSenderId: currentUserId,
          },
          { merge: true }
        )
      }

      return conversationId
    } catch (error: any) {
      console.error('Error in getOrCreateDirectConversation:', error)
      throw new Error(error.message || 'Failed to start conversation.')
    }
  },

  /**
   * Fetch all conversations where current user is a participant
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (!isFirebaseConfigured() || !userId) return []

    try {
      const convsRef = collection(db, 'conversations')
      let snap
      try {
        const q = query(convsRef, where('memberIds', 'array-contains', userId))
        snap = await getDocs(q)
      } catch (err: any) {
        const isPerm =
          err?.code === 'permission-denied' ||
          (typeof err?.message === 'string' &&
            (err.message.toLowerCase().includes('permission') ||
              err.message.toLowerCase().includes('insufficient')))
        if (isPerm) {
          try {
            const q2 = query(convsRef, where('participantIds', 'array-contains', userId))
            snap = await getDocs(q2)
          } catch {
            console.warn('Conversations query blocked by Firestore security rules. Publish firestore.rules to enable.')
            return []
          }
        } else {
          console.warn('Error querying conversations:', err)
          return []
        }
      }

      if (!snap || snap.empty) return []

      const rawConversations: Array<{ id: string; data: any }> = []
      snap.forEach((docSnap) => {
        rawConversations.push({ id: docSnap.id, data: docSnap.data() })
      })

      // Sort conversations by updatedAt descending
      rawConversations.sort(
        (a, b) => new Date(b.data.updatedAt || b.data.createdAt || 0).getTime() - new Date(a.data.updatedAt || a.data.createdAt || 0).getTime()
      )

      // Fetch member profiles and calculate unread counts
      const profileCache = new Map<string, Profile | null>()

      const enriched: Conversation[] = await Promise.all(
        rawConversations.map(async ({ id, data }) => {
          const memberIds: string[] = data.memberIds || data.participantIds || []

          // Fetch member profiles
          const membersWithProfiles = await Promise.all(
            memberIds.map(async (mId) => {
              if (!profileCache.has(mId)) {
                try {
                  const uSnap = await getDoc(doc(db, 'users', mId))
                  profileCache.set(mId, uSnap.exists() ? (uSnap.data() as Profile) : null)
                } catch {
                  profileCache.set(mId, null)
                }
              }
              const prof = profileCache.get(mId)
              return {
                conversation_id: id,
                user_id: mId,
                role: 'member' as const,
                joined_at: data.createdAt || new Date().toISOString(),
                last_read_at: data.updatedAt || new Date().toISOString(),
                profile: prof || undefined,
              }
            })
          )

          // Fetch latest message
          let lastMessage: Message | undefined
          let unreadCount = 0

          try {
            const messagesRef = collection(db, 'conversations', id, 'messages')
            const msgsSnap = await getDocs(messagesRef)

            if (!msgsSnap.empty) {
              const msgsList = msgsSnap.docs.map((d) => ({
                id: d.id,
                data: d.data(),
              }))

              // Sort ascending for messages
              msgsList.sort(
                (a, b) => new Date(a.data.createdAt || 0).getTime() - new Date(b.data.createdAt || 0).getTime()
              )

              const latest = msgsList[msgsList.length - 1]
              if (latest) {
                lastMessage = {
                  id: latest.id,
                  conversation_id: id,
                  sender_id: latest.data.senderId,
                  text_content: latest.data.textContent || '',
                  media_url: latest.data.mediaUrl || null,
                  media_type: latest.data.mediaType || null,
                  is_read: Boolean(latest.data.is_read),
                  created_at: latest.data.createdAt || new Date().toISOString(),
                }
              }

              // Count unread where sender is not current user
              unreadCount = msgsList.filter(
                (m) => m.data.senderId !== userId && !m.data.is_read
              ).length
            }
          } catch (e) {
            console.warn(`Could not load message preview for conversation ${id}:`, e)
          }

          return {
            id,
            title: data.title || null,
            is_group: Boolean(data.is_group),
            created_at: data.createdAt || new Date().toISOString(),
            updated_at: data.updatedAt || data.createdAt || new Date().toISOString(),
            members: membersWithProfiles,
            last_message: lastMessage,
            unread_count: unreadCount,
          }
        })
      )

      return enriched
    } catch (error) {
      console.error('Error fetching Firestore conversations:', error)
      return []
    }
  },

  /**
   * Fetch messages for a specific conversation in chronological order
   */
  async getConversationMessages(
    conversationId: string,
    limitCount = 50
  ): Promise<Message[]> {
    if (!isFirebaseConfigured() || !conversationId) return []

    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages')
      let snap
      try {
        const q = query(messagesRef, orderBy('createdAt', 'asc'), firestoreLimit(limitCount))
        snap = await getDocs(q)
      } catch (err) {
        console.warn('Ordered messages query fallback:', err)
        snap = await getDocs(messagesRef)
      }

      if (snap.empty) return []

      const messages: Message[] = snap.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          conversation_id: conversationId,
          sender_id: data.senderId,
          text_content: data.textContent || '',
          media_url: data.mediaUrl || null,
          media_type: data.mediaType || null,
          is_read: Boolean(data.is_read),
          created_at: data.createdAt || new Date().toISOString(),
        }
      })

      // Ensure chronological ordering
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      return messages
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      return []
    }
  },

  /**
   * Send a text message inside a conversation
   */
  async sendMessage({
    conversationId,
    senderId,
    textContent,
    file,
  }: {
    conversationId: string
    senderId: string
    textContent: string
    file?: File
  }): Promise<Message> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const cleanText = textContent ? textContent.trim() : ''
    if (!cleanText && !file) {
      throw new Error('Message cannot be empty.')
    }
    if (cleanText.length > 1000) {
      throw new Error('Message must not exceed 1000 characters.')
    }

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== senderId) {
      throw new Error('Sender identity mismatch. Please sign in.')
    }

    // Spark free plan check: binary file uploads to Storage are disabled
    if (file) {
      console.warn('Direct media attachments in messages are disabled on Spark free tier.')
    }

    const messagesRef = collection(db, 'conversations', conversationId, 'messages')
    const messageDocRef = doc(messagesRef)
    const timestamp = new Date().toISOString()

    const messagePayload = {
      id: messageDocRef.id,
      conversationId,
      senderId: currentUser.uid,
      textContent: cleanText,
      mediaUrl: null,
      mediaType: null,
      is_read: false,
      createdAt: timestamp,
    }

    // 1. Add message document
    await setDoc(messageDocRef, messagePayload)

    // 2. Update conversation's updatedAt and preview metadata
    try {
      const convRef = doc(db, 'conversations', conversationId)
      await updateDoc(convRef, {
        updatedAt: timestamp,
        lastMessageText: cleanText,
        lastMessageAt: timestamp,
        lastMessageSenderId: currentUser.uid,
      })

      // 3. Generate notification for recipient(s)
      const convSnap = await getDoc(convRef)
      if (convSnap.exists()) {
        const memberIds: string[] = convSnap.data().memberIds || []
        const otherMembers = memberIds.filter((id) => id !== currentUser.uid)

        for (const recipientId of otherMembers) {
          await notificationServiceFirebase.createNotification({
            recipientId,
            actorId: currentUser.uid,
            type: 'message',
            resourceId: conversationId,
            resourceType: 'conversation',
          })
        }
      }
    } catch (e) {
      console.warn('Non-blocking conversation metadata update error:', e)
    }

    return {
      id: messageDocRef.id,
      conversation_id: conversationId,
      sender_id: currentUser.uid,
      text_content: cleanText,
      media_url: null,
      media_type: null,
      is_read: false,
      created_at: timestamp,
    }
  },

  /**
   * Mark all messages in a conversation sent by others as read
   */
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    if (!isFirebaseConfigured() || !conversationId || !userId) return

    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages')
      const snap = await getDocs(messagesRef)

      if (snap.empty) return

      // Find messages sent by someone else that are unread
      const unreadOtherDocs = snap.docs.filter((d) => {
        const data = d.data()
        return data.senderId !== userId && !data.is_read
      })

      // Update is_read safely (matches firestore rules)
      await Promise.all(
        unreadOtherDocs.map(async (docSnap) => {
          try {
            await updateDoc(docSnap.ref, { is_read: true })
          } catch {
            // Ignore individual read update failure
          }
        })
      )
    } catch (err) {
      console.warn('Error marking conversation as read in Firestore:', err)
    }
  },

  /**
   * Realtime subscription for conversation messages
   */
  subscribeToConversation(
    conversationId: string,
    onNewMessage: (msg: Message) => void
  ): { unsubscribe: () => void } {
    if (!isFirebaseConfigured() || !conversationId) {
      return { unsubscribe: () => {} }
    }

    const messagesRef = collection(db, 'conversations', conversationId, 'messages')

    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        // Handle all doc changes
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data()
            onNewMessage({
              id: change.doc.id,
              conversation_id: conversationId,
              sender_id: data.senderId,
              text_content: data.textContent || '',
              media_url: data.mediaUrl || null,
              media_type: data.mediaType || null,
              is_read: Boolean(data.is_read),
              created_at: data.createdAt || new Date().toISOString(),
            })
          }
        })
      },
      (error) => {
        console.warn('Realtime chat subscription error:', error)
      }
    )

    return { unsubscribe }
  },

  /**
   * Realtime subscription for current user's conversations list
   */
  subscribeToUserConversations(
    userId: string,
    onUpdate: (conversations: Conversation[]) => void
  ): { unsubscribe: () => void } {
    if (!isFirebaseConfigured() || !userId) {
      return { unsubscribe: () => {} }
    }

    const convsRef = collection(db, 'conversations')
    const q = query(convsRef, where('memberIds', 'array-contains', userId))

    const unsubscribe = onSnapshot(
      q,
      async () => {
        try {
          const list = await this.getUserConversations(userId)
          onUpdate(list)
        } catch (e) {
          console.warn('Realtime conversations update error:', e)
        }
      },
      (error) => {
        console.warn('Realtime conversations listener error:', error)
      }
    )

    return { unsubscribe }
  },

  /**
   * Get total unread messages count across all user's conversations
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!isFirebaseConfigured() || !userId) return 0

    try {
      const conversations = await this.getUserConversations(userId)
      return conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0)
    } catch {
      return 0
    }
  },
}
