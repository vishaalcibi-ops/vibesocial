import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle, UserPlus, Film, CheckCheck, Bell, MessageSquare, UserCheck, AtSign } from 'lucide-react'
import type { Notification, FollowRequest } from '../../types/database.types'
import { notificationService } from '../../services/notificationService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'

interface NotificationsViewProps {
  onSelectProfile: (userId: string) => void
  onSelectPost?: (postId: string) => void
  onStartMessageWithUser?: (userId: string) => void
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectProfile,
  onStartMessageWithUser,
}) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    if (!user) return
    try {
      const [data, requests] = await Promise.all([
        notificationService.getUserNotifications(user.id, 50),
        profileService.getFollowRequests(user.id),
      ])
      setNotifications(data)
      setFollowRequests(requests)
    } catch (e) {
      console.error('Failed to load notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    if (!user) return
    const sub = notificationService.subscribeToNotifications(user.id, (newNotif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
    })

    return () => {
      sub.unsubscribe()
    }
  }, [user])

  const handleMarkAllRead = async () => {
    if (!user) return
    await notificationService.markAllNotificationsAsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read && user) {
      await notificationService.markNotificationAsRead(notif.id, user.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
    }

    // Navigation based on notification type
    if (notif.type === 'message' && onStartMessageWithUser && notif.actor_id) {
      onStartMessageWithUser(notif.actor_id)
    } else if (notif.actor_id) {
      onSelectProfile(notif.actor_id)
    }
  }

  const handleAcceptRequest = async (request: FollowRequest) => {
    if (!user) return
    setActionLoadingId(request.id)
    try {
      await profileService.acceptFollowRequest(user.id, request.requester_id)
      setFollowRequests((prev) => prev.filter((r) => r.id !== request.id))
      // Also update notification if present
      setNotifications((prev) =>
        prev.map((n) =>
          n.actor_id === request.requester_id && n.type === 'follow_request'
            ? { ...n, is_read: true }
            : n
        )
      )
    } catch (err) {
      console.error('Failed to accept follow request:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeclineRequest = async (request: FollowRequest) => {
    if (!user) return
    setActionLoadingId(request.id)
    try {
      await profileService.declineFollowRequest(user.id, request.requester_id)
      setFollowRequests((prev) => prev.filter((r) => r.id !== request.id))
    } catch (err) {
      console.error('Failed to decline follow request:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'like_post':
        return <Heart size={16} color="#ef4444" fill="#ef4444" />
      case 'comment_post':
        return <MessageCircle size={16} color="#3b82f6" />
      case 'follow':
        return <UserPlus size={16} color="#ec4899" />
      case 'follow_request':
        return <UserPlus size={16} color="#a855f7" />
      case 'follow_request_accepted':
        return <UserCheck size={16} color="#10b981" />
      case 'like_reel':
        return <Film size={16} color="#8b5cf6" />
      case 'like_story':
        return <Heart size={16} color="#ec4899" fill="#ec4899" />
      case 'mention':
        return <AtSign size={16} color="#f59e0b" />
      case 'message':
        return <MessageSquare size={16} color="#10b981" />
      default:
        return <Bell size={16} color="var(--color-pink)" />
    }
  }

  const renderMessage = (notif: Notification) => {
    switch (notif.type) {
      case 'like_post':
        return 'liked your post.'
      case 'like_story':
        return 'liked your story.'
      case 'mention':
        if (notif.resource_type === 'story') return 'mentioned you in a story.'
        if (notif.resource_type === 'note') return 'mentioned you in a note.'
        if (notif.resource_type === 'post_comment') return 'mentioned you in a comment.'
        return 'mentioned you in a post.'
      case 'comment_post':
        return 'commented on your post.'
      case 'follow':
        return 'started following you.'
      case 'follow_request':
        return 'requested to follow you.'
      case 'follow_request_accepted':
        return 'accepted your follow request.'
      case 'like_reel':
        return 'liked your reel.'
      case 'message':
        return 'sent you a direct message.'
      default:
        return 'interacted with your profile.'
    }
  }

  const defaultAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '640px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '0 4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Notifications</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time updates on likes, comments, follows, and messages.
          </p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-pink)',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Pending Follow Requests for Private Accounts */}
      {followRequests.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Follow Requests ({followRequests.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {followRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                  onClick={() => onSelectProfile(req.requester_id)}
                >
                  <img
                    src={req.requester?.avatar_url || defaultAvatar}
                    alt={req.requester?.username || 'User'}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {req.requester?.username || 'user'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {req.requester?.full_name || 'wants to follow you'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleAcceptRequest(req)}
                    disabled={actionLoadingId === req.id}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req)}
                    disabled={actionLoadingId === req.id}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={40} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              No notifications yet
            </p>
            <p style={{ fontSize: '13px', maxWidth: '340px', margin: '0 auto' }}>
              When people follow you, like your posts, comment, or send you direct messages, you will see them here.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-light)',
                background: notif.is_read ? 'transparent' : 'var(--bg-card-hover)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (notif.is_read) e.currentTarget.style.background = 'var(--bg-card-hover)'
              }}
              onMouseLeave={(e) => {
                if (notif.is_read) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={notif.actor?.avatar_url || defaultAvatar}
                  alt={notif.actor?.username || 'User'}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--border-subtle)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '50%',
                    padding: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {renderIcon(notif.type)}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0, fontSize: '14px', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)', marginRight: '6px' }}>
                  {notif.actor?.username || 'Someone'}
                </strong>
                <span style={{ color: '#cbd5e1' }}>{renderMessage(notif)}</span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {new Date(notif.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {!notif.is_read && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-pink)',
                    flexShrink: 0,
                  }}
                  title="Unread"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
