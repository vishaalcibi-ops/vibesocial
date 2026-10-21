import React, { useState } from 'react'
import { X, Sparkles, AlertCircle, Link, Check, Image as ImageIcon, Video, HelpCircle, Upload, Trash2 } from 'lucide-react'
import { storyService } from '../../services/storyService'
import { useAuth } from '../../context/AuthContext'
import { SAMPLE_STORY_PRESETS } from '../../constants/presets'
import { compressImageFile } from '../../utils/imageCompressor'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'preset' | 'url' | 'upload'>('upload')
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

  const handlePresetSelect = (preset: typeof SAMPLE_STORY_PRESETS[0]) => {
    setSelectedPresetUrl(preset.url)
    setSelectedPresetType(preset.type)
    setErrorMsg(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid photo file (JPEG, PNG, WebP).')
      return
    }

    setCompressing(true)
    try {
      const result = await compressImageFile(file, 1080, 0.82)
      setUploadedDataUrl(result.dataUrl)
      setUploadedFileName(file.name)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process photo.')
    } finally {
      setCompressing(false)
    }
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

  const handlePublish = async (isCloseFriends = false) => {
    if (!user) {
      setErrorMsg('You must be logged in to create a story.')
      return
    }

    if (!activeMediaUrl) {
      setErrorMsg('Please select a preset, upload a photo, or enter a valid media URL.')
      return
    }

    if (
      !activeMediaUrl.startsWith('data:image/') &&
      !activeMediaUrl.startsWith('http://') &&
      !activeMediaUrl.startsWith('https://')
    ) {
      setErrorMsg('Media URL must start with http:// or https://')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    try {
      await storyService.createStory({
        authorId: user.id,
        mediaUrl: activeMediaUrl,
        mediaType: activeMediaType,
        caption: caption.trim(),
        isCloseFriends,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish story.')
    } finally {
      setLoading(false)
    }
  }

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
            <span style={{ fontWeight: 700 }}>Add to Your Story</span>
          </div>
          <button onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Free Plan Spark Banner */}
        <div
          style={{
            margin: '12px 20px 0',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--color-blue)',
          }}
        >
          <HelpCircle size={15} style={{ flexShrink: 0 }} />
          <span>
            Firebase Spark Free-Plan: Uses high-speed external media URLs & verified presets with zero billing.
          </span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handlePublish(false) }} style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          {/* Tab Switcher */}
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
              <span>Upload Photo</span>
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
              <span>Media URL</span>
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
          </div>

          {/* Upload Photo Panel */}
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
                  <Upload size={24} color="var(--color-pink)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {compressing ? 'Optimizing photo...' : 'Select photo from device'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Instant high-res story ready photo
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
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      height: '240px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      background: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={uploadedDataUrl}
                      alt="Story preview"
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📸 {uploadedFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedDataUrl('')
                        setUploadedFileName('')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preset Selector */}
          {activeTab === 'preset' && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Select a high-resolution 9:16 vertical story preset:
              </span>
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '10px', color: 'white', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                            {preset.label.split(' ')[0]}
                          </span>
                          {isSelected && (
                            <div style={{ background: 'var(--color-pink)', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={10} color="white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom URL Input */}
          {activeTab === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Media Direct URL (Image or MP4 Video)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/story-image.jpg or video.mp4"
                  value={customUrl}
                  onChange={handleCustomUrlChange}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Media Type:</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="storyMediaType"
                    checked={customType === 'image'}
                    onChange={() => setCustomType('image')}
                  />
                  <ImageIcon size={14} />
                  <span>Image</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="storyMediaType"
                    checked={customType === 'video'}
                    onChange={() => setCustomType('video')}
                  />
                  <Video size={14} />
                  <span>Video</span>
                </label>
              </div>
            </div>
          )}

          {/* Live Preview */}
          {activeMediaUrl && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Live Story Preview (24-hour expiration)
              </span>
              <div
                style={{
                  position: 'relative',
                  width: '180px',
                  height: '280px',
                  margin: '0 auto',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#000',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                {activeMediaType === 'video' ? (
                  <video
                    src={activeMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={activeMediaUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setErrorMsg('Failed to load image from provided URL. Please verify the link.')}
                  />
                )}
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
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    {caption}
                  </div>
                )}
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
              placeholder="Add text to your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              style={{ width: '100%' }}
            />
          </div>

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
