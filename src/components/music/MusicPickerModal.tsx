import React, { useState, useEffect } from 'react'
import { Search, X, Music, Play, Pause, Check } from 'lucide-react'
import type { AudioTrack } from '../../types/database.types'
import { musicService, globalAudioManager } from '../../services/musicService'

interface MusicPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTrack: (track: AudioTrack) => void
  selectedTrackId?: string | null
}

export const MusicPickerModal: React.FC<MusicPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  selectedTrackId,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<AudioTrack[]>(musicService.getTrendingTracks())
  const [loading, setLoading] = useState(false)
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Subscribe to global audio playback
  useEffect(() => {
    const unsubscribe = globalAudioManager.subscribe((state) => {
      setIsPlaying(state.isPlaying)
      setActivePreviewId(state.activeTrackId)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Debounced search when user types
  useEffect(() => {
    if (!isOpen) return

    if (!searchQuery.trim()) {
      setTracks(musicService.getTrendingTracks())
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const results = await musicService.searchTracks(searchQuery)
        setTracks(results)
      } catch (err) {
        console.error('Error searching tracks:', err)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery, isOpen])

  // Stop playback when modal closes
  const handleClose = () => {
    globalAudioManager.stop()
    onClose()
  }

  const handleTogglePreview = (e: React.MouseEvent, track: AudioTrack) => {
    e.stopPropagation()
    globalAudioManager.playTrack(track)
  }

  const handleSelect = (track: AudioTrack) => {
    globalAudioManager.stop()
    onSelectTrack(track)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="music-picker-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Music size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Add Music
              </h3>
              <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)' }}>
                Select a song for your note or post
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="action-btn"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search artists, songs, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 38px 10px 38px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Spotify Integration Banner & Genre Filters */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(29, 185, 84, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#1db954',
                  boxShadow: '0 0 6px #1db954',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1db954', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Spotify Integrated Music Library
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Millions of tracks</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { label: '🔥 All Hits', query: '' },
              { label: '🌴 Tamil Hits 🎵', query: 'tamil' },
              { label: '⚡ Anirudh Mania', query: 'Anirudh' },
              { label: '🎼 A.R. Rahman', query: 'A.R. Rahman' },
              { label: '🎧 Leo & Jailer', query: 'Leo' },
              { label: '💖 Tamil Melodies', query: 'Munbe Vaa' },
              { label: '🌟 Spotify Top 50', query: 'Starboy' },
            ].map((genre) => (
              <button
                key={genre.label}
                type="button"
                onClick={() => setSearchQuery(genre.query)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 11px',
                  borderRadius: 'var(--radius-full, 999px)',
                  background: searchQuery === genre.query ? '#1db954' : 'var(--bg-elevated)',
                  color: searchQuery === genre.query ? '#fff' : 'var(--text-primary)',
                  border: searchQuery === genre.query ? '1px solid #1db954' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Header */}
        <div
          style={{
            padding: '10px 20px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {searchQuery.trim() ? `Search Results (${tracks.length})` : '🟢 Spotify & Instagram Trending'}
          </span>
          {loading && (
            <span style={{ fontSize: '12px', color: '#1db954', fontWeight: 600 }}>
              Searching Spotify...
            </span>
          )}
        </div>

        {/* Song List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {tracks.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <Music size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No songs found
              </p>
              <p style={{ fontSize: '12px' }}>Try searching with a different song title or artist name.</p>
            </div>
          )}

          {tracks.map((track) => {
            const trackId = track.id || track.audio_url
            const isThisPlaying = isPlaying && activePreviewId === trackId
            const isSelected = selectedTrackId === trackId

            return (
              <div
                key={trackId}
                onClick={() => handleSelect(track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md, 10px)',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'rgba(225, 48, 108, 0.12)'
                    : isThisPlaying
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                  border: isSelected ? '1px solid rgba(225, 48, 108, 0.3)' : '1px solid transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isThisPlaying) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Artwork with Play Overlay */}
                <div
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  <img
                    src={track.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
                    alt={track.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Play / Pause button overlay */}
                  <button
                    type="button"
                    onClick={(e) => handleTogglePreview(e, track)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: isThisPlaying ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
                      border: 'none',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    title={isThisPlaying ? 'Pause preview' : 'Play 30s preview'}
                  >
                    {isThisPlaying ? (
                      <Pause size={18} fill="#fff" />
                    ) : (
                      <Play size={18} fill="#fff" style={{ marginLeft: '2px' }} />
                    )}
                  </button>
                </div>

                {/* Track Metadata */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: isThisPlaying ? 'var(--color-pink, #e1306c)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {track.title}
                    </span>
                    {isThisPlaying && (
                      <span
                        className="sound-wave"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          height: '12px',
                        }}
                      >
                        <span style={{ width: '2px', height: '12px', background: 'var(--color-pink, #e1306c)', animation: 'waveBar 0.5s ease-in-out infinite alternate' }} />
                        <span style={{ width: '2px', height: '8px', background: 'var(--color-pink, #e1306c)', animation: 'waveBar 0.4s ease-in-out infinite alternate 0.2s' }} />
                        <span style={{ width: '2px', height: '14px', background: 'var(--color-pink, #e1306c)', animation: 'waveBar 0.6s ease-in-out infinite alternate 0.4s' }} />
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px',
                    }}
                  >
                    {track.artist}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(29, 185, 84, 0.15)',
                        color: '#1db954',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      ● Spotify
                    </span>
                    {track.lyrics && track.lyrics.length > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(225, 48, 108, 0.12)',
                          color: 'var(--color-pink, #e1306c)',
                        }}
                      >
                        📝 Full Lyrics
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Indicator */}
                <div style={{ flexShrink: 0 }}>
                  {isSelected ? (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-pink, #e1306c)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelect(track)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full, 999px)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
