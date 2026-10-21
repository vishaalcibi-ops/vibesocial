import React, { useState, useEffect } from 'react'
import { Search, Heart, MessageCircle, User } from 'lucide-react'
import type { Post, Profile } from '../../types/database.types'
import { postService } from '../../services/postService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'
import { PostDetailModal } from '../feed/PostDetailModal'

interface ExploreViewProps {
  onSelectProfile: (userId: string) => void
  onSelectPost?: (post: Post) => void
  onOpenAuth?: () => void
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onSelectProfile,
  onOpenAuth = () => {},
}) => {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  // Load explore posts
  useEffect(() => {
    postService
      .getExplorePosts({ limit: 30, currentUserId: user?.id })
      .then((data) => setPosts(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [user])

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const results = await profileService.searchProfiles(searchQuery)
        setSearchResults(results)
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  return (
    <div style={{ width: '100%', maxWidth: '935px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search Header */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search creators, hashtags, or friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
          }}
        />

        {/* Search Results Dropdown */}
        {searchQuery.trim() && (
          <div
            style={{
              position: 'absolute',
              top: '48px',
              left: 0,
              right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 40,
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {searching ? (
              <p style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Searching...</p>
            ) : searchResults.length === 0 ? (
              <p style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No users found for "{searchQuery}".</p>
            ) : (
              searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProfile(p.id)
                    setSearchQuery('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <img
                    src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={p.username}
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.full_name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Explore Grid */}
      {loading ? (
        <div className="explore-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <User size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Explore feed is fresh</p>
          <p style={{ fontSize: '14px' }}>New posts uploaded by creators will appear here automatically.</p>
        </div>
      ) : (
        <div className="explore-grid">
          {posts.map((post) => {
            const media = post.media && post.media[0]
            return (
              <div
                key={post.id}
                className="explore-item"
                onClick={() => setSelectedPost(post)}
              >
                {media ? (
                  media.media_type === 'video' ? (
                    <video src={media.storage_path} className="explore-img" />
                  ) : (
                    <img src={media.storage_path} alt="Explore post" className="explore-img" loading="lazy" />
                  )
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Post
                  </div>
                )}

                <div className="explore-overlay">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={18} fill="white" />
                    <span>{post.likes_count || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={18} fill="white" />
                    <span>{post.comments_count || 0}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          onSelectProfile={onSelectProfile}
          onOpenAuth={onOpenAuth}
        />
      )}
    </div>
  )
}
