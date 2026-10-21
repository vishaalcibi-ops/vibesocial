import React, { useState, useEffect } from 'react'
import { X, Send, Trash2, MessageCircle } from 'lucide-react'
import type { Comment } from '../../types/database.types'
import { postService } from '../../services/postService'
import { useAuth } from '../../context/AuthContext'

interface CommentsModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  onCommentCountChange?: (count: number) => void
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  postId,
  isOpen,
  onClose,
  onCommentCountChange,
}) => {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadComments = async () => {
    setErrorMsg(null)
    try {
      const data = await postService.getPostComments(postId)
      setComments(data)
      if (onCommentCountChange) onCommentCountChange(data.length)
    } catch (e: any) {
      console.error('Error loading comments:', e)
      setErrorMsg(e?.message || 'Failed to load comments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadComments()
    }
  }, [isOpen, postId])

  if (!isOpen) return null

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || submitting) return

    setSubmitting(true)
    setErrorMsg(null)
    try {
      const added = await postService.addComment(postId, user.id, newComment)
      const updated = [...comments, added]
      setComments(updated)
      setNewComment('')
      if (onCommentCountChange) onCommentCountChange(updated.length)
    } catch (e: any) {
      console.error('Failed to post comment:', e)
      setErrorMsg(e?.message || 'Failed to post comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return
    setErrorMsg(null)
    try {
      await postService.deleteComment(commentId, user.id, postId)
      const updated = comments.filter((c) => c.id !== commentId)
      setComments(updated)
      if (onCommentCountChange) onCommentCountChange(updated.length)
    } catch (e: any) {
      console.error('Failed to delete comment:', e)
      setErrorMsg(e?.message || 'Failed to delete comment.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', height: '600px', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={18} />
            <span>Comments ({comments.length})</span>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'var(--color-like-bg)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '10px 16px',
              color: 'var(--color-like)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading comments...</p>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>No comments yet</p>
              <p style={{ fontSize: '13px' }}>Start the conversation by adding a comment below.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <img
                  src={comment.author?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt={comment.author?.username || 'User'}
                  style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                    <strong style={{ marginRight: '6px', color: 'var(--text-primary)' }}>{comment.author?.username || 'user'}</strong>
                    <span style={{ color: 'var(--text-primary)' }}>{comment.content}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    {user?.id === comment.author_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          <form onSubmit={handleAddComment} className="add-comment-row" style={{ padding: '12px 16px' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              className="comment-submit-btn"
              disabled={!newComment.trim() || submitting}
            >
              <Send size={18} />
            </button>
          </form>
        ) : (
          <div style={{ padding: '14px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--text-muted)' }}>
            Sign in to leave a comment.
          </div>
        )}
      </div>
    </div>
  )
}
