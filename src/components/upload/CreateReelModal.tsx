import React, { useState } from 'react'
import { X, Film, Music, AlertCircle, Link, Check, Sparkles, HelpCircle } from 'lucide-react'
import { reelService } from '../../services/reelService'
import { useAuth } from '../../context/AuthContext'
import type { Reel } from '../../types/database.types'
import { SAMPLE_REEL_PRESETS } from '../../constants/presets'

interface CreateReelModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (reel: Reel) => void
}

export const CreateReelModal: React.FC<CreateReelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'preset' | 'url'>('preset')
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0)
  const [customUrl, setCustomUrl] = useState('')
  const [caption, setCaption] = useState(SAMPLE_REEL_PRESETS[0].caption)
  const [audioTitle, setAudioTitle] = useState(SAMPLE_REEL_PRESETS[0].audioTitle)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const activeVideoUrl =
    activeTab === 'preset'
      ? SAMPLE_REEL_PRESETS[selectedPresetIndex]?.url || ''
      : customUrl.trim()

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index)
    const preset = SAMPLE_REEL_PRESETS[index]
    setCaption(preset.caption)
    setAudioTitle(preset.audioTitle)
    setErrorMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setErrorMsg('You must be logged in to create a reel.')
      return
    }

    if (!activeVideoUrl) {
      setErrorMsg('Please select a video preset or enter a direct video URL.')
      return
    }

    if (!activeVideoUrl.startsWith('http://') && !activeVideoUrl.startsWith('https://')) {
      setErrorMsg('Video URL must start with http:// or https://')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const createdReel = await reelService.createReel({
        authorId: user.id,
        videoUrl: activeVideoUrl,
        caption: caption.trim(),
        audioTitle: audioTitle.trim() || 'Original Audio',
      })
      onSuccess(createdReel)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish Reel.')
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
            <Film size={18} className="verified-icon" />
            <span style={{ fontWeight: 700 }}>Create New Reel</span>
          </div>
          <button onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Free Plan Spark Info */}
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
            Firebase Spark Free-Plan: Uses external high-definition video streams and verified sample clips.
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                background: activeTab === 'preset' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'preset' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'preset' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} />
              <span>Video Presets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                background: activeTab === 'url' ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === 'url' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'url' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Link size={14} />
              <span>Direct Video URL</span>
            </button>
          </div>

          {/* Presets Grid */}
          {activeTab === 'preset' && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Choose a pre-tested vertical reel video:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {SAMPLE_REEL_PRESETS.map((preset, idx) => {
                  const isSelected = selectedPresetIndex === idx
                  return (
                    <div
                      key={preset.url}
                      onClick={() => handleSelectPreset(idx)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {preset.label}
                        </span>
                        {isSelected && (
                          <div style={{ background: 'var(--color-pink)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={11} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        🎵 {preset.audioTitle}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom Video URL */}
          {activeTab === 'url' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Direct MP4 / WebM Video URL (CORS & Range compatible)
              </label>
              <input
                type="url"
                placeholder="https://example.com/vertical-reel.mp4"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value)
                  setErrorMsg(null)
                }}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Video Preview */}
          {activeVideoUrl && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                9:16 Vertical Video Preview
              </span>
              <div
                style={{
                  position: 'relative',
                  width: '180px',
                  height: '320px',
                  margin: '0 auto',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#000',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <video
                  src={activeVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setErrorMsg('Failed to playback video from this URL. Verify it is a valid MP4/WebM direct stream.')}
                />
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Reel Caption
            </label>
            <input
              type="text"
              placeholder="Write a caption for your reel..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              style={{ width: '100%' }}
            />
          </div>

          {/* Audio Title */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Audio Track Title
            </label>
            <div style={{ position: 'relative' }}>
              <Music size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Original Audio - Artist"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                maxLength={60}
                style={{ width: '100%', paddingLeft: '38px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!activeVideoUrl || loading}
            style={{ justifyContent: 'center', padding: '12px', opacity: !activeVideoUrl || loading ? 0.6 : 1 }}
          >
            {loading ? 'Publishing Reel...' : 'Publish Reel'}
          </button>
        </form>
      </div>
    </div>
  )
}
