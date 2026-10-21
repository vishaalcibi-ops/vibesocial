import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Upload,
  MapPin,
  Image as ImageIcon,
  Film,
  Type,
  AlertCircle,
  Sparkles,
  Link,
  Check,
  Music,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { postService } from '../../services/postService'
import { reelService } from '../../services/reelService'
import { useAuth } from '../../context/AuthContext'
import type { Post, Reel, AudioTrack } from '../../types/database.types'
import { SAMPLE_IMAGE_PRESETS, SAMPLE_REEL_PRESETS } from '../../constants/presets'
import { compressImageFile } from '../../utils/imageCompressor'
import { MusicPickerModal } from '../music/MusicPickerModal'
import { MapLocationPickerModal } from '../common/MapLocationPickerModal'
import { globalAudioManager } from '../../services/musicService'

export interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (post: Post) => void
  onReelSuccess?: (reel: Reel) => void
  initialTab?: 'post' | 'reel'
}

type MainTab = 'post' | 'reel'
type PostMediaMode = 'upload' | 'url' | 'presets' | 'text'
type ReelMediaMode = 'url' | 'presets'

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onReelSuccess,
  initialTab = 'post',
}) => {
  const { user, profile } = useAuth()

  // Top-level tab: Post or Reel
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialTab)

  // --- POST STATE ---
  const [postMode, setPostMode] = useState<PostMediaMode>('upload')
  const [postCaption, setPostCaption] = useState('')
  const [postLocation, setPostLocation] = useState('')
  const [postLocationLat, setPostLocationLat] = useState<number | null>(null)
  const [postLocationLng, setPostLocationLng] = useState<number | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [isCloseFriends, setIsCloseFriends] = useState(false)
  const [postMediaUrl, setPostMediaUrl] = useState('')
  const [postMediaType, setPostMediaType] = useState<'text' | 'image' | 'video'>('image')
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string | null>(null)
  const [uploadedImageInfo, setUploadedImageInfo] = useState<{
    name: string
    sizeKb: number
    width: number
    height: number
  } | null>(null)
  const [compressingImage, setCompressingImage] = useState(false)
  const [postPreviewError, setPostPreviewError] = useState(false)

  // --- REEL STATE ---
  const [reelMode, setReelMode] = useState<ReelMediaMode>('url')
  const [reelVideoUrl, setReelVideoUrl] = useState(SAMPLE_REEL_PRESETS[0].url)
  const [reelCaption, setReelCaption] = useState(SAMPLE_REEL_PRESETS[0].caption)
  const [reelAudioTitle, setReelAudioTitle] = useState(SAMPLE_REEL_PRESETS[0].audioTitle)
  const [selectedReelPresetIndex, setSelectedReelPresetIndex] = useState(0)
  const [reelIsPlaying, setReelIsPlaying] = useState(true)
  const [reelIsMuted, setReelIsMuted] = useState(false)
  const [reelPreviewError, setReelPreviewError] = useState(false)
  const reelVideoRef = useRef<HTMLVideoElement | null>(null)

  // --- MUSIC / AUDIO STATE ---
  const [selectedSong, setSelectedSong] = useState<AudioTrack | null>(null)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [isSongPlaying, setIsSongPlaying] = useState(false)

  // Listen to global audio playback to sync play/pause status
  useEffect(() => {
    const unsub = globalAudioManager.subscribe((state) => {
      if (selectedSong) {
        const songId = selectedSong.id || selectedSong.audio_url
        setIsSongPlaying(state.isPlaying && state.activeTrackId === songId)
      } else {
        setIsSongPlaying(false)
      }
    })
    return () => unsub()
  }, [selectedSong])

  // Shared state
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  // --- POST HANDLERS ---
  const handleSelectPreset = (url: string) => {
    setSelectedPresetUrl(url)
    setPostMediaUrl(url)
    setPostMediaType('image')
    setUploadedImageInfo(null)
    setPostPreviewError(false)
    setErrorMsg(null)
  }

  const handlePostUrlChange = (val: string) => {
    setPostMediaUrl(val)
    setPostMediaType('image')
    setSelectedPresetUrl(null)
    setUploadedImageInfo(null)
    setPostPreviewError(false)
    setErrorMsg(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WebP).')
      return
    }

    setCompressingImage(true)
    try {
      const result = await compressImageFile(file, 1200, 0.82)
      setPostMediaUrl(result.dataUrl)
      setPostMediaType('image')
      setSelectedPresetUrl(null)
      setPostPreviewError(false)
      setUploadedImageInfo({
        name: file.name,
        sizeKb: Math.round(result.compressedSize / 1024),
        width: result.width,
        height: result.height,
      })
    } catch (err: any) {
      console.error('Image compression error:', err)
      setErrorMsg(err.message || 'Failed to process image.')
    } finally {
      setCompressingImage(false)
    }
  }

  const handleRemoveUploadedImage = () => {
    setPostMediaUrl('')
    setUploadedImageInfo(null)
    setPostPreviewError(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setErrorMsg(null)
    const cleanCaption = postCaption.trim()
    const cleanUrl = postMediaUrl.trim()

    if (!cleanCaption && !cleanUrl) {
      setErrorMsg('Please write a caption or attach a photo to publish.')
      return
    }

    if (cleanUrl && !cleanUrl.startsWith('data:image/') && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setErrorMsg('Image URL must start with http:// or https://')
      return
    }

    setLoading(true)
    try {
      const createdPost = await postService.createPost({
        authorId: user.id,
        caption: cleanCaption,
        location: postLocation.trim() || undefined,
        location_lat: postLocationLat,
        location_lng: postLocationLng,
        visibility: isCloseFriends ? 'close_friends' : 'public',
        is_close_friends: isCloseFriends,
        mediaUrl: cleanUrl || undefined,
        mediaType: cleanUrl ? postMediaType : 'text',
        audioTrack: selectedSong || undefined,
      })

      globalAudioManager.stop()
      setSelectedSong(null)
      onSuccess(createdPost)
      onClose()
    } catch (err: any) {
      console.error('Error creating post:', err)
      setErrorMsg(err.message || 'Failed to publish post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // --- REEL HANDLERS ---
  const handleSelectReelPreset = (index: number) => {
    setSelectedReelPresetIndex(index)
    const preset = SAMPLE_REEL_PRESETS[index]
    setReelVideoUrl(preset.url)
    setReelCaption(preset.caption)
    setReelAudioTitle(preset.audioTitle)
    setReelPreviewError(false)
    setErrorMsg(null)
  }

  const handleReelUrlChange = (val: string) => {
    setReelVideoUrl(val)
    setReelPreviewError(false)
    setErrorMsg(null)
  }

  const toggleReelPlayback = () => {
    if (!reelVideoRef.current) return
    if (reelIsPlaying) {
      reelVideoRef.current.pause()
      setReelIsPlaying(false)
    } else {
      reelVideoRef.current.play()
      setReelIsPlaying(true)
    }
  }

  const toggleReelMute = () => {
    if (!reelVideoRef.current) return
    reelVideoRef.current.muted = !reelIsMuted
    setReelIsMuted(!reelIsMuted)
  }

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setErrorMsg(null)
    const cleanVideoUrl = reelVideoUrl.trim()

    if (!cleanVideoUrl) {
      setErrorMsg('Please select a video preset or enter a direct video URL.')
      return
    }

    if (!cleanVideoUrl.startsWith('http://') && !cleanVideoUrl.startsWith('https://')) {
      setErrorMsg('Video URL must start with http:// or https://')
      return
    }

    setLoading(true)
    try {
      const defaultAudio = profile?.username
        ? `Original Audio — ${profile.username}`
        : 'Original Audio'

      const createdReel = await reelService.createReel({
        authorId: user.id,
        videoUrl: cleanVideoUrl,
        caption: reelCaption.trim(),
        audioTitle: reelAudioTitle.trim() || defaultAudio,
      })

      if (onReelSuccess) {
        onReelSuccess(createdReel)
      }
      onClose()
    } catch (err: any) {
      console.error('Error creating reel:', err)
      setErrorMsg(err.message || 'Failed to publish Reel. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: activeMainTab === 'reel' ? '560px' : '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Header with Top Tabs (Post vs Reel) */}
        <div
          className="modal-header"
          style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} className="verified-icon" />
              <span style={{ fontWeight: 700, fontSize: '15px' }}>
                Create New {activeMainTab === 'post' ? 'Post' : 'Reel'}
              </span>
            </div>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>

          {/* Post vs Reel Main Tab Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('post')
                setErrorMsg(null)
              }}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: 'none',
                background: activeMainTab === 'post' ? 'var(--bg-elevated)' : 'transparent',
                color: activeMainTab === 'post' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeMainTab === 'post' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ImageIcon size={16} />
              <span>Post (Photo / Feed)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMainTab('reel')
                setErrorMsg(null)
              }}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: 'none',
                background: activeMainTab === 'reel' ? 'var(--bg-elevated)' : 'transparent',
                color: activeMainTab === 'reel' ? 'var(--color-pink)' : 'var(--text-muted)',
                boxShadow: activeMainTab === 'reel' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Film size={16} />
              <span>Reel (Short Video)</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            style={{
              margin: '12px 20px 0',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ef4444',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{errorMsg}</span>
            <X size={14} onClick={() => setErrorMsg(null)} style={{ cursor: 'pointer' }} />
          </div>
        )}

        {/* =========================================================================
            SECTION A: CREATE POST FORM
        ========================================================================== */}
        {activeMainTab === 'post' && (
          <form
            onSubmit={handleCreatePost}
            style={{
              padding: '16px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
            }}
          >
            {/* Post Media Option Tabs */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                Photo Source
              </label>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: 'var(--bg-secondary)',
                  padding: '3px',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPostMode('upload')
                    setErrorMsg(null)
                  }}
                  className={`tab-btn ${postMode === 'upload' ? 'active' : ''}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Upload size={14} />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPostMode('url')
                    setPostMediaType('image')
                    setErrorMsg(null)
                  }}
                  className={`tab-btn ${postMode === 'url' ? 'active' : ''}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Link size={14} />
                  <span>Image URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPostMode('presets')
                    if (!postMediaUrl && SAMPLE_IMAGE_PRESETS[0]) {
                      handleSelectPreset(SAMPLE_IMAGE_PRESETS[0].url)
                    }
                    setErrorMsg(null)
                  }}
                  className={`tab-btn ${postMode === 'presets' ? 'active' : ''}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={14} />
                  <span>HD Presets</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPostMode('text')
                    setPostMediaUrl('')
                    setSelectedPresetUrl(null)
                    setUploadedImageInfo(null)
                    setPostMediaType('text')
                    setErrorMsg(null)
                  }}
                  className={`tab-btn ${postMode === 'text' ? 'active' : ''}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Type size={14} />
                  <span>Text Only</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Real Local Image Upload */}
            {postMode === 'upload' && (
              <div>
                {!postMediaUrl ? (
                  <label
                    style={{
                      border: '2px dashed var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      padding: '28px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: compressingImage ? 'wait' : 'pointer',
                      background: 'var(--bg-input)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(236, 72, 153, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-pink)',
                      }}
                    >
                      <Upload size={24} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {compressingImage ? 'Optimizing photo...' : 'Select photo from device'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Supports JPEG, PNG, WebP with instant high-res compression
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={compressingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: '#09090b',
                        maxHeight: '260px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <img
                        src={postMediaUrl}
                        alt="Uploaded preview"
                        style={{ maxHeight: '260px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>
                        📸 {uploadedImageInfo?.name} ({uploadedImageInfo?.sizeKb} KB)
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveUploadedImage}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#ef4444',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Real Image URL Input */}
            {postMode === 'url' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Direct Image URL (Unsplash, Imgur, CDN, etc.)
                </label>
                <div style={{ position: 'relative' }}>
                  <Link
                    size={15}
                    style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or https://example.com/photo.jpg"
                    value={postMediaUrl}
                    onChange={(e) => handlePostUrlChange(e.target.value)}
                    style={{ width: '100%', paddingLeft: '38px' }}
                  />
                </div>

                {/* Quick Working Image URLs */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick tests:</span>
                  <button
                    type="button"
                    onClick={() => handlePostUrlChange('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80')}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    Beach Sunset
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePostUrlChange('https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80')}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    City Skyline
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePostUrlChange('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80')}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    Coffee Vibes
                  </button>
                </div>

                {/* Live Image URL Preview */}
                {postMediaUrl && (
                  <div style={{ marginTop: '12px' }}>
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: '#09090b',
                        maxHeight: '240px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <img
                        src={postMediaUrl}
                        alt="URL Preview"
                        style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain' }}
                        onError={() => setPostPreviewError(true)}
                        onLoad={() => setPostPreviewError(false)}
                      />
                    </div>
                    {postPreviewError && (
                      <div
                        style={{
                          color: '#f87171',
                          fontSize: '12px',
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={13} />
                        <span>Could not load image from this URL. Please check the link.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: Presets Grid */}
            {postMode === 'presets' && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Click a verified HD photograph to attach:
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {SAMPLE_IMAGE_PRESETS.map((preset) => {
                    const isSelected = selectedPresetUrl === preset.url
                    return (
                      <div
                        key={preset.label}
                        onClick={() => handleSelectPreset(preset.url)}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                          boxShadow: isSelected ? '0 0 10px rgba(236, 72, 153, 0.4)' : 'none',
                        }}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                            padding: '6px 4px 3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#fff',
                            textAlign: 'center',
                          }}
                        >
                          {preset.label}
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'var(--color-pink)',
                              color: '#fff',
                              borderRadius: '50%',
                              padding: '2px',
                              display: 'flex',
                            }}
                          >
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Caption Textarea */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                Caption {postMode === 'text' && <span style={{ color: 'var(--color-pink)' }}>*</span>}
              </label>
              <textarea
                rows={3}
                placeholder={
                  postMode === 'text'
                    ? 'Share your thoughts, stories, or announcements with the community...'
                    : 'What are the vibes today? Add #hashtags or @mentions...'
                }
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Location Tag with Real Map & GPS Picker */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Location (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-link, #0095f6)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MapPin size={13} />
                  <span>Choose on Map / GPS</span>
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: postLocationLat ? '#10b981' : 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="e.g. Marina Beach, Chennai or Central Park, NY"
                  value={postLocation}
                  onChange={(e) => {
                    setPostLocation(e.target.value)
                    setPostLocationLat(null)
                    setPostLocationLng(null)
                  }}
                  style={{ width: '100%', paddingLeft: '38px', paddingRight: postLocation ? '30px' : '12px' }}
                />
                {postLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setPostLocation('')
                      setPostLocationLat(null)
                      setPostLocationLng(null)
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {postLocationLat !== null && postLocationLng !== null && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📍 Real Map Pin verified ({postLocationLat.toFixed(3)}, {postLocationLng.toFixed(3)})</span>
                </div>
              )}
            </div>

            {/* Audience: Everyone vs Close Friends */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                Audience
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCloseFriends(false)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: !isCloseFriends ? '2px solid var(--color-link, #0095f6)' : '1px solid var(--border-subtle)',
                    background: !isCloseFriends ? 'rgba(0, 149, 246, 0.08)' : 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>🌐 Everyone</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Visible to all users</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCloseFriends(true)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: isCloseFriends ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    background: isCloseFriends ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💚</span> Close Friends
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Only your close friends list</span>
                </button>
              </div>
            </div>

            {/* Instagram Add Music Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Music / Soundtrack (Optional)
                </label>
                {selectedSong && (
                  <button
                    type="button"
                    onClick={() => setShowMusicPicker(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-pink, #e1306c)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Change Song
                  </button>
                )}
              </div>

              {!selectedSong ? (
                <button
                  type="button"
                  onClick={() => setShowMusicPicker(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md, 10px)',
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-pink, #e1306c)'
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(220, 39, 67, 0.3)',
                      }}
                    >
                      <Music size={15} />
                    </div>
                    <span>Add Music to Post</span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-pink, #e1306c)',
                      fontWeight: 700,
                    }}
                  >
                    Choose Song +
                  </span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 10px)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(225, 48, 108, 0.35)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}
                  >
                    <img
                      src={
                        selectedSong.artwork_url ||
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={selectedSong.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => globalAudioManager.playTrack(selectedSong)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title={isSongPlaying ? 'Pause' : 'Play 30s preview'}
                    >
                      {isSongPlaying ? (
                        <Pause size={16} fill="#fff" />
                      ) : (
                        <Play size={16} fill="#fff" style={{ marginLeft: '2px' }} />
                      )}
                    </button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {selectedSong.title}
                      </span>
                      {isSongPlaying && (
                        <span style={{ fontSize: '11px', color: 'var(--color-pink)' }}>♫</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        marginTop: '2px',
                      }}
                    >
                      {selectedSong.artist}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      globalAudioManager.stop()
                      setSelectedSong(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title="Remove music"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (!postCaption.trim() && !postMediaUrl.trim())}
              style={{
                justifyContent: 'center',
                padding: '12px',
                opacity: loading || (!postCaption.trim() && !postMediaUrl.trim()) ? 0.6 : 1,
              }}
            >
              {loading ? 'Publishing Post to Feed...' : 'Share Post'}
            </button>
          </form>
        )}

        {/* =========================================================================
            SECTION B: CREATE REEL FORM
        ========================================================================== */}
        {activeMainTab === 'reel' && (
          <form
            onSubmit={handleCreateReel}
            style={{
              padding: '16px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
            }}
          >
            {/* Reel Source Switcher */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--bg-secondary)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setReelMode('url')
                  setErrorMsg(null)
                }}
                className={`tab-btn ${reelMode === 'url' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Link size={14} />
                <span>Direct Video URL</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReelMode('presets')
                  setErrorMsg(null)
                }}
                className={`tab-btn ${reelMode === 'presets' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} />
                <span>Trending Reel Clips</span>
              </button>
            </div>

            {/* Reel Video URL Input */}
            {reelMode === 'url' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Direct MP4 / WebM Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/vertical-reel.mp4"
                  value={reelVideoUrl}
                  onChange={(e) => handleReelUrlChange(e.target.value)}
                  style={{ width: '100%' }}
                />

                {/* Quick Real Working Video URLs */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick clips:</span>
                  <button
                    type="button"
                    onClick={() => handleReelUrlChange('https://vjs.zencdn.net/v/oceans.mp4')}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    Ocean Waves 🌊
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReelUrlChange('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4')}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    Botanical 🌸
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReelUrlChange('https://www.w3schools.com/html/mov_bbb.mp4')}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    Animation 🐰
                  </button>
                </div>
              </div>
            )}

            {/* Reel Presets Grid */}
            {reelMode === 'presets' && (
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Select a vertical video clip:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {SAMPLE_REEL_PRESETS.map((preset, idx) => {
                    const isSelected = selectedReelPresetIndex === idx
                    return (
                      <div
                        key={preset.url}
                        onClick={() => handleSelectReelPreset(idx)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(236, 72, 153, 0.08)' : 'var(--bg-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {preset.label}
                          </span>
                          {isSelected && <Check size={12} color="var(--color-pink)" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🎵 {preset.audioTitle}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Live Reel Video Preview */}
            {reelVideoUrl && (
              <div>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: '#000',
                    height: '240px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <video
                    ref={reelVideoRef}
                    src={reelVideoUrl}
                    autoPlay
                    loop
                    muted={reelIsMuted}
                    playsInline
                    style={{ height: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    onError={() => setReelPreviewError(true)}
                    onLoadedData={() => {
                      setReelPreviewError(false)
                      setReelIsPlaying(true)
                    }}
                  />

                  {/* Player Controls Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={toggleReelPlayback}
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title={reelIsPlaying ? 'Pause video' : 'Play video'}
                    >
                      {reelIsPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleReelMute}
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title={reelIsMuted ? 'Unmute audio' : 'Mute audio'}
                    >
                      {reelIsMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  </div>
                </div>

                {reelPreviewError && (
                  <div
                    style={{
                      color: '#f87171',
                      fontSize: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertCircle size={13} />
                    <span>Unable to stream video from this link. Please verify it is a direct MP4/WebM URL.</span>
                  </div>
                )}
              </div>
            )}

            {/* Reel Caption */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                Reel Caption
              </label>
              <textarea
                rows={2}
                placeholder="What's this reel about? Add #trending #reels..."
                value={reelCaption}
                onChange={(e) => setReelCaption(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Audio Track Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                Audio / Sound Track Title
              </label>
              <div style={{ position: 'relative' }}>
                <Music
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="e.g. Original Audio — your_name"
                  value={reelAudioTitle}
                  onChange={(e) => setReelAudioTitle(e.target.value)}
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
              </div>
            </div>

            {/* Submit Reel */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !reelVideoUrl.trim()}
              style={{
                justifyContent: 'center',
                padding: '12px',
                opacity: loading || !reelVideoUrl.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Publishing Reel...' : 'Share Reel'}
            </button>
          </form>
        )}
      </div>

      {/* Music Selector Modal */}
      <MusicPickerModal
        isOpen={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onSelectTrack={(track) => setSelectedSong(track)}
        selectedTrackId={selectedSong?.id}
      />

      {/* Real Map Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialLocation={postLocation}
        initialLat={postLocationLat ?? undefined}
        initialLng={postLocationLng ?? undefined}
        onSelectLocation={(loc) => {
          setPostLocation(loc.name)
          setPostLocationLat(loc.lat ?? null)
          setPostLocationLng(loc.lng ?? null)
          setShowMapPicker(false)
        }}
      />
    </div>
  )
}
export default CreatePostModal
