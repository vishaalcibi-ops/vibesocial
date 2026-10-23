import React, { useState, useEffect } from 'react'
import {
  Search,
  X,
  MapPin,
  AtSign,
  Music,
  BarChart2,
  Link2,
  Hash,
  Clock,
  Scissors,
  Bell,
  Utensils,
  HelpCircle,
  Layers,
  Image as ImageIcon,
  Compass,
  Sparkles,
  Upload,
} from 'lucide-react'
import { profileService } from '../../services/profileService'
import type { Profile } from '../../types/database.types'

export interface StickerPayload {
  type: string
  data: any
}

interface InstagramStickerSheetProps {
  isOpen: boolean
  onClose: () => void
  onSelectSticker: (sticker: StickerPayload) => void
  onOpenMusicPicker: () => void
}

const YOUR_STICKERS = [
  { id: 'neon_love', text: 'Love you ❤️', color: '#f43f5e' },
  { id: 'neon_vibes', text: 'Good Vibes ✨', color: '#a855f7' },
  { id: 'neon_mood', text: 'Current Mood 🔥', color: '#f59e0b' },
  { id: 'neon_weekend', text: 'Weekend Mood 🎉', color: '#10b981' },
]

const QUICK_EMOJIS = ['😍', '🔥', '😂', '❤️', '👏', '🥳', '💯', '✨']

const POPULAR_LOCATIONS = [
  'Marina Beach, Chennai',
  'Besant Nagar Beach',
  'T. Nagar, Chennai',
  'ECR, Chennai',
  'Coimbatore, India',
  'Bengaluru, India',
  'Goa, India',
  'Madurai, India',
]

export const TRENDING_ANIMATED_GIFS = [
  { id: 'cat_vibe', label: '🐱 Cat Vibe', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
  { id: 'party_popper', label: '🎉 Celebration', url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif' },
  { id: 'fire_dance', label: '🔥 Lit Fire', url: 'https://media.giphy.com/media/l41JGlWa1xYFUasOI/giphy.gif' },
  { id: 'hype_dance', label: '🕺 Hype Dance', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
  { id: 'heart_love', label: '💖 Love Blast', url: 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif' },
  { id: 'popcorn', label: '🍿 Cinema Vibe', url: 'https://media.giphy.com/media/t3cL1iXeWHBxS/giphy.gif' },
  { id: 'sparkles_neon', label: '✨ Sparkles', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif' },
  { id: 'laugh_tears', label: '😂 Laughing Out Loud', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif' },
  { id: 'good_vibes', label: '🌈 Good Vibes', url: 'https://media.giphy.com/media/3og0IPxMM0W22283fy/giphy.gif' },
  { id: 'dj_sound', label: '🎧 DJ Music Beats', url: 'https://media.giphy.com/media/l4Ep3mmmj7Bw3adWw/giphy.gif' },
  { id: 'cute_puppy', label: '🐶 Cheerful Pup', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
  { id: 'cool_boss', label: '🕶️ Cool Boss', url: 'https://media.giphy.com/media/xUPGczof2laMlAJaWk/giphy.gif' },
]

export const ANDROID_3D_ANIMATED_EMOJIS = [
  { id: '3d_fire', label: '🔥 3D Flame', emoji: '🔥', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif' },
  { id: '3d_hearteyes', label: '😍 3D Heart Eyes', emoji: '😍', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif' },
  { id: '3d_party', label: '🥳 3D Party Horn', emoji: '🥳', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif' },
  { id: '3d_rocket', label: '🚀 3D Rocket', emoji: '🚀', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif' },
  { id: '3d_100', label: '💯 3D Hundred', emoji: '💯', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif' },
  { id: '3d_sparkle_heart', label: '💖 3D Sparkling Heart', emoji: '💖', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.gif' },
  { id: '3d_crown', label: '👑 3D Royal Crown', emoji: '👑', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.gif' },
  { id: '3d_star_struck', label: '🤩 3D Star Struck', emoji: '🤩', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif' },
  { id: '3d_rofl', label: '🤣 3D ROFL', emoji: '🤣', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.gif' },
  { id: '3d_sunglasses', label: '😎 3D Cool Guy', emoji: '😎', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif' },
  { id: '3d_zap', label: '⚡ 3D High Voltage', emoji: '⚡', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.gif' },
  { id: '3d_folded_hands', label: '🙏 3D Namaste', emoji: '🙏', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif' },
]

export const InstagramStickerSheet: React.FC<InstagramStickerSheetProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  onOpenMusicPicker,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeConfigType, setActiveConfigType] = useState<string | null>(null)

  // Location search states
  const [locationInput, setLocationInput] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ name: string; full: string; lat?: string; lon?: string }>>([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)
  const [detectingGps, setDetectingGps] = useState(false)
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat?: number; lon?: number } | null>(null)
  const [locationStyle, setLocationStyle] = useState<'pill' | 'badge' | 'map'>('pill')

  // Mention states
  const [mentionInput, setMentionInput] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([])
  const [selectedMentionProfile, setSelectedMentionProfile] = useState<Profile | null>(null)

  // Link states
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')

  // Poll states
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOpt1, setPollOpt1] = useState('YES')
  const [pollOpt2, setPollOpt2] = useState('NO')

  // Slider states
  const [sliderPrompt, setSliderPrompt] = useState('Rate this ✨')
  const [sliderEmoji, setSliderEmoji] = useState('😍')

  // Questions states
  const [questionPrompt, setQuestionPrompt] = useState('Ask me a question...')

  // Add Yours states
  const [addYoursPrompt, setAddYoursPrompt] = useState('Drop your favorite photo 📸')
  const [addYoursMediaType, setAddYoursMediaType] = useState<'photo' | 'music' | 'none'>('photo')
  const [addYoursCustomImage, setAddYoursCustomImage] = useState<string | null>(null)
  const [addYoursMusicTitle, setAddYoursMusicTitle] = useState('Naa Ready • Anirudh')

  // Hashtag states
  const [hashtagInput, setHashtagInput] = useState('')

  // Countdown states
  const [countdownTitle, setCountdownTitle] = useState('Weekend Celebration 🎉')
  const [countdownDate, setCountdownDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)) // upcoming Saturday
    return d.toISOString().split('T')[0]
  })
  const [countdownTime, setCountdownTime] = useState('20:00')

  // GIFs & 3D Emojis states
  const [gifTab, setGifTab] = useState<'gifs' | '3d_emojis'>('gifs')
  const [gifSearch, setGifSearch] = useState('')

  // Frames Sticker states
  const [frameInnerImage, setFrameInnerImage] = useState<string | null>(null)
  const [frameStyle, setFrameStyle] = useState<'polaroid' | 'film' | 'retro' | 'neon'>('polaroid')
  const [frameLabel, setFrameLabel] = useState('VIBE POLAROID')

  // Cutouts states
  const [cutoutImage, setCutoutImage] = useState<string | null>(null)
  const [cutoutShape, setCutoutShape] = useState<'sticker' | 'circle' | 'heart' | 'star'>('sticker')

  // Notify & Food Orders
  const [notifyTitle, setNotifyTitle] = useState('New Drop Alert 🔔')
  const [foodOrdersName, setFoodOrdersName] = useState('Order on Swiggy / Zomato 🍕')
  const [foodOrdersUrl, setFoodOrdersUrl] = useState('https://swiggy.com')

  // Real-time exact Nominatim location search
  useEffect(() => {
    if (!locationInput.trim() || locationInput.startsWith('📍')) {
      setLocationSuggestions([])
      return
    }
    const clean = locationInput.trim()
    const timer = setTimeout(async () => {
      setLocationSearchLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&addressdetails=1&limit=6`
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          const suggestions = data.map((item: any) => {
            const parts = (item.display_name || '').split(',')
            const shortName = parts.slice(0, 2).join(',').trim()
            return {
              name: shortName || clean,
              full: item.display_name,
              lat: item.lat,
              lon: item.lon,
            }
          })
          setLocationSuggestions(suggestions)
        }
      } catch {
        setLocationSuggestions([])
      } finally {
        setLocationSearchLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [locationInput])

  // Real-time mention search
  useEffect(() => {
    const clean = mentionInput.trim().replace(/^@/, '')
    if (clean.length >= 1) {
      let active = true
      profileService.searchProfiles(clean, 6).then((res) => {
        if (active) setMentionSuggestions(res)
      }).catch(() => {})
      return () => { active = false }
    } else {
      setMentionSuggestions([])
    }
  }, [mentionInput])

  if (!isOpen) return null

  const handleStickerClick = (type: string) => {
    switch (type) {
      case 'music':
        onClose()
        onOpenMusicPicker()
        break
      case 'location':
        setActiveConfigType('location')
        break
      case 'mention':
        setActiveConfigType('mention')
        break
      case 'link':
        setActiveConfigType('link')
        break
      case 'poll':
        setActiveConfigType('poll')
        break
      case 'slider':
        setActiveConfigType('slider')
        break
      case 'questions':
        setActiveConfigType('questions')
        break
      case 'add_yours':
        setActiveConfigType('add_yours')
        break
      case 'hashtag':
        setActiveConfigType('hashtag')
        break
      case 'countdown':
        setActiveConfigType('countdown')
        break
      case 'frames':
        setActiveConfigType('frames')
        break
      case 'cutouts':
        setActiveConfigType('cutouts')
        break
      case 'highlight':
        onSelectSticker({
          type: 'highlight',
          data: { label: 'HIGHLIGHT', color: '#ec4899' },
        })
        onClose()
        break
      case 'notify':
        setActiveConfigType('notify')
        break
      case 'avatar':
        setActiveConfigType('avatar')
        break
      case 'food_orders':
        setActiveConfigType('food_orders')
        break
      case 'gif':
        setActiveConfigType('gif')
        break
      default:
        break
    }
  }

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConfigType) return

    switch (activeConfigType) {
      case 'location': {
        const placeName = locationInput.trim().replace(/^📍\s*/, '') || 'Marina Beach, Chennai'
        onSelectSticker({
          type: 'location',
          data: {
            name: `📍 ${placeName}`,
            rawName: placeName,
            style: locationStyle,
            lat: selectedLocationCoords?.lat,
            lon: selectedLocationCoords?.lon,
          },
        })
        break
      }
      case 'mention':
        onSelectSticker({
          type: 'mention',
          data: {
            username: selectedMentionProfile?.username || mentionInput.trim().replace(/^@/, '') || 'friend',
            userId: selectedMentionProfile?.id,
            avatarUrl: selectedMentionProfile?.avatar_url,
          },
        })
        break
      case 'link':
        onSelectSticker({
          type: 'link',
          data: {
            url: linkUrl.trim() || 'https://vibesocial.app',
            title: linkTitle.trim() || linkUrl.trim() || '🔗 vibesocial.app',
          },
        })
        break
      case 'poll':
        onSelectSticker({
          type: 'poll',
          data: {
            question: pollQuestion.trim() || 'Coffee or Tea? ☕🍵',
            option1: pollOpt1.trim() || 'YES',
            option2: pollOpt2.trim() || 'NO',
            votes1: 0,
            votes2: 0,
          },
        })
        break
      case 'slider':
        onSelectSticker({
          type: 'slider',
          data: {
            question: sliderPrompt.trim() || 'How much do you love this? ✨',
            emoji: sliderEmoji || '😍',
            value: 60,
          },
        })
        break
      case 'questions':
        onSelectSticker({
          type: 'questions',
          data: {
            prompt: questionPrompt.trim() || 'Ask me a question...',
          },
        })
        break
      case 'add_yours':
        onSelectSticker({
          type: 'add_yours',
          data: {
            prompt: addYoursPrompt.trim() || 'Drop your favorite photo 📸',
            mediaType: addYoursMediaType,
            customImage: addYoursCustomImage,
            musicTitle: addYoursMusicTitle,
          },
        })
        break
      case 'frames':
        onSelectSticker({
          type: 'frames',
          data: {
            innerImage: frameInnerImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
            frameStyle,
            label: frameLabel.trim() || 'VIBE POLAROID',
            date: new Date().toLocaleDateString(),
          },
        })
        break
      case 'cutouts':
        onSelectSticker({
          type: 'cutouts',
          data: {
            imageUrl: cutoutImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
            shape: cutoutShape,
            label: 'CUTOUT STAMP',
          },
        })
        break
      case 'hashtag':
        onSelectSticker({
          type: 'hashtag',
          data: {
            tag: hashtagInput.trim().replace(/^#/, '') || 'vibes',
          },
        })
        break
      case 'countdown': {
        const targetIso = new Date(`${countdownDate}T${countdownTime}:00`).toISOString()
        onSelectSticker({
          type: 'countdown',
          data: {
            title: countdownTitle.trim() || 'Weekend Celebration 🎉',
            targetDate: targetIso,
            targetTimestamp: new Date(targetIso).getTime(),
          },
        })
        break
      }
      case 'notify':
        onSelectSticker({
          type: 'notify',
          data: {
            title: notifyTitle.trim() || 'Live Drop Alert 🔔',
            subscribers: 0,
          },
        })
        break
      case 'food_orders':
        onSelectSticker({
          type: 'food_orders',
          data: {
            restaurantName: foodOrdersName.trim() || 'Order on Swiggy / Zomato 🍕',
            orderUrl: foodOrdersUrl.trim() || 'https://swiggy.com',
          },
        })
        break
    }

    setActiveConfigType(null)
    onClose()
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationInput('📍 Marina Beach, Chennai')
      return
    }
    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          )
          const data = await res.json()
          const address = data.address || {}
          const poi = address.amenity || address.tourism || address.building || address.road || ''
          const neighborhood = address.suburb || address.neighbourhood || address.residential || ''
          const city = address.city || address.town || address.village || address.county || 'Chennai'
          const nameParts = [poi, neighborhood, city].filter(Boolean)
          const shortName = nameParts.slice(0, 2).join(', ') || city
          setLocationInput(`📍 ${shortName}`)
          setSelectedLocationCoords({ lat: latitude, lon: longitude })
        } catch {
          setLocationInput('📍 Marina Beach, Chennai')
        } finally {
          setDetectingGps(false)
        }
      },
      () => {
        setLocationInput('📍 Marina Beach, Chennai')
        setDetectingGps(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handlePhotoSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onSelectSticker({
        type: 'photo',
        data: { url: reader.result as string, mask: 'rounded' },
      })
      onClose()
    }
    reader.readAsDataURL(file)
  }

  const handleFrameImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFrameInnerImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCutoutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCutoutImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAddYoursImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setAddYoursCustomImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Filter stickers by search query
  const matchesSearch = (name: string) => {
    if (!searchQuery.trim()) return true
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  }

  // Filtered GIFs
  const filteredGifs = TRENDING_ANIMATED_GIFS.filter((g) =>
    gifSearch.trim() ? g.label.toLowerCase().includes(gifSearch.toLowerCase()) : true
  )

  const filtered3dEmojis = ANDROID_3D_ANIMATED_EMOJIS.filter((e) =>
    gifSearch.trim() ? e.label.toLowerCase().includes(gifSearch.toLowerCase()) : true
  )

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 130,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        className="sticker-sheet-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '82vh',
          backgroundColor: '#1c1c1e',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 16px 32px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.7)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Pull Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
          <div
            style={{
              width: '38px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
            }}
          />
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8e8e93',
            }}
          />
          <input
            type="text"
            placeholder="Search stickers, locations, gifs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#2c2c2e',
              borderRadius: '12px',
              border: 'none',
              color: '#ffffff',
              padding: '10px 12px 10px 38px',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Instagram Authentic Sticker Pills Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          {/* LOCATION */}
          {matchesSearch('location') && (
            <button
              type="button"
              onClick={() => handleStickerClick('location')}
              className="ig-sticker-pill"
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <MapPin size={17} color="#8b5cf6" strokeWidth={2.5} />
              <span>LOCATION</span>
            </button>
          )}

          {/* MENTION */}
          {matchesSearch('mention') && (
            <button
              type="button"
              onClick={() => handleStickerClick('mention')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <AtSign size={17} color="#f97316" strokeWidth={2.5} />
              <span>MENTION</span>
            </button>
          )}

          {/* MUSIC */}
          {matchesSearch('music') && (
            <button
              type="button"
              onClick={() => handleStickerClick('music')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Music size={17} color="#ec4899" strokeWidth={2.5} />
              <span>MUSIC</span>
            </button>
          )}

          {/* GIF & 3D EMOJI */}
          {matchesSearch('gif') && (
            <button
              type="button"
              onClick={() => handleStickerClick('gif')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Sparkles size={17} color="#10b981" strokeWidth={2.5} />
              <span>GIF / 3D</span>
            </button>
          )}

          {/* ADD YOURS */}
          {matchesSearch('add yours') && (
            <button
              type="button"
              onClick={() => handleStickerClick('add_yours')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '12px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Layers size={17} color="#ec4899" strokeWidth={2.5} />
              <span>ADD YOURS</span>
            </button>
          )}

          {/* FRAMES */}
          {matchesSearch('frames') && (
            <button
              type="button"
              onClick={() => handleStickerClick('frames')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <span style={{ fontSize: '15px' }}>🖼️</span>
              <span>FRAMES</span>
            </button>
          )}

          {/* PHOTO (PIP) */}
          {matchesSearch('photo') && (
            <label
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <ImageIcon size={17} color="#10b981" strokeWidth={2.5} />
              <span>PHOTO</span>
              <input type="file" accept="image/*" onChange={handlePhotoSticker} style={{ display: 'none' }} />
            </label>
          )}

          {/* CUTOUTS */}
          {matchesSearch('cutouts') && (
            <button
              type="button"
              onClick={() => handleStickerClick('cutouts')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Scissors size={17} color="#10b981" strokeWidth={2.5} />
              <span>CUTOUTS</span>
            </button>
          )}

          {/* QUESTIONS */}
          {matchesSearch('questions') && (
            <button
              type="button"
              onClick={() => handleStickerClick('questions')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '12px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <HelpCircle size={17} color="#ec4899" strokeWidth={2.5} />
              <span>QUESTIONS</span>
            </button>
          )}

          {/* NOTIFY */}
          {matchesSearch('notify') && (
            <button
              type="button"
              onClick={() => handleStickerClick('notify')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Bell size={17} color="#3b82f6" strokeWidth={2.5} />
              <span>NOTIFY</span>
            </button>
          )}

          {/* AVATAR */}
          {matchesSearch('avatar') && (
            <button
              type="button"
              onClick={() => handleStickerClick('avatar')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <span style={{ fontSize: '16px' }}>🧑‍🦱</span>
              <span>AVATAR</span>
            </button>
          )}

          {/* POLL */}
          {matchesSearch('poll') && (
            <button
              type="button"
              onClick={() => handleStickerClick('poll')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <BarChart2 size={17} color="#8b5cf6" strokeWidth={2.5} />
              <span>POLL</span>
            </button>
          )}

          {/* EMOJI SLIDER */}
          {matchesSearch('slider') && (
            <button
              type="button"
              onClick={() => handleStickerClick('slider')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <span style={{ fontSize: '15px' }}>😍</span>
              <span style={{ letterSpacing: '-1px' }}>────</span>
            </button>
          )}

          {/* LINK */}
          {matchesSearch('link') && (
            <button
              type="button"
              onClick={() => handleStickerClick('link')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Link2 size={17} color="#2563eb" strokeWidth={2.5} />
              <span>LINK</span>
            </button>
          )}

          {/* HASHTAG */}
          {matchesSearch('hashtag') && (
            <button
              type="button"
              onClick={() => handleStickerClick('hashtag')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '13px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Hash size={17} color="#ec4899" strokeWidth={2.5} />
              <span>HASHTAG</span>
            </button>
          )}

          {/* COUNTDOWN */}
          {matchesSearch('countdown') && (
            <button
              type="button"
              onClick={() => handleStickerClick('countdown')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '12px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Clock size={17} color="#a855f7" strokeWidth={2.5} />
              <span>COUNTDOWN</span>
            </button>
          )}

          {/* FOOD ORDERS */}
          {matchesSearch('food') && (
            <button
              type="button"
              onClick={() => handleStickerClick('food_orders')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '12px',
                color: '#1c1c1e',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Utensils size={17} color="#ef4444" strokeWidth={2.5} />
              <span>FOOD ORDERS</span>
            </button>
          )}
        </div>

        {/* Quick Reactions Emojis Row */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#8e8e93', margin: '0 0 10px 4px' }}>
            Quick Reaction
          </p>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  onSelectSticker({ type: 'emoji', data: { emoji: em } })
                  onClose()
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.15s ease',
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Your Stickers Section */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#8e8e93', margin: '0 0 10px 4px' }}>
            Your stickers
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {YOUR_STICKERS.map((stk) => (
              <button
                key={stk.id}
                type="button"
                onClick={() => {
                  onSelectSticker({
                    type: 'custom',
                    data: { text: stk.text, color: stk.color },
                  })
                  onClose()
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '8px 16px',
                  color: stk.color,
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: '"Brush Script MT", cursive, sans-serif',
                  cursor: 'pointer',
                  textShadow: `0 0 10px ${stk.color}`,
                }}
              >
                {stk.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Sticker Configuration Dialog */}
      {activeConfigType && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveConfigType(null)}
          style={{ zIndex: 140, backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              width: '92%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#1c1c1e',
              borderRadius: '20px',
              color: 'white',
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
            }}
          >
            <form onSubmit={handleConfigSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>
                  {activeConfigType === 'location' && '📍 Exact Location & Map Pin'}
                  {activeConfigType === 'mention' && '🌀 Mention User Sticker'}
                  {activeConfigType === 'link' && '🔗 Add Link Sticker'}
                  {activeConfigType === 'poll' && '📊 Create Poll'}
                  {activeConfigType === 'slider' && '😍 Emoji Slider'}
                  {activeConfigType === 'questions' && '💬 Ask Me a Question'}
                  {activeConfigType === 'add_yours' && '🗂️ Add Yours Collaborative Prompt'}
                  {activeConfigType === 'frames' && '🖼️ Polaroid & Photo Frame Studio'}
                  {activeConfigType === 'cutouts' && '✂️ Photo Cutouts & Stickers'}
                  {activeConfigType === 'hashtag' && '#️⃣ Add Hashtag'}
                  {activeConfigType === 'countdown' && '⏱️ Countdown Sticker'}
                  {activeConfigType === 'notify' && '🔔 Reminder Notification Sticker'}
                  {activeConfigType === 'avatar' && '🧑‍🦱 3D Avatar Expressions'}
                  {activeConfigType === 'food_orders' && '🍕 Food Order Button'}
                  {activeConfigType === 'gif' && '🌟 Animated GIFs & 3D Emojis'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveConfigType(null)}
                  style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* LOCATION STICKER (Exact search + GPS + styles) */}
              {activeConfigType === 'location' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Type exact street, landmark, beach, or city..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#2c2c2e',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: '14px',
                      }}
                    />
                    {locationSearchLoading && (
                      <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '12px', color: '#8e8e93' }}>
                        Searching...
                      </span>
                    )}
                  </div>

                  {/* Real Search Suggestions Dropdown */}
                  {locationSuggestions.length > 0 && (
                    <div
                      style={{
                        background: '#2c2c2e',
                        borderRadius: '12px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {locationSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setLocationInput(`📍 ${item.name}`)
                            setSelectedLocationCoords({ lat: Number(item.lat), lon: Number(item.lon) })
                            setLocationSuggestions([])
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <MapPin size={14} color="#8b5cf6" />
                          <div style={{ overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'white' }}>{item.name}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#8e8e93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.full}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GPS Detection Button */}
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingGps}
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.5)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#c4b5fd',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: detectingGps ? 'wait' : 'pointer',
                    }}
                  >
                    <Compass size={16} />
                    <span>{detectingGps ? 'Pinpointing exact street GPS...' : '📍 Use High-Accuracy GPS'}</span>
                  </button>

                  {/* Location Style Selector */}
                  <div>
                    <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Sticker Style
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {(['pill', 'badge', 'map'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setLocationStyle(s)}
                          style={{
                            background: locationStyle === s ? 'rgba(236, 72, 153, 0.3)' : '#2c2c2e',
                            border: locationStyle === s ? '1.5px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '6px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {s === 'pill' ? '📍 Gradient Pill' : s === 'badge' ? '🏷️ Street Badge' : '🗺️ Mini Map'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Popular Location Chips */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Quick Popular Spots
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {POPULAR_LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocationInput(`📍 ${loc}`)}
                          style={{
                            background: locationInput.includes(loc) ? '#ec4899' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FRAMES STICKER STUDIO (Upload or pick image inside the frame) */}
              {activeConfigType === 'frames' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      1. Photo to Put Inside Frame
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(236, 72, 153, 0.15)',
                        border: '1.5px dashed #ec4899',
                        borderRadius: '14px',
                        padding: '16px',
                        cursor: 'pointer',
                        color: '#f472b6',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      <Upload size={18} />
                      <span>{frameInnerImage ? 'Change Frame Photo' : 'Upload Photo for Frame'}</span>
                      <input type="file" accept="image/*" onChange={handleFrameImageUpload} style={{ display: 'none' }} />
                    </label>

                    {frameInnerImage && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={frameInnerImage}
                          alt="Inside frame preview"
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>✓ Custom photo selected</span>
                      </div>
                    )}
                  </div>

                  {/* Frame Style */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      2. Frame Style
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {(['polaroid', 'film', 'retro', 'neon'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setFrameStyle(style)}
                          style={{
                            background: frameStyle === style ? 'rgba(236, 72, 153, 0.3)' : '#2c2c2e',
                            border: frameStyle === style ? '1.5px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '8px 4px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Caption */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      3. Frame Caption
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIBE POLAROID, Summer 2026..."
                      value={frameLabel}
                      onChange={(e) => setFrameLabel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#2c2c2e',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CUTOUTS STICKER STUDIO */}
              {activeConfigType === 'cutouts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1.5px dashed #10b981',
                      borderRadius: '14px',
                      padding: '16px',
                      cursor: 'pointer',
                      color: '#34d399',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    <Scissors size={18} />
                    <span>{cutoutImage ? 'Change Cutout Photo' : 'Upload Photo to Create Cutout'}</span>
                    <input type="file" accept="image/*" onChange={handleCutoutUpload} style={{ display: 'none' }} />
                  </label>

                  {cutoutImage && (
                    <div>
                      <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                        Cutout Shape Style
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {(['sticker', 'circle', 'heart', 'star'] as const).map((shape) => (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => setCutoutShape(shape)}
                            style={{
                              background: cutoutShape === shape ? 'rgba(16, 185, 129, 0.3)' : '#2c2c2e',
                              border: cutoutShape === shape ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '10px',
                              padding: '8px 4px',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                            }}
                          >
                            {shape === 'sticker' ? '🏷️ Outline' : shape === 'circle' ? '⚪ Circle' : shape === 'heart' ? '💖 Heart' : '⭐ Star'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADD YOURS PROMPT */}
              {activeConfigType === 'add_yours' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Topic prompt (e.g. Drop your favorite photo 📸)"
                    value={addYoursPrompt}
                    onChange={(e) => setAddYoursPrompt(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#2c2c2e',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  />

                  {/* Preset Quick Prompts */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Popular Prompts
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        'Drop your favorite photo 📸',
                        'Share your favorite music 🎵',
                        'Drop your pet 🐾',
                        'Current Mood ✨',
                        'OOTD Outfit 👗',
                        'Sunset view 🌅',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setAddYoursPrompt(prompt)}
                          style={{
                            background: addYoursPrompt === prompt ? '#ec4899' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collaborative Media: Photo or Music */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Feature Your Favorite Image or Music
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                      {(['photo', 'music', 'none'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddYoursMediaType(type)}
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            border: addYoursMediaType === type ? '1.5px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                            background: addYoursMediaType === type ? 'rgba(236, 72, 153, 0.25)' : '#2c2c2e',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {type === 'photo' ? '📸 Photo' : type === 'music' ? '🎵 Music' : 'None'}
                        </button>
                      ))}
                    </div>

                    {addYoursMediaType === 'photo' && (
                      <div>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'rgba(236, 72, 153, 0.15)',
                            border: '1.5px dashed #ec4899',
                            borderRadius: '12px',
                            padding: '12px',
                            cursor: 'pointer',
                            color: '#f472b6',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          <Upload size={16} />
                          <span>{addYoursCustomImage ? 'Change Favorite Photo' : 'Upload Favorite Photo'}</span>
                          <input type="file" accept="image/*" onChange={handleAddYoursImageUpload} style={{ display: 'none' }} />
                        </label>
                        {addYoursCustomImage && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={addYoursCustomImage} alt="Fav preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>✓ Attached</span>
                          </div>
                        )}
                      </div>
                    )}

                    {addYoursMediaType === 'music' && (
                      <input
                        type="text"
                        placeholder="Song & Artist (e.g. Naa Ready • Anirudh)"
                        value={addYoursMusicTitle}
                        onChange={(e) => setAddYoursMusicTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: '#2c2c2e',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: 'white',
                          fontSize: '12px',
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* SLIDER STICKER */}
              {activeConfigType === 'slider' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Rate prompt (e.g. Rate this ✨)"
                    value={sliderPrompt}
                    onChange={(e) => setSliderPrompt(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#2c2c2e',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  />
                  <div>
                    <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Slider Emoji
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['😍', '🔥', '😂', '❤️', '👏', '🥳', '💯', '✨', '🎸', '🌟'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setSliderEmoji(em)}
                          style={{
                            background: sliderEmoji === em ? 'rgba(236,72,153,0.3)' : '#2c2c2e',
                            border: sliderEmoji === em ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '20px',
                            cursor: 'pointer',
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* QUESTIONS STICKER */}
              {activeConfigType === 'questions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Question prompt (e.g. Ask me a question...)"
                    value={questionPrompt}
                    onChange={(e) => setQuestionPrompt(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#2c2c2e',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  />
                </div>
              )}

              {/* HASHTAG STICKER */}
              {activeConfigType === 'hashtag' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Hashtag (e.g. #vibes, #chennai)"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#2c2c2e',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  />
                </div>
              )}

              {/* GIF & 3D ANIMATED EMOJIS */}
              {activeConfigType === 'gif' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setGifTab('gifs')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        background: gifTab === 'gifs' ? '#ec4899' : '#2c2c2e',
                        color: 'white',
                      }}
                    >
                      🌟 Trending Animated GIFs ({TRENDING_ANIMATED_GIFS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGifTab('3d_emojis')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        background: gifTab === '3d_emojis' ? '#8b5cf6' : '#2c2c2e',
                        color: 'white',
                      }}
                    >
                      🤖 Android 3D Emojis ({ANDROID_3D_ANIMATED_EMOJIS.length})
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search animated stickers..."
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: '#2c2c2e',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white',
                      fontSize: '13px',
                    }}
                  />

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                    }}
                  >
                    {gifTab === 'gifs'
                      ? filteredGifs.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => {
                              onSelectSticker({
                                type: 'gif',
                                data: { url: g.url, label: g.label },
                              })
                              setActiveConfigType(null)
                              onClose()
                            }}
                            style={{
                              background: '#2c2c2e',
                              borderRadius: '10px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            <img
                              src={g.url}
                              alt={g.label}
                              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                            />
                            <span style={{ fontSize: '10px', color: '#e5e7eb', textAlign: 'center' }}>
                              {g.label}
                            </span>
                          </div>
                        ))
                      : filtered3dEmojis.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              onSelectSticker({
                                type: 'gif',
                                data: { url: e.url, label: e.label, is3dEmoji: true },
                              })
                              setActiveConfigType(null)
                              onClose()
                            }}
                            style={{
                              background: '#2c2c2e',
                              borderRadius: '10px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            <img
                              src={e.url}
                              alt={e.label}
                              style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                            />
                            <span style={{ fontSize: '10px', color: '#e5e7eb', textAlign: 'center' }}>
                              {e.label}
                            </span>
                          </div>
                        ))}
                  </div>
                </div>
              )}

              {/* MENTION */}
              {activeConfigType === 'mention' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type username..."
                    value={mentionInput}
                    onChange={(e) => {
                      setMentionInput(e.target.value)
                      setSelectedMentionProfile(null)
                    }}
                    autoFocus
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  {mentionSuggestions.length > 0 && (
                    <div style={{ background: '#2c2c2e', borderRadius: '12px', maxHeight: '160px', overflowY: 'auto' }}>
                      {mentionSuggestions.map((prof) => (
                        <div
                          key={prof.id}
                          onClick={() => {
                            setSelectedMentionProfile(prof)
                            setMentionInput(`@${prof.username}`)
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer' }}
                        >
                          <img src={prof.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>@{prof.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LINK */}
              {activeConfigType === 'link' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="url"
                    placeholder="URL (e.g. https://vibesocial.app)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  <input
                    type="text"
                    placeholder="Sticker text (e.g. Visit Website)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                </div>
              )}

              {/* POLL */}
              {activeConfigType === 'poll' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Option 1 (YES)"
                      value={pollOpt1}
                      onChange={(e) => setPollOpt1(e.target.value)}
                      style={{ padding: '8px', borderRadius: '8px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                    />
                    <input
                      type="text"
                      placeholder="Option 2 (NO)"
                      value={pollOpt2}
                      onChange={(e) => setPollOpt2(e.target.value)}
                      style={{ padding: '8px', borderRadius: '8px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                    />
                  </div>
                </div>
              )}

              {/* NOTIFY */}
              {activeConfigType === 'notify' && (
                <input
                  type="text"
                  placeholder="Event or Reminder title (e.g. Live Concert 🔔)"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                />
              )}

              {/* FOOD ORDERS */}
              {activeConfigType === 'food_orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Button Text (e.g. Order on Swiggy / Zomato 🍕)"
                    value={foodOrdersName}
                    onChange={(e) => setFoodOrdersName(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  <input
                    type="url"
                    placeholder="Order URL (https://...)"
                    value={foodOrdersUrl}
                    onChange={(e) => setFoodOrdersUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                </div>
              )}

              {/* COUNTDOWN */}
              {activeConfigType === 'countdown' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Event Name (e.g. Weekend Celebration 🎉)"
                    value={countdownTitle}
                    onChange={(e) => setCountdownTitle(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                    <input
                      type="date"
                      value={countdownDate}
                      onChange={(e) => setCountdownDate(e.target.value)}
                      style={{ width: '100%', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '8px' }}
                    />
                    <input
                      type="time"
                      value={countdownTime}
                      onChange={(e) => setCountdownTime(e.target.value)}
                      style={{ width: '100%', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '8px' }}
                    />
                  </div>
                </div>
              )}

              {/* AVATAR */}
              {activeConfigType === 'avatar' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { emoji: '👋', label: 'Wave' },
                    { emoji: '😎', label: 'Cool' },
                    { emoji: '🥳', label: 'Celebrate' },
                    { emoji: '🤩', label: 'Star' },
                    { emoji: '💃', label: 'Dance' },
                    { emoji: '🔥', label: 'Fire' },
                    { emoji: '💖', label: 'Love' },
                    { emoji: '🚀', label: 'Rocket' },
                  ].map((av, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onSelectSticker({
                          type: 'emoji',
                          data: { emoji: av.emoji },
                        })
                        setActiveConfigType(null)
                        onClose()
                      }}
                      style={{
                        padding: '12px 6px',
                        background: '#2c2c2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '26px' }}>{av.emoji}</span>
                      <span style={{ fontSize: '11px', color: '#8e8e93' }}>{av.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Submit Button for Modal */}
              {activeConfigType !== 'gif' && activeConfigType !== 'avatar' && (
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Add to Story
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
