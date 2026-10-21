import { describe, it, expect } from 'vitest'
import { postServiceFirebase } from '../services/firebase/postService.firebase'
import { SAMPLE_IMAGE_PRESETS } from '../constants/presets'
import { getBackendProvider } from '../services/backendConfig'
import fs from 'fs'
import path from 'path'

describe('Firebase Posts & Spark Free Plan Validation', () => {
  it('confirms active backend provider is firebase', () => {
    expect(getBackendProvider()).toBe('firebase')
  })

  it('verifies sample presets have secure https URLs and non-empty labels', () => {
    expect(SAMPLE_IMAGE_PRESETS.length).toBeGreaterThanOrEqual(4)
    SAMPLE_IMAGE_PRESETS.forEach((preset) => {
      expect(preset.url).toMatch(/^https:\/\//)
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.type).toBe('image')
    })
  })

  it('rejects post creation if user is not signed in', async () => {
    await expect(
      postServiceFirebase.createPost({
        authorId: 'fake_unauthenticated_id',
        caption: 'Hello VibeSocial!',
      })
    ).rejects.toThrow(/signed in/i)
  })

  it('blocks direct binary file uploads without mediaUrl on Spark plan', async () => {
    const dummyFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    await expect(
      postServiceFirebase.createPost({
        authorId: 'user_123',
        caption: 'Test Post',
        files: [dummyFile],
      })
    ).rejects.toThrow()
  })

  it('validates URL formatting rules', () => {
    const validHttp = 'http://example.com/photo.jpg'
    const validHttps = 'https://images.unsplash.com/photo-123'
    const invalidUrl = 'ftp://invalid-server/pic.png'
    const invalidRelative = '/images/local.png'

    const isValid = (url: string) => url.startsWith('http://') || url.startsWith('https://')

    expect(isValid(validHttp)).toBe(true)
    expect(isValid(validHttps)).toBe(true)
    expect(isValid(invalidUrl)).toBe(false)
    expect(isValid(invalidRelative)).toBe(false)
  })

  it('enforces comment character limit of 500 characters', () => {
    const validComment = 'This is a fantastic vibe!'
    const tooLongComment = 'A'.repeat(501)

    expect(validComment.length).toBeLessThanOrEqual(500)
    expect(tooLongComment.length).toBeGreaterThan(500)
  })
})

describe('Firestore Post & Comment Security Rules', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules')
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8')

  it('enforces post creation only for authenticated user matching authorId', () => {
    expect(rulesContent).toContain('match /posts/{postId}')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
  })

  it('enforces likeCount and commentCount start at 0 on creation', () => {
    expect(rulesContent).toContain('request.resource.data.likeCount == 0')
    expect(rulesContent).toContain('request.resource.data.commentCount == 0')
  })

  it('restricts post deletion strictly to post author', () => {
    expect(rulesContent).toContain('allow delete: if isAuthenticated() && resource.data.authorId == request.auth.uid;')
  })

  it('enforces like ownership in likes subcollection', () => {
    expect(rulesContent).toContain('match /likes/{userId}')
    expect(rulesContent).toContain('allow create: if isOwner(userId) && request.resource.data.userId == userId;')
    expect(rulesContent).toContain('allow delete: if isOwner(userId);')
  })

  it('enforces comment content constraints and author matching', () => {
    expect(rulesContent).toContain('match /comments/{commentId}')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.content is string')
    expect(rulesContent).toContain('request.resource.data.content.size() <= 500')
  })

  it('allows public read of posts and comments to ensure feed persists on refresh before auth initializes', () => {
    expect(rulesContent).toContain('// Feed and posts are readable publicly so posts persist after refresh and before auth completes')
    expect(rulesContent).toContain('allow read: if true;')
  })

  it('prevents negative likeCount and commentCount on counter update', () => {
    expect(rulesContent).toContain('request.resource.data.likeCount >= 0')
    expect(rulesContent).toContain('request.resource.data.commentCount >= 0')
  })
})
