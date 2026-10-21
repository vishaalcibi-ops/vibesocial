import React, { useState, useEffect } from 'react'
import { X, Send, Music, Play, Pause, Trash2, Edit2, Sparkles, Scissors, FileText } from 'lucide-react'
import type { InstagramNote } from '../../types/database.types'
import { globalAudioManager, generateTimedLyrics } from '../../services/musicService'
import { messageService } from '../../services/messageService'
import { useAuth } from '../../context/AuthContext'

interface NoteInteractionModalProps {
  note: InstagramNote | null
  isOpen: boolean
  onClose: () => void
  onEditOwnNote?: () => void
  onDeleteOwnNote?: (noteId: string) => void
  onOpenDirectChat?: (userId: string) => void
}

export const NoteInteractionModal: React.FC<NoteInteractionModalProps> = ({
  note,
  isOpen,
  onClose,
  onEditOwnNote,
  onDeleteOwnNote,
  onOpenDirectChat,
}) => {
  const { user } = useAuth()
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [showLyricsList, setShowLyricsList] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [sentFeedback, setSentFeedback] = useState(false)

  const isOwnNote = user && note && user.id === note.user_id

  // Auto-play song when opening note at its designated clip start time!
  useEffect(() => {
    if (isOpen && note?.audio_track) {
      globalAudioManager.playTrack(note.audio_track, note.clip_start || 0)
    }
  }, [isOpen, note])

  // Subscribe to audio state
  useEffect(() => {
    const unsub = globalAudioManager.subscribe((state) => {
      if (note?.audio_track) {
        const trackId = note.audio_track.id || note.audio_track.audio_url
        setIsPlaying(state.isPlaying && state.activeTrackId === trackId)
        setAudioCurrentTime(state.currentTime)
      } else {
        setIsPlaying(false)
        setAudioCurrentTime(0)
      }
    })
    return () => unsub()
  }, [note])

  const handleClose = () => {
    globalAudioManager.stop()
    onClose()
  }

  const handleToggleAudio = () => {
    if (note?.audio_track) {
      globalAudioManager.playTrack(note.audio_track, note.clip_start || 0)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !note || !replyText.trim() || sendingReply) return

    setSendingReply(true)
    try {
      const convId = await messageService.getOrCreateDirectConversation(user.id, note.user_id)
      const noteContext = note.selected_lyrics
        ? `Replied to your note "${note.selected_lyrics}": ${replyText.trim()}`
        : note.audio_track
        ? `Replied to your note "${note.text || note.audio_track.title}": ${replyText.trim()}`
        : `Replied to your note "${note.text}": ${replyText.trim()}`

      await messageService.sendMessage({
        conversationId: convId,
        senderId: user.id,
        textContent: noteContext,
      })

      setSentFeedback(true)
      setReplyText('')
      setTimeout(() => {
        setSentFeedback(false)
        if (onOpenDirectChat) {
          onOpenDirectChat(note.user_id)
        }
        handleClose()
      }, 1200)
    } catch (err) {
      console.error('Failed to send reply to note:', err)
      alert('Could not send reply. Please try again.')
    } finally {
      setSendingReply(false)
    }
  }

  if (!isOpen || !note) return null

  const formatSec = (sec: number) => {
    const s = Math.floor(sec)
    return `0:${s < 10 ? '0' : ''}${s}`
  }

  const trackLyrics = note.audio_track
    ? note.audio_track.lyrics && note.audio_track.lyrics.length > 0
      ? note.audio_track.lyrics
      : generateTimedLyrics(note.audio_track.title, note.audio_track.artist)
    : []

  const clipStart = note.clip_start || 0
  const clipDuration = note.clip_duration || 15
  const clipEnd = Math.min(30, clipStart + clipDuration)

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
        className="note-interaction-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '400px',
          maxHeight: '90vh',
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
            padding: '14px 16px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={
                note.author?.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              }
              alt={note.author?.username || 'User'}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {note.author?.username || 'user'}
              {note.author?.is_verified && <span style={{ color: '#0095f6', marginLeft: '4px' }}>●</span>}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Note Body */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            gap: '14px',
          }}
        >
          {/* Note Thought Bubble */}
          {note.text && (
            <div
              style={{
                backgroundColor: 'var(--bg-elevated)',
                padding: '16px 20px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textAlign: 'center',
                maxWidth: '92%',
                lineHeight: 1.4,
              }}
            >
              "{note.text}"
            </div>
          )}

          {/* Featured Lyrics Snippet */}
          {note.selected_lyrics && (
            <div
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'rgba(225, 48, 108, 0.08)',
                border: '1px dashed rgba(225, 48, 108, 0.35)',
                color: 'var(--color-pink, #e1306c)',
                fontSize: '13px',
                fontStyle: 'italic',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                maxWidth: '92%',
              }}
            >
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              <span>❝ {note.selected_lyrics} ❞</span>
            </div>
          )}

          {/* Attached Song Card with Real Audio Controls */}
          {note.audio_track && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid rgba(225, 48, 108, 0.35)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
              }}
            >
              <div
                onClick={handleToggleAudio}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                {/* Spinning Vinyl Cover */}
                <div
                  style={{
                    position: 'relative',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#111',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    animation: isPlaying ? 'spinRecord 3s linear infinite' : 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <img
                    src={
                      note.audio_track.artwork_url ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={note.audio_track.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Title, Artist, & Soundwave */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Music size={14} color="var(--color-pink, #e1306c)" />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isPlaying ? 'var(--color-pink, #e1306c)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {note.audio_track.title}
                    </span>
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
                    {note.audio_track.artist}
                  </span>

                  {/* Clip segment tag */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      fontSize: '10px',
                      color: 'var(--color-pink)',
                      fontWeight: 600,
                    }}
                  >
                    <Scissors size={11} />
                    <span>Clip: {formatSec(clipStart)} - {formatSec(clipEnd)}</span>
                  </div>
                </div>

                {/* Play / Pause button */}
                <button
                  type="button"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--color-pink, #e1306c)',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(225, 48, 108, 0.4)',
                  }}
                >
                  {isPlaying ? (
                    <Pause size={17} fill="#fff" />
                  ) : (
                    <Play size={17} fill="#fff" style={{ marginLeft: '2px' }} />
                  )}
                </button>
              </div>

              {/* Synchronized Lyrics Toggle Button */}
              {trackLyrics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLyricsList(!showLyricsList)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '5px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  <FileText size={12} />
                  <span>{showLyricsList ? 'Hide Lyrics' : 'View Synced Lyrics'}</span>
                </button>
              )}

              {/* Expandable Synced Lyrics Viewer */}
              {showLyricsList && trackLyrics.length > 0 && (
                <div
                  style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {trackLyrics.map((lyric, idx) => {
                    const isLineActive =
                      isPlaying &&
                      audioCurrentTime >= lyric.time &&
                      (idx === trackLyrics.length - 1 || audioCurrentTime < trackLyrics[idx + 1].time)
                    return (
                      <div
                        key={idx}
                        onClick={() => globalAudioManager.playTrack(note.audio_track!, lyric.time)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: isLineActive ? 'rgba(225, 48, 108, 0.3)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: isLineActive ? '#fff' : 'var(--text-secondary)',
                          fontWeight: isLineActive ? 700 : 400,
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatSec(lyric.time)}
                        </span>
                        <span>{lyric.text}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Reply to note OR Manage own note */}
        <div style={{ padding: '16px 20px' }}>
          {isOwnNote ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  handleClose()
                  if (onEditOwnNote) onEditOwnNote()
                }}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '13px', justifyContent: 'center' }}
              >
                <Edit2 size={15} />
                <span>Leave a New Note</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOwnNote) onDeleteOwnNote(note.id)
                  handleClose()
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder={`Reply to ${note.author?.username || 'user'}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={200}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-full, 999px)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: replyText.trim() ? 'var(--color-pink, #e1306c)' : 'var(--bg-secondary)',
                  border: 'none',
                  color: replyText.trim() ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: replyText.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                <Send size={16} />
              </button>
            </form>
          )}

          {sentFeedback && (
            <p style={{ fontSize: '11px', color: '#10b981', textAlign: 'center', margin: '6px 0 0', fontWeight: 600 }}>
              ✓ Reply sent to messages!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
