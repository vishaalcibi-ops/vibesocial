import React, { useState, useEffect, useRef } from 'react'
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  Play,
  Music,
  Plus,
  ChevronUp,
  ChevronDown,
  Share2,
  Trash2,
  X,
  Send,
  AlertCircle,
  Check,
} from 'lucide-react'
import type { Reel, ReelComment } from '../../types/database.types'
import { reelService } from '../../services/reelService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'
import { CreateReelModal } from '../upload/CreateReelModal'

interface ReelsViewProps {
  onSelectProfile: (userId: string) => void
  onOpenAuth: () => void
}

const formatRelativeTime = (isoString?: string): string => {
  if (!isoString) return ''
  const past = new Date(isoString).getTime()
  const now = Date.now()
  const diffSec = Math.floor((now - past) / 1000)
  if (diffSec < 60) return `${Math.max(1, diffSec)}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  onSelectProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [reels, setReels] = useState<Reel[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<ReelComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newCommentText, setNewCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const loadReels = async () => {
    try {
      const data = await reelService.getReels({ limit: 25, currentUserId: user?.id })
      setReels(data)
    } catch (e) {
      console.error('Error fetching reels:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReels()
  }, [user])

  const currentReel = reels[currentIndex]



  // Play video on reel change or play state change
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // Autoplay with audio might require user gesture, fallback to muted
          if (videoRef.current) {
            videoRef.current.muted = true
            setIsMuted(true)
            videoRef.current.play().catch(() => {})
          }
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [currentIndex, isPlaying])

  // Check follow status for active reel author
  useEffect(() => {
    if (user && currentReel && currentReel.author_id !== user.id) {
      profileService.isFollowing(user.id, currentReel.author_id).then((isFollow) => {
        setFollowingMap((prev) => ({ ...prev, [currentReel.author_id]: isFollow }))
      })
    }
  }, [currentIndex, currentReel, user])

  // Load comments when comments drawer is opened
  useEffect(() => {
    if (showComments && currentReel) {
      setLoadingComments(true)
      reelService
        .getReelComments(currentReel.id)
        .then(setComments)
        .catch(console.error)
        .finally(() => setLoadingComments(false))
    }
  }, [showComments, currentReel?.id])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const toggleLike = async () => {
    if (!user) {
      onOpenAuth()
      return
    }
    if (!currentReel) return

    const nextLiked = !currentReel.is_liked_by_me
    // Optimistic update
    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex
          ? {
              ...r,
              is_liked_by_me: nextLiked,
              likes_count: nextLiked ? (r.likes_count || 0) + 1 : Math.max(0, (r.likes_count || 0) - 1),
            }
          : r
      )
    )

    try {
      await reelService.toggleLikeReel(currentReel.id, user.id)
    } catch (e: any) {
      console.error('Failed to toggle like on reel:', e)
      setActionError(e.message || 'Failed to update like.')
      setTimeout(() => setActionError(null), 3000)
      // Rollback
      setReels((prev) =>
        prev.map((r, i) =>
          i === currentIndex
            ? {
                ...r,
                is_liked_by_me: !nextLiked,
                likes_count: !nextLiked ? (r.likes_count || 0) + 1 : Math.max(0, (r.likes_count || 0) - 1),
              }
            : r
        )
      )
    }
  }

  const handleFollowToggle = async () => {
    if (!user) {
      onOpenAuth()
      return
    }
    if (!currentReel || currentReel.author_id === user.id) return

    const isCurrentlyFollowing = followingMap[currentReel.author_id]
    setFollowingMap((prev) => ({ ...prev, [currentReel.author_id]: !isCurrentlyFollowing }))

    try {
      if (isCurrentlyFollowing) {
        await profileService.unfollowUser(user.id, currentReel.author_id)
      } else {
        await profileService.followUser(user.id, currentReel.author_id)
      }
    } catch {
      setFollowingMap((prev) => ({ ...prev, [currentReel.author_id]: isCurrentlyFollowing }))
    }
  }

  const handleNextReel = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setIsPlaying(true)
      setShowComments(false)
    }
  }

  const handlePrevReel = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsPlaying(true)
      setShowComments(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCreateModal || showComments) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleNextReel()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        handlePrevReel()
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'm') {
        e.preventDefault()
        setIsMuted((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, reels.length, showCreateModal, showComments])

  const handleShare = async () => {
    if (!currentReel) return
    const shareUrl = `${window.location.origin}/#reels-${currentReel.id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setActionFeedback('Reel link copied to clipboard!')
      setTimeout(() => setActionFeedback(null), 3000)
    } catch {
      setActionFeedback('Share URL: ' + shareUrl)
      setTimeout(() => setActionFeedback(null), 4000)
    }
  }

  const handleDeleteReel = async () => {
    if (!currentReel || !user) return
    if (user.id !== currentReel.author_id) return

    if (window.confirm('Are you sure you want to delete this Reel? This cannot be undone.')) {
      try {
        await reelService.deleteReel(currentReel.id, user.id)
        setReels((prev) => prev.filter((r) => r.id !== currentReel.id))
        if (currentIndex >= reels.length - 1) {
          setCurrentIndex(Math.max(0, reels.length - 2))
        }
        setActionFeedback('Reel deleted successfully.')
        setTimeout(() => setActionFeedback(null), 3000)
      } catch (err: any) {
        setActionError(err.message || 'Failed to delete reel.')
        setTimeout(() => setActionError(null), 3000)
      }
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      onOpenAuth()
      return
    }
    if (!currentReel || !newCommentText.trim()) return

    setSubmittingComment(true)
    try {
      const addedComment = await reelService.addReelComment(currentReel.id, user.id, newCommentText)
      setComments((prev) => [...prev, addedComment])
      setNewCommentText('')
      // Update reel comment count
      setReels((prev) =>
        prev.map((r) => (r.id === currentReel.id ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r))
      )
    } catch (err: any) {
      setActionError(err.message || 'Failed to post comment.')
      setTimeout(() => setActionError(null), 3000)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!currentReel || !user) return
    try {
      await reelService.deleteReelComment(currentReel.id, commentId, user.id)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setReels((prev) =>
        prev.map((r) => (r.id === currentReel.id ? { ...r, comments_count: Math.max(0, (r.comments_count || 1) - 1) } : r))
      )
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete comment.')
      setTimeout(() => setActionError(null), 3000)
    }
  }

  return (
    <div className="reels-container">
      {/* Upload Reel Shortcut */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 30 }}>
        <button
          onClick={() => {
            if (!user) onOpenAuth()
            else setShowCreateModal(true)
          }}
          className="btn-primary"
          style={{ padding: '7px 15px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          <Plus size={16} />
          <span>Upload Reel</span>
        </button>
      </div>

      {/* Floating Action Feedback / Error Toast */}
      {actionFeedback && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            background: 'rgba(16, 185, 129, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Check size={16} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }} />
      ) : reels.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            maxWidth: '380px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.12)',
              color: 'var(--color-pink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Play size={28} />
          </div>
          <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Reels available yet
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Be the first creator to share a vertical clip with verified presets and high-definition video!
          </p>
          <button
            onClick={() => {
              if (!user) onOpenAuth()
              else setShowCreateModal(true)
            }}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            <Plus size={16} />
            <span>Create First Reel</span>
          </button>
        </div>
      ) : (
        <div className="reel-card" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={currentReel.video_url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="reel-video"
            key={currentReel.id}
          />

          {!isPlaying && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
                pointerEvents: 'none',
              }}
            >
              <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '18px' }}>
                <Play size={42} color="white" fill="white" />
              </div>
            </div>
          )}

          {/* Reel Overlay */}
          <div className="reel-overlay">
            {/* Top Row: Mute & Delete controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto', zIndex: 15 }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                {currentIndex + 1} / {reels.length}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user && user.id === currentReel.author_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteReel()
                    }}
                    title="Delete your Reel"
                    aria-label="Delete your Reel"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      color: '#f87171',
                      borderRadius: '50%',
                      padding: '8px',
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMuted(!isMuted)
                  }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '8px',
                  }}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            </div>

            {/* Bottom Info Column */}
            <div className="reel-bottom-info">
              <div className="reel-author-row">
                <img
                  src={
                    currentReel.author?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentReel.author?.username}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.8)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectProfile(currentReel.author_id)
                  }}
                />
                <span
                  style={{ fontWeight: 700, fontSize: '14px', color: 'white', cursor: 'pointer', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectProfile(currentReel.author_id)
                  }}
                >
                  {currentReel.author?.username}
                </span>

                {user && user.id !== currentReel.author_id && (
                  <button
                    className="reel-follow-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFollowToggle()
                    }}
                  >
                    {followingMap[currentReel.author_id] ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              {currentReel.caption && (
                <p style={{ color: 'white', fontSize: '13px', lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  {currentReel.caption}
                </p>
              )}

              <div className="reel-audio-tag">
                <Music size={13} />
                <span>{currentReel.audio_title || 'Original Audio'}</span>
              </div>
            </div>
          </div>

          {/* Right Action Icons Column */}
          <div className="reel-actions-column">
            {/* Like Button */}
            <button
              className="reel-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                toggleLike()
              }}
              aria-label="Like reel"
            >
              <Heart
                size={28}
                color={currentReel.is_liked_by_me ? '#ef4444' : 'white'}
                fill={currentReel.is_liked_by_me ? '#ef4444' : 'none'}
              />
              <span className="reel-action-label">{currentReel.likes_count || 0}</span>
            </button>

            {/* Comments Button */}
            <button
              className="reel-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowComments(!showComments)
              }}
              aria-label="Open reel comments"
            >
              <MessageCircle size={28} color="white" />
              <span className="reel-action-label">{currentReel.comments_count || 0}</span>
            </button>

            {/* Share / Copy Link Button */}
            <button
              className="reel-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
              aria-label="Share reel"
            >
              <Share2 size={26} color="white" />
              <span className="reel-action-label">Share</span>
            </button>
          </div>

          {/* Up/Down Reel Navigation Arrows */}
          <div
            style={{
              position: 'absolute',
              right: '-56px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrevReel()
              }}
              disabled={currentIndex === 0}
              aria-label="Previous reel"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'white',
                borderRadius: '50%',
                padding: '10px',
                opacity: currentIndex === 0 ? 0.35 : 1,
                cursor: currentIndex === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ChevronUp size={20} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNextReel()
              }}
              disabled={currentIndex === reels.length - 1}
              aria-label="Next reel"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'white',
                borderRadius: '50%',
                padding: '10px',
                opacity: currentIndex === reels.length - 1 ? 0.35 : 1,
                cursor: currentIndex === reels.length - 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Comments Overlay Drawer */}
          {showComments && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '65%',
                background: 'var(--bg-elevated)',
                borderTop: '1px solid var(--border-strong)',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 45,
                boxShadow: '0 -10px 30px rgba(0,0,0,0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Comments Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  Comments ({comments.length})
                </span>
                <button onClick={() => setShowComments(false)} aria-label="Close comments">
                  <X size={18} />
                </button>
              </div>

              {/* Comments List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingComments ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      No comments yet
                    </p>
                    <p style={{ fontSize: '12px' }}>Start the conversation!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <img
                        src={
                          comment.author?.avatar_url ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                        }
                        alt={comment.author?.username || 'User'}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {comment.author?.username || 'user'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {comment.content}
                        </p>
                      </div>

                      {user && (user.id === comment.author_id || user.id === currentReel.author_id) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          title="Delete comment"
                          aria-label="Delete comment"
                          style={{ color: 'var(--text-muted)', padding: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              {user ? (
                <form
                  onSubmit={handleAddComment}
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add a comment on this reel..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    disabled={submittingComment}
                    maxLength={300}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!newCommentText.trim() || submittingComment}
                    style={{ padding: '8px 14px' }}
                    aria-label="Post comment"
                  >
                    <Send size={14} />
                  </button>
                </form>
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                  <button onClick={onOpenAuth} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px', margin: '0 auto' }}>
                    Log in to comment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Reel Modal */}
      <CreateReelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newReel) => {
          setReels((prev) => [newReel, ...prev])
          setCurrentIndex(0)
          setActionFeedback('Reel published successfully!')
          setTimeout(() => setActionFeedback(null), 3000)
        }}
      />
    </div>
  )
}
