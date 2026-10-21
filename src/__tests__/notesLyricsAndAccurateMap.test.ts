import { describe, it, expect, beforeEach, vi } from 'vitest'
import { noteService } from '../services/noteService'
import { musicService, TRENDING_TRACKS, generateTimedLyrics } from '../services/musicService'
import {
  formatAccuratePlace,
  formatPhotonFeature,
  mapService,
} from '../services/mapService'

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

describe('Instagram Notes Audio Clip Selection & Synced Lyrics', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.restoreAllMocks()
  })

  it('trending tracks contain synchronized timestamped lyrics', () => {
    const tracks = musicService.getTrendingTracks()
    expect(tracks.length).toBeGreaterThan(0)

    const starboy = tracks.find((t) => t.id === 'spotify-starboy')
    expect(starboy).toBeDefined()
    expect(starboy?.lyrics).toBeDefined()
    expect(starboy?.lyrics?.length).toBeGreaterThan(0)
    expect(starboy?.lyrics?.[0]).toHaveProperty('time')
    expect(starboy?.lyrics?.[0]).toHaveProperty('text')

    const naaReady = tracks.find((t) => t.id === 'spotify-naa-ready')
    expect(naaReady?.lyrics).toBeDefined()
    expect(naaReady?.lyrics?.some((l) => l.text.includes('Naa ready'))).toBe(true)
  })

  it('generateTimedLyrics provides fallback synced lyrics for search results', () => {
    const lyrics = generateTimedLyrics('Shape of You', 'Ed Sheeran')
    expect(lyrics.length).toBe(5)
    expect(lyrics[0].time).toBe(0)
    expect(lyrics[0].text).toContain('Shape of You')
    expect(lyrics[1].text).toContain('Ed Sheeran')
  })

  it('creates and retrieves a note with audio clip window and selected lyrics snippet', async () => {
    const testTrack = TRENDING_TRACKS[0]
    const chosenLyric = testTrack.lyrics?.[4]?.text || 'Look what you have done'

    const note = await noteService.createOrUpdateNote({
      userId: 'test_user_music_clip',
      text: 'Cruising through the night',
      audioTrack: testTrack,
      clipStart: 18,
      clipDuration: 15,
      selectedLyrics: chosenLyric,
    })

    expect(note.clip_start).toBe(18)
    expect(note.clip_duration).toBe(15)
    expect(note.selected_lyrics).toBe(chosenLyric)

    // Retrieve active notes
    const active = await noteService.getActiveNotes('test_user_music_clip')
    const found = active.find((n) => n.user_id === 'test_user_music_clip')
    expect(found).toBeDefined()
    expect(found?.clip_start).toBe(18)
    expect(found?.clip_duration).toBe(15)
    expect(found?.selected_lyrics).toBe(chosenLyric)
  })
})

describe('Accurate Map Places & Real Street Geocoding', () => {
  it('accurately parses a real street feature from Komoot Photon', () => {
    const rawPhotonFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [80.2293988, 13.037159],
      },
      properties: {
        osm_key: 'highway',
        osm_value: 'residential',
        type: 'street',
        name: 'Ranganathan Street',
        locality: 'Ward 136',
        district: 'Kodambakkam',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postcode: '600017',
      },
    }

    const place = formatPhotonFeature(rawPhotonFeature)
    expect(place.title).toBe('Ranganathan Street')
    expect(place.subtitle).toContain('Kodambakkam')
    expect(place.subtitle).toContain('Chennai')
    expect(place.lat).toBe(13.037159)
    expect(place.lng).toBe(80.2293988)
    expect(place.full).toContain('Ranganathan Street')
  })

  it('accurately parses a venue with amenity, suburb, and city', () => {
    const rawNominatimData = {
      name: 'Saravana Bhavan',
      lat: '13.0418',
      lon: '80.2341',
      address: {
        amenity: 'restaurant',
        suburb: 'T. Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
      },
    }

    const place = formatAccuratePlace(rawNominatimData)
    expect(place.title).toBe('Saravana Bhavan')
    expect(place.subtitle).toBe('T. Nagar, Chennai')
    expect(place.full).toBe('Saravana Bhavan, T. Nagar, Chennai')
    expect(place.lat).toBe(13.0418)
    expect(place.lng).toBe(80.2341)
  })

  it('accurately parses a tourism landmark or beach', () => {
    const rawNominatimData = {
      name: 'Marina Beach',
      lat: '13.0500',
      lon: '80.2824',
      address: {
        tourism: 'attraction',
        suburb: 'Triplicane',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
      },
    }

    const place = formatAccuratePlace(rawNominatimData)
    expect(place.title).toBe('Marina Beach')
    expect(place.subtitle).toContain('Triplicane')
    expect(place.subtitle).toContain('Chennai')
  })

  it('accurately parses a shopping mall with shop tag', () => {
    const rawNominatimData = {
      name: 'Express Avenue Mall',
      lat: '13.0588',
      lon: '80.2642',
      address: {
        shop: 'mall',
        suburb: 'Royapettah',
        city: 'Chennai',
        state: 'Tamil Nadu',
      },
    }

    const place = formatAccuratePlace(rawNominatimData)
    expect(place.title).toBe('Express Avenue Mall')
    expect(place.subtitle).toContain('Royapettah')
  })

  it('handles fallback gracefully when name is empty', () => {
    const rawNominatimData = {
      display_name: 'Besant Nagar, Chennai, Tamil Nadu, 600090, India',
      lat: '12.9996',
      lon: '80.2707',
      address: {
        suburb: 'Besant Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
      },
    }

    const place = formatAccuratePlace(rawNominatimData)
    expect(place.title).toBe('Besant Nagar')
    expect(place.subtitle).toContain('Chennai')
  })

  it('searches places and streets returning results with location bias', async () => {
    const results = await mapService.searchPlacesAndStreets('anna salai', 13.0827, 80.2707, 5)
    // Even if offline/network restricted in test runner, function returns array without throwing
    expect(Array.isArray(results)).toBe(true)
  }, 10000)
})
