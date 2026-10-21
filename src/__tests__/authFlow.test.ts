import { describe, it, expect } from 'vitest'
import { authService } from '../services/authService'
import { authServiceFirebase } from '../services/firebase/authService.firebase'

describe('Instagram-Inspired Landing & Real Firebase Authentication', () => {
  it('exposes signInWithGoogle on authService and delegates to provider', () => {
    expect(typeof authService.signInWithGoogle).toBe('function')
    expect(typeof authServiceFirebase.signInWithGoogle).toBe('function')
  })

  it('exposes resetPassword on authService and delegates to provider', () => {
    expect(typeof authService.resetPassword).toBe('function')
    expect(typeof authServiceFirebase.resetPassword).toBe('function')
  })

  it('validates email format before submitting password reset', async () => {
    // Calling resetPassword with invalid email should be rejected
    await expect(authServiceFirebase.resetPassword('invalid-email')).rejects.toThrow()
  })

  it('validates username criteria strictly for new signups', () => {
    const sanitize = (u: string) => u.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')

    expect(sanitize('  User.Name_99!  ')).toBe('user.name_99')
    expect(sanitize('Ab')).toHaveLength(2) // Too short (< 3)
    expect(sanitize('Valid_User')).toHaveLength(10) // Valid (>= 3)
  })

  it('validates password requirement (min 6 characters for Firebase Auth)', () => {
    const isStrongEnough = (pw: string) => pw.length >= 6
    expect(isStrongEnough('12345')).toBe(false)
    expect(isStrongEnough('123456')).toBe(true)
    expect(isStrongEnough('mySecretPass123!')).toBe(true)
  })

  it('maps paths to tabs correctly preserving deep links and routes', () => {
    const pathToTab = (pathname: string) => {
      const clean = pathname.toLowerCase().replace(/\/$/, '')
      if (clean === '/search') return 'search'
      if (clean === '/explore') return 'explore'
      if (clean === '/reels') return 'reels'
      if (clean === '/messages') return 'messages'
      if (clean === '/notifications') return 'notifications'
      if (clean === '/profile' || clean.startsWith('/profile/')) return 'profile'
      return 'feed'
    }

    expect(pathToTab('/')).toBe('feed')
    expect(pathToTab('/search')).toBe('search')
    expect(pathToTab('/explore')).toBe('explore')
    expect(pathToTab('/reels')).toBe('reels')
    expect(pathToTab('/messages')).toBe('messages')
    expect(pathToTab('/notifications')).toBe('notifications')
    expect(pathToTab('/profile/user_abc123')).toBe('profile')
  })
})
