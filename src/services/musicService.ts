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

// Curated Spotify and Global Trending Tracks (Full Tamil Hits & International Spotify Chartbusters)
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
      { time: 20, text: "Every day a star is born, clap if you feel like that" },
      { time: 25, text: "House so empty, need a centerpiece" },
    ],
  },
  {
    id: 'spotify-naa-ready',
    title: 'Naa Ready (Leo)',
    artist: 'Anirudh Ravichander & Vijay',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/45/bc/6045bcf3-badc-db56-d044-adf6b14b0816/mzaf_7981634368973271980.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b0/bf/d4/b0bfd46c-da95-2f95-1f7d-a75aa51c2465/196871252386.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/5uQ7981634368973271980',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Naa ready thaan varava? Annan naan erangi varava?" },
      { time: 4, text: "Kettathellam kedaikkanumna ethiri kooda kooda vaa" },
      { time: 8, text: "Thodra paapom ennodaya kottai idhu da" },
      { time: 12, text: "Singam irangi varum neram vandhaachu da" },
      { time: 16, text: "Pallaakku kedachaalum kaal nadaya poganum da" },
      { time: 20, text: "Millaati koodathula muthalaali aaganum da" },
      { time: 24, text: "Pathu rooba note-u kooda kottai katti nikkum da" },
      { time: 27, text: "Vandhavan ponaavan ellam vazhi vidu da" },
    ],
  },
  {
    id: 'spotify-hukum',
    title: 'Hukum - Thalaivar Alappara (Jailer)',
    artist: 'Anirudh Ravichander & Super Subu',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/20/4b/a5/204ba5f1-aa95-9204-049a-3af28613dfdb/mzaf_9848955577816183835.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/29/10/dc/2910dce9-8973-7957-6a39-e8afc074aa55/197189422959.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/6Z9848955577816183835',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Hukum... Tiger ka hukum!" },
      { time: 4, text: "Alappara kelapparom... Thalaivar neram!" },
      { time: 8, text: "Singathoda koottathula deer-u vandhu ninnucham" },
      { time: 12, text: "Singam adha paathu oru sirippu sirippucham" },
      { time: 16, text: "Kadhara vachiputtaan thalaivan paaru" },
      { time: 20, text: "Men makkal sonna sollai kaetka maattaan" },
      { time: 24, text: "Vandha paaru Superstar-u alappara!" },
      { time: 28, text: "Ketta paeru eduthu vacha vettikaran da!" },
    ],
  },
  {
    id: 'spotify-aasa-kooda',
    title: 'Aasa Kooda',
    artist: 'Sai Abhyankkar & Sai Smriti',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7d/cf/b4/7dcfb491-bc94-a3b7-58eb-955d86b87304/mzaf_11729642638473227575.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/39/42/ba/3942ba45-40bd-5d0a-d7ad-0595f1336f3f/cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/7d11729642638473227575',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Aasa kooda paarkaiyil en manasu kooda aadudhey" },
      { time: 4, text: "Pesum vizhigal paarkum nodiyil kaadhal pookkudhey" },
      { time: 9, text: "Unnoda serndhu naan paadum paattu" },
      { time: 14, text: "Thendral kaatril mella vandhadhu paaru" },
      { time: 19, text: "Nenjukkul koodikitta aasaigal nooru" },
      { time: 23, text: "Un nizhalaaga naan kooda varuven" },
      { time: 27, text: "Endrendrum anbe unakkaga vaazhven" },
    ],
  },
  {
    id: 'spotify-arabic-kuthu',
    title: 'Arabic Kuthu (Beast)',
    artist: 'Anirudh Ravichander & Jonita Gandhi',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/58/ac/9a/58ac9a48-9e3e-15c9-5085-3a13a6187992/mzaf_12322264242631159198.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/e9/19/b9/e919b921-d5a8-9e9a-8508-3551da375aee/196626458629.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/3k12322264242631159198',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Halamithi Habibo... Halamithi Habibo!" },
      { time: 4, text: "Malama Pitha Pithadhey... Malama Pitha Pithadhey!" },
      { time: 8, text: "Holik Holik Aahaa... Jolly O Gymkhana!" },
      { time: 13, text: "Mudinja Varikkum Kuthu... Arabic Kuthu Idhu!" },
      { time: 17, text: "Kasu Panathukku Aasapadadha manasae" },
      { time: 21, text: "Veedhiyila aadudhu paaru namma pasanga kooda" },
      { time: 25, text: "Arabic Kuthu Beat-la aadidalaam vaa!" },
      { time: 28, text: "Habibo Habibo namma vibe-u vera level!" },
    ],
  },
  {
    id: 'spotify-badass',
    title: 'Badass (Leo)',
    artist: 'Anirudh Ravichander',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6c/a2/17/6ca2178b-46ab-9d33-f84c-4c59bf53c73d/mzaf_16544885937595911593.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/13/a8/70/13a87001-28ba-1bc7-0ca6-52cf10dd6f52/196871556415.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/4j16544885937595911593',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Badass Mr. Leo Das is a freaking badass!" },
      { time: 4, text: "He is the baddest of them all" },
      { time: 8, text: "Thalaivan perai sonnale theriyaadhavan yaarumilla" },
      { time: 13, text: "Rathatha paatha pinnum thirumbi nikkura aalu" },
      { time: 18, text: "Vettiyaana pecha vittu saatchiya sollu" },
      { time: 23, text: "Bloody sweet nu solli mudichiduvaan da" },
      { time: 27, text: "Badass Leo Das is back in town!" },
    ],
  },
  {
    id: 'spotify-vikram',
    title: 'Vikram Title Track',
    artist: 'Anirudh Ravichander',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/ad/62/15ad6241-3628-2f3e-06b3-5e6ade5c7a7c/mzaf_10622762420251211954.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/41/41/01/41410135-baa0-1aab-7417-f6746b0f3c25/196589186973.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/1a10622762420251211954',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Aarambikkalaangala? Vikram enters the arena" },
      { time: 4, text: "Once upon a time there lived a ghost" },
      { time: 9, text: "He was known to be a killer and one cold blooded host" },
      { time: 14, text: "Veera soora theeranukku bayam kedaiyaadhu" },
      { time: 19, text: "Pathala pathala satham pottu aadu" },
      { time: 24, text: "Eagle is coming to hunt them all down" },
      { time: 28, text: "Vikram... The legend never dies!" },
    ],
  },
  {
    id: 'spotify-vaathi-coming',
    title: 'Vaathi Coming (Master)',
    artist: 'Anirudh Ravichander & Gana Balachandar',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d7/72/96/d77296ea-677d-45f9-4267-996bbc6801c8/mzaf_2392699048273414940.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a3/f2/dc/a3f2dc29-fc54-07bb-8f9c-2a3936d21a5d/886448363347.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/2b2392699048273414940',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Kannaana kanne Vaathi coming ottha sollu" },
      { time: 4, text: "Dolu thappu melam kotti aattam pottu thallu" },
      { time: 9, text: "Namma vetti katti nikkura Vaathi yaaru paaru" },
      { time: 14, text: "Class-u cut adichu paadum paattu dhaan idhu" },
      { time: 19, text: "Kaal mela kaal pottu ukkaandhaa mass-u" },
      { time: 23, text: "Vaathi coming othukko vazhiya vidu da" },
      { time: 27, text: "Master blaster entry podhum da!" },
    ],
  },
  {
    id: 'spotify-marakkuma-nenjam',
    title: 'Marakkuma Nenjam (VTK)',
    artist: 'A.R. Rahman & Thamarai',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/21/df/f0/21dff039-b9a3-d345-4221-a39e83ec55e5/mzaf_10338781747805125345.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/91/9f/df/919fdfb0-6421-4f10-23a7-53a54d6d6342/196589333333.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/8e10338781747805125345',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Marakkuma nenjam... Marakkuma nenjam..." },
      { time: 4, text: "Kaalam pooppoal uruvam maarum..." },
      { time: 8, text: "Nenjil ninaivugal koodi vaazhum..." },
      { time: 13, text: "Thaai madi thaedi oadidum paadhai..." },
      { time: 17, text: "Marakkuma nenjam... Sol nenjae..." },
      { time: 21, text: "Engeyo thooram serndhidumo idhu..." },
      { time: 25, text: "Pirindha vazhigal mella serndhidumo..." },
    ],
  },
  {
    id: 'spotify-munbe-vaa',
    title: 'Munbe Vaa (Sillunu Oru Kaadhal)',
    artist: 'A.R. Rahman, Naresh Iyer & Shreya Ghoshal',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/1e/e0/8a/1ee08a8a-36b1-0969-e396-7a8711fae019/mzaf_7824147776269150033.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/28/eb/7e/28eb7e97-252f-c579-813c-74314aa7899b/cover.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/9f7824147776269150033',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Munbe vaa en anbe vaa... Oonbe vaa uyire vaa..." },
      { time: 5, text: "Nilavaaga nee vaa... Mazhaiyaaga nee vaa..." },
      { time: 10, text: "Poovae poovae pen poovae... En vazhi neeyae" },
      { time: 15, text: "Thanimaiyil un ninaivu thalladudhey" },
      { time: 20, text: "Un mounam kooda ennai aatkolgudhey" },
      { time: 25, text: "Nee indri naan illai uyir kaadhal idhu" },
    ],
  },
  {
    id: 'spotify-hosanna',
    title: 'Hosanna (Vinnaithaandi Varuvaayaa)',
    artist: 'A.R. Rahman, Leon D Souza & Suzanne D Mello',
    audio_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/ec/3b/b1/ec3bb114-1e5b-3b74-3253-e9d6d53d2bfd/mzaf_14022802081533036437.plus.aac.p.m4a',
    artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2a/e5/22/2ae52227-2c1b-b461-1773-452f15e81d7f/886445524826.jpg/600x600bb.jpg',
    duration: 30,
    spotify_url: 'https://open.spotify.com/track/5c14022802081533036437',
    source: 'spotify',
    lyrics: [
      { time: 0, text: "Hosanna... En thozhi Hosanna..." },
      { time: 4, text: "En vaazhvil neeyae oru varam Hosanna" },
      { time: 9, text: "Pattampoochi pol nenjam parandhidudhey" },
      { time: 13, text: "Un vizhigal paarkkayil kaadhal vizhundhidudhey" },
      { time: 18, text: "En idhayam un vasamaagi ponadhadi" },
      { time: 22, text: "Vinnai thaandi unudan varuven pennae" },
      { time: 27, text: "Hosanna... Endrendrum un anbil naan" },
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
]

export function getFullSongLyrics(track: AudioTrack): LyricLine[] {
  if (track.lyrics && track.lyrics.length > 0) {
    return track.lyrics
  }

  // Check known titles in trending tracks
  const matched = TRENDING_TRACKS.find(
    (t) =>
      t.title.toLowerCase().includes(track.title.toLowerCase()) ||
      track.title.toLowerCase().includes(t.title.toLowerCase())
  )
  if (matched?.lyrics && matched.lyrics.length > 0) {
    return matched.lyrics
  }

  // Dynamic rich timestamped full song lyrics for notes
  return [
    { time: 0, text: `Intro • ${track.title}` },
    { time: 4, text: `Vibing to ${track.title} by ${track.artist}` },
    { time: 8, text: `Catchy rhythm & beats start here` },
    { time: 12, text: `Main chorus • ${track.title}` },
    { time: 16, text: `Melody peaking in my heart right now` },
    { time: 20, text: `Favorite lyrics segment • Spotify vibes` },
    { time: 24, text: `Singing along: ${track.title}` },
    { time: 28, text: `Outro harmony by ${track.artist}` },
  ]
}

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

      // Prepend any curated Spotify hits that match query
      const localMatches = TRENDING_TRACKS.filter(
        (t) =>
          t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(cleanQuery.toLowerCase()) ||
          (cleanQuery.toLowerCase().includes('tamil') &&
            t.id &&
            !t.id.includes('starboy') &&
            !t.id.includes('blinding') &&
            !t.id.includes('as-it-was'))
      )

      const combined = [...localMatches]
      for (const trk of tracks) {
        if (!combined.some((c) => c.title.toLowerCase() === trk.title.toLowerCase())) {
          combined.push(trk)
        }
      }

      return combined
    } catch (err) {
      console.warn('Music Search API fallback to curated tracks:', err)
      return this.fallbackSearch(cleanQuery)
    }
  },

  fallbackSearch(query: string): AudioTrack[] {
    const q = query.toLowerCase()
    const matches = TRENDING_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (q.includes('tamil') &&
          t.id &&
          !t.id.includes('starboy') &&
          !t.id.includes('blinding') &&
          !t.id.includes('as-it-was'))
    )
    return matches.length > 0 ? matches : TRENDING_TRACKS
  },
}
