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
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/91/9f/bd/919fbd59-fdf2-fa15-b778-43bb2ff2aa91/mzaf_12411855214041766627.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/37/ef/89/37ef8936-e0f3-be99-4d89-b57bf2585f09/16UMGIM56680.rgb.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/7MXVkk9YM5IT0Yv52zhY2l',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "I'm tryna put you in the worst mood, ah" },
      { time: 5, text: "P1 cleaner than your church shoes, ah" },
      { time: 10, text: "Milli point two just to hurt you, ah" },
      { time: 15, text: "Look what you've done, I'm a motherfuckin' starboy" },
    ],
  },
  {
    id: 'spotify-naa-ready',
    title: 'Naa Ready (Leo)',
    artist: 'Anirudh Ravichander & Vijay',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/45/bc/6045bcf3-badc-db56-d044-adf6b14b0816/mzaf_7981634368973271980.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b0/bf/d4/b0bfd46c-da95-2f95-1f7d-a75aa51c2465/196871252386.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Naa%20Ready%20Leo',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Naa ready thaan varava? Annan naan erangi varava?" },
      { time: 6, text: "Kettathellam kedaikkanumna ethiri kooda kooda vaa" },
      { time: 12, text: "Thodra paapom ennodaya kottai idhu da" },
      { time: 18, text: "Singam irangi varum neram vandhaachu da" },
    ],
  },
  {
    id: 'itunes-naa-ready',
    title: 'Naa Ready (Leo)',
    artist: 'Anirudh Ravichander & Vijay',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/45/bc/6045bcf3-badc-db56-d044-adf6b14b0816/mzaf_7981634368973271980.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b0/bf/d4/b0bfd46c-da95-2f95-1f7d-a75aa51c2465/196871252386.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Naa%20Ready%20Leo',
    source: 'spotify',
  },
  {
    id: 'itunes-aasa-kooda',
    title: 'Aasa Kooda',
    artist: 'Sai Abhyankkar & Sai Smriti',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7d/cf/b4/7dcfb491-bc94-a3b7-58eb-955d86b87304/mzaf_11729642638473227575.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/39/42/ba/3942ba45-40bd-5d0a-d7ad-0595f1336f3f/cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Aasa%20Kooda',
    source: 'spotify',
  },
  {
    id: 'itunes-arabic-kuthu',
    title: 'Arabic Kuthu (Beast)',
    artist: 'Anirudh Ravichander & Jonita Gandhi',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/58/ac/9a/58ac9a48-9e3e-15c9-5085-3a13a6187992/mzaf_12322264242631159198.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/e9/19/b9/e919b921-d5a8-9e9a-8508-3551da375aee/196626458629.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Arabic%20Kuthu',
    source: 'spotify',
  },
  {
    id: 'itunes-powerhouse',
    title: 'Powerhouse (Coolie)',
    artist: 'Anirudh Ravichander & Arivu',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6f/51/5e/6f515e16-25fd-c190-e277-6a0c27772ad8/mzaf_8795228625472102415.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f0/7c/ec/f07cec97-4d1a-da91-02a1-d1a0421ac840/199538343670.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Powerhouse%20Coolie',
    source: 'spotify',
  },
  {
    id: 'itunes-hukum',
    title: 'Hukum (Jailer)',
    artist: 'Anirudh Ravichander & Super Subu',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/20/4b/a5/204ba5f1-aa95-9204-049a-3af28613dfdb/mzaf_9848955577816183835.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/29/10/dc/2910dce9-8973-7957-6a39-e8afc074aa55/197189422959.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Hukum%20Jailer',
    source: 'spotify',
  },
  {
    id: 'itunes-vaathi-coming',
    title: 'Vaathi Coming (Master)',
    artist: 'Anirudh Ravichander & Gana Balachandar',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d7/72/96/d77296ea-677d-45f9-4267-996bbc6801c8/mzaf_2392699048273414940.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a3/f2/dc/a3f2dc29-fc54-07bb-8f9c-2a3936d21a5d/886448363347.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Vaathi%20Coming',
    source: 'spotify',
  },
  {
    id: 'itunes-thalapathy-kacheri',
    title: 'Thalapathy Kacheri',
    artist: 'Anirudh Ravichander & Vijay',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/00/12/4b/00124bc6-3928-404c-fa9a-b6157fc472f5/mzaf_6999912150450564885.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/ef/74/eb/ef74eb29-043d-990b-3a83-40fa23db6e58/8903431148827_cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Thalapathy%20Kacheri',
    source: 'spotify',
  },
  {
    id: 'itunes-badass',
    title: 'Badass (Leo)',
    artist: 'Anirudh Ravichander',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6c/a2/17/6ca2178b-46ab-9d33-f84c-4c59bf53c73d/mzaf_16544885937595911593.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/13/a8/70/13a87001-28ba-1bc7-0ca6-52cf10dd6f52/196871556415.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Badass%20Leo',
    source: 'spotify',
  },
  {
    id: 'itunes-vikram',
    title: 'Vikram Title Track',
    artist: 'Anirudh Ravichander',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/ad/62/15ad6241-3628-2f3e-06b3-5e6ade5c7a7c/mzaf_10622762420251211954.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/41/41/01/41410135-baa0-1aab-7417-f6746b0f3c25/196589186973.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/search/Vikram%20Title%20Track',
    source: 'spotify',
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
      // Calls iTunes search API with country=IN (covers all global + Indian/regional music with CORS enabled)
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        cleanQuery
      )}&country=IN&entity=song&limit=${limit}`

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
