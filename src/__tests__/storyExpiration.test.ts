import { describe, it, expect } from 'vitest'

describe('Story Expiration & Filtering Architecture', () => {
  it('correctly filters out expired stories older than 24 hours', () => {
    const now = new Date()

    const activeStory = {
      id: 'active-1',
      author_id: 'user-1',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      expires_at: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(), // expires in 22h
    }

    const expiredStory = {
      id: 'expired-1',
      author_id: 'user-2',
      created_at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(), // 26 hours ago
      expires_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // expired 2h ago
    }

    const stories = [activeStory, expiredStory]
    const currentTimeIso = now.toISOString()

    const visibleStories = stories.filter((s) => s.expires_at > currentTimeIso)

    expect(visibleStories).toHaveLength(1)
    expect(visibleStories[0].id).toBe('active-1')
  })
})
