import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postServiceFirebase } from '../services/firebase/postService.firebase'
import { profileServiceFirebase } from '../services/firebase/profileService.firebase'
import { reelServiceFirebase } from '../services/firebase/reelService.firebase'
import { authServiceFirebase } from '../services/firebase/authService.firebase'

// Mock Firestore and Firebase Config
const mockStore = new Map<string, any>()

vi.mock('../services/firebase/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test_user_uid',
      email: 'test@vibesocial.com',
      displayName: 'Test User',
      providerData: [{ providerId: 'password' }],
    },
    authStateReady: vi.fn().mockResolvedValue(undefined),
  },
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...pathSegments) => ({
    path: pathSegments.join('/'),
  })),
  doc: vi.fn((parentOrDb, ...pathSegments) => {
    let fullPath = ''
    const generatedId = pathSegments[pathSegments.length - 1] || 'doc_' + Math.random().toString(36).substring(2, 8)
    if (parentOrDb && parentOrDb.path) {
      fullPath = `${parentOrDb.path}/${generatedId}`
    } else {
      fullPath = pathSegments.join('/')
    }
    return {
      id: generatedId,
      fullPath,
    }
  }),
  getDoc: vi.fn(async (docRef: any) => {
    const data = mockStore.get(docRef.fullPath || docRef.id)
    return {
      exists: () => Boolean(data),
      data: () => data,
      id: docRef.id,
    }
  }),
  getDocs: vi.fn(async (queryOrCol: any) => {
    const path = queryOrCol.path || ''
    const results: any[] = []
    for (const [key, val] of mockStore.entries()) {
      if (key.startsWith(path + '/')) {
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
    const key = docRef.fullPath || docRef.id
    if (options?.merge && mockStore.has(key)) {
      mockStore.set(key, { ...mockStore.get(key), ...data })
    } else {
      mockStore.set(key, data)
    }
  }),
  updateDoc: vi.fn(async (docRef: any, updates: any) => {
    const key = docRef.fullPath || docRef.id
    const existing = mockStore.get(key) || {}
    mockStore.set(key, { ...existing, ...updates })
  }),
  deleteDoc: vi.fn(async (docRef: any) => {
    mockStore.delete(docRef.fullPath || docRef.id)
  }),
  runTransaction: vi.fn(async (_db, updateFunction) => {
    return updateFunction({
      get: async (ref: any) => {
        const data = mockStore.get(ref.fullPath || ref.id)
        return {
          exists: () => Boolean(data),
          data: () => data,
        }
      },
      set: (ref: any, data: any) => {
        mockStore.set(ref.fullPath || ref.id, data)
      },
      update: (ref: any, data: any) => {
        const existing = mockStore.get(ref.fullPath || ref.id) || {}
        mockStore.set(ref.fullPath || ref.id, { ...existing, ...data })
      },
      delete: (ref: any) => {
        mockStore.delete(ref.fullPath || ref.id)
      },
    })
  }),
  query: vi.fn((coll) => coll),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  getCountFromServer: vi.fn(async (coll: any) => {
    const path = coll.path || ''
    let count = 0
    for (const key of mockStore.keys()) {
      if (key.startsWith(path + '/')) count++
    }
    return { data: () => ({ count }) }
  }),
  writeBatch: vi.fn(() => ({
    set: vi.fn((ref, data) => mockStore.set(ref.fullPath || ref.id, data)),
    delete: vi.fn((ref) => mockStore.delete(ref.fullPath || ref.id)),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn().mockResolvedValue(undefined),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}))

describe('Comprehensive Modules Suite', () => {
  beforeEach(() => {
    mockStore.clear()
  })

  describe('Module 3: Post Detail & Editing', () => {
    it('fetches post by ID and maps real fields correctly', async () => {
      mockStore.set('posts/post_1', {
        authorId: 'test_user_uid',
        authorUsername: 'vibestar',
        caption: 'Hello VibeSocial!',
        likeCount: 5,
        commentCount: 2,
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/sample.jpg',
        createdAt: '2026-10-17T12:00:00Z',
      })

      const post = await postServiceFirebase.getPostById('post_1', 'test_user_uid')
      expect(post).not.toBeNull()
      expect(post?.id).toBe('post_1')
      expect(post?.caption).toBe('Hello VibeSocial!')
      expect(post?.likes_count).toBe(5)
    })

    it('allows post author to edit post caption and location', async () => {
      mockStore.set('posts/post_2', {
        authorId: 'test_user_uid',
        caption: 'Old caption',
        location: 'Old City',
        createdAt: '2026-10-17T12:00:00Z',
      })

      const updated = await postServiceFirebase.updatePost('post_2', 'test_user_uid', {
        caption: 'New updated caption',
        location: 'New York, NY',
      })

      expect(updated.caption).toBe('New updated caption')
      expect(updated.location).toBe('New York, NY')
      const stored = mockStore.get('posts/post_2')
      expect(stored.caption).toBe('New updated caption')
      expect(stored.location).toBe('New York, NY')
    })

    it('rejects post editing if user is not author', async () => {
      mockStore.set('posts/post_3', {
        authorId: 'other_user',
        caption: 'Someone elses post',
      })

      await expect(
        postServiceFirebase.updatePost('post_3', 'test_user_uid', { caption: 'Hacked caption' })
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('Module 7 & 8: Follower Lists and Stats', () => {
    it('fetches followers and following profiles from subcollections', async () => {
      mockStore.set('users/user_follower_1', {
        id: 'user_follower_1',
        username: 'follower1',
        full_name: 'Follower One',
      })
      mockStore.set('users/test_user_uid/followers/user_follower_1', {
        follower_id: 'user_follower_1',
        followed_id: 'test_user_uid',
      })

      const followers = await profileServiceFirebase.getFollowers('test_user_uid')
      expect(followers.length).toBe(1)
      expect(followers[0].username).toBe('follower1')
    })
  })

  describe('Module 12: Settings & Data Management', () => {
    it('manages user settings preferences', async () => {
      await profileServiceFirebase.updateUserSettings('test_user_uid', {
        is_private: true,
        like_notifications: false,
      })

      const settings = await profileServiceFirebase.getUserSettings('test_user_uid')
      expect(settings.is_private).toBe(true)
      expect(settings.like_notifications).toBe(false)
    })

    it('exports user account data safely as JSON payload', async () => {
      mockStore.set('users/test_user_uid', {
        id: 'test_user_uid',
        username: 'vibestar',
      })

      const exported = await profileServiceFirebase.exportUserData('test_user_uid')
      expect(exported.account.uid).toBe('test_user_uid')
      expect(exported.platform).toBe('VibeSocial Web')
    })
  })

  describe('Module 15: Content and User Reporting', () => {
    it('persists content reports to /reports collection with pending status', async () => {
      await postServiceFirebase.reportContent(
        'test_user_uid',
        'post_target_123',
        'post',
        "It's spam or deceptive",
        'Bot account spamming ads'
      )

      let foundReport = false
      for (const [key, val] of mockStore.entries()) {
        if (key.startsWith('reports/')) {
          foundReport = true
          expect(val.reporterId).toBe('test_user_uid')
          expect(val.targetId).toBe('post_target_123')
          expect(val.reason).toBe("It's spam or deceptive")
          expect(val.status).toBe('pending')
        }
      }
      expect(foundReport).toBe(true)
    })
  })

  describe('Module 5: Creator Reels by User', () => {
    it('retrieves user reels by creator id', async () => {
      mockStore.set('reels/reel_1', {
        authorId: 'test_user_uid',
        videoUrl: 'https://example.com/reel1.mp4',
        caption: 'My first reel',
        createdAt: '2026-10-17T12:00:00Z',
      })
      mockStore.set('reels/reel_2', {
        authorId: 'someone_else',
        videoUrl: 'https://example.com/reel2.mp4',
        createdAt: '2026-10-17T12:00:00Z',
      })

      const userReels = await reelServiceFirebase.getUserReels('test_user_uid')
      expect(userReels.length).toBe(1)
      expect(userReels[0].author_id).toBe('test_user_uid')
    })
  })

  describe('Module 2 & 12: Authentication & Account Security', () => {
    it('returns the active authentication provider name', () => {
      const provider = authServiceFirebase.getAuthProvider()
      expect(provider).toBe('Email / Password')
    })
  })
})
