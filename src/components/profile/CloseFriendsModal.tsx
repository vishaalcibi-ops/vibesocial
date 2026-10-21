import React, { useState, useEffect } from 'react'
import { X, Star, Search, Check, Users } from 'lucide-react'
import type { Profile } from '../../types/database.types'
import { closeFriendsService } from '../../services/closeFriendsService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'

interface CloseFriendsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated?: (closeFriendIds: string[]) => void
}

export const CloseFriendsModal: React.FC<CloseFriendsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth()
  const [closeFriends, setCloseFriends] = useState<string[]>([])
  const [candidates, setCandidates] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Initial candidate users (connections and active creators)
  const SAMPLE_CANDIDATES: Profile[] = [
    {
      id: 'user_alex_sample',
      username: 'alex_vibes',
      full_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      bio: '',
      website: '',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user_sarah_sample',
      username: 'sarah_creates',
      full_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      bio: '',
      website: '',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user_elena_sample',
      username: 'elena_dance',
      full_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      bio: '',
      website: '',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user_marcus_sample',
      username: 'marcus_beats',
      full_name: 'Marcus Bell',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      bio: '',
      website: '',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  useEffect(() => {
    if (!isOpen || !user) return

    const load = async () => {
      setLoading(true)
      try {
        const [friends, following] = await Promise.all([
          closeFriendsService.getCloseFriends(user.id),
          profileService.getFollowing(user.id),
        ])
        setCloseFriends(friends)

        // Combine followed users with sample creator candidates
        const merged = [...following]
        SAMPLE_CANDIDATES.forEach((cand) => {
          if (!merged.some((m) => m.id === cand.id) && cand.id !== user.id) {
            merged.push(cand)
          }
        })
        setCandidates(merged)
      } catch (err) {
        console.warn('Error loading close friends:', err)
        setCandidates(SAMPLE_CANDIDATES.filter((c) => c.id !== user.id))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isOpen, user])

  const toggleFriend = (id: string) => {
    setCloseFriends((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await closeFriendsService.setCloseFriends(user.id, closeFriends)
      if (onUpdated) onUpdated(closeFriends)
      onClose()
    } catch (err) {
      console.error('Failed to save close friends:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const filteredCandidates = candidates.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
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
        className="close-friends-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg, 20px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '82vh',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Star size={16} fill="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Close Friends
              </h3>
              <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted)' }}>
                {closeFriends.length} people selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        {/* Info Banner */}
        <div
          style={{
            padding: '10px 18px',
            background: 'rgba(16, 185, 129, 0.08)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#10b981',
          }}
        >
          <Star size={14} fill="#10b981" />
          <span>Only people on this list will see your Close Friends stories, posts, & notes.</span>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Candidate List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading connections...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '13px', fontWeight: 600 }}>No users found</p>
            </div>
          ) : (
            filteredCandidates.map((cand) => {
              const isSelected = closeFriends.includes(cand.id)

              return (
                <div
                  key={cand.id}
                  onClick={() => toggleFriend(cand.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 10px)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <img
                    src={cand.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                    alt={cand.username}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: isSelected ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cand.username}
                      </span>
                      {cand.is_verified && <span style={{ color: '#0095f6', fontSize: '12px' }}>●</span>}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {cand.full_name}
                    </span>
                  </div>

                  {/* Toggle Check Circle */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '2px solid var(--border-subtle)',
                      background: isSelected ? '#10b981' : 'transparent',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <Check size={15} strokeWidth={3} />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Save Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Star size={16} fill="#fff" />
            <span>{saving ? 'Saving...' : `Done (${closeFriends.length} Close Friends)`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
