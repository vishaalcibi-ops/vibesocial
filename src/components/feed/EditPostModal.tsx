import React, { useState } from 'react'
import { X, MapPin, AlertCircle, Check } from 'lucide-react'
import type { Post } from '../../types/database.types'
import { postService } from '../../services/postService'
import { useAuth } from '../../context/AuthContext'

interface EditPostModalProps {
  post: Post
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: Post) => void
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth()
  const [caption, setCaption] = useState(post.caption || '')
  const [location, setLocation] = useState(post.location || '')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || user.id !== post.author_id) {
      setErrorMsg('You can only edit your own posts.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const updated = await postService.updatePost(post.id, user.id, {
        caption,
        location,
      })
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      console.error('Failed to update post:', err)
      setErrorMsg(err?.message || 'Failed to update post.')
    } finally {
      setLoading(false)
    }
  }

  const media = post.media && post.media[0]

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-post-title">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '90%', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="modal-header">
          <span id="edit-post-title" style={{ fontWeight: 700 }}>Edit Post</span>
          <button onClick={onClose} className="action-btn" aria-label="Close edit modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {errorMsg && (
            <div
              style={{
                margin: '16px 20px 0 20px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ef4444',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: '260px' }}>
            {/* Media thumbnail preview on the left */}
            {media && (
              <div
                style={{
                  width: '240px',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid var(--border-subtle)',
                }}
              >
                {media.media_type === 'video' ? (
                  <video src={media.storage_path} style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain' }} />
                ) : (
                  <img src={media.storage_path} alt="Post preview" style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain' }} />
                )}
              </div>
            )}

            {/* Inputs on the right */}
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '240px' }}>
              <div>
                <label htmlFor="edit-caption" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Caption
                </label>
                <textarea
                  id="edit-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  rows={5}
                  placeholder="Write a caption..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', float: 'right' }}>
                  {caption.length}/2200
                </span>
              </div>

              <div>
                <label htmlFor="edit-location" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  <MapPin size={15} color="var(--color-pink)" />
                  <span>Location</span>
                </label>
                <input
                  id="edit-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                  placeholder="Add location (e.g. San Francisco, CA)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={16} />
              <span>{loading ? 'Saving...' : 'Done'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
