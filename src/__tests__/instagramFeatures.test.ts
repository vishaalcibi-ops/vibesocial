import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postServiceFirebase } from '../services/firebase/postService.firebase'
import { profileServiceFirebase } from '../services/firebase/profileService.firebase'
import { storyServiceFirebase } from '../services/firebase/storyService.firebase'

// Mock firebaseConfig
vi.mock('../services/firebase/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'user_123', email: 'test@vibesocial.com' },
    authStateReady: vi.fn().mockResolvedValue(undefined),
  },
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
}))

// Mock Firestore functions
const mockDocsMap = new Map<string, any>()

function applyFieldUpdates(target: any, updates: any) {
  const result = { ...target }
  for (const [key, value] of Object.entries(updates)) {
    if (value && typeof value === 'object' && (value as any)._type === 'arrayUnion') {
      const current = Array.isArray(result[key]) ? result[key] : []
      const added = (value as any).elements.filter((e: any) => !current.includes(e))
      result[key] = [...current, ...added]
    } else if (value && typeof value === 'object' && (value as any)._type === 'arrayRemove') {
      const current = Array.isArray(result[key]) ? result[key] : []
      result[key] = current.filter((e: any) => !(value as any).elements.includes(e))
    } else {
      result[key] = value
    }
  }
  return result
}

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...pathSegments) => ({
      path: pathSegments.join('/'),
    })),
    doc: vi.fn((parentOrDb, ...pathSegments) => {
      const generatedId = pathSegments[pathSegments.length - 1] || 'mock_doc_' + Math.random().toString(36).substring(2, 9)
      let fullPath = ''
      if (parentOrDb && parentOrDb.path) {
        fullPath = pathSegments.length > 0 ? `${parentOrDb.path}/${pathSegments.join('/')}` : `${parentOrDb.path}/${generatedId}`
      } else {
        fullPath = pathSegments.join('/')
      }
      return {
        id: generatedId,
        path: fullPath,
        fullPath,
      }
    }),
    getDoc: vi.fn(async (docRef: any) => {
      const data = mockDocsMap.get(docRef.fullPath || docRef.path || docRef.id)
      return {
        exists: () => Boolean(data),
        data: () => data,
        id: docRef.id,
      }
    }),
    getDocs: vi.fn(async (queryOrCol: any) => {
      const path = queryOrCol.path || (queryOrCol as any)._query?.path || ''
      const results: any[] = []
      for (const [key, val] of mockDocsMap.entries()) {
        if (key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1) {
          results.push({
            id: key.split('/').pop(),
            data: () => val,
          })
        }
      }
      return {
        empty: results.length === 0,
        forEach: (cb: any) => results.forEach(cb),
        docs: results,
      }
    }),
    setDoc: vi.fn(async (docRef: any, data: any, options?: any) => {
      const targetPath = docRef.fullPath || docRef.path || docRef.id
      if (options?.merge && mockDocsMap.has(targetPath)) {
        mockDocsMap.set(targetPath, applyFieldUpdates(mockDocsMap.get(targetPath), data))
      } else {
        mockDocsMap.set(targetPath, applyFieldUpdates({}, data))
      }
      return Promise.resolve()
    }),
    updateDoc: vi.fn(async (docRef: any, data: any) => {
      const targetPath = docRef.fullPath || docRef.path || docRef.id
      const existing = mockDocsMap.get(targetPath) || {}
      mockDocsMap.set(targetPath, applyFieldUpdates(existing, data))
      return Promise.resolve()
    }),
    deleteDoc: vi.fn(async (docRef: any) => {
      const targetPath = docRef.fullPath || docRef.path || docRef.id
      mockDocsMap.delete(targetPath)
      return Promise.resolve()
    }),
    writeBatch: vi.fn(() => {
      const operations: Array<() => void> = []
      return {
        set: (docRef: any, data: any, options?: any) => {
          operations.push(() => {
            const path = docRef.fullPath || docRef.path || docRef.id
            if (options?.merge && mockDocsMap.has(path)) {
              mockDocsMap.set(path, applyFieldUpdates(mockDocsMap.get(path), data))
            } else {
              mockDocsMap.set(path, applyFieldUpdates({}, data))
            }
          })
        },
        update: (docRef: any, data: any) => {
          operations.push(() => {
            const path = docRef.fullPath || docRef.path || docRef.id
            const existing = mockDocsMap.get(path) || {}
            mockDocsMap.set(path, applyFieldUpdates(existing, data))
          })
        },
        delete: (docRef: any) => {
          operations.push(() => {
            const path = docRef.fullPath || docRef.path || docRef.id
            mockDocsMap.delete(path)
          })
        },
        commit: async () => {
          operations.forEach((op) => op())
          return Promise.resolve()
        },
      }
    }),
    arrayUnion: (...elements: any[]) => ({ _type: 'arrayUnion', elements }),
    arrayRemove: (...elements: any[]) => ({ _type: 'arrayRemove', elements }),
    query: vi.fn((colRef: any) => ({
      _query: { path: colRef.path },
      path: colRef.path,
    })),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    runTransaction: vi.fn(async (_db: any, updateFunction: any) => {
      const transaction = {
        get: async (docRef: any) => {
          const path = docRef.fullPath || docRef.path || docRef.id
          const data = mockDocsMap.get(path)
          return {
            exists: () => Boolean(data),
            data: () => data,
            id: docRef.id,
          }
        },
        set: (docRef: any, data: any) => {
          const path = docRef.fullPath || docRef.path || docRef.id
          mockDocsMap.set(path, data)
        },
        update: (docRef: any, data: any) => {
          const path = docRef.fullPath || docRef.path || docRef.id
          const existing = mockDocsMap.get(path) || {}
          mockDocsMap.set(path, applyFieldUpdates(existing, data))
        },
        delete: (docRef: any) => {
          const path = docRef.fullPath || docRef.path || docRef.id
          mockDocsMap.delete(path)
        },
      }
      return updateFunction(transaction)
    }),
    serverTimestamp: () => new Date().toISOString(),
    increment: (n: number) => n,
  }
})

describe('Instagram Advanced Real-Working Features Suite', () => {
  beforeEach(() => {
    mockDocsMap.clear()
  })

  describe('Post Archive and Undo Archive', () => {
    it('archives an active post and marks isArchived as true', async () => {
      const postId = 'post_arch_1'
      const authorId = 'user_123'
      mockDocsMap.set(`posts/${postId}`, {
        id: postId,
        authorId,
        caption: 'Beautiful sunset in Paris',
        createdAt: new Date().toISOString(),
        isArchived: false,
      })

      await postServiceFirebase.archivePost(postId, authorId)

      const stored = mockDocsMap.get(`posts/${postId}`)
      expect(stored.isArchived).toBe(true)
    })

    it('unarchives an archived post (undo archive) and restores it to profile and feed', async () => {
      const postId = 'post_arch_2'
      const authorId = 'user_123'
      mockDocsMap.set(`posts/${postId}`, {
        id: postId,
        authorId,
        caption: 'Throwback to holiday',
        createdAt: new Date().toISOString(),
        isArchived: true,
      })

      await postServiceFirebase.unarchivePost(postId, authorId)

      const stored = mockDocsMap.get(`posts/${postId}`)
      expect(stored.isArchived).toBe(false)
    })

    it('retrieves only archived posts in getArchivedPosts', async () => {
      const authorId = 'user_123'
      mockDocsMap.set('posts/p1', {
        id: 'p1',
        authorId,
        caption: 'Archived post',
        createdAt: new Date().toISOString(),
        isArchived: true,
      })
      mockDocsMap.set('posts/p2', {
        id: 'p2',
        authorId,
        caption: 'Active public post',
        createdAt: new Date().toISOString(),
        isArchived: false,
      })

      const archived = await postServiceFirebase.getArchivedPosts(authorId)
      expect(archived.length).toBe(1)
      expect(archived[0].id).toBe('p1')
      expect(archived[0].is_archived).toBe(true)
    })
  })

  describe('Stories Archive', () => {
    it('retrieves author past stories in getArchivedStories', async () => {
      const authorId = 'user_123'
      mockDocsMap.set('stories/s1', {
        id: 's1',
        authorId,
        mediaUrl: 'https://example.com/story1.jpg',
        mediaType: 'image',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      })

      const stories = await storyServiceFirebase.getArchivedStories(authorId)
      expect(stories.length).toBe(1)
      expect(stories[0].id).toBe('s1')
    })
  })

  describe('Private Account & Follow Requests', () => {
    it('sends follow request to private target user', async () => {
      const requesterId = 'user_123'
      const targetUserId = 'target_priv_1'
      mockDocsMap.set(`users/${targetUserId}`, {
        id: targetUserId,
        username: 'privatetarget',
        fullName: 'Private Target',
        is_private: true,
      })

      const result = await profileServiceFirebase.sendFollowRequest(requesterId, targetUserId)
      expect(result.status).toBe('requested')

      const hasRequested = await profileServiceFirebase.hasRequestedFollow(requesterId, targetUserId)
      expect(hasRequested).toBe(true)
    })

    it('accepts follow request and establishes follower/following relationship', async () => {
      const targetUserId = 'user_123'
      const requesterId = 'requester_456'

      // Set up pending follow request
      mockDocsMap.set(`users/${targetUserId}/followRequests/${requesterId}`, {
        requesterId,
        targetUserId,
        createdAt: new Date().toISOString(),
      })
      mockDocsMap.set(`users/${targetUserId}`, {
        id: targetUserId,
        username: 'myaccount',
        followersCount: 0,
        followingCount: 0,
      })
      mockDocsMap.set(`users/${requesterId}`, {
        id: requesterId,
        username: 'requesteruser',
        followersCount: 0,
        followingCount: 0,
      })

      await profileServiceFirebase.acceptFollowRequest(targetUserId, requesterId)

      // Request removed
      const hasReq = await profileServiceFirebase.hasRequestedFollow(requesterId, targetUserId)
      expect(hasReq).toBe(false)

      // Follower added
      const followerDoc = mockDocsMap.get(`users/${targetUserId}/followers/${requesterId}`)
      expect(followerDoc).toBeDefined()
    })

    it('declines follow request and removes it cleanly', async () => {
      const targetUserId = 'user_123'
      const requesterId = 'requester_789'

      mockDocsMap.set(`users/${targetUserId}/followRequests/${requesterId}`, {
        requesterId,
        targetUserId,
        createdAt: new Date().toISOString(),
      })

      await profileServiceFirebase.declineFollowRequest(targetUserId, requesterId)

      const hasReq = await profileServiceFirebase.hasRequestedFollow(requesterId, targetUserId)
      expect(hasReq).toBe(false)
    })
  })

  describe('Active Status Heartbeat', () => {
    it('updates user last_seen timestamp in Firestore', async () => {
      const userId = 'user_123'
      mockDocsMap.set(`users/${userId}`, {
        id: userId,
        username: 'activetester',
      })

      await profileServiceFirebase.updateActiveStatus(userId)

      const updated = mockDocsMap.get(`users/${userId}`)
      expect(updated.last_seen).toBeDefined()
    })
  })

  describe('Hide Story From Specific Users', () => {
    it('adds and removes users from hiddenStories list', async () => {
      const userId = 'user_123'
      const blockedStoryUser = 'hidden_friend_1'

      mockDocsMap.set(`users/${userId}`, {
        id: userId,
        username: 'activetester',
        settings: { hidden_story_users: [] },
      })
      mockDocsMap.set(`users/${blockedStoryUser}`, {
        id: blockedStoryUser,
        username: 'hiddenfriend',
        fullName: 'Hidden Friend',
      })

      await profileServiceFirebase.hideStoryFrom(userId, blockedStoryUser)
      const hiddenList = await profileServiceFirebase.getHiddenStoryUsers(userId)
      expect(hiddenList.map((u) => u.id)).toContain(blockedStoryUser)

      await profileServiceFirebase.unhideStoryFrom(userId, blockedStoryUser)
      const afterList = await profileServiceFirebase.getHiddenStoryUsers(userId)
      expect(afterList.map((u) => u.id)).not.toContain(blockedStoryUser)
    })
  })

  describe('Block and Restrict Accounts', () => {
    it('blocks user and correctly identifies blocked state', async () => {
      const currentUserId = 'user_123'
      const targetUser = 'spammer_99'

      await profileServiceFirebase.blockUser(currentUserId, targetUser)
      const isBlocked = await profileServiceFirebase.isUserBlocked(currentUserId, targetUser)
      expect(isBlocked).toBe(true)

      await profileServiceFirebase.unblockUser(currentUserId, targetUser)
      const afterUnblock = await profileServiceFirebase.isUserBlocked(currentUserId, targetUser)
      expect(afterUnblock).toBe(false)
    })

    it('restricts user and correctly identifies restricted state', async () => {
      const currentUserId = 'user_123'
      const targetUser = 'troll_88'

      await profileServiceFirebase.restrictUser(currentUserId, targetUser)
      const isRestricted = await profileServiceFirebase.isUserRestricted(currentUserId, targetUser)
      expect(isRestricted).toBe(true)

      await profileServiceFirebase.unrestrictUser(currentUserId, targetUser)
      const afterUnrestrict = await profileServiceFirebase.isUserRestricted(currentUserId, targetUser)
      expect(afterUnrestrict).toBe(false)
    })
  })
})
