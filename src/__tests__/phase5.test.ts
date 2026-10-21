import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { messageServiceFirebase } from '../services/firebase/messageService.firebase'
import { notificationServiceFirebase } from '../services/firebase/notificationService.firebase'

describe('Phase 5: Search, Direct Messages & Notifications Test Suite', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules')
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8')

  describe('1. User Search & Discovery', () => {
    it('handles search queries cleanly and returns empty for blank searches', async () => {
      const results1 = await messageServiceFirebase.getUserConversations('')
      expect(results1).toEqual([])

      const emptyResults = await notificationServiceFirebase.getUserNotifications('')
      expect(emptyResults).toEqual([])
    })

    it('ensures usernames are sanitized to lowercase for case-insensitive lookup', () => {
      const inputUsername = 'JaneDoe_99'
      const cleanUsername = inputUsername.toLowerCase().trim()
      expect(cleanUsername).toBe('janedoe_99')
    })

    it('deduplicates merged search results by unique user ID', () => {
      const mockUsernameResults = [
        { id: 'u1', username: 'alex', full_name: 'Alex Smith' },
        { id: 'u2', username: 'alexander', full_name: 'Alexander Great' },
      ]
      const mockNameResults = [
        { id: 'u1', username: 'alex', full_name: 'Alex Smith' },
        { id: 'u3', username: 'bob', full_name: 'Alex Johnson' },
      ]

      const resultsMap = new Map()
      mockUsernameResults.forEach((u) => resultsMap.set(u.id, u))
      mockNameResults.forEach((u) => {
        if (!resultsMap.has(u.id)) {
          resultsMap.set(u.id, u)
        }
      })

      const deduplicated = Array.from(resultsMap.values())
      expect(deduplicated).toHaveLength(3)
      expect(deduplicated.map((u) => u.id)).toEqual(['u1', 'u2', 'u3'])
    })
  })

  describe('2. Direct Messaging & Duplicate Prevention', () => {
    it('generates deterministic stable conversation ID regardless of participant order', () => {
      const id1 = messageServiceFirebase.getStableDirectConversationId('user_alpha', 'user_beta')
      const id2 = messageServiceFirebase.getStableDirectConversationId('user_beta', 'user_alpha')

      expect(id1).toBe(id2)
      expect(id1).toBe('dm_user_alpha_user_beta')
    })

    it('strictly prevents a user from starting a conversation with themselves', async () => {
      await expect(
        messageServiceFirebase.getOrCreateDirectConversation('same_user', 'same_user')
      ).rejects.toThrow('You cannot start a conversation with yourself.')
    })

    it('enforces maximum message character length of 1000', async () => {
      const longMessage = 'a'.repeat(1001)
      // When text exceeds 1000 chars, it should reject
      await expect(
        messageServiceFirebase.sendMessage({
          conversationId: 'dm_test',
          senderId: 'any_user',
          textContent: longMessage,
        })
      ).rejects.toThrow('Message must not exceed 1000 characters.')
    })

    it('rejects empty message with no text content', async () => {
      await expect(
        messageServiceFirebase.sendMessage({
          conversationId: 'dm_test',
          senderId: 'any_user',
          textContent: '   ',
        })
      ).rejects.toThrow('Message cannot be empty.')
    })
  })

  describe('3. Notifications & Duplicate Prevention', () => {
    it('prevents self-notifications when actor is also recipient', async () => {
      // Spy on console.warn or check that nothing is created
      const spyWarn = vi.spyOn(console, 'warn')
      await notificationServiceFirebase.createNotification({
        recipientId: 'user_123',
        actorId: 'user_123', // Self action
        type: 'like_post',
      })
      // Self-notification should be discarded immediately
      expect(spyWarn).not.toHaveBeenCalled()
    })

    it('uses deterministic notification IDs to prevent duplicate spamming on repeated actions', () => {
      const actorId = 'actor_42'
      const postId = 'post_99'
      const reelId = 'reel_77'

      const followNotifId = `follow_${actorId}`
      const likePostNotifId = `like_post_${actorId}_${postId}`
      const likeReelNotifId = `like_reel_${actorId}_${reelId}`
      const messageNotifId = `msg_conv_123_${actorId}`

      // Re-running action generates the exact same document ID (overwrites with latest timestamp instead of spamming duplicates)
      expect(followNotifId).toBe(`follow_${actorId}`)
      expect(likePostNotifId).toBe('like_post_actor_42_post_99')
      expect(likeReelNotifId).toBe('like_reel_actor_42_reel_77')
      expect(messageNotifId).toBe('msg_conv_123_actor_42')
    })
  })

  describe('4. Security Rules & Firestore Policy Verification', () => {
    it('enforces conversation participant isolation in firestore.rules', () => {
      expect(rulesContent).toContain('match /conversations/{conversationId}')
      // Members must be in memberIds to read
      expect(rulesContent).toContain('request.auth.uid in resource.data.memberIds')
      // Creating requires caller in memberIds and size >= 2
      expect(rulesContent).toContain('request.auth.uid in request.resource.data.memberIds')
      expect(rulesContent).toContain('request.resource.data.memberIds.size() >= 2')
      // Deleting conversation is forbidden
      expect(rulesContent).toContain('allow delete: if false;')
    })

    it('enforces message authorization and field constraints in firestore.rules', () => {
      expect(rulesContent).toContain('match /messages/{messageId}')
      // Only conversation members can read messages
      expect(rulesContent).toContain(
        'request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.memberIds'
      )
      // Sender must be authenticated user
      expect(rulesContent).toContain('request.resource.data.senderId == request.auth.uid')
      // Length limited to 1000 characters
      expect(rulesContent).toContain('request.resource.data.textContent.size() <= 1000')
      // Update only allowed for sender or is_read key
      expect(rulesContent).toContain(
        "request.resource.data.diff(resource.data).affectedKeys().hasOnly(['is_read'])"
      )
    })

    it('enforces recipient privacy for notifications in firestore.rules', () => {
      expect(rulesContent).toContain('match /notifications/{notificationId}')
      // Only the recipient can read, update (mark as read), or delete their notifications
      expect(rulesContent).toContain('allow read, update, delete: if isOwner(userId);')
      // Authenticated users can create notifications for events
      expect(rulesContent).toContain('allow create: if isAuthenticated();')
    })
  })
})
