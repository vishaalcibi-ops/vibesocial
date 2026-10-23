import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callService } from '../services/callService'
import type { Profile } from '../types/database.types'

// Polyfill localStorage for node environment
const store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = val
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k])
  },
}

;(globalThis as any).localStorage = mockLocalStorage

describe('Instagram In-App Audio & Video Calling Suite', () => {
  const callerProfile: Profile = {
    id: 'user_alice',
    username: 'alice',
    full_name: 'Alice Wonder',
    avatar_url: 'https://example.com/alice.jpg',
    bio: '',
    website: '',
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const receiverProfile: Profile = {
    id: 'user_bob',
    username: 'bob',
    full_name: 'Bob Builder',
    avatar_url: 'https://example.com/bob.jpg',
    bio: '',
    website: '',
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    mockLocalStorage.clear()
    vi.restoreAllMocks()
  })

  it('initiates an in-app voice call and saves session with ringing status', async () => {
    const session = await callService.initiateCall({
      caller: callerProfile,
      receiver: receiverProfile,
      type: 'voice',
    })

    expect(session).toBeDefined()
    expect(session.id).toMatch(/^call_/)
    expect(session.caller_id).toBe('user_alice')
    expect(session.receiver_id).toBe('user_bob')
    expect(session.type).toBe('voice')
    expect(session.status).toBe('ringing')
    expect(session.answered_at).toBeNull()

    // Stored in localStorage for instant multi-tab notification
    const stored = mockLocalStorage.getItem(`vibesocial_call_${session.id}`)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.id).toBe(session.id)
  })

  it('initiates an in-app video call', async () => {
    const session = await callService.initiateCall({
      caller: callerProfile,
      receiver: receiverProfile,
      type: 'video',
    })

    expect(session.type).toBe('video')
    expect(session.status).toBe('ringing')
  })

  it('updates call status to accepted when receiver attends the call', async () => {
    const session = await callService.initiateCall({
      caller: callerProfile,
      receiver: receiverProfile,
      type: 'voice',
    })

    await callService.acceptCall(session.id)

    const stored = JSON.parse(mockLocalStorage.getItem(`vibesocial_call_${session.id}`)!)
    expect(stored.status).toBe('accepted')
    expect(stored.answered_at).toBeTruthy()
  })

  it('updates call status to declined when receiver rejects the call', async () => {
    const session = await callService.initiateCall({
      caller: callerProfile,
      receiver: receiverProfile,
      type: 'video',
    })

    await callService.declineCall(session.id)

    const stored = JSON.parse(mockLocalStorage.getItem(`vibesocial_call_${session.id}`)!)
    expect(stored.status).toBe('declined')
    expect(stored.ended_at).toBeTruthy()
  })

  it('ends an active call when endCall is executed', async () => {
    const session = await callService.initiateCall({
      caller: callerProfile,
      receiver: receiverProfile,
      type: 'voice',
    })

    await callService.endCall(session.id)

    const stored = JSON.parse(mockLocalStorage.getItem(`vibesocial_call_${session.id}`)!)
    expect(stored.status).toBe('ended')
    expect(stored.ended_at).toBeTruthy()
  })
})
