import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Sparkles,
  AlertCircle,
  Link,
  Check,
  Image as ImageIcon,
  Video,
  Upload,
  Music,
  Sliders,
  Type,
  Play,
  Pause,
  Search,
} from 'lucide-react'
import { storyService } from '../../services/storyService'
import { useAuth } from '../../context/AuthContext'
import { SAMPLE_STORY_PRESETS } from '../../constants/presets'
import { compressImageFile } from '../../utils/imageCompressor'
import { INSTAGRAM_FILTERS } from '../../constants/storyFilters'
import { TRENDING_TRACKS } from '../../services/musicService'
import { bakeStoryCanvas } from '../../utils/storyCanvasBaker'
import type { AudioTrack } from '../../types/database.types'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const TEXT_COLORS = ['#ffffff', '#000000', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Instagram Story Tools
  const [selectedFilter, setSelectedFilter] = useState<string>('normal')
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState<AudioTrack | null>(null)
  const [musicSearch, setMusicSearch] = useState('')
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)

  // In-Photo Text Overlay ("Aa")
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [overlayText, setOverlayText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textBgMode, setTextBgMode] = useState<'none' | 'black' | 'white' | 'color'>('black')

  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause()
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
      const result = await compressImageFile(file, 1080, 0.85)
      setUploadedDataUrl(result.dataUrl)
      setUploadedFileName(file.name)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process photo.')
    } finally {
      setCompressing(false)
    }
  }

  const handlePresetSelect = (preset: typeof SAMPLE_STORY_PRESETS[0]) => {
    setSelectedPresetUrl(preset.url)
    setSelectedPresetType(preset.type)
    setErrorMsg(null)
  }

  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomUrl(val)
    setErrorMsg(null)
    if (val.match(/\.(mp4|webm|mov)(\?|$)/i)) {
      setCustomType('video')
    } else if (val.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) {
      setCustomType('image')
    }
  }

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
  }

  const removeTrack = () => {
    setSelectedMusic(null)
    if (musicAudioRef.current) musicAudioRef.current.pause()
    setPreviewPlayingId(null)
  }

  const getTextBackgroundColor = () => {
    if (textBgMode === 'none') return 'transparent'
    if (textBgMode === 'black') return 'rgba(0, 0, 0, 0.75)'
    if (textBgMode === 'white') return 'rgba(255, 255, 255, 0.9)'
    return textColor
  }

  const getEffectiveTextColor = () => {
    if (textBgMode === 'white') return '#000000'
    if (textBgMode === 'color' && ['#ffffff', '#f59e0b'].includes(textColor)) return '#000000'
    if (textBgMode === 'color') return '#ffffff'
    return textColor
  }

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

      // If it's an image and has filters or text overlay, bake onto canvas!
      if (activeMediaType === 'image' && (selectedFilter !== 'normal' || overlayText.trim())) {
        const textOverlayObj = overlayText.trim()
          ? {
              text: overlayText.trim(),
              color: getEffectiveTextColor(),
              bgColor: getTextBackgroundColor(),
              fontSize: 32,
            }
          : null

        finalMediaUrl = await bakeStoryCanvas(activeMediaUrl, currentFilterObj.css, textOverlayObj)
      }

      await storyService.createStory({
        authorId: user.id,
        mediaUrl: finalMediaUrl,
        mediaType: activeMediaType,
        caption: caption.trim(),
        isCloseFriends,
        audioTrack: selectedMusic,
        filter: selectedFilter,
        textOverlay: overlayText.trim() || null,
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

  const filteredTracks = TRENDING_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
      t.artist.toLowerCase().includes(musicSearch.toLowerCase())
  )

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} className="verified-icon" />
            <span style={{ fontWeight: 700 }}>Create Story</span>
          </div>
          <button onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handlePublish(false)
          }}
          style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fca5a5',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Tabs: Upload Photo, Presets, URL */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                background: activeTab === 'upload' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'upload' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Upload size={14} />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                background: activeTab === 'preset' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'preset' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'preset' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={14} />
              <span>Presets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                background: activeTab === 'url' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'url' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'url' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Link size={14} />
              <span>URL</span>
            </button>
          </div>

          {/* Photo Upload Zone */}
          {activeTab === 'upload' && (
            <div>
              {!uploadedDataUrl ? (
                <label
                  style={{
                    border: '2px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: compressing ? 'wait' : 'pointer',
                    background: 'var(--bg-input)',
                  }}
                >
                  <Upload size={28} color="var(--color-pink)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {compressing ? 'Optimizing photo...' : 'Select Photo from Gallery / Camera'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    High-quality story ready photo • Instant upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={compressing}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📸 <strong>{uploadedFileName || 'Photo Selected'}</strong>
                  </span>
                  <label
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-pink)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Presets */}
          {activeTab === 'preset' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {SAMPLE_STORY_PRESETS.map((preset) => {
                const isSelected = selectedPresetUrl === preset.url
                return (
                  <div
                    key={preset.url}
                    onClick={() => handlePresetSelect(preset)}
                    style={{
                      position: 'relative',
                      aspectRatio: '9/14',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                      background: '#111',
                    }}
                  >
                    {preset.type === 'video' ? (
                      <video src={preset.url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: isSelected ? 'rgba(244, 63, 94, 0.25)' : 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '6px',
                      }}
                    >
                      <span style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.6)', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', color: 'white' }}>
                        {preset.type === 'video' ? 'VIDEO' : 'PHOTO'}
                      </span>
                      {isSelected && (
                        <div style={{ alignSelf: 'flex-end', background: 'var(--color-pink)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* URL Input */}
          {activeTab === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg or video.mp4"
                value={customUrl}
                onChange={handleCustomUrlChange}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="radio" name="mtype" checked={customType === 'image'} onChange={() => setCustomType('image')} />
                  <ImageIcon size={13} /> Photo
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="radio" name="mtype" checked={customType === 'video'} onChange={() => setCustomType('video')} />
                  <Video size={13} /> Video
                </label>
              </div>
            </div>
          )}

          {/* Instagram Story Canvas / Live Preview */}
          {activeMediaUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {/* Instagram Story Toolbar: Music, Filters, Aa Text */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {/* Music Button */}
                <button
                  type="button"
                  onClick={() => setShowMusicPicker(!showMusicPicker)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: selectedMusic ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                    border: selectedMusic ? '1px solid var(--color-pink)' : 'none',
                    color: selectedMusic ? 'var(--color-pink)' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Music size={15} />
                  <span>{selectedMusic ? selectedMusic.title : 'Add Music'}</span>
                </button>

                {/* Text Overlay Button ("Aa") */}
                <button
                  type="button"
                  onClick={() => setShowTextEditor(!showTextEditor)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: overlayText.trim() ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: overlayText.trim() ? '1px solid var(--color-blue)' : 'none',
                    color: overlayText.trim() ? 'var(--color-blue)' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Type size={15} />
                  <span>Aa Text</span>
                </button>

                {/* Close/Reset tools if needed */}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {currentFilterObj.name !== 'Normal' ? `Filter: ${currentFilterObj.name}` : ''}
                </span>
              </div>

              {/* Music Selection Drawer */}
              {showMusicPicker && (
                <div
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      🎵 Choose Music for Story
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMusicPicker(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search songs or artists..."
                      value={musicSearch}
                      onChange={(e) => setMusicSearch(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filteredTracks.map((track) => {
                      const isSelected = selectedMusic?.id === track.id
                      const isPlaying = previewPlayingId === track.id
                      return (
                        <div
                          key={track.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'rgba(236, 72, 153, 0.12)' : 'var(--bg-input)',
                            cursor: 'pointer',
                          }}
                          onClick={() => selectTrack(track)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <img
                              src={track.artwork_url}
                              alt={track.title}
                              style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: '12px', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {track.title}
                              </p>
                              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMusicPreview(track)
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                padding: '6px',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                display: 'flex',
                              }}
                            >
                              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            {isSelected && <Check size={16} color="var(--color-pink)" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Text Overlay Drawer */}
              {showTextEditor && (
                <div
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>Aa In-Photo Text Editor</span>
                    <button
                      type="button"
                      onClick={() => setShowTextEditor(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Type text to display directly on photo..."
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    maxLength={60}
                    style={{ width: '100%', fontSize: '13px' }}
                  />

                  {/* Colors & Style */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {TEXT_COLORS.map((col) => (
                        <div
                          key={col}
                          onClick={() => setTextColor(col)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: col,
                            cursor: 'pointer',
                            border: textColor === col ? '2px solid var(--color-pink)' : '1px solid rgba(255,255,255,0.4)',
                          }}
                        />
                      ))}
                    </div>

                    {/* Background badge toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setTextBgMode((prev) => (prev === 'black' ? 'white' : prev === 'white' ? 'color' : prev === 'color' ? 'none' : 'black'))
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                      }}
                    >
                      BG: {textBgMode.toUpperCase()}
                    </button>
                  </div>
                </div>
              )}

              {/* 9:16 Vertical Story Live Canvas Viewport */}
              <div
                style={{
                  position: 'relative',
                  width: '220px',
                  height: '350px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#000',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '2px solid var(--border-strong)',
                }}
              >
                {/* Media with live Filter */}
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
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: currentFilterObj.css,
                      transition: 'filter 0.2s ease',
                    }}
                    onError={() => setErrorMsg('Failed to load image. Please verify URL or re-select photo.')}
                  />
                )}

                {/* Music Badge Overlay */}
                {selectedMusic && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '10px',
                      background: 'rgba(0,0,0,0.65)',
                      backdropFilter: 'blur(8px)',
                      color: 'white',
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      maxWidth: '190px',
                    }}
                  >
                    <Music size={11} color="var(--color-pink)" />
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedMusic.title} • {selectedMusic.artist}
                    </span>
                    <button
                      type="button"
                      onClick={removeTrack}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* In-Photo Overlay Text (Aa) */}
                {overlayText.trim() && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxWidth: '85%',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: getTextBackgroundColor(),
                      color: getEffectiveTextColor(),
                      fontWeight: 700,
                      fontSize: '13px',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      boxShadow: textBgMode === 'none' ? '0 2px 4px rgba(0,0,0,0.8)' : '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    {overlayText.trim()}
                  </div>
                )}

                {/* Bottom Caption pill */}
                {caption && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.65)',
                      backdropFilter: 'blur(4px)',
                      color: 'white',
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {caption}
                  </div>
                )}
              </div>

              {/* Real Instagram Filter Selection Carousel */}
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sliders size={13} color="var(--text-secondary)" />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Instagram Filters & Effects
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '6px',
                    scrollbarWidth: 'none',
                  }}
                >
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
                          gap: '4px',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: isCurrent ? '2px solid var(--color-pink)' : '1px solid var(--border-strong)',
                            padding: isCurrent ? '2px' : '0',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              background: '#333',
                            }}
                          >
                            <img
                              src={activeMediaUrl}
                              alt={f.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: f.css,
                              }}
                            />
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? 'var(--color-pink)' : 'var(--text-muted)',
                          }}
                        >
                          {f.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Caption Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Story Caption (Optional)
            </label>
            <input
              type="text"
              placeholder="Add caption to your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              style={{ width: '100%' }}
            />
          </div>

          {/* Action Buttons: Your Story vs Close Friends */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handlePublish(false)}
              className="btn-secondary"
              disabled={!activeMediaUrl || loading}
              style={{
                justifyContent: 'center',
                padding: '12px',
                opacity: !activeMediaUrl || loading ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              {loading ? 'Publishing...' : 'Your Story'}
            </button>

            <button
              type="button"
              onClick={() => handlePublish(true)}
              disabled={!activeMediaUrl || loading}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: !activeMediaUrl || loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: !activeMediaUrl || loading ? 0.6 : 1,
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
              }}
            >
              <span>★</span>
              <span>{loading ? 'Sharing...' : 'Close Friends'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
