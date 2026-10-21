import React, { useState, useEffect } from 'react'
import { X, Search, User } from 'lucide-react'
import type { Profile } from '../../types/database.types'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'

interface FollowListModalProps {
  userId: string
  initialTab?: 'followers' | 'following'
  isOpen: boolean
  onClose: () => void
  onSelectProfile: (userId: string) => void
  onOpenAuth: () => void
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  userId,
  initialTab = 'followers',
  isOpen,
  onClose,
  onSelectProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [followers, setFollowers] = useState<Profile[]>([])
  const [following, setFollowing] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!isOpen || !userId) return

    setLoading(true)
    Promise.all([
      profileService.getFollowers(userId),
      profileService.getFollowing(userId),
    ])
      .then(([fList, fingList]) => {
        setFollowers(fList)
        setFollowing(fingList)

        // Check if current user follows each of them
        if (user) {
          const allUserIds = Array.from(
            new Set([...fList.map((p) => p.id), ...fingList.map((p) => p.id)])
          ).filter((id) => id !== user.id)

          Promise.all(
            allUserIds.map((targetId) =>
              profileService.isFollowing(user.id, targetId).then((res) => ({ id: targetId, res }))
            )
          ).then((results) => {
            const map: Record<string, boolean> = {}
            results.forEach(({ id, res }) => {
              map[id] = res
            })
            setFollowingMap(map)
          })
        }
      })
      .catch((err) => console.error('Error loading follow list:', err))
      .finally(() => setLoading(false))
  }, [isOpen, userId, user])

  if (!isOpen) return null

  const handleToggleFollow = async (targetId: string) => {
    if (!user) {
      onOpenAuth()
      return
    }

    const currentStatus = Boolean(followingMap[targetId])
    const nextStatus = !currentStatus

    setFollowingMap((prev) => ({ ...prev, [targetId]: nextStatus }))

    try {
      if (nextStatus) {
        await profileService.followUser(user.id, targetId)
      } else {
        await profileService.unfollowUser(user.id, targetId)
      }
    } catch {
      setFollowingMap((prev) => ({ ...prev, [targetId]: currentStatus }))
    }
  }

  const currentList = activeTab === 'followers' ? followers : following
  const filteredList = currentList.filter(
    (p) =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '92%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
      >
        {/* Header Tabs */}
        <div className="modal-header" style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <button
              onClick={() => setActiveTab('followers')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: activeTab === 'followers' ? 700 : 500,
                color: activeTab === 'followers' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'followers' ? '2px solid var(--text-primary)' : '2px solid transparent',
                paddingBottom: '8px',
                cursor: 'pointer',
              }}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: activeTab === 'following' ? 700 : 500,
                color: activeTab === 'following' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'following' ? '2px solid var(--text-primary)' : '2px solid transparent',
                paddingBottom: '8px',
                cursor: 'pointer',
              }}
            >
              Following ({following.length})
            </button>
          </div>
          <button onClick={onClose} className="action-btn" aria-label="Close follow modal">
            <X size={18} />
          </button>
        </div>

        {/* Search within list */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '26px', top: '20px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within list..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>

        {/* List Items */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="skeleton" style={{ width: '100px', height: '14px' }} />
                    <div className="skeleton" style={{ width: '140px', height: '11px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <User size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>
                {searchQuery
                  ? 'No matching users found.'
                  : activeTab === 'followers'
                  ? 'No followers yet.'
                  : 'Not following anyone yet.'}
              </p>
            </div>
          ) : (
            filteredList.map((p) => {
              const isMe = user?.id === p.id
              const isFollowed = Boolean(followingMap[p.id])

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                    onClick={() => {
                      onSelectProfile(p.id)
                      onClose()
                    }}
                  >
                    <img
                      src={
                        p.avatar_url ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={p.username}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{p.username}</span>
                        {p.is_verified && <span className="verified-icon">●</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.full_name}</div>
                    </div>
                  </div>

                  {!isMe && user && (
                    <button
                      className={isFollowed ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => handleToggleFollow(p.id)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        minWidth: '90px',
                      }}
                    >
                      {isFollowed ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
