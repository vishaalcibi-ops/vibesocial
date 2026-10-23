import React, { useState, useEffect } from 'react'
import { X, Music, Play, Pause, Trash2, Scissors, FileText, Check, Sparkles, Search, Edit2 } from 'lucide-react'
import type { InstagramNote, AudioTrack } from '../../types/database.types'
import { noteService } from '../../services/noteService'
import { useAuth } from '../../context/AuthContext'
import { MusicPickerModal } from '../music/MusicPickerModal'
import { globalAudioManager, getFullSongLyrics } from '../../services/musicService'

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  existingNote?: InstagramNote | null
  onNoteSaved: (note: InstagramNote | null) => void
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  existingNote,
  onNoteSaved,
}) => {
  const { user, profile } = useAuth()
  const [text, setText] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null)
  const [clipStart, setClipStart] = useState<number>(0)
  const [clipDuration, setClipDuration] = useState<number>(15)
  const [selectedLyrics, setSelectedLyrics] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'clip' | 'lyrics'>('clip')
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isCloseFriends, setIsCloseFriends] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lyricsSearch, setLyricsSearch] = useState('')
  const [isCustomLyricMode, setIsCustomLyricMode] = useState(false)
  const [customLyricInput, setCustomLyricInput] = useState('')

  // Populate existing note if editing
  useEffect(() => {
    if (existingNote) {
      setText(existingNote.text || '')
      setSelectedTrack(existingNote.audio_track || null)
      setClipStart(existingNote.clip_start ?? 0)
      setClipDuration(existingNote.clip_duration ?? 15)
      setSelectedLyrics(existingNote.selected_lyrics ?? '')
      setIsCloseFriends(Boolean(existingNote.is_close_friends || existingNote.audience === 'close_friends'))
    } else {
      setText('')
      setSelectedTrack(null)
      setClipStart(0)
      setClipDuration(15)
      setSelectedLyrics('')
      setIsCloseFriends(false)
    }
  }, [existingNote, isOpen])

  // Subscribe to audio player
  useEffect(() => {
    const unsub = globalAudioManager.subscribe((state) => {
      if (selectedTrack) {
        const trackId = selectedTrack.id || selectedTrack.audio_url
        setIsAudioPlaying(state.isPlaying && state.activeTrackId === trackId)
        setAudioCurrentTime(state.currentTime)
      } else {
        setIsAudioPlaying(false)
        setAudioCurrentTime(0)
      }
    })
    return () => unsub()
  }, [selectedTrack])

  const handleClose = () => {
    globalAudioManager.stop()
    onClose()
  }

  const handleSelectTrack = (track: AudioTrack) => {
    setSelectedTrack(track)
    setShowMusicPicker(false)
    setClipStart(0)
    setLyricsSearch('')
    setIsCustomLyricMode(false)
    const lyrics = getFullSongLyrics(track)
    if (lyrics.length > 0) {
      setSelectedLyrics(lyrics[0].text)
      setCustomLyricInput(lyrics[0].text)
    }
    globalAudioManager.playTrack(track, 0)
  }

  const handleSeekClip = (newStart: number) => {
    setClipStart(newStart)
    if (selectedTrack) {
      globalAudioManager.playTrack(selectedTrack, newStart)
    }
  }

  const handleSelectLyricLine = (time: number, lyricText: string) => {
    setClipStart(time)
    setSelectedLyrics(lyricText)
    if (selectedTrack) {
      globalAudioManager.playTrack(selectedTrack, time)
    }
  }

  const handleApplyLyricToThought = (lyricText: string) => {
    setText(lyricText.slice(0, 60))
  }

  const handleShare = async () => {
    if (!user) return
    const cleanText = text.trim()
    if (!cleanText && !selectedTrack) return

    setLoading(true)
    try {
      const saved = await noteService.createOrUpdateNote({
        userId: user.id,
        text: cleanText,
        audioTrack: selectedTrack,
        clipStart,
        clipDuration,
        selectedLyrics,
        userProfile: profile,
        isCloseFriends,
        audience: isCloseFriends ? 'close_friends' : 'followers',
      })
      globalAudioManager.stop()
      onNoteSaved(saved)
      onClose()
    } catch (err) {
      console.error('Failed to save note:', err)
      alert('Failed to save note. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !existingNote) return
    setLoading(true)
    try {
      await noteService.deleteNote(existingNote.id, user.id)
      globalAudioManager.stop()
      onNoteSaved(null)
      onClose()
    } catch (err) {
      console.error('Failed to delete note:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isFormValid = Boolean(text.trim() || selectedTrack)
  const trackLyrics = selectedTrack ? getFullSongLyrics(selectedTrack) : []
  const filteredLyrics = trackLyrics.filter((l) =>
    l.text.toLowerCase().includes(lyricsSearch.toLowerCase().trim())
  )

  const formatSec = (sec: number) => {
    const s = Math.floor(sec)
    return `0:${s < 10 ? '0' : ''}${s}`
  }

  // Generate 24 pseudo-randomized waveform heights for authentic Instagram aesthetic
  const waveformHeights = [
    30, 45, 60, 85, 70, 95, 50, 65, 80, 100, 75, 90, 60, 70, 85, 55, 95, 80, 65, 45, 75, 90, 60, 40,
  ]

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
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        className="create-note-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg, 20px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-elevated)',
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {existingNote ? 'Your Note' : 'New Note'}
          </span>
          <button
            type="button"
            onClick={handleShare}
            disabled={!isFormValid || loading}
            style={{
              background: 'none',
              border: 'none',
              color: isFormValid && !loading ? 'var(--color-pink, #e1306c)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: isFormValid && !loading ? 'pointer' : 'default',
              opacity: isFormValid && !loading ? 1 : 0.4,
            }}
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {/* Thought Bubble + Avatar Visual */}
        <div
          style={{
            padding: '28px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
          }}
        >
          {/* Instagram Thought Bubble */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: '20px',
              padding: '14px 16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
              marginBottom: '16px',
            }}
          >
            {/* Selected Lyric Quote Badge in Thought Bubble */}
            {selectedLyrics && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  background: 'rgba(225, 48, 108, 0.09)',
                  border: '1px dashed rgba(225, 48, 108, 0.35)',
                  marginBottom: '10px',
                  fontSize: '11px',
                  color: 'var(--color-pink, #e1306c)',
                  fontStyle: 'italic',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                  <Sparkles size={12} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    ❝ {selectedLyrics} ❞
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLyrics('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                  title="Remove lyric quote"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 60))}
              placeholder="Share a thought..."
              rows={2}
              maxLength={60}
              autoFocus
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: 1.4,
                resize: 'none',
                outline: 'none',
                textAlign: 'center',
              }}
            />
            {/* Character counter */}
            <div
              style={{
                textAlign: 'right',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              {text.length}/60
            </div>

            {/* Pointer circles down to avatar */}
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '10px',
                height: '10px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
              }}
            />
          </div>

          {/* User Avatar */}
          <div
            style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
          >
            <img
              src={
                profile?.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt="Avatar"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--bg-elevated)',
              }}
            />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
            {profile?.username || 'You'}
          </span>
        </div>

        {/* Music Attachment & Clip / Lyrics Selector Section */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!selectedTrack ? (
            <button
              type="button"
              onClick={() => setShowMusicPicker(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md, 12px)',
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
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
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(220, 39, 67, 0.3)',
                  }}
                >
                  <Music size={16} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Add Song with Lyrics & Clip</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Pick segment & synchronized lyrics
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-pink, #e1306c)', fontWeight: 700 }}>
                Select +
              </span>
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 14px)',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(225, 48, 108, 0.35)',
              }}
            >
              {/* Selected Track Top Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Artwork with play button */}
                <div
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  <img
                    src={
                      selectedTrack.artwork_url ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={selectedTrack.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => globalAudioManager.playTrack(selectedTrack, clipStart)}
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
                    title={isAudioPlaying ? 'Pause' : 'Play clip'}
                  >
                    {isAudioPlaying ? (
                      <Pause size={16} fill="#fff" />
                    ) : (
                      <Play size={16} fill="#fff" style={{ marginLeft: '2px' }} />
                    )}
                  </button>
                </div>

                {/* Title & Artist */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                      {selectedTrack.title}
                    </span>
                    {isAudioPlaying && (
                      <span style={{ fontSize: '11px', color: 'var(--color-pink)' }}>♫</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      marginTop: '2px',
                    }}
                  >
                    {selectedTrack.artist}
                  </span>
                </div>

                {/* Change & Remove Buttons */}
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
                    padding: '4px',
                  }}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    globalAudioManager.stop()
                    setSelectedTrack(null)
                    setSelectedLyrics('')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Remove song"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Clip Scrubber & Lyrics Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  padding: '3px',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('clip')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'clip' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'clip' ? 'var(--color-pink, #e1306c)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'clip' ? 700 : 500,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Scissors size={13} />
                  <span>Audio Clip ({formatSec(clipStart)} - {formatSec(Math.min(30, clipStart + clipDuration))})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('lyrics')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'lyrics' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'lyrics' ? 'var(--color-pink, #e1306c)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'lyrics' ? 700 : 500,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <FileText size={13} />
                  <span>Synced Lyrics</span>
                </button>
              </div>

              {/* TAB 1: Visual Waveform & Audio Clip Range Scrubber */}
              {activeTab === 'clip' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Waveform graphic */}
                  <div
                    style={{
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '3px',
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    {waveformHeights.map((h, i) => {
                      const barTime = (i / waveformHeights.length) * 30
                      const isInClip = barTime >= clipStart && barTime <= clipStart + clipDuration
                      const isCurrent =
                        isAudioPlaying && Math.abs(audioCurrentTime - barTime) < 1.2
                      return (
                        <div
                          key={i}
                          onClick={() => handleSeekClip(Math.min(30 - clipDuration, Math.floor(barTime)))}
                          style={{
                            flex: 1,
                            height: `${h}%`,
                            borderRadius: '3px',
                            background: isCurrent
                              ? '#fff'
                              : isInClip
                              ? 'linear-gradient(to top, #f09433, #e1306c)'
                              : 'rgba(255, 255, 255, 0.15)',
                            transition: 'background 0.2s, height 0.2s',
                            cursor: 'pointer',
                          }}
                          title={`Jump to ${formatSec(barTime)}`}
                        />
                      )
                    })}
                  </div>

                  {/* Scrubber slider */}
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, 30 - clipDuration)}
                      step={1}
                      value={clipStart}
                      onChange={(e) => handleSeekClip(Number(e.target.value))}
                      style={{
                        width: '100%',
                        cursor: 'pointer',
                        accentColor: 'var(--color-pink, #e1306c)',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      <span>0:00</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-pink)' }}>
                        Selected: {formatSec(clipStart)} - {formatSec(Math.min(30, clipStart + clipDuration))}
                      </span>
                      <span>0:30</span>
                    </div>
                  </div>

                  {/* Duration pills & Preview Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setClipDuration(15)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: clipDuration === 15 ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                          background: clipDuration === 15 ? 'rgba(225, 48, 108, 0.15)' : 'transparent',
                          color: clipDuration === 15 ? 'var(--color-pink)' : 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        15s Clip
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClipDuration(30)
                          setClipStart(0)
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: clipDuration === 30 ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                          background: clipDuration === 30 ? 'rgba(225, 48, 108, 0.15)' : 'transparent',
                          color: clipDuration === 30 ? 'var(--color-pink)' : 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        30s Full
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => globalAudioManager.playTrack(selectedTrack, clipStart)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '12px',
                        background: 'var(--color-pink, #e1306c)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isAudioPlaying ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
                      <span>{isAudioPlaying ? 'Pause' : 'Play Clip'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Synchronized Interactive Lyrics */}
              {activeTab === 'lyrics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Lyrics search & Custom Lyric Toggle */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search lyrics lines..."
                        value={lyricsSearch}
                        onChange={(e) => setLyricsSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 8px 5px 24px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          outline: 'none',
                        }}
                      />
                      {lyricsSearch && (
                        <button
                          type="button"
                          onClick={() => setLyricsSearch('')}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomLyricMode(!isCustomLyricMode)}
                      style={{
                        padding: '5px 9px',
                        borderRadius: '8px',
                        background: isCustomLyricMode ? 'var(--color-pink, #e1306c)' : 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Edit2 size={11} />
                      <span>{isCustomLyricMode ? 'List' : 'Custom'}</span>
                    </button>
                  </div>

                  {/* Custom Lyric Input Panel */}
                  {isCustomLyricMode && (
                    <div
                      style={{
                        background: 'rgba(225, 48, 108, 0.08)',
                        border: '1px solid rgba(225, 48, 108, 0.3)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-pink)' }}>
                        ✍️ Post Custom Song Lyric
                      </label>
                      <input
                        type="text"
                        placeholder="Type any line from this song to post..."
                        value={customLyricInput}
                        onChange={(e) => setCustomLyricInput(e.target.value.slice(0, 80))}
                        maxLength={80}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {customLyricInput.length}/80 chars
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (customLyricInput.trim()) {
                                handleApplyLyricToThought(customLyricInput.trim())
                              }
                            }}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.1)',
                              border: 'none',
                              color: 'var(--text-primary)',
                              fontSize: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            Set Thought
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (customLyricInput.trim()) {
                                setSelectedLyrics(customLyricInput.trim())
                                setIsCustomLyricMode(false)
                              }
                            }}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              background: 'var(--color-pink, #e1306c)',
                              border: 'none',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Attach Lyric
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lyrics Lines List */}
                  <div
                    style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {filteredLyrics.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No lyrics found matching "{lyricsSearch}"
                      </div>
                    ) : (
                      filteredLyrics.map((lyric, idx) => {
                        const isLineActive =
                          isAudioPlaying &&
                          audioCurrentTime >= lyric.time &&
                          (idx === filteredLyrics.length - 1 || audioCurrentTime < filteredLyrics[idx + 1].time)
                        const isSelected = selectedLyrics === lyric.text

                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectLyricLine(lyric.time, lyric.text)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isLineActive
                                ? 'rgba(225, 48, 108, 0.25)'
                                : isSelected
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'transparent',
                              border: isSelected ? '1px solid rgba(225, 48, 108, 0.5)' : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: isLineActive ? 'var(--color-pink)' : 'var(--text-muted)',
                                  fontWeight: 600,
                                  flexShrink: 0,
                                }}
                              >
                                {formatSec(lyric.time)}
                              </span>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: isLineActive || isSelected ? 700 : 500,
                                  color: isLineActive ? '#fff' : isSelected ? 'var(--color-pink)' : 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {lyric.text}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              {isSelected && <Check size={13} color="var(--color-pink)" />}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleApplyLyricToThought(lyric.text)
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: 'var(--text-muted)',
                                  fontSize: '10px',
                                  padding: '2px 5px',
                                  cursor: 'pointer',
                                }}
                                title="Copy this lyric to thought text"
                              >
                                Quote
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Tap any full song lyric line to sync audio clip and attach to your note
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Share with Audience Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Share with
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCloseFriends(false)}
                style={{
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-md, 10px)',
                  border: !isCloseFriends ? '2px solid var(--color-pink, #e1306c)' : '1px solid var(--border-subtle)',
                  background: !isCloseFriends ? 'rgba(225, 48, 108, 0.08)' : 'var(--bg-input, rgba(255,255,255,0.04))',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Followers</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Followers you follow back</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCloseFriends(true)}
                style={{
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-md, 10px)',
                  border: isCloseFriends ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                  background: isCloseFriends ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input, rgba(255,255,255,0.04))',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>💚</span> Close Friends
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Only selected close friends</span>
              </button>
            </div>
          </div>

          {/* Delete Option for Existing Note */}
          {existingNote && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md, 10px)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} />
              <span>Delete Current Note</span>
            </button>
          )}

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Notes are visible for 24 hours to your mutual connections.
          </p>
        </div>

        {/* Music Picker Modal */}
        <MusicPickerModal
          isOpen={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          onSelectTrack={handleSelectTrack}
          selectedTrackId={selectedTrack?.id}
        />
      </div>
    </div>
  )
}
