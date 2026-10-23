import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Pause, Play, Music, Volume2, VolumeX, Link2, Heart, Send, Star, MapPin } from 'lucide-react'
import type { Story, StoryView } from '../../types/database.types'
import { storyService } from '../../services/storyService'
import { useAuth } from '../../context/AuthContext'
import { highlightService, type StoryHighlight } from '../../services/highlightService'
import { notificationService } from '../../services/notificationService'

interface StoryViewerModalProps {
  storyGroup: { authorId: string; author: any; stories: Story[] } | null
  onClose: () => void
  onStoryDeleted?: () => void
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

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  storyGroup,
  onClose,
  onStoryDeleted,
}) => {
  const { user, profile } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [viewers, setViewers] = useState<StoryView[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [storyLikes, setStoryLikes] = useState<string[]>([])
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number; size: number; duration: number; isSuper?: boolean }[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<'viewers' | 'likes'>('viewers')
  const [replyText, setReplyText] = useState('')
  const [isHoldingLike, setIsHoldingLike] = useState(false)

  // Highlights state
  const [showHighlightDialog, setShowHighlightDialog] = useState(false)
  const [userHighlights, setUserHighlights] = useState<StoryHighlight[]>([])
  const [newHighlightTitle, setNewHighlightTitle] = useState('')
  const [isCreatingNewHighlight, setIsCreatingNewHighlight] = useState(false)

  // Interactive stickers state
  const [pollVotes, setPollVotes] = useState<Record<string, 'opt1' | 'opt2'>>({})
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [activeQuestionSticker, setActiveQuestionSticker] = useState<any>(null)
  const [questionResponseText, setQuestionResponseText] = useState('')

  const timerRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const isHeldTriggeredRef = useRef(false)
  const toastTimeoutRef = useRef<number | null>(null)

  const hasStories = Boolean(storyGroup && storyGroup.stories.length > 0)
  const currentStory = hasStories && storyGroup ? storyGroup.stories[currentIndex] : null
  const isOwner = Boolean(user && storyGroup && user.id === storyGroup.authorId)

  // Manage attached music playback
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.loop = true
    }

    const audio = audioRef.current
    if (currentStory?.audio_track?.audio_url) {
      audio.src = currentStory.audio_track.audio_url
      audio.muted = isMuted
      if (!isPaused && !showViewers) {
        audio.play().catch(() => {})
      }
    } else {
      audio.pause()
      audio.src = ''
    }

    return () => {
      audio.pause()
    }
  }, [currentIndex, currentStory, isMuted])

  // Pause / resume audio when modal state changes
  useEffect(() => {
    if (audioRef.current && currentStory?.audio_track?.audio_url) {
      if (isPaused || showViewers) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(() => {})
      }
    }
  }, [isPaused, showViewers, currentStory])

  // Cleanup audio on modal unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const handleNext = useCallback(() => {
    if (!storyGroup) {
      onClose()
      return
    }
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
      setMediaError(false)
    } else {
      onClose()
    }
  }, [currentIndex, storyGroup, onClose])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
      setMediaError(false)
    }
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'Escape') onClose()
      else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, onClose])

  // Mark viewed and load viewers/likes
  useEffect(() => {
    if (!currentStory) return

    if (user && user.id !== currentStory.author_id) {
      storyService.markStoryViewed(currentStory.id, user.id)
    }

    if (isOwner) {
      storyService.getStoryViewers(currentStory.id).then(setViewers)
    }

    if (user) {
      storyService.isStoryLiked(currentStory.id, user.id).then(setIsLiked)
    } else {
      setIsLiked(false)
    }

    storyService.getStoryLikes(currentStory.id).then(setStoryLikes)
  }, [currentStory, user, isOwner])

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage(msg)
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 2500)
  }

  const triggerFloatingHearts = (isSuper: boolean = false) => {
    const count = isSuper ? 16 : 6
    const newHearts = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      left: 72 + (Math.random() * 22 - 11),
      size: isSuper ? 24 + Math.random() * 20 : 18 + Math.random() * 12,
      duration: isSuper ? 1.2 + Math.random() * 0.8 : 0.9 + Math.random() * 0.6,
      isSuper,
    }))
    setFloatingHearts((prev) => [...prev, ...newHearts])
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)))
    }, 2200)
  }

  const handleLikeAction = async (isHeld: boolean = false) => {
    if (!currentStory || !user) return

    try {
      if (isHeld) {
        setIsLiked(true)
        triggerFloatingHearts(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([40, 50, 40])
        }
        showToast(`💖 Super-liked! @${storyGroup?.author?.username || 'user'} notified`)
        await storyService.toggleLikeStory(currentStory.id, user.id, currentStory.author_id, true)
        const updatedLikes = await storyService.getStoryLikes(currentStory.id)
        setStoryLikes(updatedLikes)
      } else {
        const nextLiked = !isLiked
        setIsLiked(nextLiked)
        if (nextLiked) {
          triggerFloatingHearts(false)
          showToast('❤️ Liked story')
        }
        await storyService.toggleLikeStory(currentStory.id, user.id, currentStory.author_id, false)
        const updatedLikes = await storyService.getStoryLikes(currentStory.id)
        setStoryLikes(updatedLikes)
      }
    } catch (err) {
      console.error('Failed to like story:', err)
    }
  }

  const handleLikePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    setIsPaused(true)
    setIsHoldingLike(true)
    isHeldTriggeredRef.current = false

    holdTimerRef.current = window.setTimeout(() => {
      isHeldTriggeredRef.current = true
      setIsHoldingLike(false)
      handleLikeAction(true)
    }, 550)
  }

  const handleLikePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    setIsPaused(false)
    setIsHoldingLike(false)
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (!isHeldTriggeredRef.current) {
      handleLikeAction(false)
    }
  }

  const handleLikePointerLeave = (e: React.PointerEvent) => {
    e.stopPropagation()
    setIsPaused(false)
    setIsHoldingLike(false)
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !currentStory || !user) return
    showToast(`Sent reply to @${storyGroup?.author?.username || 'user'}`)
    setReplyText('')
  }

  // Highlight Handlers (⭐ Profile Highlights)
  const handleOpenHighlightModal = async () => {
    if (!user || !currentStory) return
    setIsPaused(true)
    setShowHighlightDialog(true)
    setIsCreatingNewHighlight(false)
    setNewHighlightTitle('')
    try {
      const hls = await highlightService.getUserHighlights(user.id)
      setUserHighlights(hls)
    } catch {
      setUserHighlights([])
    }
  }

  const handleAddToExistingHighlight = async (hl: StoryHighlight) => {
    if (!user || !currentStory) return
    try {
      await highlightService.addStoryToHighlight(user.id, hl.id, currentStory)
      showToast(`Added story to "${hl.title}" ⭐`)
      setShowHighlightDialog(false)
      setIsPaused(false)
    } catch {
      showToast('Failed to add story to highlight.')
    }
  }

  const handleCreateHighlight = async () => {
    if (!user || !currentStory || !newHighlightTitle.trim()) return
    try {
      await highlightService.createHighlight(
        user.id,
        newHighlightTitle.trim(),
        currentStory.media_url,
        [currentStory]
      )
      showToast(`Created highlight: "${newHighlightTitle.trim()}" ⭐`)
      setShowHighlightDialog(false)
      setIsPaused(false)
      setNewHighlightTitle('')
      setIsCreatingNewHighlight(false)
    } catch {
      showToast('Failed to create highlight.')
    }
  }

  // Interactive sticker handlers
  const handleVotePoll = (stickerId: string, option: 'opt1' | 'opt2') => {
    setPollVotes((prev) => ({ ...prev, [stickerId]: option }))
    showToast(`Voted ${option === 'opt1' ? 'Option 1' : 'Option 2'}! 📊`)
  }

  const handleOpenQuestionModal = (stk: any) => {
    setActiveQuestionSticker(stk)
    setQuestionResponseText('')
    setIsPaused(true)
    setShowQuestionDialog(true)
  }

  const handleSubmitQuestionResponse = async () => {
    if (!questionResponseText.trim() || !user || !storyGroup) return
    try {
      await notificationService.createNotification({
        recipientId: storyGroup.authorId,
        actorId: user.id,
        type: 'mention',
        resourceId: currentStory?.id,
        resourceType: 'story_question',
      })
      showToast(`Response sent to @${storyGroup.author?.username || 'user'}! ✉️`)
      setShowQuestionDialog(false)
      setIsPaused(false)
      setQuestionResponseText('')
    } catch {
      showToast('Failed to send response.')
    }
  }

  // Pause / resume video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused || showViewers) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isPaused, showViewers, currentIndex])

  // Story Timer (5 seconds for photos, or driven by interval for videos)
  useEffect(() => {
    if (!hasStories || isPaused || showViewers) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const intervalTime = 50
    const durationMs = 5000
    const step = (intervalTime / durationMs) * 100

    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + step
      })
    }, intervalTime)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [hasStories, isPaused, showViewers, handleNext, currentIndex])

  const handleDelete = async () => {
    if (!currentStory || !user) return
    if (window.confirm('Are you sure you want to delete this story?')) {
      try {
        await storyService.deleteStory(currentStory.id, user.id)
        if (onStoryDeleted) onStoryDeleted()
        onClose()
      } catch (err: any) {
        alert(err.message || 'Failed to delete story.')
      }
    }
  }

  if (!storyGroup || !hasStories || !currentStory) return null

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="story-viewer-card"
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '90vh',
          maxHeight: '760px',
          background: '#0a0a0a',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          userSelect: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        onPointerLeave={() => setIsPaused(false)}
      >
        {/* Progress Bars Row */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            gap: '4px',
            zIndex: 35,
          }}
        >
          {storyGroup.stories.map((story, i) => (
            <div
              key={story.id}
              style={{
                flex: 1,
                height: '3px',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'white',
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                  transition: i === currentIndex ? 'width 0.05s linear' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 35,
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={
                storyGroup.author?.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }
              alt={storyGroup.author?.username}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(255,255,255,0.6)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {storyGroup.author?.username}
              </span>
              {currentStory.is_close_friends && (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                  }}
                  title="Close Friends Only"
                >
                  <span>★</span> Close Friends
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                • {formatRelativeTime(currentStory.created_at)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Pause/Resume indicator */}
            {currentStory.audio_track && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMuted(!isMuted)
                }}
                aria-label={isMuted ? 'Unmute music' : 'Mute music'}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsPaused(!isPaused)
              }}
              aria-label={isPaused ? 'Resume story' : 'Pause story'}
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: 'white',
                borderRadius: '50%',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPaused ? <Play size={15} fill="white" /> : <Pause size={15} />}
            </button>

            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                title="Delete Story"
                aria-label="Delete story"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: '#f87171',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Close story viewer"
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: 'white',
                borderRadius: '50%',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Music Sticker Badge under Header if attached */}
        {currentStory.audio_track && (
          <div
            style={{
              position: 'absolute',
              top: '70px',
              left: '16px',
              zIndex: 35,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-full, 20px)',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
              maxWidth: '75%',
            }}
          >
            <Music size={13} color="#ec4899" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentStory.audio_track.title} • {currentStory.audio_track.artist}
            </span>
          </div>
        )}

        {/* Paid Partnership Banner */}
        {currentStory.is_paid_partnership && (
          <div
            style={{
              position: 'absolute',
              top: '70px',
              right: '16px',
              zIndex: 35,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-full, 20px)',
              padding: '4px 10px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Paid partnership
          </div>
        )}

        {/* Made with AI Label */}
        {currentStory.is_ai_labeled && (
          <div
            style={{
              position: 'absolute',
              top: currentStory.is_paid_partnership ? '100px' : '70px',
              right: '16px',
              zIndex: 35,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-full, 20px)',
              padding: '4px 10px',
              color: '#60a5fa',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid rgba(96,165,250,0.3)',
            }}
          >
            ✨ Made with AI
          </div>
        )}

        {/* Interactive Link Sticker Overlay if present */}
        {currentStory.stickers?.find((s: any) => s.type === 'link') && (() => {
          const linkStk = currentStory.stickers?.find((s: any) => s.type === 'link')
          const url = linkStk?.data?.url || '#'
          const title = linkStk?.data?.title || '🔗 Visit Link'
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 38,
                background: '#ffffff',
                color: '#2563eb',
                padding: '8px 16px',
                borderRadius: '24px',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              <Link2 size={14} />
              <span>{title}</span>
            </a>
          )
        })()}

        {/* Interactive "Add Yours" Sticker Collaboration Button */}
        {(() => {
          const addYoursStk = currentStory.stickers?.find((s: any) => s.type === 'add_yours')
          if (!addYoursStk) return null
          const prompt = addYoursStk.data?.prompt || 'Drop your favorite view'
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                window.dispatchEvent(
                  new CustomEvent('open-create-story', {
                    detail: { prompt },
                  })
                )
                onClose()
              }}
              style={{
                position: 'absolute',
                bottom: '120px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 39,
                background: '#ffffff',
                color: '#ec4899',
                padding: '8px 18px',
                borderRadius: '24px',
                fontWeight: 800,
                fontSize: '12px',
                border: '2px solid rgba(236, 72, 153, 0.4)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span>📷</span>
              <span>Add Yours: {prompt}</span>
            </button>
          )
        })()}

        {/* Mentioned User "Add to story" Repost Button */}
        {(() => {
          if (!user || isOwner) return null
          const myUsername = profile?.username?.toLowerCase()
          const isMentioned = Boolean(
            (currentStory as any).mentioned_user_ids?.includes(user.id) ||
              currentStory.stickers?.some(
                (s: any) =>
                  s.type === 'mention' &&
                  (s.data?.userId === user.id ||
                    (myUsername && s.data?.username?.toLowerCase() === myUsername))
              ) ||
              (currentStory.caption &&
                myUsername &&
                currentStory.caption.toLowerCase().includes(`@${myUsername}`))
          )
          if (!isMentioned) return null

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                window.dispatchEvent(
                  new CustomEvent('open-create-story', {
                    detail: { repostMediaUrl: currentStory.media_url },
                  })
                )
                onClose()
              }}
              style={{
                position: 'absolute',
                bottom: '75px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                color: '#ffffff',
                padding: '9px 20px',
                borderRadius: '24px',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                boxShadow: '0 6px 24px rgba(236, 72, 153, 0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span>🔁</span>
              <span>Add this to your story</span>
            </button>
          )
        })()}

        {/* Interactive Poll Sticker */}
        {(() => {
          const pollStk = currentStory.stickers?.find((s: any) => s.type === 'poll')
          if (!pollStk) return null
          const votedOpt = pollVotes[pollStk.id]
          const q = pollStk.data?.question || 'Ask a question...'
          const opt1 = pollStk.data?.option1 || 'YES'
          const opt2 = pollStk.data?.option2 || 'NO'
          const pct1 = votedOpt === 'opt1' ? 68 : votedOpt === 'opt2' ? 32 : 50
          const pct2 = 100 - pct1

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: `${pollStk.y || 45}%`,
                left: `${pollStk.x || 50}%`,
                transform: `translate(-50%, -50%) scale(${pollStk.scale || 1})`,
                zIndex: 38,
                width: '240px',
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '14px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                color: '#111827',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: '14px' }}>{q}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleVotePoll(pollStk.id, 'opt1')}
                  style={{
                    background: votedOpt === 'opt1' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#f3f4f6',
                    color: votedOpt === 'opt1' ? '#ffffff' : '#111827',
                    border: 'none',
                    padding: '10px 8px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span>{opt1}</span>
                  {votedOpt && <span style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>{pct1}%</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleVotePoll(pollStk.id, 'opt2')}
                  style={{
                    background: votedOpt === 'opt2' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#f3f4f6',
                    color: votedOpt === 'opt2' ? '#ffffff' : '#111827',
                    border: 'none',
                    padding: '10px 8px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span>{opt2}</span>
                  {votedOpt && <span style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>{pct2}%</span>}
                </button>
              </div>
            </div>
          )
        })()}

        {/* Interactive Questions Sticker */}
        {(() => {
          const qStk = currentStory.stickers?.find((s: any) => s.type === 'questions')
          if (!qStk) return null
          return (
            <div
              onClick={(e) => {
                e.stopPropagation()
                handleOpenQuestionModal(qStk)
              }}
              style={{
                position: 'absolute',
                top: `${qStk.y || 40}%`,
                left: `${qStk.x || 50}%`,
                transform: `translate(-50%, -50%) scale(${qStk.scale || 1})`,
                zIndex: 38,
                width: '230px',
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                cursor: 'pointer',
              }}
            >
              <div style={{ background: '#f43f5e', color: 'white', padding: '10px', textAlign: 'center', fontWeight: 800, fontSize: '13px' }}>
                {qStk.data?.prompt || 'Ask me a question...'}
              </div>
              <div style={{ padding: '14px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', background: '#fafafa' }}>
                Tap to reply... ✍️
              </div>
            </div>
          )
        })()}

        {/* Interactive Notification Reminder Sticker */}
        {(() => {
          const notifStk = currentStory.stickers?.find((s: any) => s.type === 'notify')
          if (!notifStk) return null
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                showToast(`Reminder set for "${notifStk.data?.title || 'Story Event'}"! 🔔`)
              }}
              style={{
                position: 'absolute',
                top: `${notifStk.y || 50}%`,
                left: `${notifStk.x || 50}%`,
                transform: `translate(-50%, -50%) scale(${notifStk.scale || 1})`,
                zIndex: 38,
                background: 'linear-gradient(135deg, #1f2937, #111827)',
                color: 'white',
                padding: '10px 18px',
                borderRadius: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.25)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '16px' }}>🔔</span>
              <span>Remind Me: {notifStk.data?.title || 'Event'}</span>
            </button>
          )
        })()}

        {/* Interactive Food Orders Sticker */}
        {(() => {
          const foodStk = currentStory.stickers?.find((s: any) => s.type === 'food_orders')
          if (!foodStk) return null
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                showToast(`Order placed for ${foodStk.data?.dish || 'Special Dish'}! 🍕 Deliveries on the way!`)
              }}
              style={{
                position: 'absolute',
                top: `${foodStk.y || 50}%`,
                left: `${foodStk.x || 50}%`,
                transform: `translate(-50%, -50%) scale(${foodStk.scale || 1})`,
                zIndex: 38,
                background: '#ffffff',
                color: '#111827',
                padding: '10px 18px',
                borderRadius: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '18px' }}>🍕</span>
              <span>Order {foodStk.data?.dish || 'Food'} ({foodStk.data?.price || '$12'})</span>
            </button>
          )
        })()}

        {/* Interactive Location Sticker (Click to Open Map) */}
        {(() => {
          const locStk = currentStory.stickers?.find((s: any) => s.type === 'location')
          if (!locStk) return null
          const mapQuery = locStk.data?.full || locStk.data?.name || 'Location'
          return (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: `${locStk.y || 25}%`,
                left: `${locStk.x || 50}%`,
                transform: `translate(-50%, -50%) scale(${locStk.scale || 1})`,
                zIndex: 38,
                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '24px',
                fontWeight: 800,
                fontSize: '12px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              <MapPin size={14} />
              <span>{locStk.data?.name || 'Exact Location'}</span>
            </a>
          )
        })()}

        {/* Story Media */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          {mediaError ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '20px' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Unable to load story media</p>
              <button
                onClick={handleNext}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Skip to Next
              </button>
            </div>
          ) : currentStory.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              autoPlay
              playsInline
              loop
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => setMediaError(true)}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setMediaError(true)}
            />
          )}

          {/* Left/Right Tap Zones for Navigation */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '35%',
              cursor: 'pointer',
              zIndex: 20,
            }}
          />
          <div
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '65%',
              cursor: 'pointer',
              zIndex: 20,
            }}
          />

          {/* Nav Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              aria-label="Previous story"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                borderRadius: '50%',
                padding: '8px',
                zIndex: 25,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <ChevronLeft size={22} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            aria-label="Next story"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              borderRadius: '50%',
              padding: '8px',
              zIndex: 25,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Story Caption & Viewers / Likes bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {currentStory.caption && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                fontSize: '13px',
                lineHeight: 1.4,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {currentStory.caption}
            </div>
          )}

          {isOwner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDrawerTab('viewers')
                  setShowViewers(true)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'white',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                }}
              >
                <Eye size={14} />
                <span>{viewers.length} {viewers.length === 1 ? 'view' : 'views'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDrawerTab('likes')
                  setShowViewers(true)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: storyLikes.length > 0 ? '#ef4444' : 'white',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                }}
              >
                <Heart size={14} fill={storyLikes.length > 0 ? '#ef4444' : 'none'} />
                <span>{storyLikes.length} {storyLikes.length === 1 ? 'like' : 'likes'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenHighlightModal()
                }}
                title="Add to Profile Highlights"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#fbbf24',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  cursor: 'pointer',
                }}
              >
                <Star size={14} fill="#fbbf24" />
                <span>Highlight</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <form
                onSubmit={handleSendReply}
                style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  placeholder={`Reply to ${storyGroup?.author?.username || 'story'}...`}
                  style={{
                    width: '100%',
                    padding: '8px 38px 8px 14px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                {replyText.trim() && (
                  <button
                    type="submit"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#ec4899',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Send size={15} />
                  </button>
                )}
              </form>

              {/* Heart / Like Story Button with Hold to Super Like */}
              <button
                type="button"
                onPointerDown={handleLikePointerDown}
                onPointerUp={handleLikePointerUp}
                onPointerLeave={handleLikePointerLeave}
                title="Tap to like, hold for super like notification"
                aria-label={isLiked ? "Unlike story" : "Like story"}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: isLiked ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.25)',
                  background: isLiked
                    ? 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(0, 0, 0, 0.6) 100%)'
                    : 'rgba(0, 0, 0, 0.55)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transform: isHoldingLike ? 'scale(1.28)' : isLiked ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.2s',
                  boxShadow: isHoldingLike
                    ? '0 0 16px rgba(239, 68, 68, 0.8)'
                    : isLiked
                    ? '0 0 10px rgba(239, 68, 68, 0.4)'
                    : 'none',
                  flexShrink: 0,
                }}
              >
                <Heart
                  size={20}
                  fill={isLiked ? '#ef4444' : 'none'}
                  color={isLiked ? '#ef4444' : 'white'}
                  style={{
                    filter: isLiked ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </button>
            </div>
          )}
        </div>

        {/* Viewers & Likes Drawer */}
        {showViewers && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '55%',
              background: 'var(--bg-elevated)',
              borderTop: '1px solid var(--border-strong)',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              padding: '16px',
              zIndex: 45,
              overflowY: 'auto',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setDrawerTab('viewers')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: drawerTab === 'viewers' ? 'var(--primary, #6366f1)' : 'var(--bg-surface)',
                    color: drawerTab === 'viewers' ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Viewers ({viewers.length})
                </button>
                <button
                  onClick={() => setDrawerTab('likes')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: drawerTab === 'likes' ? '#ef4444' : 'var(--bg-surface)',
                    color: drawerTab === 'likes' ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Heart size={12} fill="currentColor" /> Likes ({storyLikes.length})
                </button>
              </div>
              <button onClick={() => setShowViewers(false)}>
                <X size={18} />
              </button>
            </div>

            {drawerTab === 'viewers' ? (
              viewers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                  No views on this story yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewers.map((v) => {
                    const hasLiked = storyLikes.includes(v.viewer_id)
                    return (
                      <div
                        key={`${v.story_id}_${v.viewer_id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={v.viewer?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                            alt="Viewer"
                            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{v.viewer?.username || 'User'}</span>
                            {hasLiked && (
                              <span title="Liked this story">
                                <Heart size={14} fill="#ef4444" color="#ef4444" />
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {formatRelativeTime(v.viewed_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              storyLikes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                  No likes on this story yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {storyLikes.map((userId) => {
                    const matchedViewer = viewers.find((v) => v.viewer_id === userId)
                    const username = matchedViewer?.viewer?.username || `User (${userId.slice(0, 6)})`
                    const avatar = matchedViewer?.viewer?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    return (
                      <div
                        key={`like_${userId}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={avatar}
                            alt={username}
                            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{username}</span>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                          <Heart size={14} fill="#ef4444" color="#ef4444" /> Liked
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* Toast notification banner */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              top: '90px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '20px',
              zIndex: 60,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              pointerEvents: 'none',
              animation: 'fadeInOut 2.5s ease forwards',
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Floating animated hearts */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          {floatingHearts.map((h) => (
            <div
              key={h.id}
              style={{
                position: 'absolute',
                bottom: '40px',
                left: `${h.left}%`,
                animation: `floatStoryHeart ${h.duration}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: h.isSuper ? 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.9))' : 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.7))',
              }}
            >
              <Heart
                size={h.size}
                fill={h.isSuper ? '#ec4899' : '#ef4444'}
                color={h.isSuper ? '#f472b6' : '#f87171'}
              />
            </div>
          ))}
        </div>

        <style>{`
          @keyframes floatStoryHeart {
            0% {
              transform: translateY(0) scale(0.6) rotate(0deg);
              opacity: 0;
            }
            15% {
              opacity: 1;
              transform: translateY(-20px) scale(1.1) rotate(-8deg);
            }
            70% {
              opacity: 0.9;
            }
            100% {
              transform: translateY(-340px) scale(1.4) rotate(16deg);
              opacity: 0;
            }
          }
        `}</style>
        {/* Add to Highlights Modal Dialog */}
        {showHighlightDialog && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              e.stopPropagation()
              setShowHighlightDialog(false)
              setIsPaused(false)
            }}
            style={{
              zIndex: 140,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#1c1c1e',
                borderRadius: '24px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={16} fill="#fbbf24" color="#fbbf24" />
                  <span>Add to Profile Highlights</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowHighlightDialog(false)
                    setIsPaused(false)
                  }}
                  style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Existing highlights list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto', marginBottom: '16px' }}>
                {userHighlights.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: '14px 0' }}>
                    No highlights yet. Create your first one below!
                  </p>
                ) : (
                  userHighlights.map((hl) => (
                    <div
                      key={hl.id}
                      onClick={() => handleAddToExistingHighlight(hl)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={hl.cover_url}
                          alt={hl.title}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #fbbf24' }}
                        />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{hl.title}</p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: '11px' }}>{hl.stories?.length || 0} stories</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>+ Add</span>
                    </div>
                  ))
                )}
              </div>

              {/* Create New Highlight Input */}
              {isCreatingNewHighlight ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Highlight Name (e.g. Summer ☀️)"
                    value={newHighlightTitle}
                    onChange={(e) => setNewHighlightTitle(e.target.value)}
                    autoFocus
                    maxLength={30}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#2c2c2e',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewHighlight(false)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateHighlight}
                      disabled={!newHighlightTitle.trim()}
                      style={{
                        flex: 2,
                        padding: '8px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: '#111827',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: newHighlightTitle.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Save Highlight ⭐
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewHighlight(true)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '14px',
                    background: 'rgba(251, 191, 36, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>+</span>
                  <span>New Highlight</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Question Reply Modal Dialog */}
        {showQuestionDialog && activeQuestionSticker && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              e.stopPropagation()
              setShowQuestionDialog(false)
              setIsPaused(false)
            }}
            style={{
              zIndex: 140,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '340px',
                background: '#ffffff',
                borderRadius: '24px',
                padding: '20px',
                color: '#111827',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ background: '#f43f5e', color: 'white', padding: '10px 14px', borderRadius: '14px', textAlign: 'center', fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>
                {activeQuestionSticker.data?.prompt || 'Ask me a question...'}
              </div>
              <textarea
                placeholder="Type your response to the creator..."
                value={questionResponseText}
                onChange={(e) => setQuestionResponseText(e.target.value)}
                autoFocus
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1.5px solid #e5e7eb',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '14px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionDialog(false)
                    setIsPaused(false)
                  }}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '14px',
                    background: '#f3f4f6',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitQuestionResponse}
                  disabled={!questionResponseText.trim()}
                  style={{
                    flex: 2,
                    padding: '9px',
                    borderRadius: '14px',
                    background: '#ec4899',
                    color: 'white',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: questionResponseText.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Send Response
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
