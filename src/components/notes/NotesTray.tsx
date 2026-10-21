import React, { useState, useEffect, useRef } from 'react'
import { Plus, Music } from 'lucide-react'
import type { InstagramNote } from '../../types/database.types'
import { noteService } from '../../services/noteService'
import { globalAudioManager } from '../../services/musicService'
import { useAuth } from '../../context/AuthContext'
import { CreateNoteModal } from './CreateNoteModal'
import { NoteInteractionModal } from './NoteInteractionModal'

interface NotesTrayProps {
  onOpenDirectChat?: (userId: string) => void
  onOpenAuth?: () => void
  compact?: boolean
}

export const NotesTray: React.FC<NotesTrayProps> = ({
  onOpenDirectChat,
  onOpenAuth,
  compact = false,
}) => {
  const { user, profile } = useAuth()
  const [notes, setNotes] = useState<InstagramNote[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlayingNoteId, setActivePlayingNoteId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<InstagramNote | null>(null)
  const trayRef = useRef<HTMLDivElement | null>(null)

  const loadNotes = async () => {
    try {
      const data = await noteService.getActiveNotes(user?.id)
      setNotes(data)
    } catch (err) {
      console.warn('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [user])

  // Subscribe to global audio playback
  useEffect(() => {
    const unsub = globalAudioManager.subscribe((state) => {
      if (state.isPlaying && state.activeTrackId) {
        // Find which note matches activeTrackId
        const matched = notes.find(
          (n) => n.audio_track && (n.audio_track.id === state.activeTrackId || n.audio_track.audio_url === state.activeTrackId)
        )
        setActivePlayingNoteId(matched ? matched.id : null)
      } else {
        setActivePlayingNoteId(null)
      }
    })
    return () => unsub()
  }, [notes])

  const myNote = user ? notes.find((n) => n.user_id === user.id) || null : null
  const friendsNotes = user ? notes.filter((n) => n.user_id !== user.id) : notes

  const handleNoteClick = (note: InstagramNote) => {
    setSelectedNote(note)
  }

  const handleMyNoteClick = () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth()
      return
    }
    if (myNote) {
      setSelectedNote(myNote)
    } else {
      setShowCreateModal(true)
    }
  }

  const handleNoteSaved = (savedNote: InstagramNote | null) => {
    if (savedNote) {
      setNotes((prev) => {
        const withoutMine = prev.filter((n) => n.user_id !== savedNote.user_id)
        return [savedNote, ...withoutMine]
      })
    } else if (user) {
      // Deleted
      setNotes((prev) => prev.filter((n) => n.user_id !== user.id))
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return
    try {
      await noteService.deleteNote(noteId, user.id)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'

  return (
    <div
      className="notes-tray-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: compact ? '8px 12px 14px' : '12px 16px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
      }}
    >
      {/* Horizontal scrolling list */}
      <div
        ref={trayRef}
        style={{
          display: 'flex',
          gap: '16px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: '28px', // Space for floating thought bubbles
          paddingBottom: '4px',
          paddingLeft: '6px',
          paddingRight: '6px',
          alignItems: 'flex-start',
        }}
      >
        {/* User's Own Note Item */}
        <div
          onClick={handleMyNoteClick}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            width: '74px',
          }}
          title={myNote ? 'View or change your note' : 'Share a thought or song'}
        >
          {/* Floating Note Thought Bubble */}
          <div
            style={{
              position: 'absolute',
              top: '-26px',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '92px',
              padding: myNote?.audio_track ? '3px 8px 3px 6px' : '4px 8px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-elevated)',
              border: myNote?.is_close_friends
                ? '1.5px solid #10b981'
                : myNote?.audio_track
                ? '1px solid rgba(225, 48, 108, 0.4)'
                : '1px solid var(--border-subtle)',
              boxShadow: myNote?.is_close_friends ? '0 0 10px rgba(16, 185, 129, 0.35)' : '0 4px 10px rgba(0,0,0,0.18)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {myNote?.is_close_friends && (
              <span style={{ color: '#10b981', fontSize: '10px' }}>★</span>
            )}
            {myNote?.audio_track && (
              <Music
                size={11}
                color={activePlayingNoteId === myNote.id ? 'var(--color-pink)' : 'var(--text-muted)'}
              />
            )}
            <span
              style={{
                maxWidth: '72px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {myNote
                ? myNote.selected_lyrics
                  ? `❝ ${myNote.selected_lyrics}`
                  : myNote.text || myNote.audio_track?.title || 'Note'
                : 'Note...'}
            </span>

            {/* Bubble pointer dot */}
            <span
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '50%',
                border: myNote?.is_close_friends ? '1px solid #10b981' : '1px solid var(--border-subtle)',
              }}
            />
          </div>

          {/* Avatar with add badge */}
          <div
            style={{
              position: 'relative',
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              padding: myNote ? '2px' : '0',
              background: myNote?.is_close_friends
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : myNote
                ? 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)'
                : 'transparent',
            }}
          >
            <img
              src={profile?.avatar_url || defaultAvatar}
              alt="You"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--bg-card)',
              }}
            />
            {!myNote && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--color-pink, #e1306c)',
                  border: '2px solid var(--bg-card)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                <Plus size={13} strokeWidth={3} />
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '5px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            {myNote ? 'Your note' : 'Leave a note'}
          </span>
        </div>

        {/* Loading Skeletons */}
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ width: '74px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: '60px', height: '16px', borderRadius: '10px', marginBottom: '8px' }} />
              <div className="skeleton" style={{ width: '62px', height: '62px', borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: '46px', height: '10px', marginTop: '6px' }} />
            </div>
          ))}

        {/* Friends' Notes List */}
        {friendsNotes.map((note) => {
          const isPlaying = activePlayingNoteId === note.id

          return (
            <div
              key={note.id}
              onClick={() => handleNoteClick(note)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                width: '78px',
              }}
              title={`View ${note.author?.username || 'user'}'s note`}
            >
              {/* Floating Note Bubble */}
              <div
                style={{
                  position: 'absolute',
                  top: '-26px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  maxWidth: '96px',
                  padding: note.audio_track ? '3px 8px 3px 6px' : '4px 8px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: note.is_close_friends
                    ? '1.5px solid #10b981'
                    : note.audio_track
                    ? '1px solid rgba(225, 48, 108, 0.45)'
                    : '1px solid var(--border-subtle)',
                  boxShadow: note.is_close_friends
                    ? '0 0 10px rgba(16, 185, 129, 0.4)'
                    : isPlaying
                    ? '0 0 12px rgba(225, 48, 108, 0.5)'
                    : '0 4px 10px rgba(0,0,0,0.18)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isPlaying ? 'var(--color-pink, #e1306c)' : 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                {note.is_close_friends && (
                  <span style={{ color: '#10b981', fontSize: '10px' }}>★</span>
                )}
                {note.audio_track && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    <Music size={11} color="var(--color-pink, #e1306c)" />
                    {isPlaying && (
                      <span style={{ display: 'inline-flex', gap: '1px', alignItems: 'center', height: '8px' }}>
                        <span style={{ width: '2px', height: '8px', background: 'var(--color-pink)', animation: 'waveBar 0.4s infinite alternate' }} />
                        <span style={{ width: '2px', height: '5px', background: 'var(--color-pink)', animation: 'waveBar 0.3s infinite alternate 0.15s' }} />
                      </span>
                    )}
                  </div>
                )}
                <span
                  style={{
                    maxWidth: '74px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {note.selected_lyrics ? `❝ ${note.selected_lyrics}` : note.text || note.audio_track?.title || 'Note'}
                </span>

                {/* Bubble pointer dot */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: '50%',
                    border: note.is_close_friends ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                  }}
                />
              </div>

              {/* Friend Avatar */}
              <div
                style={{
                  position: 'relative',
                  width: '62px',
                  height: '62px',
                  borderRadius: '50%',
                  padding: '2px',
                  background: note.is_close_friends
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : isPlaying
                    ? 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)'
                    : 'var(--border-subtle)',
                  boxShadow: note.is_close_friends
                    ? '0 0 10px rgba(16, 185, 129, 0.4)'
                    : isPlaying
                    ? '0 0 10px rgba(225, 48, 108, 0.4)'
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <img
                  src={note.author?.avatar_url || defaultAvatar}
                  alt={note.author?.username || 'User'}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--bg-card)',
                  }}
                />

                {/* Mini audio badge if playing */}
                {note.audio_track && isPlaying && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0px',
                      right: '0px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--color-pink, #e1306c)',
                      border: '2px solid var(--bg-card)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Music size={10} />
                  </div>
                )}
              </div>

              {/* Username */}
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  marginTop: '5px',
                  textAlign: 'center',
                  fontWeight: 500,
                  maxWidth: '74px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {note.author?.username || 'user'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Create Note Modal */}
      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        existingNote={myNote}
        onNoteSaved={handleNoteSaved}
      />

      {/* Note Interaction Modal (View, listen, reply) */}
      <NoteInteractionModal
        note={selectedNote}
        isOpen={Boolean(selectedNote)}
        onClose={() => setSelectedNote(null)}
        onEditOwnNote={() => {
          setSelectedNote(null)
          setShowCreateModal(true)
        }}
        onDeleteOwnNote={(noteId) => {
          handleDeleteNote(noteId)
          setSelectedNote(null)
        }}
        onOpenDirectChat={onOpenDirectChat}
      />
    </div>
  )
}
