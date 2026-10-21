import React, { useState, useEffect } from 'react'
import { Bookmark, Heart, MessageCircle, Lock } from 'lucide-react'
import type { Post } from '../../types/database.types'
import { postService } from '../../services/postService'
import { useAuth } from '../../context/AuthContext'
import { PostDetailModal } from '../feed/PostDetailModal'

interface SavedViewProps {
  onSelectProfile: (userId: string) => void
  onOpenAuth: () => void
}

export const SavedView: React.FC<SavedViewProps> = ({
  onSelectProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    postService
      .getSavedPosts(user.id)
      .then(setSavedPosts)
      .catch((err) => console.error('Failed to load saved posts:', err))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <Bookmark size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-pink)' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Sign In to View Saved Posts
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '360px', margin: '0 auto 16px auto' }}>
          Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.
        </p>
        <button className="btn-primary" onClick={onOpenAuth} style={{ margin: '0 auto' }}>
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '935px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Saved</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Lock size={14} />
            <span>Only you can see what you've saved</span>
          </div>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {savedPosts.length} {savedPosts.length === 1 ? 'post' : 'posts'}
        </span>
      </div>

      {loading ? (
        <div className="explore-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
      ) : savedPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '2px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Bookmark size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Save</h3>
          <p style={{ fontSize: '14px', maxWidth: '340px', margin: '0 auto' }}>
            Save photos and videos that you want to see again. Click the bookmark icon under any post to save it.
          </p>
        </div>
      ) : (
        <div className="explore-grid">
          {savedPosts.map((post) => {
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
                    <img src={media.storage_path} alt="Saved thumbnail" className="explore-img" loading="lazy" />
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
