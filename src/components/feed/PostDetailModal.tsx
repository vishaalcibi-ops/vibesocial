import React, { useState, useEffect, useRef } from 'react'
import {
  X,
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
  AlertCircle,
  Music,
  Play,
  Pause,
} from 'lucide-react'
import type { Post, Comment } from '../../types/database.types'
import { postService } from '../../services/postService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'
import { EditPostModal } from './EditPostModal'
import { ReportModal } from '../common/ReportModal'
import { globalAudioManager } from '../../services/musicService'

interface PostDetailModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onSelectProfile: (userId: string) => void
  onPostUpdated?: (updated: Post) => void
  onPostDeleted?: (postId: string) => void
  onOpenAuth: () => void
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post: initialPost,
  isOpen,
  onClose,
  onSelectProfile,
  onPostUpdated,
  onPostDeleted,
  onOpenAuth,
}) => {
  const { user } = useAuth()
  const [currentPost, setCurrentPost] = useState<Post | null>(initialPost)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [isLiked, setIsLiked] = useState(Boolean(initialPost?.is_liked_by_me))
  const [likesCount, setLikesCount] = useState(initialPost?.likes_count || 0)
  const [isSaved, setIsSaved] = useState(Boolean(initialPost?.is_saved_by_me))
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isTrackPlaying, setIsTrackPlaying] = useState(false)
  const commentInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setCurrentPost(initialPost)
    if (initialPost) {
      setIsLiked(Boolean(initialPost.is_liked_by_me))
      setLikesCount(initialPost.likes_count || 0)
      setIsSaved(Boolean(initialPost.is_saved_by_me))
    }
  }, [initialPost])

  // Sync audio playback
  useEffect(() => {
    if (!currentPost?.audio_track) return
    const trackId = currentPost.audio_track.id || currentPost.audio_track.audio_url
    const unsub = globalAudioManager.subscribe((state) => {
      setIsTrackPlaying(state.isPlaying && state.activeTrackId === trackId)
    })
    return () => unsub()
  }, [currentPost?.audio_track])

  const toggleAudio = () => {
    if (currentPost?.audio_track) {
      globalAudioManager.playTrack(currentPost.audio_track)
    }
  }

  // Load comments and author follow status
  useEffect(() => {
    if (!currentPost || !isOpen) return

    setLoadingComments(true)
    postService
      .getPostComments(currentPost.id)
      .then(setComments)
      .catch((err) => console.error('Error fetching comments:', err))
      .finally(() => setLoadingComments(false))

    if (user && currentPost.author_id !== user.id) {
      profileService
        .isFollowing(user.id, currentPost.author_id)
        .then(setIsFollowingAuthor)
        .catch(() => {})
    }
  }, [currentPost?.id, isOpen, user])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !currentPost) return null

  const isAuthor = user?.id === currentPost.author_id
  const media = currentPost.media && currentPost.media[0]

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleToggleLike = async () => {
    if (!user) {
      onOpenAuth()
      return
    }

    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)))

    try {
      await postService.toggleLikePost(currentPost.id, user.id)
    } catch {
      setIsLiked(!nextLiked)
      setLikesCount((prev) => (nextLiked ? Math.max(0, prev - 1) : prev + 1))
    }
  }

  const handleToggleSave = async () => {
    if (!user) {
      onOpenAuth()
      return
    }

    const nextSaved = !isSaved
    setIsSaved(nextSaved)

    try {
      await postService.toggleSavePost(currentPost.id, user.id)
      showToast(nextSaved ? 'Post saved to your collection.' : 'Post removed from saved.')
    } catch {
      setIsSaved(!nextSaved)
    }
  }

  const handleToggleFollow = async () => {
    if (!user) {
      onOpenAuth()
      return
    }

    const nextState = !isFollowingAuthor
    setIsFollowingAuthor(nextState)

    try {
      if (nextState) {
        await profileService.followUser(user.id, currentPost.author_id)
      } else {
        await profileService.unfollowUser(user.id, currentPost.author_id)
      }
    } catch {
      setIsFollowingAuthor(!nextState)
    }
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/?tab=feed`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${currentPost.author?.username || 'VibeSocial user'}`,
          text: currentPost.caption || 'Check out this post on VibeSocial',
          url: postUrl,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(postUrl)
    showToast('Post link copied to clipboard!')
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !user || submittingComment) return

    setSubmittingComment(true)
    setErrorMsg(null)
    try {
      const newComment = await postService.addComment(currentPost.id, user.id, commentText.trim())
      setComments((prev) => [...prev, newComment])
      setCommentText('')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to post comment.')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return
    try {
      await postService.deleteComment(commentId, user.id, currentPost.id)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err: any) {
      console.error('Failed to delete comment:', err)
    }
  }

  const handleArchivePost = async () => {
    if (!user || !isAuthor) return
    try {
      await postService.archivePost(currentPost.id, user.id)
      if (onPostDeleted) onPostDeleted(currentPost.id)
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Failed to archive post.')
    }
  }

  const handleDeletePost = async () => {
    if (!user || !isAuthor) return
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await postService.deletePost(currentPost.id, user.id)
        if (onPostDeleted) onPostDeleted(currentPost.id)
        onClose()
      } catch (err: any) {
        alert(err?.message || 'Failed to delete post.')
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      {/* Toast feedback */}
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

      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'row',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Left Column: Media display */}
        <div
          style={{
            flex: '1.2',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: '360px',
          }}
          onDoubleClick={handleToggleLike}
        >
          {media ? (
            media.media_type === 'video' ? (
              <video
                src={media.storage_path}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', maxHeight: '85vh', objectFit: 'contain' }}
              />
            ) : (
              <img
                src={media.storage_path}
                alt="Post content"
                style={{ width: '100%', height: '100%', maxHeight: '85vh', objectFit: 'contain' }}
              />
            )
          ) : (
            <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', color: '#fff', fontStyle: 'italic' }}>"{currentPost.caption}"</p>
            </div>
          )}
        </div>

        {/* Right Column: Author, comments, actions */}
        <div
          style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-card)',
            minWidth: '320px',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={() => {
                onSelectProfile(currentPost.author_id)
                onClose()
              }}
            >
              <img
                src={
                  currentPost.author?.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                }
                alt={currentPost.author?.username || 'Author'}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    {currentPost.author?.username || 'user'}
                  </span>
                  {currentPost.author?.is_verified && <span className="verified-icon">●</span>}
                  {!isAuthor && user && (
                    <>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>•</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleFollow()
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isFollowingAuthor ? 'var(--text-muted)' : 'var(--color-pink)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {isFollowingAuthor ? 'Following' : 'Follow'}
                      </button>
                    </>
                  )}
                </div>
                {currentPost.location && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currentPost.location}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
              <button
                className="action-btn"
                onClick={() => setShowOptions(!showOptions)}
                aria-label="More options"
              >
                <MoreHorizontal size={18} />
              </button>

              <button className="action-btn" onClick={onClose} aria-label="Close modal">
                <X size={18} />
              </button>

              {showOptions && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '32px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 50,
                    minWidth: '150px',
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
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Edit2 size={14} />
                        <span>Edit Post</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowOptions(false)
                          handleArchivePost()
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Archive size={14} />
                        <span>Archive Post</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowOptions(false)
                          handleDeletePost()
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ef4444',
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
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
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#ef4444',
                      }}
                    >
                      <Flag size={14} />
                      <span>Report</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowOptions(false)
                      handleShare()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Share2 size={14} />
                    <span>Copy Link</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Audio Track Bar */}
          {currentPost.audio_track && (
            <div
              onClick={toggleAudio}
              style={{
                padding: '8px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#111',
                  overflow: 'hidden',
                  flexShrink: 0,
                  animation: isTrackPlaying ? 'spinRecord 3s linear infinite' : 'none',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                <img
                  src={
                    currentPost.audio_track.artwork_url ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=50&auto=format&fit=crop&q=80'
                  }
                  alt="Track Art"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Music size={13} color="var(--color-pink, #e1306c)" />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isTrackPlaying ? 'var(--color-pink, #e1306c)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentPost.audio_track.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                >
                  {currentPost.audio_track.artist}
                </span>
              </div>
              <button
                type="button"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--color-pink, #e1306c)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {isTrackPlaying ? (
                  <Pause size={14} fill="#fff" />
                ) : (
                  <Play size={14} fill="#fff" style={{ marginLeft: '1px' }} />
                )}
              </button>
            </div>
          )}

          {/* Comments list area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Caption item */}
            {currentPost.caption && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <img
                  src={
                    currentPost.author?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentPost.author?.username || 'Author'}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.4' }}>
                  <span
                    style={{ fontWeight: 700, marginRight: '6px', cursor: 'pointer' }}
                    onClick={() => {
                      onSelectProfile(currentPost.author_id)
                      onClose()
                    }}
                  >
                    {currentPost.author?.username || 'user'}
                  </span>
                  <span>{currentPost.caption}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(currentPost.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Comments list */}
            {loadingComments ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading comments...
              </p>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>No comments yet.</p>
                <p style={{ fontSize: '12px' }}>Start the conversation.</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                  <img
                    src={
                      c.author?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={c.author?.username || 'User'}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span
                          style={{ fontWeight: 700, marginRight: '6px', cursor: 'pointer' }}
                          onClick={() => {
                            onSelectProfile(c.author_id)
                            onClose()
                          }}
                        >
                          {c.author?.username || 'user'}
                        </span>
                        <span>{c.content}</span>
                      </div>
                      {(user?.id === c.author_id || isAuthor) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0 4px',
                          }}
                          title="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions Footer */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  className="action-btn"
                  onClick={handleToggleLike}
                  aria-label={isLiked ? 'Unlike post' : 'Like post'}
                  style={{ color: isLiked ? '#ef4444' : 'var(--text-primary)' }}
                >
                  <Heart size={22} fill={isLiked ? '#ef4444' : 'none'} strokeWidth={2} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => commentInputRef.current?.focus()}
                  aria-label="Comment on post"
                >
                  <MessageCircle size={22} strokeWidth={2} />
                </button>
                <button className="action-btn" onClick={handleShare} aria-label="Share post">
                  <Share2 size={22} strokeWidth={2} />
                </button>
              </div>

              <button
                className="action-btn"
                onClick={handleToggleSave}
                aria-label={isSaved ? 'Unsave post' : 'Save post'}
                style={{ color: isSaved ? 'var(--text-primary)' : 'var(--text-primary)' }}
              >
                <Bookmark size={22} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} />
              </button>
            </div>

            <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '13px' }}>
              {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {new Date(currentPost.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Quick Comment Input */}
          {errorMsg && (
            <div
              style={{
                padding: '6px 16px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
          {user ? (
            <form
              onSubmit={handleAddComment}
              style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={500}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: commentText.trim() ? 'var(--color-pink)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: commentText.trim() ? 'pointer' : 'default',
                }}
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </form>
          ) : (
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}
            >
              <button
                onClick={onOpenAuth}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-pink)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Log in
              </button>{' '}
              to like or comment.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditPostModal
          post={currentPost}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            setCurrentPost(updated)
            if (onPostUpdated) onPostUpdated(updated)
            showToast('Post updated successfully.')
          }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetId={currentPost.id}
          targetType="post"
          targetTitle={currentPost.caption ? `"${currentPost.caption.slice(0, 30)}..."` : 'Post'}
        />
      )}
    </div>
  )
}
