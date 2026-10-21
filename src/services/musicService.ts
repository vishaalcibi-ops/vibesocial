import type { AudioTrack, LyricLine } from '../types/database.types'

export function generateTimedLyrics(title: string, artist: string): LyricLine[] {
  return [
    { time: 0, text: `Intro • ${title}` },
    { time: 6, text: `Singing along with ${artist}...` },
    { time: 12, text: `Main chorus • ${title} hits right here` },
    { time: 18, text: `Vibing to ${title} on Instagram Notes` },
    { time: 24, text: `Best melody segment by ${artist}` },
  ]
}

// Curated Spotify and Global Trending Tracks (International + Indian/Tamil Hits)
export const TRENDING_TRACKS: AudioTrack[] = [
  {
    id: 'spotify-starboy',
    title: 'Starboy',
    artist: 'The Weeknd & Daft Punk',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/bf/20/df/bf20df71-6c4d-6202-b2f7-b2ebbb4f8664/mzaf_17206121735165991851.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3d/bf/d4/3dbfd4ec-d278-ca63-8a3d-4c3ab159f812/16UMGIM56847.rgb.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/7MXVkk9YM0zgGCKKL5g994',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "I'm tryna put you in the worst mood, ah" },
      { time: 5, text: "P1 cleaner than your church shoes, ah" },
      { time: 9, text: "Milli point two just to hurt you, ah" },
      { time: 13, text: "All red Lamb' just to tease you, ah" },
      { time: 18, text: "Look what you've done, I'm a motherfuckin' starboy" },
      { time: 24, text: "Look what you've done, I'm a motherfuckin' starboy" },
    ],
  },
  {
    id: 'spotify-levitating',
    title: 'Levitating',
    artist: 'Dua Lipa',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/95/ec/3b/95ec3bfa-db32-c6cb-1f4a-fa63a9254bb7/mzaf_16487538965825227705.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/bf/3a/e0/bf3ae058-208b-590f-c7db-111ec7f53f3e/190295190695.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/463CkQjx2Zk1yXoBuierM9',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "If you wanna run away with me, I know a galaxy" },
      { time: 4, text: "And I can take you for a ride" },
      { time: 8, text: "I had a premonition that we fell into a rhythm" },
      { time: 12, text: "Where the music don't stop for life" },
      { time: 16, text: "Glitter in the sky, glitter in my eyes" },
      { time: 20, text: "Shining just the way I like" },
      { time: 24, text: "You want me, I want you, baby" },
      { time: 27, text: "My sugarboo, I'm levitating" },
    ],
  },
  {
    id: 'spotify-naa-ready',
    title: 'Naa Ready (Leo)',
    artist: 'Anirudh Ravichander & Thalapathy Vijay',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/4a/ce/74/4ace74e2-6cf7-7975-5858-a537f59d58ae/mzaf_9777593681682703875.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/d5/4b/31/d54b31a8-ffc3-718e-4a7b-3b36440ae0fb/8903431940989_cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/6M77X9H6c5m0cEaAELsJtS',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Naa ready thaan varava? Annan naan erangi varava?" },
      { time: 5, text: "Kettathellam kedaikkanumna ethiri kooda kooda vaa" },
      { time: 11, text: "Thodra paapom ennodaya kottai idhu da" },
      { time: 16, text: "Singam irangi varum neram vandhaachu da" },
      { time: 21, text: "Milligan aattam paaru theriya pogudhu" },
      { time: 26, text: "Naa ready thaan varava... Leo dash!" },
    ],
  },
  {
    id: 'spotify-hukum',
    title: 'Hukum - Thalaivar Alappara (Jailer)',
    artist: 'Anirudh Ravichander & Super Subu',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/37/f3/04/37f3044a-b50a-c932-d81a-c71556a31505/mzaf_16694670267794017367.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/e5/22/01/e522019a-9e73-b39d-2101-294b6d9be705/8903431945038_cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/1yYkZfZuHh6g2k1b7X8a8J',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Hukum... Tiger ka hukum!" },
      { time: 4, text: "Alappara kelapparom... Thalaivar neram!" },
      { time: 8, text: "Singathoda koottathula deer-u vandhu ninnucham" },
      { time: 14, text: "Kadhara vachiputtaan thalaivan paaru" },
      { time: 19, text: "Men makkal sonna sollai kaetka maattaan" },
      { time: 24, text: "Vandha paaru Superstar-u alappara!" },
    ],
  },
  {
    id: 'spotify-arabic-kuthu',
    title: 'Arabic Kuthu (Beast)',
    artist: 'Anirudh Ravichander & Jonita Gandhi',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/a5/d7/c4/a5d7c491-7f99-a99f-703a-3c734ea0b3ec/mzaf_11306352932147321523.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/bf/25/7f/bf257fe5-5b48-18e4-e0eb-14421b96d96d/8903431872129_cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/4jVqgJqQ6zX2V5Y61m4XvL',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Halamithi Habibo... Halamithi Habibo!" },
      { time: 5, text: "Malama Pitha Pithadhey... Malama Pitha Pithadhey!" },
      { time: 10, text: "Holik Holik Aahaa... Jolly O Gymkhana!" },
      { time: 15, text: "Mudinja Varikkum Kuthu... Arabic Kuthu Idhu!" },
      { time: 21, text: "Kasu Panathukku Aasapadadha manasae" },
      { time: 26, text: "Arabic Kuthu Beat-la aadidalaam vaa!" },
    ],
  },
  {
    id: 'spotify-marakkuma-nenjam',
    title: 'Marakkuma Nenjam (VTK)',
    artist: 'A.R. Rahman & Thamarai',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/21/df/f0/21dff039-b9a3-d345-4221-a39e83ec55e5/mzaf_10338781747805125345.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/91/9f/df/919fdfb0-6421-4f10-23a7-53a54d6d6342/196589333333.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/1a2b3c4d5e6f7g8h9i0j',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Marakkuma nenjam... Marakkuma nenjam..." },
      { time: 5, text: "Kaalam pooppoal uruvam maarum..." },
      { time: 11, text: "Nenjil ninaivugal koodi vaazhum..." },
      { time: 16, text: "Thaai madi thaedi oadidum paadhai..." },
      { time: 21, text: "Marakkuma nenjam... Sol nenjae..." },
      { time: 26, text: "Engeyo thooram serndhidumo..." },
    ],
  },
  {
    id: 'spotify-blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/91/9f/bd/919fbd59-fdf2-fa15-b778-43bb2ff2aa91/mzaf_12411855214041766627.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/55/7c/48/557c4897-4221-5a0a-ff99-aa4438aa632c/19UMGIM86065.rgb.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Yeah, I've been tryna call" },
      { time: 4, text: "I've been on my own for long enough" },
      { time: 8, text: "Maybe you can show me how to love, maybe" },
      { time: 14, text: "I'm going through withdrawals" },
      { time: 18, text: "You don't even have to do too much" },
      { time: 22, text: "I'm blinded by the lights" },
      { time: 26, text: "No, I can't sleep until I feel your touch" },
    ],
  },
  {
    id: 'spotify-as-it-was',
    title: 'As It Was',
    artist: 'Harry Styles',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/ce/df/bc/cedfbca9-df96-9878-aa7f-6831d10e05dc/mzaf_10375990264027781514.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ae/96/97/ae9697d4-8d93-18f9-dd60-498b82c3f0c1/886449970929.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/4LRPiXqCikLlN15c3yImP7',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Hold on, ringin' the bell, nobody's comin' to help" },
      { time: 5, text: "Your daddy lives by himself, he just wants to know that you're well" },
      { time: 11, text: "In this world, it's just us" },
      { time: 16, text: "You know it's not the same as it was" },
      { time: 21, text: "In this world, it's just us" },
      { time: 26, text: "As it was, as it was" },
    ],
  },
  {
    id: 'spotify-bad-guy',
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/b8/69/cf/b869cf13-b541-efeb-09fc-77b311fcfa35/mzaf_17203378586326177579.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e0/75/a0/e075a0df-d250-9856-cb89-3eaaecc44f8d/19UMGIM08920.rgb.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/2Fxmhks0bxGSBdJ92vM42m',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "White shirt now red, my bloody nose" },
      { time: 4, text: "Sleepin', you're on your tiptoes" },
      { time: 8, text: "Creepin' around like no one knows" },
      { time: 12, text: "Think you're so criminal" },
      { time: 16, text: "So you're a tough guy, like it really rough guy" },
      { time: 22, text: "I'm that bad type, make-your-mama-sad type" },
      { time: 26, text: "I'm the bad guy... duh!" },
    ],
  },
  {
    id: 'spotify-cruel-summer',
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/ae/23/1e/ae231e34-5853-2703-92f7-f370605db9b1/mzaf_14022802081533036437.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/ec/3b/b1/ec3bb114-1e5b-3b74-3253-e9d6d53d2bfd/19UMGIM69458.rgb.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/1BxfuPKGuaTgP7aM0fbdwr',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Fever dream high in the quiet of the night" },
      { time: 4, text: "You know that I caught it" },
      { time: 7, text: "Bad, bad boy, shiny toy with a price" },
      { time: 11, text: "You know that I bought it" },
      { time: 15, text: "And it's new, the shape of your body" },
      { time: 19, text: "It's blue, the feeling I've got" },
      { time: 23, text: "And it's a cruel summer with you" },
    ],
  },
]

type AudioListener = (state: {
  isPlaying: boolean
  activeTrackId: string | null
  currentTime: number
  duration: number
}) => void

class GlobalAudioManager {
  private audio: HTMLAudioElement | null = null
  private activeTrackId: string | null = null
  private activeTrack: AudioTrack | null = null
  private listeners: Set<AudioListener> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio()
      this.audio.preload = 'auto'

      this.audio.addEventListener('timeupdate', () => {
        this.notify()
      })

      this.audio.addEventListener('play', () => {
        this.notify()
      })

      this.audio.addEventListener('pause', () => {
        this.notify()
      })

      this.audio.addEventListener('ended', () => {
        this.activeTrackId = null
        this.activeTrack = null
        this.notify()
      })

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio playback error:', e)
        this.activeTrackId = null
        this.activeTrack = null
        this.notify()
      })
    }
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener)
    listener({
      isPlaying: this.isPlaying(),
      activeTrackId: this.activeTrackId,
      currentTime: this.audio?.currentTime || 0,
      duration: this.audio?.duration || 30,
    })
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const state = {
      isPlaying: this.isPlaying(),
      activeTrackId: this.activeTrackId,
      currentTime: this.audio?.currentTime || 0,
      duration: this.audio?.duration || 30,
    }
    this.listeners.forEach((l) => l(state))
  }

  public isPlaying(): boolean {
    return Boolean(this.audio && !this.audio.paused && !this.audio.ended && this.audio.currentTime > 0)
  }

  public getActiveTrackId(): string | null {
    return this.activeTrackId
  }

  public getActiveTrack(): AudioTrack | null {
    return this.activeTrack
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0
  }

  public playTrack(track: AudioTrack, startTime = 0) {
    if (!this.audio) return
    const trackId = track.id || track.audio_url

    // If already playing this track
    if (this.activeTrackId === trackId && this.isPlaying()) {
      if (startTime === 0 || Math.abs(this.audio.currentTime - startTime) < 0.8) {
        this.audio.pause()
        return
      }
    }

    // Switch or set new track
    if (this.activeTrackId !== trackId || this.audio.src !== track.audio_url) {
      this.audio.src = track.audio_url
      this.activeTrackId = trackId
      this.activeTrack = track

      const startPlayback = () => {
        if (this.audio) {
          if (startTime > 0 && startTime < (this.audio.duration || 30)) {
            this.audio.currentTime = startTime
          }
          this.audio.play().catch((err) => {
            console.warn('Audio play request failed:', err)
            this.notify()
          })
        }
      }

      if (this.audio.readyState >= 1) {
        startPlayback()
      } else {
        this.audio.addEventListener('loadedmetadata', startPlayback, { once: true })
      }
      return
    }

    // Same track, seek to requested start time and play
    if (startTime >= 0) {
      this.audio.currentTime = startTime
    }
    this.audio.play().catch((err) => {
      console.warn('Audio play request failed:', err)
      this.notify()
    })
  }

  public seek(time: number) {
    if (this.audio) {
      const dur = this.audio.duration || 30
      this.audio.currentTime = Math.max(0, Math.min(time, dur))
      this.notify()
    }
  }

  public pause() {
    if (this.audio) {
      this.audio.pause()
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.activeTrackId = null
      this.activeTrack = null
      this.notify()
    }
  }
}

export const globalAudioManager = new GlobalAudioManager()

export const musicService = {
  getTrendingTracks(): AudioTrack[] {
    return TRENDING_TRACKS
  },

  async searchTracks(query: string, limit = 25): Promise<AudioTrack[]> {
    const cleanQuery = query.trim()
    if (!cleanQuery) {
      return TRENDING_TRACKS
    }

    try {
      // Calls iTunes search API with entity=song (covers all global + Indian/regional music with CORS enabled)
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        cleanQuery
      )}&entity=song&limit=${limit}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`Music search API error ${res.status}`)
      }

      const data = await res.json()
      if (!data.results || !Array.isArray(data.results)) {
        return this.fallbackSearch(cleanQuery)
      }

      const tracks: AudioTrack[] = data.results
        .filter((item: any) => item.previewUrl && item.trackName)
        .map((item: any) => {
          let artwork = item.artworkUrl100 || ''
          if (artwork) {
            artwork = artwork.replace('100x100bb', '600x600bb')
          }
          const title = item.trackName
          const artist = item.artistName || 'Unknown Artist'
          return {
            id: `spotify-itunes-${item.trackId}`,
            title,
            artist,
            audio_url: item.previewUrl,
            artwork_url: artwork,
            duration: 30,
            spotify_url: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
            source: 'spotify',
            lyrics: generateTimedLyrics(title, artist),
          }
        })

      if (tracks.length === 0) {
        return this.fallbackSearch(cleanQuery)
      }

      return tracks
    } catch (err) {
      console.warn('Music Search API fallback to curated tracks:', err)
      return this.fallbackSearch(cleanQuery)
    }
  },

  fallbackSearch(query: string): AudioTrack[] {
    const q = query.toLowerCase()
    const matches = TRENDING_TRACKS.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    )
    return matches.length > 0 ? matches : TRENDING_TRACKS
  },
}
