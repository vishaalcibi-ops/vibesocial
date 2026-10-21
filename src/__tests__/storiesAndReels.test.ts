import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storyServiceFirebase } from '../services/firebase/storyService.firebase'
import { reelServiceFirebase } from '../services/firebase/reelService.firebase'
import { SAMPLE_STORY_PRESETS, SAMPLE_REEL_PRESETS } from '../constants/presets'

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
const mockSubcollectionsMap = new Map<string, Map<string, any>>()

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
        fullPath,
      }
    }),
    getDoc: vi.fn(async (docRef: any) => {
      const data = mockDocsMap.get(docRef.fullPath || docRef.id)
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
      const key = docRef.fullPath || docRef.id
      if (options?.merge && mockDocsMap.has(key)) {
        mockDocsMap.set(key, { ...mockDocsMap.get(key), ...data })
      } else {
        mockDocsMap.set(key, data)
      }
    }),
    deleteDoc: vi.fn(async (docRef: any) => {
      mockDocsMap.delete(docRef.fullPath || docRef.id)
    }),
    query: vi.fn((colRef: any) => ({
      path: colRef.path,
      _query: true,
    })),
    orderBy: vi.fn(),
    limit: vi.fn(),
    runTransaction: vi.fn(async (_db: any, updateFunction: any) => {
      const transaction = {
        get: async (docRef: any) => {
          const key = docRef.fullPath || docRef.id
          const data = mockDocsMap.get(key)
          return {
            exists: () => Boolean(data),
            data: () => data,
            id: docRef.id,
          }
        },
        set: (docRef: any, data: any) => {
          mockDocsMap.set(docRef.fullPath || docRef.id, data)
        },
        update: (docRef: any, data: any) => {
          const key = docRef.fullPath || docRef.id
          const existing = mockDocsMap.get(key) || {}
          mockDocsMap.set(key, { ...existing, ...data })
        },
        delete: (docRef: any) => {
          mockDocsMap.delete(docRef.fullPath || docRef.id)
        },
      }
      return await updateFunction(transaction)
    }),
  }
})

describe('Phase 4: Stories & Reels Service & Logic Suite', () => {
  beforeEach(() => {
    mockDocsMap.clear()
    mockSubcollectionsMap.clear()
    // Populate mock user profile
    mockDocsMap.set('users/user_123', {
      id: 'user_123',
      username: 'alice',
      full_name: 'Alice Wonderland',
      avatar_url: 'https://images.unsplash.com/avatar1',
      is_verified: false,
    })
    mockDocsMap.set('users/user_456', {
      id: 'user_456',
      username: 'bob',
      full_name: 'Bob Builder',
      avatar_url: 'https://images.unsplash.com/avatar2',
      is_verified: false,
    })
  })

  describe('Stories Logic', () => {
    it('disallows direct binary file uploads on Firebase Spark free plan', async () => {
      const mockFile = new File(['dummy'], 'story.jpg', { type: 'image/jpeg' })
      await expect(
        storyServiceFirebase.createStory({
          authorId: 'user_123',
          file: mockFile,
        })
      ).rejects.toThrow(/Spark free plan/)
    })

    it('requires a valid http/https media URL for stories', async () => {
      await expect(
        storyServiceFirebase.createStory({
          authorId: 'user_123',
          mediaUrl: 'ftp://invalidscheme.com/photo.jpg',
        })
      ).rejects.toThrow(/http:\/\/ or https:\/\//)
    })

    it('creates a story with 24-hour expiration calculation and denormalized author data', async () => {
      const storyPreset = SAMPLE_STORY_PRESETS[0]
      const beforeTime = Date.now()
      const story = await storyServiceFirebase.createStory({
        authorId: 'user_123',
        mediaUrl: storyPreset.url,
        mediaType: storyPreset.type,
        caption: 'Sunset in paradise 🌅',
      })

      expect(story).toBeDefined()
      expect(story.author_id).toBe('user_123')
      expect(story.media_url).toBe(storyPreset.url)
      expect(story.media_type).toBe(storyPreset.type)
      expect(story.caption).toBe('Sunset in paradise 🌅')
      expect(story.author?.username).toBe('alice')

      const createdTime = new Date(story.created_at).getTime()
      const expiresTime = new Date(story.expires_at).getTime()
      expect(expiresTime - createdTime).toBe(24 * 60 * 60 * 1000)
      expect(createdTime).toBeGreaterThanOrEqual(beforeTime - 1000)
    })

    it('marks a story as viewed by viewerId', async () => {
      await storyServiceFirebase.markStoryViewed('story_test_1', 'user_456')
      const viewData = mockDocsMap.get('stories/story_test_1/views/user_456')
      expect(viewData).toBeDefined()
      expect(viewData.viewerId).toBe('user_456')
      expect(viewData.storyId).toBe('story_test_1')
      expect(viewData.viewedAt).toBeDefined()
    })

    it('prevents non-owners from deleting other users stories', async () => {
      mockDocsMap.set('stories/story_abc', {
        id: 'story_abc',
        authorId: 'user_123',
        mediaUrl: 'https://images.unsplash.com/photo1',
      })

      await expect(storyServiceFirebase.deleteStory('story_abc', 'user_456')).rejects.toThrow(
        /Permission denied/
      )
      // Story still exists
      expect(mockDocsMap.has('stories/story_abc')).toBe(true)
    })

    it('allows story owner to delete their own story', async () => {
      mockDocsMap.set('stories/story_abc', {
        id: 'story_abc',
        authorId: 'user_123',
        mediaUrl: 'https://images.unsplash.com/photo1',
      })

      await storyServiceFirebase.deleteStory('story_abc', 'user_123')
      expect(mockDocsMap.has('stories/story_abc')).toBe(false)
    })
  })

  describe('Reels Logic', () => {
    it('disallows direct binary file uploads on Firebase Spark free plan', async () => {
      const mockFile = new File(['dummy'], 'reel.mp4', { type: 'video/mp4' })
      await expect(
        reelServiceFirebase.createReel({
          authorId: 'user_123',
          videoFile: mockFile,
        })
      ).rejects.toThrow(/Spark free plan/)
    })

    it('creates a reel initialized with likeCount 0 and commentCount 0', async () => {
      const reelPreset = SAMPLE_REEL_PRESETS[0]
      const reel = await reelServiceFirebase.createReel({
        authorId: 'user_123',
        videoUrl: reelPreset.url,
        caption: reelPreset.caption,
        audioTitle: reelPreset.audioTitle,
      })

      expect(reel).toBeDefined()
      expect(reel.author_id).toBe('user_123')
      expect(reel.video_url).toBe(reelPreset.url)
      expect(reel.caption).toBe(reelPreset.caption)
      expect(reel.audio_title).toBe(reelPreset.audioTitle)
      expect(reel.likes_count).toBe(0)
      expect(reel.comments_count).toBe(0)
      expect(reel.is_liked_by_me).toBe(false)
    })

    it('toggles reel like atomically and prevents duplicate likes or negative counts', async () => {
      const reelId = 'reel_999'
      mockDocsMap.set(`reels/${reelId}`, {
        id: reelId,
        authorId: 'user_123',
        likeCount: 0,
        commentCount: 0,
      })

      // 1. Like
      const liked = await reelServiceFirebase.toggleLikeReel(reelId, 'user_456')
      expect(liked).toBe(true)
      expect(mockDocsMap.get(`reels/${reelId}`).likeCount).toBe(1)
      expect(mockDocsMap.has(`reels/${reelId}/likes/user_456`)).toBe(true)

      // 2. Unlike
      const unliked = await reelServiceFirebase.toggleLikeReel(reelId, 'user_456')
      expect(unliked).toBe(false)
      expect(mockDocsMap.get(`reels/${reelId}`).likeCount).toBe(0)
      expect(mockDocsMap.has(`reels/${reelId}/likes/user_456`)).toBe(false)

      // 3. Ensuring count cannot drop below 0
      mockDocsMap.set(`reels/${reelId}/likes/user_456`, { userId: 'user_456' })
      mockDocsMap.set(`reels/${reelId}`, {
        id: reelId,
        authorId: 'user_123',
        likeCount: 0, // Inconsistent corrupted count
      })
      await reelServiceFirebase.toggleLikeReel(reelId, 'user_456')
      expect(mockDocsMap.get(`reels/${reelId}`).likeCount).toBe(0)
    })

    it('adds and deletes reel comments atomically', async () => {
      const reelId = 'reel_888'
      mockDocsMap.set(`reels/${reelId}`, {
        id: reelId,
        authorId: 'user_123',
        likeCount: 0,
        commentCount: 0,
      })

      const comment = await reelServiceFirebase.addReelComment(reelId, 'user_456', 'Amazing reel! 🔥')
      expect(comment).toBeDefined()
      expect(comment.content).toBe('Amazing reel! 🔥')
      expect(comment.author_id).toBe('user_456')
      expect(mockDocsMap.get(`reels/${reelId}`).commentCount).toBe(1)

      // Delete comment
      await reelServiceFirebase.deleteReelComment(reelId, comment.id, 'user_456')
      expect(mockDocsMap.get(`reels/${reelId}`).commentCount).toBe(0)
    })

    it('prevents unauthorized deletion of reels', async () => {
      const reelId = 'reel_777'
      mockDocsMap.set(`reels/${reelId}`, {
        id: reelId,
        authorId: 'user_123',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      })

      await expect(reelServiceFirebase.deleteReel(reelId, 'user_456')).rejects.toThrow(
        /Permission denied/
      )
      expect(mockDocsMap.has(`reels/${reelId}`)).toBe(true)

      // Owner can delete
      await reelServiceFirebase.deleteReel(reelId, 'user_123')
      expect(mockDocsMap.has(`reels/${reelId}`)).toBe(false)
    })
  })
})
