import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle, Clock, Grid, User } from 'lucide-react'
import type { Post } from '../../types/database.types'
import { postService } from '../../services/postService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'
import { PostDetailModal } from '../feed/PostDetailModal'

interface ActivityViewProps {
  onSelectProfile: (userId: string) => void
  onOpenAuth: () => void
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  onSelectProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'likes' | 'posts' | 'stats'>('likes')
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [stats, setStats] = useState({ followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      postService.getUserActivity(user.id),
      profileService.getFollowStats(user.id),
    ])
      .then(([activity, followStats]) => {
        setLikedPosts(activity.likedPosts)
        setUserPosts(activity.userPosts)
        setStats(followStats)
      })
      .catch((err) => console.error('Failed to load activity:', err))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <Clock size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-pink)' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Sign In to View Your Activity
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '360px', margin: '0 auto 16px auto' }}>
          Sign in to check your likes, comments history, and upload statistics.
        </p>
        <button className="btn-primary" onClick={onOpenAuth} style={{ margin: '0 auto' }}>
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '935px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Your Activity</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          One place to review the posts you've liked and your shared content.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '28px' }}>
        <button
          onClick={() => setActiveTab('likes')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '10px',
            fontSize: '14px',
            fontWeight: activeTab === 'likes' ? 700 : 500,
            color: activeTab === 'likes' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'likes' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          <Heart size={16} color={activeTab === 'likes' ? '#ef4444' : 'currentColor'} />
          <span>Likes ({likedPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '10px',
            fontSize: '14px',
            fontWeight: activeTab === 'posts' ? 700 : 500,
            color: activeTab === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'posts' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          <Grid size={16} />
          <span>Your Posts ({userPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '10px',
            fontSize: '14px',
            fontWeight: activeTab === 'stats' ? 700 : 500,
            color: activeTab === 'stats' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'stats' ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          <Clock size={16} />
          <span>Account Overview</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="explore-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
      ) : activeTab === 'stats' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <Grid size={24} color="var(--color-pink)" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{userPosts.length}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Shared Posts</div>
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <Heart size={24} color="#ef4444" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{likedPosts.length}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Liked Posts</div>
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <User size={24} color="#3b82f6" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.followers}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Followers</div>
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <User size={24} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.following}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Following</div>
          </div>
        </div>
      ) : (activeTab === 'likes' ? likedPosts : userPosts).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {activeTab === 'likes' ? 'No Liked Posts' : 'No Posts Uploaded'}
          </p>
          <p style={{ fontSize: '13px' }}>
            {activeTab === 'likes'
              ? 'When you like photos or videos, they will appear here.'
              : 'Create your first post to see it here.'}
          </p>
        </div>
      ) : (
        <div className="explore-grid">
          {(activeTab === 'likes' ? likedPosts : userPosts).map((post) => {
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
                    <img src={media.storage_path} alt="Post preview" className="explore-img" loading="lazy" />
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

      {/* Post Detail Modal */}
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
