import React from 'react'
import { X, Image as ImageIcon, Sparkles, Film } from 'lucide-react'

interface CreateMenuModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPost: () => void
  onSelectStory: () => void
  onSelectReel: () => void
}

export const CreateMenuModal: React.FC<CreateMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectPost,
  onSelectStory,
  onSelectReel,
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="create-menu-title">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', width: '90%', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="modal-header">
          <span id="create-menu-title" style={{ fontWeight: 700 }}>Create New</span>
          <button onClick={onClose} className="action-btn" aria-label="Close create menu">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Post Option */}
          <button
            onClick={() => {
              onClose()
              onSelectPost()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF007F, #7928CA)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
              }}
            >
              <ImageIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Post</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Share photos, captions, and locations to your feed
              </div>
            </div>
          </button>

          {/* Reel Option */}
          <button
            onClick={() => {
              onClose()
              onSelectReel()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7928CA, #0070F3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
              }}
            >
              <Film size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Reel</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Share short vertical videos with audio and captions
              </div>
            </div>
          </button>

          {/* Story Option */}
          <button
            onClick={() => {
              onClose()
              onSelectStory()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFB800, #FF007F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Story</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Share photos or videos that disappear after 24 hours
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
