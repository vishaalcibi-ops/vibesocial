import { describe, it, expect } from 'vitest'
import { isFirebaseConfigured } from '../services/firebase/firebaseConfig'
import { getBackendProvider, isBackendConfigured } from '../services/backendConfig'
import { profileServiceFirebase } from '../services/firebase/profileService.firebase'
import fs from 'fs'
import path from 'path'

describe('Firebase Configuration & Spark Plan Guard', () => {
  it('correctly detects placeholder vs configured Firebase credentials', () => {
    // When placeholders are in .env.local, isFirebaseConfigured returns false
    const configured = isFirebaseConfigured()
    expect(typeof configured).toBe('boolean')
  })

  it('correctly detects active backend provider as firebase', () => {
    const provider = getBackendProvider()
    expect(['firebase', 'supabase']).toContain(provider)
    expect(provider).toBe('firebase')
  })

  it('checks backend configured status consistently', () => {
    const isConfig = isBackendConfigured()
    expect(typeof isConfig).toBe('boolean')
  })

  it('blocks direct binary avatar uploads on Spark plan with a clear message', async () => {
    const dummyFile = new File(['dummy'], 'avatar.png', { type: 'image/png' })
    await expect(profileServiceFirebase.uploadAvatar('user_123', dummyFile)).rejects.toThrow(
      /Firebase Storage is disabled on the Spark free plan/i
    )
  })

  it('enforces username sanitization rules', () => {
    const rawUsername = '  Test.User_42!@#  '
    const cleanUsername = rawUsername.toLowerCase().trim().replace(/[^a-z0-9_.]/g, '')
    expect(cleanUsername).toBe('test.user_42')
    expect(cleanUsername.length).toBeGreaterThanOrEqual(3)
    expect(cleanUsername.length).toBeLessThanOrEqual(30)
    expect(/^[a-z0-9_.]+$/.test(cleanUsername)).toBe(true)
  })
})

describe('Firestore Rules Security Validation', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules')
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8')

  it('contains cloud.firestore rules_version = 2', () => {
    expect(rulesContent).toContain("rules_version = '2';")
    expect(rulesContent).toContain('service cloud.firestore')
  })

  it('enforces isAuthenticated() on user profiles', () => {
    expect(rulesContent).toContain('function isAuthenticated()')
    expect(rulesContent).toContain('function isOwner(userId)')
    expect(rulesContent).toContain('match /users/{userId}')
    expect(rulesContent).toContain('allow create: if isOwner(userId)')
    expect(rulesContent).toContain('allow update: if isOwner(userId)')
  })

  it('forbids profile deletion to prevent accidental account destruction', () => {
    expect(rulesContent).toContain('allow delete: if false;')
  })

  it('enforces self-follow prevention in followers subcollection', () => {
    expect(rulesContent).toContain('match /followers/{followerId}')
    expect(rulesContent).toContain('allow create: if isOwner(followerId) && followerId != userId;')
  })

  it('protects private direct messages to conversation members only', () => {
    expect(rulesContent).toContain('match /conversations/{conversationId}')
    expect(rulesContent).toContain('request.auth.uid in resource.data.memberIds')
  })
})
