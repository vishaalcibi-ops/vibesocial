import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory localStorage mock for node test runner
const memoryStorage = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) || null,
  setItem: (key: string, value: string) => memoryStorage.set(key, value),
  removeItem: (key: string) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
}

if (typeof globalThis.localStorage === 'undefined') {
  ;(globalThis as any).localStorage = mockLocalStorage
}

import { closeFriendsService } from '../services/closeFriendsService'
import { recentViewsService } from '../services/recentViewsService'
import { musicService, TRENDING_TRACKS } from '../services/musicService'
import type { Profile } from '../types/database.types'

describe('Close Friends, Real Map Location, Recent Views & Spotify Integration', () => {
  const testUserId = 'test_user_owner'
  const friendId = 'friend_user_1'
  const strangerId = 'stranger_user_2'

  beforeEach(() => {
    mockLocalStorage.clear()
    vi.restoreAllMocks()
  })

  describe('1. Close Friends Service (💚 ⭐)', () => {
    it('initializes with default close friends or empty list', async () => {
      const friends = await closeFriendsService.getCloseFriends(testUserId)
      expect(Array.isArray(friends)).toBe(true)
    })

    it('adds and removes close friends accurately', async () => {
      await closeFriendsService.setCloseFriends(testUserId, [friendId])
      let friends = await closeFriendsService.getCloseFriends(testUserId)
      expect(friends).toContain(friendId)
      expect(friends).not.toContain(strangerId)

      // Verify isCloseFriend logic
      const isFriend = await closeFriendsService.isCloseFriend(testUserId, friendId)
      const isStranger = await closeFriendsService.isCloseFriend(testUserId, strangerId)
      expect(isFriend).toBe(true)
      expect(isStranger).toBe(false)

      // Author is always treated as self-friend
      const isSelf = await closeFriendsService.isCloseFriend(testUserId, testUserId)
      expect(isSelf).toBe(true)

      // Toggle close friend
      const toggledOff = await closeFriendsService.toggleCloseFriend(testUserId, friendId)
      expect(toggledOff).toBe(false)
      friends = await closeFriendsService.getCloseFriends(testUserId)
      expect(friends).not.toContain(friendId)
    })
  })

  describe('2. Recent Profile Views Service (👁️)', () => {
    const mockVisitor: Profile = {
      id: friendId,
      username: 'friendly_visitor',
      full_name: 'Friendly Visitor',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Hello world',
      website: '',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('records and retrieves profile views', async () => {
      await recentViewsService.recordProfileView(friendId, testUserId, mockVisitor)
      const views = await recentViewsService.getRecentViews(testUserId)
      expect(views.length).toBeGreaterThan(0)
      const recorded = views.find((v) => v.viewer_id === friendId)
      expect(recorded).toBeDefined()
      expect(recorded?.viewer?.username).toBe('friendly_visitor')
    })

    it('does not record self-views as visitors', async () => {
      const initialViews = (await recentViewsService.getRecentViews(testUserId)).length
      await recentViewsService.recordProfileView(testUserId, testUserId, mockVisitor)
      const afterViews = (await recentViewsService.getRecentViews(testUserId)).length
      expect(afterViews).toBe(initialViews)
    })
  })

  describe('3. Spotify Music Integration & Search', () => {
    it('contains verified Spotify metadata across songs', () => {
      TRENDING_TRACKS.forEach((track) => {
        expect(track.title).toBeTruthy()
        expect(track.artist).toBeTruthy()
        expect(track.audio_url).toMatch(/^https:\/\//)
        expect(track.spotify_url).toMatch(/^https:\/\/open\.spotify\.com\/track\//)
        expect(track.source).toBe('spotify')
      })
    })

    it('searches Spotify catalog with instant fallback for Tamil and Hindi songs', async () => {
      const results = await musicService.searchTracks('Hukum')
      expect(results.length).toBeGreaterThan(0)
      const hukum = results.find((r) => r.title.toLowerCase().includes('hukum'))
      expect(hukum).toBeDefined()
      expect(hukum?.spotify_url).toBeTruthy()
    })
  })
})
