import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Sparkles,
  UserPlus,
  X,
  ArrowLeft,
  AlertCircle,
  WifiOff,
  Check,
  CheckCheck,
  Phone,
  Video,
  Trash2,
  Copy,
  MoreHorizontal,
  Image as ImageIcon,
} from 'lucide-react'
import type { Conversation, Message, Profile } from '../../types/database.types'
import { messageService } from '../../services/messageService'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../context/AuthContext'
import { NotesTray } from '../notes/NotesTray'
import { CallModal } from '../calls/CallModal'

interface MessagesViewProps {
  initialTargetUserId?: string | null
  onSelectProfile: (userId: string) => void
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  initialTargetUserId,
  onSelectProfile,
}) => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchProfiles, setSearchProfiles] = useState<Profile[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [activeCallTarget, setActiveCallTarget] = useState<Partial<Profile> | null>(null)
  const [activeCallMode, setActiveCallMode] = useState<'voice' | 'video'>('voice')
  const [actionMenuMessage, setActionMenuMessage] = useState<Message | null>(null)
  const [showUnsendConfirm, setShowUnsendConfirm] = useState(false)
  const [isUnsending, setIsUnsending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const handleUnsendMessage = async () => {
    if (!actionMenuMessage || !activeConvId || !user) return
    const msgId = actionMenuMessage.id
    setIsUnsending(true)
    try {
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      await messageService.unsendMessage(activeConvId, msgId, user.id)
    } catch (err) {
      console.error('Failed to unsend message:', err)
    } finally {
      setIsUnsending(false)
      setShowUnsendConfirm(false)
      setActionMenuMessage(null)
    }
  }

  const handleCopyMessage = () => {
    if (!actionMenuMessage?.text_content) return
    navigator.clipboard?.writeText(actionMenuMessage.text_content).catch(() => {})
    setActionMenuMessage(null)
  }

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return
    try {
      const list = await messageService.getUserConversations(user.id)
      setConversations(list)
      // On desktop, auto-select first conversation if none selected
      if (list.length > 0 && !activeConvId && window.innerWidth > 768) {
        setActiveConvId(list[0].id)
      }
    } catch (e: any) {
      console.warn('Could not load conversations:', e)
      const isPermissionErr =
        e?.code === 'permission-denied' ||
        (typeof e?.message === 'string' &&
          (e.message.toLowerCase().includes('permission') ||
            e.message.toLowerCase().includes('insufficient')))
      if (isPermissionErr) {
        setConversations([])
      } else {
        setErrorMessage(e.message || 'Could not load conversations.')
      }
    } finally {
      setLoading(false)
    }
  }, [user, activeConvId])

  useEffect(() => {
    loadConversations()
    if (!user) return

    const sub = messageService.subscribeToUserConversations(user.id, (updatedList) => {
      setConversations(updatedList)
    })

    return () => {
      sub.unsubscribe()
    }
  }, [loadConversations, user])

  // Handle direct message navigation with a specific user
  useEffect(() => {
    if (initialTargetUserId && user) {
      if (initialTargetUserId === user.id) {
        setErrorMessage('You cannot send a direct message to yourself.')
        return
      }
      messageService
        .getOrCreateDirectConversation(user.id, initialTargetUserId)
        .then(async (convId) => {
          setActiveConvId(convId)
          await loadConversations()
        })
        .catch((err) => {
          console.error('Error initiating conversation:', err)
          setErrorMessage(err.message || 'Failed to start conversation.')
        })
    }
  }, [initialTargetUserId, user, loadConversations])

  // Load messages & subscribe to realtime updates for active conversation
  useEffect(() => {
    if (!activeConvId || !user) return

    setMessagesLoading(true)
    setErrorMessage(null)

    messageService
      .getConversationMessages(activeConvId)
      .then((data) => {
        setMessages(data)
        messageService.markConversationAsRead(activeConvId, user.id)
        // Update unread count locally for this conversation
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, unread_count: 0 } : c))
        )
      })
      .catch((err) => {
        console.error('Error fetching messages:', err)
        setErrorMessage('Failed to load messages. Check your connection or permissions.')
      })
      .finally(() => {
        setMessagesLoading(false)
      })

    const subscription = messageService.subscribeToConversation(activeConvId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })

      if (user && newMsg.sender_id !== user.id) {
        messageService.markConversationAsRead(activeConvId, user.id)
      }

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                last_message: newMsg,
                updated_at: newMsg.created_at,
              }
            : c
        )
      )
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [activeConvId, user])

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Debounced user search for New Chat modal
  useEffect(() => {
    const clean = searchQuery.trim()
    if (!clean) {
      setSearchProfiles([])
      setSearchingUsers(false)
      return
    }

    setSearchingUsers(true)
    const timer = setTimeout(async () => {
      try {
        const results = await profileService.searchProfiles(clean, 15)
        setSearchProfiles(results.filter((p) => p.id !== user?.id))
      } catch (e) {
        console.error('Error searching profiles:', e)
      } finally {
        setSearchingUsers(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, user])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanText = inputText.trim()
    if (!cleanText || !user || !activeConvId || sending) return

    if (cleanText.length > 1000) {
      setErrorMessage('Messages must not exceed 1000 characters.')
      return
    }

    setSending(true)
    setErrorMessage(null)

    try {
      const sentMsg = await messageService.sendMessage({
        conversationId: activeConvId,
        senderId: user.id,
        textContent: cleanText,
      })

      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev
        return [...prev, sentMsg]
      })
      setInputText('')

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                last_message: sentMsg,
                updated_at: sentMsg.created_at,
              }
            : c
        )
      )
    } catch (e: any) {
      console.error('Failed to send message:', e)
      setErrorMessage(e.message || 'Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Send photo in chat
  const handleSendPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConvId || !user) return

    setSending(true)
    setErrorMessage(null)

    try {
      let mediaDataUrl: string | null = null
      try {
        const { compressImageFile } = await import('../../utils/imageCompressor')
        const res = await compressImageFile(file, 800, 0.75)
        mediaDataUrl = res.dataUrl
      } catch (err) {
        console.warn('Direct compress fallback in chat:', err)
      }

      const sentMsg = await messageService.sendMessage({
        conversationId: activeConvId,
        senderId: user.id,
        textContent: '',
        file,
        mediaUrl: mediaDataUrl,
        mediaType: 'image',
      })

      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev
        return [...prev, sentMsg]
      })

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                last_message: sentMsg,
                updated_at: sentMsg.created_at,
              }
            : c
        )
      )
    } catch (e: any) {
      console.error('Failed to send photo:', e)
      setErrorMessage(e.message || 'Failed to send photo. Please try again.')
    } finally {
      setSending(false)
      if (e.target) e.target.value = ''
    }
  }

  // Start chat with user selected from modal
  const handleStartChatWithUser = async (targetUserId: string) => {
    if (!user) return
    if (targetUserId === user.id) {
      setErrorMessage('You cannot message yourself.')
      return
    }

    try {
      const convId = await messageService.getOrCreateDirectConversation(user.id, targetUserId)
      setShowNewChatModal(false)
      setSearchQuery('')
      setActiveConvId(convId)
      await loadConversations()
    } catch (e: any) {
      console.error('Failed to create chat:', e)
      setErrorMessage(e.message || 'Failed to create conversation.')
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeConvId)
  const otherMember = activeConversation?.members?.find((m) => m.user_id !== user?.id)?.profile

  const defaultAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'

  return (
    <div className="messages-container" style={{ position: 'relative' }}>
      {/* Offline Banner */}
      {isOffline && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            background: '#eab308',
            color: '#713f12',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <WifiOff size={14} />
          <span>You are currently offline. Messages will sync when you reconnect.</span>
        </div>
      )}

      {/* Conversations List Sidebar */}
      <div
        className="conversations-sidebar"
        style={{
          display: activeConvId && window.innerWidth <= 768 ? 'none' : 'flex',
          width: window.innerWidth <= 768 ? '100%' : '320px',
        }}
      >
        <div className="conversations-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Messages</span>
          </div>
          <button
            onClick={() => setShowNewChatModal(true)}
            style={{
              color: 'var(--color-pink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
            }}
            title="Start new conversation"
          >
            <UserPlus size={20} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            <span style={{ flex: 1 }}>{errorMessage}</span>
            <X size={14} onClick={() => setErrorMessage(null)} style={{ cursor: 'pointer' }} />
          </div>
        )}

        {/* Instagram Notes Tray */}
        <NotesTray
          onOpenDirectChat={async (targetId) => {
            if (!user) return
            try {
              const convId = await messageService.getOrCreateDirectConversation(user.id, targetId)
              setActiveConvId(convId)
              await loadConversations()
            } catch (err) {
              console.error('Failed to open direct conversation:', err)
            }
          }}
        />

        <div className="conversations-list">
          {loading ? (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '60px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Sparkles size={36} color="var(--color-pink)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No messages yet
              </p>
              <p style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '16px' }}>
                Connect with creators and friends by sending a direct message.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="btn-primary"
                style={{ fontSize: '13px', margin: '0 auto' }}
              >
                Send Message
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const partner = conv.members?.find((m) => m.user_id !== user?.id)?.profile
              const isActive = conv.id === activeConvId
              const hasUnread = Boolean(conv.unread_count && conv.unread_count > 0)

              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveConvId(conv.id)}
                  style={{
                    position: 'relative',
                    background: isActive ? 'var(--bg-card-hover)' : undefined,
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={partner?.avatar_url || defaultAvatar}
                      alt={partner?.username || 'User'}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    {partner?.show_active_status !== false && partner?.last_seen && (Date.now() - new Date(partner.last_seen).getTime()) < 5 * 60 * 1000 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '1px',
                          right: '1px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          border: '2px solid var(--bg-card)',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {partner?.username || 'Direct Message'}
                      </span>
                      {hasUnread && (
                        <span
                          style={{
                            background: 'var(--color-pink)',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 800,
                            borderRadius: 'var(--radius-full)',
                            padding: '1px 6px',
                            minWidth: '18px',
                            textAlign: 'center',
                          }}
                        >
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: hasUnread ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: hasUnread ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {conv.last_message?.text_content || 'Started a conversation'}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Thread View */}
      <div
        className="chat-view"
        style={{
          display: !activeConvId && window.innerWidth <= 768 ? 'none' : 'flex',
          flex: 1,
        }}
      >
        {activeConvId && otherMember ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              {/* Mobile Back Button */}
              <button
                onClick={() => setActiveConvId(null)}
                style={{
                  display: window.innerWidth <= 768 ? 'flex' : 'none',
                  alignItems: 'center',
                  marginRight: '6px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
                title="Back to conversations"
              >
                <ArrowLeft size={20} />
              </button>

              <div style={{ position: 'relative' }}>
                <img
                  src={otherMember.avatar_url || defaultAvatar}
                  alt={otherMember.username}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: '2px solid var(--border-subtle)',
                  }}
                  onClick={() => onSelectProfile(otherMember.id)}
                />
                {otherMember.show_active_status !== false && otherMember.last_seen && (Date.now() - new Date(otherMember.last_seen).getTime()) < 5 * 60 * 1000 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '1px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      border: '2px solid var(--bg-card)',
                    }}
                  />
                )}
              </div>

              <div
                style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                onClick={() => onSelectProfile(otherMember.id)}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {otherMember.username}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {otherMember.show_active_status !== false && otherMember.last_seen ? (
                    (Date.now() - new Date(otherMember.last_seen).getTime()) < 5 * 60 * 1000 ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Active now</span>
                    ) : (Date.now() - new Date(otherMember.last_seen).getTime()) < 60 * 60 * 1000 ? (
                      `Active ${Math.floor((Date.now() - new Date(otherMember.last_seen).getTime()) / 60000)}m ago`
                    ) : (Date.now() - new Date(otherMember.last_seen).getTime()) < 24 * 3600 * 1000 ? (
                      `Active ${Math.floor((Date.now() - new Date(otherMember.last_seen).getTime()) / 3600000)}h ago`
                    ) : (
                      otherMember.full_name || 'VibeSocial member'
                    )
                  ) : (
                    otherMember.full_name || 'VibeSocial member'
                  )}
                </div>
              </div>

              {/* Call and Video Call Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCallTarget(otherMember)
                    setActiveCallMode('voice')
                  }}
                  title="Audio Call"
                  aria-label="Audio Call"
                  style={{
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                >
                  <Phone size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveCallTarget(otherMember)
                    setActiveCallMode('video')
                  }}
                  title="Video Call"
                  aria-label="Video Call"
                  style={{
                    background: 'rgba(236, 72, 153, 0.14)',
                    border: '1px solid rgba(236, 72, 153, 0.35)',
                    color: '#ec4899',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                >
                  <Video size={17} />
                </button>
              </div>
            </div>

            {/* Chat Messages Scroll */}
            <div className="messages-scroll">
              {messagesLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '13px' }}>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  <Sparkles size={32} color="var(--color-pink)" style={{ margin: '0 auto 8px auto', opacity: 0.7 }} />
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    No messages yet
                  </p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Say hello to @{otherMember.username}!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id
                  if (msg.text_content && msg.text_content.startsWith('[VIBE_CALL:')) {
                    const parts = msg.text_content.replace(/^\[VIBE_CALL:|\]$/g, '').split(':')
                    const callType = parts[0] || 'voice'
                    const callStatus = parts[2] || 'ended'
                    return (
                      <div
                        key={msg.id}
                        style={{
                          margin: '8px auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {callType === 'video' ? (
                          <Video size={14} style={{ color: '#38bdf8' }} />
                        ) : (
                          <Phone size={14} style={{ color: '#10b981' }} />
                        )}
                        <span>
                          {callStatus === 'ringing' && `${callType === 'video' ? 'Video' : 'Audio'} call started`}
                          {callStatus === 'accepted' && `${callType === 'video' ? 'Video' : 'Audio'} call connected`}
                          {callStatus === 'declined' && `Declined ${callType} call`}
                          {callStatus === 'ended' && `${callType === 'video' ? 'Video' : 'Audio'} call ended`}
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                        position: 'relative',
                        marginBottom: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexDirection: isMine ? 'row' : 'row-reverse',
                          maxWidth: '85%',
                        }}
                      >
                        {/* More Action Trigger Button */}
                        <button
                          type="button"
                          onClick={() => setActionMenuMessage(msg)}
                          aria-label="Message options"
                          title="Message options"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {/* Bubble */}
                        <div
                          className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setActionMenuMessage(msg)
                          }}
                          style={{
                            margin: 0,
                            cursor: 'pointer',
                          }}
                        >
                          {Boolean(msg.media_url || (msg as any).mediaUrl) && (
                            <div
                              style={{
                                borderRadius: '12px',
                                overflow: 'hidden',
                                marginBottom: msg.text_content ? '6px' : '0',
                                maxWidth: '280px',
                              }}
                            >
                              <img
                                src={msg.media_url || (msg as any).mediaUrl}
                                alt="Shared photo"
                                style={{
                                  width: '100%',
                                  maxHeight: '300px',
                                  objectFit: 'cover',
                                  display: 'block',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(msg.media_url || (msg as any).mediaUrl || '', '_blank')
                                }}
                              />
                            </div>
                          )}
                          {msg.text_content ? <div>{msg.text_content}</div> : null}
                          <div
                            style={{
                              fontSize: '10px',
                              opacity: 0.75,
                              textAlign: 'right',
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                            }}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && (
                              <span>
                                {msg.is_read ? (
                                  <CheckCheck size={12} color="#93c5fd" />
                                ) : (
                                  <Check size={12} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '8px 16px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} />
                <span style={{ flex: 1 }}>{errorMessage}</span>
                <X size={14} onClick={() => setErrorMessage(null)} style={{ cursor: 'pointer' }} />
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder={`Message @${otherMember.username}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={1000}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />

              {inputText.length > 800 && (
                <span
                  style={{
                    fontSize: '11px',
                    color: inputText.length >= 1000 ? '#ef4444' : 'var(--text-muted)',
                  }}
                >
                  {inputText.length}/1000
                </span>
              )}

              {/* Photo Picker Button */}
              <label
                style={{
                  cursor: sending ? 'not-allowed' : 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '50%',
                  opacity: sending ? 0.4 : 0.8,
                  transition: 'opacity 0.2s',
                }}
                title="Send a photo"
              >
                <ImageIcon size={20} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSendPhoto}
                  disabled={sending}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                style={{
                  color: 'var(--color-pink)',
                  opacity: !inputText.trim() || sending ? 0.35 : 1,
                  cursor: !inputText.trim() || sending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat Placeholder */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '12px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(236, 72, 153, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <Sparkles size={34} color="var(--color-pink)" />
            </div>
            <p style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
              Direct Messages
            </p>
            <p style={{ fontSize: '14px', maxWidth: '320px' }}>
              Send private, end-to-end authorized messages to creators and friends.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="btn-primary"
              style={{ marginTop: '8px' }}
            >
              <UserPlus size={16} />
              <span>New Message</span>
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-backdrop" onClick={() => setShowNewChatModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', width: '92%' }}
          >
            <div className="modal-header">
              <span style={{ fontWeight: 800, fontSize: '16px' }}>New Direct Message</span>
              <button onClick={() => setShowNewChatModal(false)} style={{ cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px' }}>
              <input
                type="text"
                placeholder="Search user by username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  marginBottom: '14px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />

              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {searchingUsers ? (
                  <p style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Searching users...
                  </p>
                ) : searchQuery.trim() && searchProfiles.length === 0 ? (
                  <p style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No users found matching &quot;{searchQuery}&quot;.
                  </p>
                ) : (
                  searchProfiles.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleStartChatWithUser(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <img
                        src={p.avatar_url || defaultAvatar}
                        alt={p.username}
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {p.username}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {p.full_name}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCallTarget && (
        <CallModal
          isOpen={Boolean(activeCallTarget)}
          onClose={() => setActiveCallTarget(null)}
          targetUser={activeCallTarget}
          initialMode={activeCallMode}
        />
      )}

      {/* Real Instagram Message Action Sheet */}
      {actionMenuMessage && (
        <div
          className="modal-backdrop"
          onClick={() => setActionMenuMessage(null)}
          style={{
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'var(--bg-elevated, #262626)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px 16px calc(env(safe-area-inset-bottom, 16px) + 20px)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Grab handle */}
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '2px',
                background: 'rgba(255,255,255,0.3)',
                margin: '0 auto 12px',
              }}
            />

            {/* Message Preview snippet */}
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                fontSize: '13px',
                color: 'var(--text-muted, #94a3b8)',
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              &quot;{actionMenuMessage.text_content}&quot;
            </div>

            {/* Unsend Option (Only for messages sent by current user) */}
            {actionMenuMessage.sender_id === user?.id && (
              <button
                type="button"
                onClick={() => {
                  setShowUnsendConfirm(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Trash2 size={18} />
                <span>Unsend</span>
              </button>
            )}

            {/* Copy Text Option */}
            <button
              type="button"
              onClick={handleCopyMessage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: 'var(--text-primary, #ffffff)',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Copy size={18} />
              <span>Copy text</span>
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setActionMenuMessage(null)}
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '4px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Real Instagram Unsend Confirmation Modal */}
      {showUnsendConfirm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowUnsendConfirm(false)}
          style={{
            zIndex: 1001,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '320px',
              background: 'var(--bg-elevated, #262626)',
              borderRadius: '24px',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', margin: '0 0 8px' }}>
              Unsend message?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: '0 0 20px', lineHeight: 1.4 }}>
              Unsending will remove the message for everyone in the chat. People may have already seen it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleUnsendMessage}
                disabled={isUnsending}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: isUnsending ? 'not-allowed' : 'pointer',
                }}
              >
                {isUnsending ? 'Unsending...' : 'Unsend'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsendConfirm(false)
                  setActionMenuMessage(null)
                }}
                disabled={isUnsending}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: 'var(--text-primary, #ffffff)',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
