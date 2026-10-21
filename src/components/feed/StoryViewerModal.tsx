import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Pause, Play } from 'lucide-react'
import type { Story, StoryView } from '../../types/database.types'
import { storyService } from '../../services/storyService'
import { useAuth } from '../../context/AuthContext'

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
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [viewers, setViewers] = useState<StoryView[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const timerRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const hasStories = Boolean(storyGroup && storyGroup.stories.length > 0)
  const currentStory = hasStories && storyGroup ? storyGroup.stories[currentIndex] : null
  const isOwner = Boolean(user && storyGroup && user.id === storyGroup.authorId)

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

  // Mark viewed and load viewers if owner
  useEffect(() => {
    if (!currentStory) return

    if (user && user.id !== currentStory.author_id) {
      storyService.markStoryViewed(currentStory.id, user.id)
    }

    if (isOwner) {
      storyService.getStoryViewers(currentStory.id).then(setViewers)
    }
  }, [currentStory, user, isOwner])

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

        {/* Story Caption & Viewers count */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            zIndex: 35,
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
                marginBottom: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {currentStory.caption}
            </div>
          )}

          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowViewers(!showViewers)
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
              }}
            >
              <Eye size={14} />
              <span>{viewers.length} {viewers.length === 1 ? 'view' : 'views'}</span>
            </button>
          )}
        </div>

        {/* Viewers Drawer */}
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
              <span style={{ fontWeight: 700, fontSize: '15px' }}>
                Viewers ({viewers.length})
              </span>
              <button onClick={() => setShowViewers(false)}>
                <X size={18} />
              </button>
            </div>
            {viewers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                No views on this story yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {viewers.map((v) => (
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
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{v.viewer?.username || 'User'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(v.viewed_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
