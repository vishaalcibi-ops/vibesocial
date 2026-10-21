import React, { useState, useEffect } from 'react'
import { PlusSquare, RefreshCw, Camera } from 'lucide-react'
import type { Post, Story } from '../../types/database.types'
import { postService } from '../../services/postService'
import { useAuth } from '../../context/AuthContext'
import { getBackendProvider } from '../../services/backendConfig'
import { StoriesBar } from './StoriesBar'
import { StoryViewerModal } from './StoryViewerModal'
import { PostCard } from './PostCard'
import { ConfigBanner } from '../common/ConfigBanner'
import { NotesTray } from '../notes/NotesTray'

interface FeedViewProps {
  onOpenCreatePost: () => void
  onOpenCreateStory: () => void
  onSelectProfile: (userId: string) => void
  onOpenAuth: () => void
}

export const FeedView: React.FC<FeedViewProps> = ({
  onOpenCreatePost,
  onOpenCreateStory,
  onSelectProfile,
  onOpenAuth,
}) => {
  const { user, loading: authLoading } = useAuth()
  const isFirebase = getBackendProvider() === 'firebase'
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeStoryGroup, setActiveStoryGroup] = useState<{ authorId: string; author: any; stories: Story[] } | null>(null)
  const [storyRefreshTrigger, setStoryRefreshTrigger] = useState(0)

  const loadFeed = async () => {
    setFetchError(null)
    try {
      const data = await postService.getFeedPosts({ limit: 15, currentUserId: user?.id })
      setPosts(data)
    } catch (e: any) {
      console.error('Failed to load feed:', e)
      setFetchError(e.message || 'Could not connect to database.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      loadFeed()
    }
  }, [user, authLoading])

  const handleRefresh = () => {
    setRefreshing(true)
    loadFeed()
  }

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <div className="feed-container">
      {/* Supabase Connection Setup Banner if credentials not configured */}
      <ConfigBanner />

      {/* Stories Carousel Bar */}
      <StoriesBar
        onOpenCreateStory={onOpenCreateStory}
        onSelectStoryGroup={(group) => setActiveStoryGroup(group)}
        refreshTrigger={storyRefreshTrigger}
      />

      {/* Instagram Notes Tray (with Music) */}
      <NotesTray
        compact
        onOpenDirectChat={(targetId) => onSelectProfile(targetId)}
        onOpenAuth={onOpenAuth}
      />

      {/* Subtle Feed Refresh Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: '2px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Suggested For You
        </span>
        <button
          onClick={handleRefresh}
          className="action-btn"
          style={{ color: 'var(--text-muted)', fontSize: '12px', gap: '4px' }}
          title="Refresh Feed"
        >
          <RefreshCw size={13} className={refreshing ? 'rotating' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feed Post Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="post-card" style={{ padding: '0' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px' }}>
                <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div className="skeleton" style={{ width: '110px', height: '12px' }} />
                  <div className="skeleton" style={{ width: '60px', height: '9px' }} />
                </div>
              </div>
              <div className="skeleton" style={{ width: '100%', height: '380px', borderRadius: '0' }} />
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '80px', height: '12px' }} />
                <div className="skeleton" style={{ width: '220px', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '36px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-like)' }}>
            {fetchError.includes('Missing or insufficient permissions') || fetchError.includes('permission-denied')
              ? 'Firestore Security Rules Need to Be Published'
              : 'Unable to load feed posts'}
          </span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '420px', lineHeight: 1.5 }}>
            {fetchError.includes('Missing or insufficient permissions') || fetchError.includes('permission-denied')
              ? 'Your Firebase project (vibesocial-app-906a8) is currently rejecting database queries because default locked rules are active in the Firebase Console. Paste firestore.rules into Firebase Console > Firestore Database > Rules and click Publish.'
              : fetchError}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={handleRefresh} className="btn-primary">
              <RefreshCw size={14} className={refreshing ? 'rotating' : ''} />
              <span>Retry Connection</span>
            </button>
            <a
              href="https://console.firebase.google.com/project/vibesocial-app-906a8/firestore/rules"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Open Firebase Rules
            </a>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '2px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <Camera size={32} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Welcome to VibeSocial!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px', lineHeight: 1.45 }}>
            {isFirebase
              ? 'No posts in your feed yet! Share your first photo or video using presets or URLs to start the vibe.'
              : 'No posts found in the feed. Connect your database or create your first post to see it here!'}
          </p>
          <button
            onClick={() => {
              if (!user) onOpenAuth()
              else onOpenCreatePost()
            }}
            className="btn-primary"
            style={{ marginTop: '6px' }}
          >
            <PlusSquare size={16} />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onSelectProfile={onSelectProfile}
            onDeleteSuccess={handleDeletePost}
            onOpenAuth={onOpenAuth}
          />
        ))
      )}

      {/* Story Viewer Modal */}
      {activeStoryGroup && (
        <StoryViewerModal
          storyGroup={activeStoryGroup}
          onClose={() => setActiveStoryGroup(null)}
          onStoryDeleted={() => {
            setActiveStoryGroup(null)
            setStoryRefreshTrigger((prev) => prev + 1)
          }}
        />
      )}
    </div>
  )
}
