import React, { useState, useEffect } from 'react'
import { X, Eye, Clock, Users } from 'lucide-react'
import type { ProfileViewRecord } from '../../types/database.types'
import { recentViewsService } from '../../services/recentViewsService'

interface RecentViewsModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  onSelectProfile: (userId: string) => void
}

const formatTimeAgo = (iso?: string) => {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${Math.max(1, diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const RecentViewsModal: React.FC<RecentViewsModalProps> = ({
  isOpen,
  onClose,
  profileId,
  onSelectProfile,
}) => {
  const [views, setViews] = useState<ProfileViewRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !profileId) return
    setLoading(true)
    recentViewsService
      .getRecentProfileViews(profileId)
      .then(setViews)
      .catch((err) => console.warn('Error fetching recent views:', err))
      .finally(() => setLoading(false))
  }, [isOpen, profileId])

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        className="recent-views-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg, 20px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0095f6, #00b4d8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0, 149, 246, 0.4)',
              }}
            >
              <Eye size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Recent Profile Visits
              </h3>
              <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted)' }}>
                {views.length} people recently checked your profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewers List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading recent views...
            </div>
          ) : views.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '13px', fontWeight: 600 }}>No profile visits recorded yet</p>
            </div>
          ) : (
            views.map((v) => {
              const viewer = v.viewer

              return (
                <div
                  key={v.id || v.viewer_id}
                  onClick={() => {
                    onSelectProfile(v.viewer_id)
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 10px)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <img
                    src={
                      viewer?.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                    }
                    alt={viewer?.username || 'Viewer'}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {viewer?.username || 'user'}
                      </span>
                      {viewer?.is_verified && <span style={{ color: '#0095f6', fontSize: '12px' }}>●</span>}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {viewer?.full_name || viewer?.username}
                    </span>
                  </div>

                  {/* Relative timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <Clock size={12} />
                    <span>{formatTimeAgo(v.viewed_at)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
