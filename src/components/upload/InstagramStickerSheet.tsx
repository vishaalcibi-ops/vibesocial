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

const TRENDING_GIFS = [
  { id: 'fire', label: '🔥 Fire', emoji: '🔥' },
  { id: 'heart_sparkle', label: '💖 Love', emoji: '💖' },
  { id: 'party', label: '🎉 Party', emoji: '🎉' },
  { id: 'dance', label: '💃 Vibe', emoji: '💃' },
  { id: 'star_burst', label: '✨ Sparkle', emoji: '✨' },
  { id: 'crown', label: '👑 King/Queen', emoji: '👑' },
]

export const InstagramStickerSheet: React.FC<InstagramStickerSheetProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  onOpenMusicPicker,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeConfigType, setActiveConfigType] = useState<string | null>(null)

  // Config Modal States
  const [locationInput, setLocationInput] = useState('')
  const [detectingGps, setDetectingGps] = useState(false)
  const [mentionInput, setMentionInput] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([])
  const [selectedMentionProfile, setSelectedMentionProfile] = useState<Profile | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOpt1, setPollOpt1] = useState('YES')
  const [pollOpt2, setPollOpt2] = useState('NO')
  const [sliderPrompt, setSliderPrompt] = useState('Rate this ✨')
  const [sliderEmoji, setSliderEmoji] = useState('😍')
  const [questionPrompt, setQuestionPrompt] = useState('Ask me a question...')
  const [addYoursPrompt, setAddYoursPrompt] = useState('Drop your favorite photo 📸')
  const [hashtagInput, setHashtagInput] = useState('')
  const [countdownTitle, setCountdownTitle] = useState('Weekend Celebration 🎉')
  const [countdownDate, setCountdownDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)) // upcoming Saturday
    return d.toISOString().split('T')[0]
  })
  const [countdownTime, setCountdownTime] = useState('20:00')

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
        onSelectSticker({
          type: 'frames',
          data: { label: 'VIBE POLAROID', date: new Date().toLocaleDateString() },
        })
        onClose()
        break
      case 'highlight':
        onSelectSticker({
          type: 'highlight',
          data: { label: 'HIGHLIGHT', color: '#ec4899' },
        })
        onClose()
        break
      case 'cutouts':
        onSelectSticker({
          type: 'cutouts',
          data: { label: 'CUTOUT STAMP' },
        })
        onClose()
        break
      case 'notify':
        onSelectSticker({
          type: 'notify',
          data: { label: 'NOTIFY ME 🔔' },
        })
        onClose()
        break
      case 'avatar':
        onSelectSticker({
          type: 'emoji',
          data: { emoji: '😎' },
        })
        onClose()
        break
      case 'food_orders':
        onSelectSticker({
          type: 'food_orders',
          data: { label: 'ORDER FOOD 🍕' },
        })
        onClose()
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
      case 'location':
        onSelectSticker({
          type: 'location',
          data: { name: locationInput.trim() || '📍 Marina Beach, Chennai' },
        })
        break
      case 'mention':
        onSelectSticker({
          type: 'mention',
          data: {
            username: (selectedMentionProfile?.username || mentionInput.trim().replace(/^@/, '') || 'friend'),
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
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.county || 'Chennai'
          const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.road
          const locName = suburb ? `${suburb}, ${city}` : city
          setLocationInput(`📍 ${locName}`)
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
      { timeout: 8000 }
    )
  }

  const handlePhotoSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onSelectSticker({
        type: 'photo',
        data: { url: reader.result as string },
      })
      onClose()
    }
    reader.readAsDataURL(file)
  }

  // Filter stickers by search query
  const matchesSearch = (name: string) => {
    if (!searchQuery.trim()) return true
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  }

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
            placeholder="Search"
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

        {/* Carousel Dots indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white' }} />
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </div>

        {/* Instagram Authentic Sticker Pills Grid (Screenshot 1) */}
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

          {/* GIF */}
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
              <Search size={17} color="#10b981" strokeWidth={2.5} />
              <span>GIF</span>
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

          {/* PHOTO */}
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

          {/* HIGHLIGHT */}
          {matchesSearch('highlight') && (
            <button
              type="button"
              onClick={() => handleStickerClick('highlight')}
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
              <span style={{ fontSize: '15px' }}>💖</span>
              <span>HIGHLIGHT</span>
            </button>
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

        {/* Your Stickers Section (Screenshot 1: "Your stickers") */}
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
              maxWidth: '380px',
              padding: '20px',
              backgroundColor: '#1c1c1e',
              borderRadius: '20px',
              color: 'white',
            }}
          >
            <form onSubmit={handleConfigSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>
                  {activeConfigType === 'location' && '📍 Add Location Sticker'}
                  {activeConfigType === 'mention' && '🌀 Mention User Sticker'}
                  {activeConfigType === 'link' && '🔗 Add Link Sticker'}
                  {activeConfigType === 'poll' && '📊 Create Poll'}
                  {activeConfigType === 'slider' && '😍 Emoji Slider'}
                  {activeConfigType === 'questions' && '💬 Ask Me a Question'}
                  {activeConfigType === 'add_yours' && '🗂️ Add Yours Prompt'}
                  {activeConfigType === 'hashtag' && '#️⃣ Add Hashtag'}
                  {activeConfigType === 'countdown' && '⏱️ Countdown Sticker'}
                  {activeConfigType === 'gif' && '🔍 Trending Animated Stickers'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveConfigType(null)}
                  style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {activeConfigType === 'location' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search or enter location..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    autoFocus
                    style={{ width: '100%' }}
                  />

                  {/* GPS Detection Button */}
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingGps}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      color: '#60a5fa',
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
                    <span>{detectingGps ? 'Pinpointing GPS location...' : '📍 Use My Current Location'}</span>
                  </button>

                  {/* Popular Location Chips */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Popular Locations
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {POPULAR_LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocationInput(loc)}
                          style={{
                            background: locationInput === loc ? '#ec4899' : 'rgba(255,255,255,0.1)',
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

              {activeConfigType === 'mention' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type starting letters (e.g. vi...)"
                    value={mentionInput}
                    onChange={(e) => {
                      setMentionInput(e.target.value)
                      setSelectedMentionProfile(null)
                    }}
                    autoFocus
                    style={{ width: '100%' }}
                  />

                  {/* Mention Autocomplete List */}
                  {mentionSuggestions.length > 0 && (
                    <div
                      style={{
                        background: '#2c2c2e',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {mentionSuggestions.map((prof) => (
                        <div
                          key={prof.id}
                          onClick={() => {
                            setSelectedMentionProfile(prof)
                            setMentionInput(`@${prof.username}`)
                            onSelectSticker({
                              type: 'mention',
                              data: {
                                username: prof.username,
                                userId: prof.id,
                                avatarUrl: prof.avatar_url,
                              },
                            })
                            setActiveConfigType(null)
                            onClose()
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            background: selectedMentionProfile?.id === prof.id ? 'rgba(236, 72, 153, 0.25)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <img
                            src={prof.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={prof.username}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'white' }}>
                              @{prof.username}
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#8e8e93' }}>
                              {prof.full_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedMentionProfile && (
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Selected: @{selectedMentionProfile.username} (DM notification will be sent)
                    </div>
                  )}
                </div>
              )}

              {activeConfigType === 'link' && (
                <>
                  <input
                    type="url"
                    placeholder="URL (e.g. https://vibesocial.app)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    placeholder="Sticker text (optional, e.g. Visit Website)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </>
              )}

              {activeConfigType === 'poll' && (
                <>
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Option 1 (YES)"
                      value={pollOpt1}
                      onChange={(e) => setPollOpt1(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Option 2 (NO)"
                      value={pollOpt2}
                      onChange={(e) => setPollOpt2(e.target.value)}
                    />
                  </div>
                </>
              )}

              {activeConfigType === 'slider' && (
                <>
                  <input
                    type="text"
                    placeholder="Rate this question..."
                    value={sliderPrompt}
                    onChange={(e) => setSliderPrompt(e.target.value)}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['😍', '🔥', '😂', '❤️', '🚀'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setSliderEmoji(em)}
                        style={{
                          background: sliderEmoji === em ? 'rgba(236, 72, 153, 0.3)' : 'rgba(255,255,255,0.1)',
                          border: sliderEmoji === em ? '2px solid #ec4899' : 'none',
                          borderRadius: '8px',
                          padding: '8px',
                          fontSize: '22px',
                          cursor: 'pointer',
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeConfigType === 'questions' && (
                <input
                  type="text"
                  placeholder="Ask me a question..."
                  value={questionPrompt}
                  onChange={(e) => setQuestionPrompt(e.target.value)}
                  autoFocus
                  style={{ width: '100%' }}
                />
              )}

              {activeConfigType === 'add_yours' && (
                <input
                  type="text"
                  placeholder="Topic prompt (e.g. Drop your favorite view 🌅)"
                  value={addYoursPrompt}
                  onChange={(e) => setAddYoursPrompt(e.target.value)}
                  autoFocus
                  style={{ width: '100%' }}
                />
              )}

              {activeConfigType === 'hashtag' && (
                <input
                  type="text"
                  placeholder="#hashtag (e.g. #vibesocial)"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  autoFocus
                  style={{ width: '100%' }}
                />
              )}

              {activeConfigType === 'countdown' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Event Name (e.g. Weekend Celebration 🎉)"
                    value={countdownTitle}
                    onChange={(e) => setCountdownTitle(e.target.value)}
                    autoFocus
                    style={{ width: '100%' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8e8e93', display: 'block', marginBottom: '4px' }}>
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={countdownDate}
                        onChange={(e) => setCountdownDate(e.target.value)}
                        style={{ width: '100%', background: '#2c2c2e', color: 'white', border: 'none', borderRadius: '10px', padding: '8px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8e8e93', display: 'block', marginBottom: '4px' }}>
                        Target Time
                      </label>
                      <input
                        type="time"
                        value={countdownTime}
                        onChange={(e) => setCountdownTime(e.target.value)}
                        style={{ width: '100%', background: '#2c2c2e', color: 'white', border: 'none', borderRadius: '10px', padding: '8px' }}
                      />
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
                        setCountdownDate(d.toISOString().split('T')[0])
                        setCountdownTime('20:00')
                        setCountdownTitle('Weekend Celebration 🎉')
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Saturday 8 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 1)
                        setCountdownDate(d.toISOString().split('T')[0])
                        setCountdownTime('19:00')
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Tomorrow 7 PM
                    </button>
                  </div>
                </div>
              )}

              {activeConfigType === 'gif' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {TRENDING_GIFS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onSelectSticker({
                          type: 'emoji',
                          data: { emoji: g.emoji },
                        })
                        setActiveConfigType(null)
                        onClose()
                      }}
                      style={{
                        padding: '12px 8px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '26px' }}>{g.emoji}</span>
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeConfigType !== 'gif' && (
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
