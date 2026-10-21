import React, { useState, useEffect } from 'react'
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Trash2,
  Edit2,
  Archive,
  Flag,
  Check,
  ChevronLeft,
  ChevronRight,
  Music,
  Volume2,
  Pause,
} from 'lucide-react'
import type { Post } from '../../types/database.types'
import { postService } from '../../services/postService'
import { useAuth } from '../../context/AuthContext'
import { CommentsModal } from './CommentsModal'
import { EditPostModal } from './EditPostModal'
import { ReportModal } from '../common/ReportModal'
import { globalAudioManager } from '../../services/musicService'

interface PostCardProps {
  post: Post
  onSelectProfile: (userId: string) => void
  onDeleteSuccess?: (postId: string) => void
  onOpenAuth: () => void
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onSelectProfile,
  onDeleteSuccess,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [currentCaption, setCurrentCaption] = useState(post.caption || '')
  const [currentLocation, setCurrentLocation] = useState(post.location || '')
  const [isLiked, setIsLiked] = useState(Boolean(post.is_liked_by_me))
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [isSaved, setIsSaved] = useState(Boolean(post.is_saved_by_me))
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [quickComment, setQuickComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [isArchived, setIsArchived] = useState(Boolean(post.is_archived))
  const [isTrackPlaying, setIsTrackPlaying] = useState(false)

  // Sync with global audio player
  useEffect(() => {
    if (!post.audio_track) return
    const trackId = post.audio_track.id || post.audio_track.audio_url
    const unsub = globalAudioManager.subscribe((state) => {
      setIsTrackPlaying(state.isPlaying && state.activeTrackId === trackId)
    })
    return () => unsub()
  }, [post.audio_track])

  const toggleAudioPlayback = () => {
    if (post.audio_track) {
      globalAudioManager.playTrack(post.audio_track)
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const mediaList = post.media && post.media.length > 0 ? post.media : []
  const isAuthor = user?.id === post.author_id

  const handleArchivePost = async () => {
    if (!user || !isAuthor) return
    setShowOptions(false)
    try {
      await postService.archivePost(post.id, user.id)
      setIsArchived(true)
      if (onDeleteSuccess) onDeleteSuccess(post.id)
    } catch (e) {
      console.error('Failed to archive post:', e)
      alert('Failed to archive post.')
    }
  }

  const handleToggleLike = async () => {
    if (!user) {
      onOpenAuth()
      return
    }

    setActionError(null)
    // Optimistic update
    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)))

    try {
      await postService.toggleLikePost(post.id, user.id)
    } catch (err: any) {
      // Rollback on failure
      setIsLiked(!nextLiked)
      setLikesCount((prev) => (nextLiked ? Math.max(0, prev - 1) : prev + 1))
      console.error('Failed to toggle like:', err)
      setActionError(err?.message || 'Could not update like. Please try again.')
    }
  }

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleToggleLike()
    }
    setShowHeartAnimation(true)
    setTimeout(() => setShowHeartAnimation(false), 900)
  }

  const handleToggleSave = async () => {
    if (!user) {
      onOpenAuth()
      return
    }

    const nextSaved = !isSaved
    setIsSaved(nextSaved)

    try {
      await postService.toggleSavePost(post.id, user.id)
    } catch (err) {
      setIsSaved(!nextSaved)
      console.error('Failed to toggle save:', err)
    }
  }

  const handleDeletePost = async () => {
    if (!user || !isAuthor) return
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await postService.deletePost(post.id, user.id)
        if (onDeleteSuccess) onDeleteSuccess(post.id)
      } catch (e) {
        console.error('Failed to delete post:', e)
      }
    }
  }

  const handleQuickCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickComment.trim() || !user || submittingComment) return

    setSubmittingComment(true)
    setActionError(null)
    try {
      await postService.addComment(post.id, user.id, quickComment)
      setQuickComment('')
      setCommentsCount((prev) => prev + 1)
    } catch (e: any) {
      console.error('Failed to post comment:', e)
      setActionError(e?.message || 'Failed to post comment.')
    } finally {
      setSubmittingComment(false)
    }
  }

  const currentMedia = mediaList[activeMediaIndex]

  if (isArchived) return null

  return (
    <article className="post-card">
      {/* Header */}
      <div className="post-header">
        <div
          className="post-author-info"
          onClick={() => onSelectProfile(post.author_id)}
          style={{ cursor: 'pointer' }}
        >
          <img
            src={post.author?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
            alt={post.author?.username || 'User'}
            className="author-avatar"
          />
          <div className="author-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="author-username">
                {post.author?.username || 'user'}
                {post.author?.is_verified && <span className="verified-icon">●</span>}
              </span>
              {(post.is_close_friends || post.visibility === 'close_friends') && (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
                  }}
                  title="Shared with Close Friends only"
                >
                  <span>★</span> Close Friends
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {currentLocation && (
                <span
                  className="post-location"
                  onClick={(e) => {
                    if (post.location_lat && post.location_lng) {
                      e.stopPropagation()
                      window.open(`https://www.openstreetmap.org/?mlat=${post.location_lat}&mlon=${post.location_lng}#map=16/${post.location_lat}/${post.location_lng}`, '_blank')
                    }
                  }}
                  style={{
                    cursor: post.location_lat ? 'pointer' : 'default',
                    color: post.location_lat ? '#10b981' : undefined,
                  }}
                  title={post.location_lat ? 'Click to view on real map' : undefined}
                >
                  {post.location_lat ? `📍 ${currentLocation}` : currentLocation}
                </span>
              )}
              {post.audio_track && (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleAudioPlayback()
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isTrackPlaying ? 'var(--color-pink, #e1306c)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    maxWidth: 'min(200px, 45vw)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    background: isTrackPlaying ? 'rgba(225, 48, 108, 0.1)' : 'transparent',
                    padding: isTrackPlaying ? '1px 6px' : '0',
                    borderRadius: 'var(--radius-full, 999px)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to play soundtrack"
                >
                  <Music size={11} />
                  <span>
                    {post.audio_track.artist} • {post.audio_track.title}
                  </span>
                  {isTrackPlaying && (
                    <span
                      style={{
                        display: 'inline-flex',
                        gap: '1px',
                        alignItems: 'center',
                        height: '10px',
                        marginLeft: '2px',
                      }}
                    >
                      <span
                        style={{
                          width: '2px',
                          height: '9px',
                          background: 'var(--color-pink, #e1306c)',
                          animation: 'waveBar 0.4s ease-in-out infinite alternate',
                        }}
                      />
                      <span
                        style={{
                          width: '2px',
                          height: '6px',
                          background: 'var(--color-pink, #e1306c)',
                          animation: 'waveBar 0.3s ease-in-out infinite alternate 0.15s',
                        }}
                      />
                      <span
                        style={{
                          width: '2px',
                          height: '10px',
                          background: 'var(--color-pink, #e1306c)',
                          animation: 'waveBar 0.5s ease-in-out infinite alternate 0.3s',
                        }}
                      />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="action-btn"
            style={{ color: 'var(--text-muted)' }}
          >
            <MoreHorizontal size={20} />
          </button>

          {showOptions && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '28px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 30,
                width: '150px',
                overflow: 'hidden',
              }}
            >
              {isAuthor ? (
                <>
                  <button
                    onClick={() => {
                      setShowOptions(false)
                      setShowEditModal(true)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <Edit2 size={15} />
                    <span>Edit Post</span>
                  </button>
                  <button
                    onClick={handleArchivePost}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <Archive size={15} />
                    <span>Archive Post</span>
                  </button>
                  <button
                    onClick={handleDeletePost}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Post</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowOptions(false)
                    setShowReportModal(true)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 14px',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <Flag size={15} />
                  <span>Report</span>
                </button>
              )}
              <button
                onClick={async () => {
                  setShowOptions(false)
                  const postUrl = `${window.location.origin}/?tab=feed`
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `Post by ${post.author?.username || 'user'}`,
                        text: currentCaption,
                        url: postUrl,
                      })
                      return
                    } catch {
                      // fallback
                    }
                  }
                  await navigator.clipboard.writeText(postUrl)
                  showToast('Post link copied to clipboard!')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 14px',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <Share2 size={15} />
                <span>Share / Copy</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media Carousel with Double-Tap Like */}
      <div
        className="post-media-container"
        onDoubleClick={handleDoubleTap}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        {currentMedia ? (
          currentMedia.media_type === 'video' ? (
            <video
              src={currentMedia.storage_path}
              controls
              playsInline
              className="post-media-video"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <img
              src={currentMedia.storage_path}
              alt="Post media"
              className="post-media-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
              }}
            />
          )
        ) : (
          <div
            style={{
              padding: '40px 24px',
              minHeight: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-light)',
              borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            "{post.caption}"
          </div>
        )}

        {/* Popping Heart Animation on Double-Tap */}
        {showHeartAnimation && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              animation: 'scaleUp 0.3s ease-out',
            }}
          >
            <Heart size={90} color="#ED4956" fill="#ED4956" style={{ filter: 'drop-shadow(0 4px 14px rgba(237, 73, 86, 0.45))' }} />
          </div>
        )}

        {/* Carousel Prev/Next Buttons */}
        {mediaList.length > 1 && (
          <>
            {activeMediaIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMediaIndex((prev) => prev - 1)
                }}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '6px',
                }}
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {activeMediaIndex < mediaList.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMediaIndex((prev) => prev + 1)
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '6px',
                }}
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Pagination Dots */}
            <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '5px' }}>
              {mediaList.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: idx === activeMediaIndex ? 'var(--color-pink)' : 'rgba(255, 255, 255, 0.4)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Floating Instagram Audio Badge */}
        {post.audio_track && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleAudioPlayback()
            }}
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: 'var(--radius-full, 999px)',
              padding: isTrackPlaying ? '4px 10px 4px 5px' : '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fff',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              transition: 'all 0.2s ease',
            }}
            title={isTrackPlaying ? 'Pause soundtrack' : `Play soundtrack: ${post.audio_track.title}`}
          >
            {/* Spinning Vinyl Record Disc */}
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#111',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                animation: isTrackPlaying ? 'spinRecord 3s linear infinite' : 'none',
              }}
            >
              <img
                src={
                  post.audio_track.artwork_url ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=50&auto=format&fit=crop&q=80'
                }
                alt="Vinyl Art"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {isTrackPlaying ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Pause size={12} fill="#fff" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    maxWidth: '110px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {post.audio_track.title}
                </span>
              </div>
            ) : (
              <Volume2 size={13} />
            )}
          </button>
        )}
      </div>

      {/* Action Row */}
      <div className="post-actions">
        <div className="post-actions-left">
          <button
            onClick={handleToggleLike}
            className={`action-btn ${isLiked ? 'liked' : ''}`}
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
          >
            <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => setShowCommentsModal(true)}
            className="action-btn"
            aria-label="View comments"
          >
            <MessageCircle size={24} />
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'VibeSocial Post', text: post.caption, url: window.location.href })
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
            className="action-btn"
            aria-label="Share post"
          >
            <Share2 size={24} />
          </button>
        </div>

        <button
          onClick={handleToggleSave}
          className={`action-btn ${isSaved ? 'saved' : ''}`}
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
        >
          <Bookmark size={24} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Content & Metadata */}
      <div className="post-content-body">
        <div className="likes-count">
          {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
        </div>

        {currentCaption && (
          <div className="post-caption">
            <span
              className="caption-username"
              onClick={() => onSelectProfile(post.author_id)}
              style={{ cursor: 'pointer' }}
            >
              {post.author?.username || 'user'}
            </span>
            <span>{currentCaption}</span>
          </div>
        )}

        {commentsCount > 0 && (
          <button
            onClick={() => setShowCommentsModal(true)}
            className="view-comments-btn"
          >
            View all {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
          </button>
        )}

        <span className="post-time">
          {new Date(post.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>

        {actionError && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '12px',
            }}
          >
            {actionError}
          </div>
        )}
      </div>

      {/* Inline Quick Comment Input */}
      {user && (
        <form onSubmit={handleQuickCommentSubmit} className="add-comment-row">
          <input
            type="text"
            placeholder="Add a comment..."
            className="comment-input"
            value={quickComment}
            onChange={(e) => setQuickComment(e.target.value)}
            disabled={submittingComment}
          />
          <button
            type="submit"
            className="comment-submit-btn"
            disabled={!quickComment.trim() || submittingComment}
          >
            Post
          </button>
        </form>
      )}

      {/* Comments Drawer Modal */}
      <CommentsModal
        postId={post.id}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        onCommentCountChange={(count) => setCommentsCount(count)}
      />

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            setCurrentCaption(updated.caption)
            setCurrentLocation(updated.location || '')
            showToast('Post updated successfully.')
          }}
        />
      )}

      {/* Report Post Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetId={post.id}
          targetType="post"
          targetTitle={currentCaption ? `"${currentCaption.slice(0, 30)}..."` : 'Post'}
        />
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </article>
  )
}
