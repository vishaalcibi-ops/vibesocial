import React, { useState, useEffect } from 'react'
import {
  Search,
  User,
  MessageCircle,
  ExternalLink,
  Sparkles,
  X,
  Compass,
  AlertCircle,
} from 'lucide-react'
import type { Profile } from '../../types/database.types'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'

interface SearchViewProps {
  onSelectProfile: (userId: string) => void
  onStartMessageWithUser: (userId: string) => void
  onOpenAuth?: () => void
}

export const SearchView: React.FC<SearchViewProps> = ({
  onSelectProfile,
  onStartMessageWithUser,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [discoverUsers, setDiscoverUsers] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingDiscover, setLoadingDiscover] = useState(Boolean(user))
  const [searchError, setSearchError] = useState<string | null>(null)
  const [discoverError, setDiscoverError] = useState<string | null>(null)

  // Load real discover users from Firestore when signed in
  useEffect(() => {
    if (!user) {
      setDiscoverUsers([])
      setLoadingDiscover(false)
      return
    }

    let isMounted = true
    setLoadingDiscover(true)
    setDiscoverError(null)

    profileService
      .getDiscoverUsers(user.id, 12)
      .then((users) => {
        if (isMounted) {
          setDiscoverUsers(users)
        }
      })
      .catch((err) => {
        console.error('Failed to load discover users:', err)
        if (isMounted) {
          setDiscoverError('Could not load recommended creators.')
        }
      })
      .finally(() => {
        if (isMounted) setLoadingDiscover(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  // Debounced real-time user search across username and display name
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults([])
      setSearching(false)
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)

    const timer = setTimeout(async () => {
      try {
        const results = await profileService.searchProfiles(trimmed, 20)
        // Deduplicate results and avoid self if desired
        const unique = Array.from(
          new Map(results.map((item) => [item.id, item])).values()
        )
        setSearchResults(unique)
      } catch (err: any) {
        console.error('Search error:', err)
        setSearchError('Error finding users. Please try again.')
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const defaultAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '0 4px',
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
          Search & Discover
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Find creators, search by @username or full name, and discover real community members.
        </p>
      </div>

      {/* Debounced Search Input Bar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: searchQuery ? 'var(--color-pink)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}
        />
        <input
          type="text"
          placeholder="Search by @username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 44px 14px 48px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            fontSize: '15px',
            color: 'var(--text-primary)',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
          }}
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Error State */}
      {searchError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{searchError}</span>
        </div>
      )}

      {/* Search Results Section */}
      {searchQuery.trim() !== '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Search Results
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {searching ? 'Searching Firestore...' : `${searchResults.length} found`}
            </span>
          </div>

          {searching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{
                    height: '68px',
                    borderRadius: 'var(--radius-md)',
                    width: '100%',
                  }}
                />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <User size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}
              >
                No users found
              </p>
              <p style={{ fontSize: '13px' }}>
                No registered accounts match &quot;{searchQuery}&quot;. Try another username or display name.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              {searchResults.map((p) => {
                const isMe = user?.id === p.id
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--border-light)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div
                      onClick={() => onSelectProfile(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        cursor: 'pointer',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <img
                        src={p.avatar_url || defaultAvatar}
                        alt={p.username}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border-subtle)',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '15px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {p.username}
                          </span>
                          {p.is_verified && (
                            <span
                              style={{
                                color: '#3b82f6',
                                fontSize: '12px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-full)',
                              }}
                            >
                              ✓
                            </span>
                          )}
                          {isMe && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                background: 'var(--bg-elevated)',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.full_name}
                        </div>
                        {p.bio && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginTop: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {p.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isMe && user && (
                        <button
                          onClick={() => onStartMessageWithUser(p.id)}
                          className="btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            fontSize: '13px',
                          }}
                          title={`Message ${p.username}`}
                        >
                          <MessageCircle size={15} />
                          <span>Message</span>
                        </button>
                      )}
                      <button
                        onClick={() => onSelectProfile(p.id)}
                        className="btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '13px',
                        }}
                      >
                        <ExternalLink size={14} />
                        <span>Profile</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Discover Section (Real Firestore Data) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="var(--color-pink)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Discover People</h2>
        </div>

        {discoverError && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{discoverError}</p>
        )}

        {!user ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <Compass size={38} style={{ margin: '0 auto 10px auto', opacity: 0.7, color: 'var(--color-pink)' }} />
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Sign in to Discover Creators
            </p>
            <p style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto 16px auto' }}>
              Log in or create a free account to search registered users, view profiles, and start direct conversations.
            </p>
            {onOpenAuth && (
              <button onClick={onOpenAuth} className="btn-primary" style={{ margin: '0 auto' }}>
                Sign In / Sign Up
              </button>
            )}
          </div>
        ) : loadingDiscover ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  height: '180px',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
            ))}
          </div>
        ) : discoverUsers.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <Compass size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              No other creators registered yet
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Invite friends to sign up or create new accounts to start interacting!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {discoverUsers.map((creator) => (
              <div
                key={creator.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '10px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.4)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <img
                  src={creator.avatar_url || defaultAvatar}
                  alt={creator.username}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: '2px solid var(--color-pink)',
                  }}
                  onClick={() => onSelectProfile(creator.id)}
                />

                <div
                  style={{ cursor: 'pointer', width: '100%' }}
                  onClick={() => onSelectProfile(creator.id)}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {creator.full_name || creator.username}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-pink)', fontWeight: 600 }}>
                    @{creator.username}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    minHeight: '34px',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {creator.bio || 'Active VibeSocial creator'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    marginTop: '4px',
                  }}
                >
                  {user && user.id !== creator.id && (
                    <button
                      onClick={() => onStartMessageWithUser(creator.id)}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        padding: '6px 8px',
                        justifyContent: 'center',
                      }}
                      title="Direct message"
                    >
                      <MessageCircle size={14} />
                      <span>Chat</span>
                    </button>
                  )}
                  <button
                    onClick={() => onSelectProfile(creator.id)}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      padding: '6px 8px',
                      justifyContent: 'center',
                    }}
                  >
                    <span>Profile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
