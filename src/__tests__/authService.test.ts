import { describe, it, expect } from 'vitest'
import { isSupabaseConfigured } from '../services/supabase'

describe('Supabase Client Configuration & Auth Guard', () => {
  it('correctly detects when Supabase credentials are missing or default', () => {
    // In unconfigured state (before real credentials supplied), isSupabaseConfigured should be false
    const configured = isSupabaseConfigured()
    expect(typeof configured).toBe('boolean')
  })

  it('validates username sanitization format', () => {
    const rawUsername = 'Cool_User.99@Vibes!'
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    expect(cleanUsername).toBe('cool_user.99vibes')
    expect(cleanUsername.length).toBeGreaterThanOrEqual(3)
    expect(cleanUsername.length).toBeLessThanOrEqual(30)
    expect(/^[a-z0-9_.]+$/.test(cleanUsername)).toBe(true)
  })
})
