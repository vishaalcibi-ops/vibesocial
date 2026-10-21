import { describe, it, expect, vi, beforeEach } from 'vitest'
import { musicService, globalAudioManager, TRENDING_TRACKS } from '../services/musicService'
import { noteService } from '../services/noteService'

// In-memory localStorage mock for node test runner
const memoryStorage = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) || null,
  setItem: (key: string, value: string) => memoryStorage.set(key, value),
  removeItem: (key: string) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
}

// Attach to globalThis if not defined
if (typeof globalThis.localStorage === 'undefined') {
  ;(globalThis as any).localStorage = mockLocalStorage
}

describe('Music & Notes Features', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.restoreAllMocks()
  })

  it('provides trending tracks with valid titles, artists, and audio preview URLs', () => {
    const tracks = musicService.getTrendingTracks()
    expect(tracks.length).toBeGreaterThan(0)
    tracks.forEach((track) => {
      expect(track.title).toBeTruthy()
      expect(track.artist).toBeTruthy()
      expect(track.audio_url).toMatch(/^https:\/\//)
      expect(track.duration).toBe(30)
    })
  })

  it('searches tracks with fallback when query matches trending songs', async () => {
    const results = await musicService.searchTracks('Starboy')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((t) => t.title.toLowerCase().includes('starboy'))).toBe(true)
  })

  it('globalAudioManager controls playback state cleanly', () => {
    expect(globalAudioManager.getActiveTrackId()).toBeNull()

    // Test subscription
    const listener = vi.fn()
    const unsubscribe = globalAudioManager.subscribe(listener)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        isPlaying: false,
        activeTrackId: null,
      })
    )

    unsubscribe()
  })

  it('creates, retrieves, and deletes Instagram notes with music attachments', async () => {
    const track = TRENDING_TRACKS[1] // Levitating
    const note = await noteService.createOrUpdateNote({
      userId: 'test_user_music',
      text: 'Listening to Levitating! 🎵',
      audioTrack: track,
      userProfile: {
        id: 'test_user_music',
        username: 'music_lover',
        full_name: 'Music Lover',
        avatar_url: null,
        bio: '',
        website: '',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    expect(note).toBeDefined()
    expect(note.user_id).toBe('test_user_music')
    expect(note.text).toBe('Listening to Levitating! 🎵')
    expect(note.audio_track?.title).toBe(track.title)
    expect(note.audio_track?.audio_url).toBe(track.audio_url)

    // Verify in active notes
    const activeNotes = await noteService.getActiveNotes()
    expect(activeNotes.some((n) => n.user_id === 'test_user_music')).toBe(true)

    // Delete note
    await noteService.deleteNote(note.id, 'test_user_music')
    const postDeleteNotes = await noteService.getActiveNotes()
    expect(postDeleteNotes.some((n) => n.id === note.id)).toBe(false)
  })

  it('limits note text to 60 characters like Instagram', async () => {
    const longText = 'A'.repeat(100)
    const note = await noteService.createOrUpdateNote({
      userId: 'test_user_limit',
      text: longText,
    })
    expect(note.text.length).toBeLessThanOrEqual(60)
  })
})
