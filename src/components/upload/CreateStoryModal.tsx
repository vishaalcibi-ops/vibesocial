import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  X,
  Sparkles,
  Music,
  Smile,
  AtSign,
  Edit3,
  Download,
  Bot,
  UserCheck,
  MoreHorizontal,
  Upload,
  Link as LinkIcon,
  Check,
  Play,
  Pause,
  Sliders,
  Send,
  Star,
  Trash2,
  Search,
} from 'lucide-react'
import { storyService } from '../../services/storyService'
import { useAuth } from '../../context/AuthContext'
import { SAMPLE_STORY_PRESETS } from '../../constants/presets'
import { compressImageFile } from '../../utils/imageCompressor'
import { INSTAGRAM_FILTERS } from '../../constants/storyFilters'
import { TRENDING_TRACKS, musicService } from '../../services/musicService'
import {
  bakeStoryCanvas,
  type DrawingStroke,
  type StoryTextOverlay,
  type StoryCanvasSticker,
} from '../../utils/storyCanvasBaker'
import { InstagramStickerSheet, type StickerPayload } from './InstagramStickerSheet'
import { StoryDrawingCanvas } from './StoryDrawingCanvas'
import type { AudioTrack } from '../../types/database.types'

export interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialOptions?: {
    prompt?: string
    repostMediaUrl?: string
    initialSticker?: StickerPayload
  }
}

const TEXT_COLORS = [
  '#ffffff',
  '#000000',
  '#f43f5e',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
]

const STORY_EFFECTS = [
  { id: 'none', label: 'None', icon: '🚫' },
  { id: 'sparkles', label: 'Sparkles', icon: '✨' },
  { id: 'gold_dust', label: 'Gold Dust', icon: '🌟' },
  { id: 'grain', label: 'Film Grain', icon: '🎞️' },
  { id: 'hearts', label: 'Hearts', icon: '💖' },
]

const CountdownLiveTimer: React.FC<{ data: any }> = ({ data }) => {
  const [timeText, setTimeText] = useState('00 : 00 : 00')
  const [isPassed, setIsPassed] = useState(false)

  useEffect(() => {
    const target = data?.targetTimestamp || (data?.targetDate ? new Date(data.targetDate).getTime() : 0)
    if (!target) {
      setTimeText('02 : 14 : 35')
      return
    }

    const calc = () => {
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) {
        setIsPassed(true)
        setTimeText("IT'S TIME! 🎉")
        return
      }
      setIsPassed(false)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const mins = Math.floor((diff / (1000 * 60)) % 60)
      const secs = Math.floor((diff / 1000) % 60)
      if (days > 0) {
        setTimeText(`${days}d ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
      } else {
        setTimeText(`${String(hours).padStart(2, '0')} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`)
      }
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [data?.targetDate, data?.targetTimestamp])

  return (
    <p
      style={{
        margin: 0,
        fontSize: '17px',
        fontWeight: 800,
        color: isPassed ? '#10b981' : '#f43f5e',
        fontFamily: 'monospace',
        letterSpacing: '1px',
      }}
    >
      {timeText}
    </p>
  )
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialOptions,
}) => {
  const { user } = useAuth()

  // Layout & Device Detection
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Media Source States
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'preset'>('upload')
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string>(SAMPLE_STORY_PRESETS[0].url)
  const [selectedPresetType, setSelectedPresetType] = useState<'image' | 'video'>(SAMPLE_STORY_PRESETS[0].type)
  const [customUrl, setCustomUrl] = useState('')
  const [customType, setCustomType] = useState<'image' | 'video'>('image')
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('')
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [compressing, setCompressing] = useState(false)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Right-Side Instagram Story Tools (Screenshot 2)
  const [selectedFilter, setSelectedFilter] = useState<string>('normal')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [selectedEffect, setSelectedEffect] = useState<string>('none')
  const [showEffectDrawer, setShowEffectDrawer] = useState(false)
  const [isAiLabeled, setIsAiLabeled] = useState(false)
  const [isPaidPartnership, setIsPaidPartnership] = useState(false)
  const [showGridGuides, setShowGridGuides] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Music State & Real-time Live Search
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState<AudioTrack | null>(null)
  const [musicSearch, setMusicSearch] = useState('')
  const [musicTracks, setMusicTracks] = useState<AudioTrack[]>(TRENDING_TRACKS)
  const [searchingMusic, setSearchingMusic] = useState(false)
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)

  // Sticker Tray State
  const [showStickerSheet, setShowStickerSheet] = useState(false)
  const [stickers, setStickers] = useState<StoryCanvasSticker[]>([])

  // Active Item Selection for Dragging, Scaling, and Rotation
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<'sticker' | 'text' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)
  const pinchStartRef = useRef<{ initialDist: number; initialScale: number } | null>(null)

  // Draw Mode State
  const [isDrawMode, setIsDrawMode] = useState(false)
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([])

  // Text Overlay State ("Aa")
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [textOverlays, setTextOverlays] = useState<StoryTextOverlay[]>([])
  const [currentEditingText, setCurrentEditingText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textBgMode, setTextBgMode] = useState<'none' | 'black' | 'white' | 'color'>('black')
  const [textFontStyle, setTextFontStyle] = useState<'classic' | 'modern' | 'neon' | 'typewriter' | 'strong'>('modern')

  const canvasContainerRef = useRef<HTMLDivElement | null>(null)

  // Handle Initial Options (Repost or Add Yours collaboration)
  useEffect(() => {
    if (isOpen && initialOptions) {
      if (initialOptions.repostMediaUrl) {
        setUploadedDataUrl(initialOptions.repostMediaUrl)
        setActiveTab('upload')
      }
      if (initialOptions.prompt) {
        const collabSticker: StoryCanvasSticker = {
          id: `sticker_addyours_${Date.now()}`,
          type: 'add_yours',
          x: 50,
          y: 35,
          scale: 1,
          rotation: 0,
          data: { prompt: initialOptions.prompt },
        }
        setStickers((prev) => [...prev, collabSticker])
        setSelectedItemId(collabSticker.id)
        setSelectedItemType('sticker')
      }
      if (initialOptions.initialSticker) {
        const initStk: StoryCanvasSticker = {
          id: `sticker_${Date.now()}`,
          type: initialOptions.initialSticker.type,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
          data: initialOptions.initialSticker.data,
        }
        setStickers((prev) => [...prev, initStk])
        setSelectedItemId(initStk.id)
        setSelectedItemType('sticker')
      }
    }
  }, [isOpen, initialOptions])

  // Debounced Music Search (iTunes / Global / Tamil Music)
  useEffect(() => {
    if (!musicSearch.trim()) {
      setMusicTracks(TRENDING_TRACKS)
      return
    }
    const timer = setTimeout(async () => {
      setSearchingMusic(true)
      try {
        const results = await musicService.searchTracks(musicSearch, 30)
        setMusicTracks(results)
      } catch {
        setMusicTracks(TRENDING_TRACKS)
      } finally {
        setSearchingMusic(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [musicSearch])

  // Show auto-dismissing toast
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Audio Cleanup
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause()
        musicAudioRef.current.src = ''
      }
    }
  }, [])

  if (!isOpen) return null

  const activeMediaUrl =
    activeTab === 'preset'
      ? selectedPresetUrl
      : activeTab === 'upload'
      ? uploadedDataUrl
      : customUrl.trim()

  const activeMediaType =
    activeTab === 'preset'
      ? selectedPresetType
      : activeTab === 'upload'
      ? 'image'
      : customType

  const currentFilterObj = INSTAGRAM_FILTERS.find((f) => f.id === selectedFilter) || INSTAGRAM_FILTERS[0]

  // Photo Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a photo file (JPEG, PNG, WebP).')
      return
    }

    setCompressing(true)
    try {
      const result = await compressImageFile(file, 1080, 0.88)
      setUploadedDataUrl(result.dataUrl)
      setUploadedFileName(file.name)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process photo.')
    } finally {
      setCompressing(false)
    }
  }

  // Music handlers
  const toggleMusicPreview = (track: AudioTrack) => {
    const tid = track.id || track.title
    if (previewPlayingId === tid) {
      if (musicAudioRef.current) musicAudioRef.current.pause()
      setPreviewPlayingId(null)
    } else {
      if (!musicAudioRef.current) {
        musicAudioRef.current = new Audio()
      }
      musicAudioRef.current.src = track.audio_url
      musicAudioRef.current.play().catch(() => {})
      setPreviewPlayingId(tid)
    }
  }

  const selectTrack = (track: AudioTrack) => {
    setSelectedMusic(track)
    if (musicAudioRef.current) musicAudioRef.current.pause()
    setPreviewPlayingId(null)
    setShowMusicPicker(false)
    showToast(`🎵 Music added: ${track.title}`)
  }

  const removeTrack = () => {
    setSelectedMusic(null)
    if (musicAudioRef.current) musicAudioRef.current.pause()
    setPreviewPlayingId(null)
  }

  // Text Overlay Helpers
  const getTextBackgroundColor = () => {
    if (textBgMode === 'none') return 'transparent'
    if (textBgMode === 'black') return 'rgba(0, 0, 0, 0.75)'
    if (textBgMode === 'white') return 'rgba(255, 255, 255, 0.95)'
    return textColor
  }

  const getEffectiveTextColor = () => {
    if (textBgMode === 'white') return '#000000'
    if (textBgMode === 'color' && ['#ffffff', '#f59e0b', '#facc15'].includes(textColor)) return '#000000'
    if (textBgMode === 'color') return '#ffffff'
    return textColor
  }

  const handleAddTextOverlay = () => {
    if (!currentEditingText.trim()) {
      setShowTextEditor(false)
      return
    }

    const newOverlay: StoryTextOverlay = {
      id: `text_${Date.now()}`,
      text: currentEditingText.trim(),
      color: getEffectiveTextColor(),
      bgColor: getTextBackgroundColor(),
      fontSize: 32,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      fontStyle: textFontStyle,
    }

    setTextOverlays((prev) => [...prev, newOverlay])
    setSelectedItemId(newOverlay.id || null)
    setSelectedItemType('text')
    setCurrentEditingText('')
    setShowTextEditor(false)
    showToast('Text added! Drag or tap +/- to adjust.')
  }

  const removeTextOverlay = (id?: string) => {
    if (!id) return
    setTextOverlays((prev) => prev.filter((t) => t.id !== id))
    if (selectedItemId === id) {
      setSelectedItemId(null)
      setSelectedItemType(null)
    }
  }

  // Sticker Handlers
  const handleAddSticker = (payload: StickerPayload) => {
    const newSticker: StoryCanvasSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: payload.type,
      x: 50,
      y: 45 + (stickers.length % 4) * 8,
      scale: 1,
      rotation: 0,
      data: payload.data,
    }
    setStickers((prev) => [...prev, newSticker])
    setSelectedItemId(newSticker.id)
    setSelectedItemType('sticker')
    showToast(`Added ${payload.type.toUpperCase()} sticker!`)
  }

  const removeSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id))
    if (selectedItemId === id) {
      setSelectedItemId(null)
      setSelectedItemType(null)
    }
  }

  // Dragging, Pinching & Scaling Handlers for both Stickers & Text
  const handleItemPointerDown = (
    e: React.PointerEvent,
    id: string,
    type: 'sticker' | 'text',
    currX: number,
    currY: number
  ) => {
    e.stopPropagation()
    setSelectedItemId(id)
    setSelectedItemType(type)
    setIsDragging(true)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: currX,
      startY: currY,
    }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handleItemPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !canvasContainerRef.current) return
    const rect = canvasContainerRef.current.getBoundingClientRect()
    const dxPercent = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100
    const dyPercent = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100

    const newX = Math.max(8, Math.min(92, Number((dragStartRef.current.startX + dxPercent).toFixed(1))))
    const newY = Math.max(8, Math.min(92, Number((dragStartRef.current.startY + dyPercent).toFixed(1))))

    if (selectedItemType === 'sticker') {
      setStickers((prev) => prev.map((s) => (s.id === selectedItemId ? { ...s, x: newX, y: newY } : s)))
    } else if (selectedItemType === 'text') {
      setTextOverlays((prev) => prev.map((t) => (t.id === selectedItemId ? { ...t, x: newX, y: newY } : t)))
    }
  }

  const handleItemPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    dragStartRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleTouchStart = (e: React.TouchEvent, currentScale: number = 1) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      pinchStartRef.current = { initialDist: dist, initialScale: currentScale || 1 }
    }
  }

  const handleTouchMove = (e: React.TouchEvent, id: string, type: 'sticker' | 'text') => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const ratio = dist / pinchStartRef.current.initialDist
      const nextScale = Math.min(3.0, Math.max(0.4, Number((pinchStartRef.current.initialScale * ratio).toFixed(2))))
      if (type === 'sticker') {
        setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, scale: nextScale } : s)))
      } else {
        setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, scale: nextScale } : t)))
      }
    }
  }

  const handleZoomIn = (id: string, type: 'sticker' | 'text') => {
    if (type === 'sticker') {
      setStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, scale: Math.min(3.0, Number(((s.scale || 1) + 0.15).toFixed(2))) } : s))
      )
    } else {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, scale: Math.min(3.0, Number(((t.scale || 1) + 0.15).toFixed(2))) } : t))
      )
    }
  }

  const handleZoomOut = (id: string, type: 'sticker' | 'text') => {
    if (type === 'sticker') {
      setStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, scale: Math.max(0.4, Number(((s.scale || 1) - 0.15).toFixed(2))) } : s))
      )
    } else {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, scale: Math.max(0.4, Number(((t.scale || 1) - 0.15).toFixed(2))) } : t))
      )
    }
  }

  const handleRotate = (id: string, type: 'sticker' | 'text') => {
    if (type === 'sticker') {
      setStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, rotation: (((s.rotation || 0) + 15) % 360) } : s))
      )
    } else {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, rotation: (((t.rotation || 0) + 15) % 360) } : t))
      )
    }
  }

  // Feature 8: SAVE TO DEVICE (High-Res Bake & Download)
  const handleSaveToDevice = async () => {
    if (!activeMediaUrl) {
      setErrorMsg('Please select or upload a photo first.')
      return
    }

    try {
      showToast('Rendering high-res story...')
      const bakedUrl = await bakeStoryCanvas(activeMediaUrl, currentFilterObj.css, null, {
        drawingStrokes,
        textOverlays,
        stickers,
        effect: selectedEffect,
        isAiLabeled,
        isPaidPartnership,
      })

      // Download baked image
      const link = document.createElement('a')
      link.href = bakedUrl
      link.download = `vibesocial_story_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('✅ Saved to camera roll / gallery!')
    } catch (err: any) {
      setErrorMsg('Failed to save story image.')
    }
  }

  // Publish Story (Your Story vs Close Friends)
  const handlePublish = async (isCloseFriends = false) => {
    if (!user) {
      setErrorMsg('You must be logged in to create a story.')
      return
    }

    if (!activeMediaUrl) {
      setErrorMsg('Please select a photo, preset, or enter a media URL.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      let finalMediaUrl = activeMediaUrl

      // Bake canvas if image has filters, stickers, drawings, or text
      if (
        activeMediaType === 'image' &&
        (selectedFilter !== 'normal' ||
          drawingStrokes.length > 0 ||
          stickers.length > 0 ||
          textOverlays.length > 0 ||
          selectedEffect !== 'none' ||
          isAiLabeled ||
          isPaidPartnership)
      ) {
        finalMediaUrl = await bakeStoryCanvas(activeMediaUrl, currentFilterObj.css, null, {
          drawingStrokes,
          textOverlays,
          stickers,
          effect: selectedEffect,
          isAiLabeled,
          isPaidPartnership,
        })
      }

      await storyService.createStory({
        authorId: user.id,
        mediaUrl: finalMediaUrl,
        mediaType: activeMediaType,
        caption: caption.trim(),
        isCloseFriends,
        audioTrack: selectedMusic,
        filter: selectedFilter,
        textOverlay: textOverlays[0]?.text || null,
        stickers,
        isAiLabeled,
        isPaidPartnership,
      })

      if (musicAudioRef.current) musicAudioRef.current.pause()
      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish story.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop story-studio-backdrop"
      onClick={onClose}
      style={{
        zIndex: 120,
        backgroundColor: '#000000',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28, 28, 30, 0.95)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 700,
            zIndex: 200,
            boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Studio Frame */}
      <div
        className="story-studio-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: isMobile ? 'fixed' : 'relative',
          inset: isMobile ? 0 : 'auto',
          width: isMobile ? '100vw' : '430px',
          height: isMobile ? '100dvh' : '90vh',
          maxHeight: isMobile ? 'none' : '780px',
          borderRadius: isMobile ? '0px' : '32px',
          overflow: 'hidden',
          backgroundColor: '#050505',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile ? 'none' : '0 25px 60px rgba(0, 0, 0, 0.9)',
          border: isMobile ? 'none' : '2px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Top Floating Bar: Back Button + Disclosure Tags + Grid */}
        <div
          style={{
            position: 'absolute',
            top: isMobile ? 'env(safe-area-inset-top, 14px)' : '14px',
            left: '14px',
            right: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 40,
            pointerEvents: isDrawMode ? 'none' : 'auto',
          }}
        >
          {/* Back Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Discard Story"
            style={{
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={26} />
          </button>

          {/* Top Badges: Paid Partnership / Made with AI */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPaidPartnership && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                Paid partnership
              </div>
            )}
            {isAiLabeled && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  color: '#60a5fa',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid rgba(96, 165, 250, 0.4)',
                }}
              >
                ✨ Made with AI
              </div>
            )}
          </div>

          {/* Grid guides button */}
          <button
            type="button"
            onClick={() => setShowGridGuides(!showGridGuides)}
            style={{
              background: showGridGuides ? 'rgba(236, 72, 153, 0.35)' : 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: showGridGuides ? '#ec4899' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 800,
            }}
            title="Toggle Rule-of-Thirds Grid"
          >
            #
          </button>
        </div>

        {/* 9:16 Canvas Area */}
        <div
          ref={canvasContainerRef}
          onPointerMove={handleItemPointerMove}
          onPointerUp={handleItemPointerUp}
          onClick={() => {
            setSelectedItemId(null)
            setSelectedItemType(null)
          }}
          style={{
            flex: 1,
            position: 'relative',
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            overflow: 'hidden',
          }}
        >
          {/* Base Media */}
          {activeMediaType === 'video' ? (
            <video
              src={activeMediaUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: currentFilterObj.css,
              }}
            />
          ) : (
            <img
              src={activeMediaUrl}
              alt="Story"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: currentFilterObj.css,
              }}
            />
          )}

          {/* Particle / Grain / Sparkles Effect Overlay */}
          {selectedEffect === 'sparkles' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 20%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.3) 0%, transparent 20%)',
                animation: 'pulse 1.5s infinite alternate',
              }}
            />
          )}
          {selectedEffect === 'gold_dust' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at 40% 40%, rgba(245, 158, 11, 0.4) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.4) 0%, transparent 25%)',
                animation: 'pulse 2s infinite alternate',
              }}
            />
          )}

          {/* Rule of Thirds Grid Guides */}
          {showGridGuides && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gridTemplateRows: '1fr 1fr 1fr',
                border: '1px solid rgba(255,255,255,0.2)',
                zIndex: 25,
              }}
            >
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)' }} />
              <div />
            </div>
          )}

          {/* Interactive Drawing Canvas Layer */}
          <StoryDrawingCanvas
            isActive={isDrawMode}
            strokes={drawingStrokes}
            onStrokesChange={setDrawingStrokes}
            onDone={() => setIsDrawMode(false)}
          />

          {/* Placed Stickers Layer (Interactive, Draggable, Pinchable & Scalable) */}
          {stickers.map((st) => {
            const isSelected = selectedItemId === st.id
            const scale = st.scale || 1
            const rotation = st.rotation || 0

            return (
              <div
                key={st.id}
                onPointerDown={(e) => handleItemPointerDown(e, st.id, 'sticker', st.x, st.y)}
                onTouchStart={(e) => handleTouchStart(e, scale)}
                onTouchMove={(e) => handleTouchMove(e, st.id, 'sticker')}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedItemId(st.id)
                  setSelectedItemType('sticker')
                }}
                style={{
                  position: 'absolute',
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  zIndex: isSelected ? 45 : 35,
                  cursor: isDragging && isSelected ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  touchAction: 'none',
                  outline: isSelected ? '2px dashed #ec4899' : 'none',
                  outlineOffset: '4px',
                  borderRadius: '16px',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                }}
              >
                {/* Floating Quick Action Handles (Zoom, Rotate, Delete) */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-46px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(28, 28, 30, 0.95)',
                      backdropFilter: 'blur(10px)',
                      padding: '4px 8px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
                      zIndex: 60,
                      pointerEvents: 'auto',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleZoomIn(st.id, 'sticker')
                      }}
                      title="Zoom In"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleZoomOut(st.id, 'sticker')
                      }}
                      title="Zoom Out"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRotate(st.id, 'sticker')
                      }}
                      title="Rotate 15°"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSticker(st.id)
                      }}
                      title="Delete Sticker"
                      style={{
                        background: 'rgba(239, 68, 68, 0.35)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: '#f87171',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Location Sticker */}
                {st.type === 'location' && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '24px',
                      fontWeight: 800,
                      fontSize: '13px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{st.data?.name || '📍 Current Location'}</span>
                  </div>
                )}

                {/* Mention Sticker */}
                {st.type === 'mention' && (
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#e1306c',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>@{st.data?.username || 'mention'}</span>
                  </div>
                )}

                {/* Link Sticker */}
                {st.type === 'link' && (
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#2563eb',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '13px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <LinkIcon size={14} />
                    <span>{st.data?.title || '🔗 LINK'}</span>
                  </div>
                )}

                {/* Poll Sticker */}
                {st.type === 'poll' && (
                  <div
                    style={{
                      width: '240px',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      color: '#111827',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '14px' }}>
                      {st.data?.question || 'Ask a question...'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '13px' }}>
                        {st.data?.option1 || 'YES'}
                      </div>
                      <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '13px' }}>
                        {st.data?.option2 || 'NO'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Emoji Slider Sticker */}
                {st.type === 'slider' && (
                  <div
                    style={{
                      width: '230px',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      color: '#111827',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '13px' }}>
                      {st.data?.question || 'Rate this'}
                    </p>
                    <div style={{ position: 'relative', height: '18px', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px' }} />
                      <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '24px' }}>
                        {st.data?.emoji || '😍'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Questions Sticker */}
                {st.type === 'questions' && (
                  <div
                    style={{
                      width: '220px',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ background: '#f43f5e', color: 'white', padding: '8px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                      {st.data?.prompt || 'Ask me a question...'}
                    </div>
                    <div style={{ padding: '14px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                      Type something...
                    </div>
                  </div>
                )}

                {/* Add Yours Collaborative Sticker */}
                {st.type === 'add_yours' && (
                  <div
                    style={{
                      width: '230px',
                      backgroundColor: '#ffffff',
                      borderRadius: '18px',
                      padding: '10px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      textAlign: 'center',
                      border: '2px solid rgba(236, 72, 153, 0.4)',
                    }}
                  >
                    <div style={{ color: '#ec4899', fontWeight: 800, fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <span>📷</span>
                      <span>ADD YOURS</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#1f2937' }}>
                      {st.data?.prompt || 'Drop your favorite view'}
                    </p>
                    <div
                      style={{
                        marginTop: '6px',
                        background: '#f3f4f6',
                        borderRadius: '10px',
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#6b7280',
                        display: 'inline-block',
                      }}
                    >
                      Tap to collaborate
                    </div>
                  </div>
                )}

                {/* Hashtag Sticker */}
                {st.type === 'hashtag' && (
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#ec4899',
                      padding: '6px 14px',
                      borderRadius: '16px',
                      fontWeight: 800,
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    #{st.data?.tag || 'hashtag'}
                  </div>
                )}

                {/* Real Live Countdown Sticker */}
                {st.type === 'countdown' && (
                  <div
                    style={{
                      background: '#1c1c1e',
                      color: 'white',
                      padding: '12px 18px',
                      borderRadius: '16px',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.7)',
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: '#e5e7eb' }}>
                      ⏱️ {st.data?.title || 'Weekend Celebration 🎉'}
                    </p>
                    <CountdownLiveTimer data={st.data} />
                  </div>
                )}

                {/* Vintage Polaroid Frames Sticker */}
                {st.type === 'frames' && (
                  <div
                    style={{
                      width: '180px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      padding: '12px 12px 24px 12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {activeMediaUrl ? (
                        <img
                          src={activeMediaUrl}
                          alt="Polaroid frame"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '32px' }}>📷</span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#1f2937',
                        fontFamily: '"Courier New", Courier, monospace',
                        letterSpacing: '1px',
                      }}
                    >
                      {st.data?.label || 'VIBE POLAROID'}
                    </div>
                    <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
                      {st.data?.date || new Date().toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Photo Picture-in-Picture Sticker */}
                {st.type === 'photo' && (
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      border: '3px solid #ffffff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      backgroundColor: '#000000',
                    }}
                  >
                    <img
                      src={st.data?.url}
                      alt="PIP sticker"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                {/* Custom Neon Sticker */}
                {st.type === 'custom' && (
                  <div
                    style={{
                      color: st.data?.color || '#fbcfe8',
                      textShadow: `0 0 16px ${st.data?.color || '#ec4899'}`,
                      fontSize: '28px',
                      fontWeight: 700,
                      fontFamily: '"Brush Script MT", cursive, sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {st.data?.text || 'Love you'}
                  </div>
                )}

                {/* Quick Emoji Reaction Sticker */}
                {st.type === 'emoji' && (
                  <span style={{ fontSize: '48px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
                    {st.data?.emoji || '😍'}
                  </span>
                )}
              </div>
            )
          })}

          {/* Placed Text Overlays Layer (Draggable, Scalable, Rotatable) */}
          {textOverlays.map((txt, idx) => {
            const txtId = txt.id || `text_${idx}`
            const isSelected = selectedItemId === txtId
            const scale = txt.scale || 1
            const rotation = txt.rotation || 0

            return (
              <div
                key={txtId}
                onPointerDown={(e) => handleItemPointerDown(e, txtId, 'text', txt.x || 50, txt.y || 50)}
                onTouchStart={(e) => handleTouchStart(e, scale)}
                onTouchMove={(e) => handleTouchMove(e, txtId, 'text')}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedItemId(txtId)
                  setSelectedItemType('text')
                }}
                style={{
                  position: 'absolute',
                  left: `${txt.x || 50}%`,
                  top: `${txt.y || 50}%`,
                  transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  zIndex: isSelected ? 46 : 36,
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: txt.bgColor,
                  color: txt.color,
                  fontWeight: 800,
                  fontSize: '18px',
                  fontFamily:
                    txt.fontStyle === 'typewriter'
                      ? '"Courier New", Courier, monospace'
                      : txt.fontStyle === 'neon'
                      ? '"Brush Script MT", cursive, sans-serif'
                      : txt.fontStyle === 'strong'
                      ? 'Impact, sans-serif'
                      : '-apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                  textAlign: 'center',
                  boxShadow: txt.bgColor === 'transparent' ? '0 2px 6px rgba(0,0,0,0.8)' : '0 4px 12px rgba(0,0,0,0.4)',
                  cursor: isDragging && isSelected ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  touchAction: 'none',
                  outline: isSelected ? '2px dashed #ec4899' : 'none',
                  outlineOffset: '4px',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Floating Quick Action Handles for Text Overlay */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-46px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(28, 28, 30, 0.95)',
                      backdropFilter: 'blur(10px)',
                      padding: '4px 8px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
                      zIndex: 60,
                      pointerEvents: 'auto',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleZoomIn(txtId, 'text')
                      }}
                      title="Zoom In"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleZoomOut(txtId, 'text')
                      }}
                      title="Zoom Out"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRotate(txtId, 'text')
                      }}
                      title="Rotate 15°"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentEditingText(txt.text)
                        setShowTextEditor(true)
                        removeTextOverlay(txtId)
                      }}
                      title="Edit Text"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: 'white',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTextOverlay(txtId)
                      }}
                      title="Delete Text"
                      style={{
                        background: 'rgba(239, 68, 68, 0.35)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        color: '#f87171',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {txt.text}
              </div>
            )
          })}

          {/* Attached Music Badge in Canvas */}
          {selectedMusic && (
            <div
              style={{
                position: 'absolute',
                top: '64px',
                left: '14px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                fontSize: '11px',
                padding: '5px 10px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 30,
                border: '1px solid rgba(255,255,255,0.2)',
                maxWidth: '200px',
              }}
            >
              <Music size={13} color="#ec4899" />
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedMusic.title}
              </span>
              <button
                type="button"
                onClick={removeTrack}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* RIGHT VERTICAL TOOLBAR (Screenshot 2: Exact Instagram Story Right Column) */}
          <div
            className="story-right-toolbar"
            style={{
              position: 'absolute',
              right: '12px',
              top: isMobile ? 'calc(env(safe-area-inset-top, 14px) + 50px)' : '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '12px',
              zIndex: 45,
              pointerEvents: isDrawMode ? 'none' : 'auto',
            }}
          >
            {/* 1. Text ("Aa") */}
            <div
              onClick={() => setShowTextEditor(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Text
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: showTextEditor ? 'rgba(59, 130, 246, 0.4)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '15px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                Aa
              </div>
            </div>

            {/* 2. Stickers (Smiley) */}
            <div
              onClick={() => setShowStickerSheet(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Stickers
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Smile size={20} />
              </div>
            </div>

            {/* 3. Music (🎵) */}
            <div
              onClick={() => setShowMusicPicker(!showMusicPicker)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Music
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: selectedMusic ? 'rgba(236, 72, 153, 0.35)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedMusic ? '#ec4899' : 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Music size={20} />
              </div>
            </div>

            {/* 4. Restyle (Filters) */}
            <div
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Restyle
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: currentFilterObj.id !== 'normal' ? 'rgba(236, 72, 153, 0.35)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Sliders size={20} />
              </div>
            </div>

            {/* 5. Effects (Sparkles) */}
            <div
              onClick={() => setShowEffectDrawer(!showEffectDrawer)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Effects
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: selectedEffect !== 'none' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedEffect !== 'none' ? '#f59e0b' : 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Sparkles size={20} />
              </div>
            </div>

            {/* 6. Mention (@) */}
            <div
              onClick={() => {
                setShowStickerSheet(true)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Mention
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <AtSign size={20} />
              </div>
            </div>

            {/* 7. Draw (Pen) */}
            <div
              onClick={() => setIsDrawMode(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Draw
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: drawingStrokes.length > 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Edit3 size={19} />
              </div>
            </div>

            {/* 8. Save (Download high-res) */}
            <div
              onClick={handleSaveToDevice}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Save
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Download size={20} />
              </div>
            </div>

            {/* 9. Label AI */}
            <div
              onClick={() => {
                setIsAiLabeled(!isAiLabeled)
                showToast(isAiLabeled ? 'AI Label removed' : '✨ Made with AI badge added')
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Label AI
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: isAiLabeled ? 'rgba(96, 165, 250, 0.4)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isAiLabeled ? '#60a5fa' : 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Bot size={20} />
              </div>
            </div>

            {/* 10. Partnership */}
            <div
              onClick={() => {
                setIsPaidPartnership(!isPaidPartnership)
                showToast(isPaidPartnership ? 'Paid partnership removed' : 'Paid partnership banner added')
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Partnership
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: isPaidPartnership ? 'rgba(16, 185, 129, 0.4)' : 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isPaidPartnership ? '#34d399' : 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <UserCheck size={20} />
              </div>
            </div>

            {/* 11. More (...) */}
            <div
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                More
              </span>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(25, 25, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <MoreHorizontal size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR (Screenshot 2: Caption + Your Story + Close Friends + Send Arrow) */}
        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? 'env(safe-area-inset-bottom, 14px)' : '14px',
            left: '12px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 40,
            pointerEvents: isDrawMode ? 'none' : 'auto',
          }}
        >
          {/* Caption Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(25, 25, 25, 0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: '24px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Action Pills Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {/* Pill 1: Your story */}
            <button
              type="button"
              onClick={() => handlePublish(false)}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: 'rgba(25, 25, 25, 0.85)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                👤
              </div>
              <span>{loading ? 'Sharing...' : 'Your story'}</span>
            </button>

            {/* Pill 2: Close Friends */}
            <button
              type="button"
              onClick={() => handlePublish(true)}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Star size={12} fill="white" />
              </div>
              <span>{loading ? 'Sharing...' : 'Close Friends'}</span>
            </button>

            {/* Pill 3: Blue Next Button (Circle Arrow) */}
            <button
              type="button"
              onClick={() => handlePublish(false)}
              disabled={loading}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.5)',
                flexShrink: 0,
              }}
              title="Publish Story"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Error message alert */}
        {errorMsg && (
          <div
            style={{
              position: 'absolute',
              top: '70px',
              left: '14px',
              right: '14px',
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              zIndex: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Change Media Floating Button (Top Left) */}
        {!isDrawMode && (
          <button
            type="button"
            onClick={() => setShowMediaPicker(true)}
            style={{
              position: 'absolute',
              bottom: '120px',
              left: '14px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '20px',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              zIndex: 30,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Upload size={13} />
            <span>{uploadedFileName ? 'Change Photo' : 'Media / Presets'}</span>
          </button>
        )}
      </div>

      {/* MEDIA PICKER DRAWER */}
      {showMediaPicker && (
        <div
          className="modal-backdrop"
          onClick={() => setShowMediaPicker(false)}
          style={{ zIndex: 130, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              background: '#1c1c1e',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              color: 'white',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Choose Story Media</span>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs: Upload / Presets / URL */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {(['upload', 'preset', 'url'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '12px',
                    backgroundColor: activeTab === tab ? '#ec4899' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab: Upload */}
            {activeTab === 'upload' && (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '30px 16px',
                  border: '2px dashed rgba(255,255,255,0.25)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }}
              >
                <Upload size={28} color="#ec4899" />
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  {compressing ? 'Optimizing photo...' : 'Select Photo from Device'}
                </span>
                <span style={{ fontSize: '12px', color: '#8e8e93' }}>
                  High-quality story image (JPEG, PNG, WebP)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleFileUpload(e)
                    setShowMediaPicker(false)
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            )}

            {/* Tab: Presets */}
            {activeTab === 'preset' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {SAMPLE_STORY_PRESETS.map((p) => {
                  const isSelected = selectedPresetUrl === p.url
                  return (
                    <div
                      key={p.url}
                      onClick={() => {
                        setSelectedPresetUrl(p.url)
                        setSelectedPresetType(p.type)
                        setShowMediaPicker(false)
                      }}
                      style={{
                        position: 'relative',
                        aspectRatio: '9/14',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      <img src={p.url} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '10px',
                        }}
                      >
                        {p.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab: URL */}
            {activeTab === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="url"
                  placeholder="https://example.com/story.jpg"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value)
                    if (e.target.value.match(/\.(mp4|webm|mov)(\?|$)/i)) {
                      setCustomType('video')
                    } else {
                      setCustomType('image')
                    }
                  }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#2c2c2e', color: 'white', border: 'none', borderRadius: '12px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(false)}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: '#ec4899',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Use URL
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILTER DRAWER ("Restyle") */}
      {showFilterDrawer && (
        <div
          className="modal-backdrop"
          onClick={() => setShowFilterDrawer(false)}
          style={{ zIndex: 130, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              background: '#1c1c1e',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '16px 20px 30px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>Restyle & Filters</span>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
              {INSTAGRAM_FILTERS.map((f) => {
                const isCurrent = selectedFilter === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: isCurrent ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.2)',
                        padding: isCurrent ? '2px' : 0,
                      }}
                    >
                      <img
                        src={activeMediaUrl}
                        alt={f.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', filter: f.css }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: isCurrent ? '#ec4899' : '#8e8e93', fontWeight: 600 }}>
                      {f.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* EFFECTS DRAWER */}
      {showEffectDrawer && (
        <div
          className="modal-backdrop"
          onClick={() => setShowEffectDrawer(false)}
          style={{ zIndex: 130, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              background: '#1c1c1e',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '16px 20px 30px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>Sparkles & Visual Effects</span>
              <button
                type="button"
                onClick={() => setShowEffectDrawer(false)}
                style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {STORY_EFFECTS.map((eff) => (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => {
                    setSelectedEffect(eff.id)
                    setShowEffectDrawer(false)
                    showToast(`Effect: ${eff.label}`)
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    backgroundColor: selectedEffect === eff.id ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255,255,255,0.08)',
                    border: selectedEffect === eff.id ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{eff.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{eff.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MUSIC SELECTION DRAWER */}
      {showMusicPicker && (
        <div
          className="modal-backdrop"
          onClick={() => setShowMusicPicker(false)}
          style={{ zIndex: 130, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              background: '#1c1c1e',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '16px 20px 30px',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>🎵 Choose Music for Story</span>
              <button
                type="button"
                onClick={() => setShowMusicPicker(false)}
                style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#8e8e93' }} />
              <input
                type="text"
                placeholder="Search songs or artists..."
                value={musicSearch}
                onChange={(e) => setMusicSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', backgroundColor: '#2c2c2e', color: 'white', border: 'none', borderRadius: '12px' }}
              />
            </div>

            {searchingMusic && (
              <div style={{ textAlign: 'center', padding: '12px', color: '#ec4899', fontSize: '13px', fontWeight: 600 }}>
                🎵 Searching Tamil & global tracks...
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {musicTracks.length === 0 && !searchingMusic ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#8e8e93', fontSize: '13px' }}>
                  No tracks found. Try searching for &quot;Leo&quot;, &quot;Anirudh&quot;, or &quot;Aasa Kooda&quot;.
                </div>
              ) : (
                musicTracks.map((track) => {
                  const isSelected = selectedMusic?.id === track.id
                  const isPlaying = previewPlayingId === (track.id || track.title)
                  return (
                    <div
                      key={track.id || track.title}
                      onClick={() => selectTrack(track)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '12px',
                        backgroundColor: isSelected ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={track.artwork_url}
                          alt={track.title}
                          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div>
                          <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '13px' }}>{track.title}</p>
                          <p style={{ margin: 0, color: '#8e8e93', fontSize: '11px' }}>{track.artist}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMusicPreview(track)
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        {isSelected && <Check size={18} color="#ec4899" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEXT OVERLAY EDITOR ("Aa") */}
      {showTextEditor && (
        <div
          className="modal-backdrop"
          onClick={() => setShowTextEditor(false)}
          style={{ zIndex: 140, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '20px',
              backgroundColor: '#1c1c1e',
              borderRadius: '24px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>Aa Story Text</span>
              <button
                type="button"
                onClick={handleAddTextOverlay}
                style={{
                  background: 'white',
                  color: 'black',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 14px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>

            <input
              type="text"
              placeholder="Type your story text..."
              value={currentEditingText}
              onChange={(e) => setCurrentEditingText(e.target.value)}
              autoFocus
              maxLength={70}
              style={{
                width: '100%',
                backgroundColor: getTextBackgroundColor(),
                color: getEffectiveTextColor(),
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 700,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                outline: 'none',
              }}
            />

            {/* Font Style Toggles */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              {(['modern', 'classic', 'neon', 'typewriter', 'strong'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setTextFontStyle(style)}
                  style={{
                    background: textFontStyle === style ? '#ec4899' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '6px 10px',
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

            {/* Background pill toggle & color palette */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {TEXT_COLORS.map((col) => (
                  <div
                    key={col}
                    onClick={() => setTextColor(col)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: col,
                      cursor: 'pointer',
                      border: textColor === col ? '2px solid white' : '1px solid rgba(255,255,255,0.4)',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setTextBgMode((prev) =>
                    prev === 'black' ? 'white' : prev === 'white' ? 'color' : prev === 'color' ? 'none' : 'black'
                  )
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '6px 10px',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                BG: {textBgMode.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MORE MENU (...) ACTION SHEET */}
      {showMoreMenu && (
        <div
          className="modal-backdrop"
          onClick={() => setShowMoreMenu(false)}
          style={{ zIndex: 140, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              background: '#1c1c1e',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span style={{ color: 'white', fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>Story Options</span>

            <button
              type="button"
              onClick={() => {
                setStickers([])
                setDrawingStrokes([])
                setTextOverlays([])
                setShowMoreMenu(false)
                showToast('Cleared canvas items')
              }}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '14px',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Trash2 size={16} />
              <span>Clear All Stickers & Drawings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFilter('normal')
                setSelectedEffect('none')
                setShowMoreMenu(false)
                showToast('Filters reset to Normal')
              }}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '14px',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sliders size={16} />
              <span>Reset Filters & Effects</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false)
                onClose()
              }}
              style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                borderRadius: '14px',
                color: '#f87171',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Discard Story
            </button>
          </div>
        </div>
      )}

      {/* INSTAGRAM STICKER TRAY (Screenshot 1) */}
      <InstagramStickerSheet
        isOpen={showStickerSheet}
        onClose={() => setShowStickerSheet(false)}
        onSelectSticker={handleAddSticker}
        onOpenMusicPicker={() => setShowMusicPicker(true)}
      />
    </div>
  )
}
