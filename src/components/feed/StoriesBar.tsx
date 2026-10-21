import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { storyService } from '../../services/storyService'
import type { Story } from '../../types/database.types'
import { useAuth } from '../../context/AuthContext'

interface StoriesBarProps {
  onOpenCreateStory: () => void
  onSelectStoryGroup: (group: { authorId: string; author: any; stories: Story[] }) => void
  refreshTrigger?: number
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  onOpenCreateStory,
  onSelectStoryGroup,
  refreshTrigger = 0,
}) => {
  const { user, profile } = useAuth()
  const [storyGroups, setStoryGroups] = useState<{ authorId: string; author: any; stories: Story[]; hasUnviewed: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  const loadStories = async () => {
    try {
      const groups = await storyService.getActiveStories(user?.id)
      setStoryGroups(groups)
    } catch (e) {
      console.error('Failed to load stories:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStories()
  }, [user, refreshTrigger])

  const myGroup = user ? storyGroups.find((g) => g.authorId === user.id) : null
  const otherGroups = user ? storyGroups.filter((g) => g.authorId !== user.id) : storyGroups
  const isMyCloseFriends = Boolean(myGroup?.stories.some((s) => s.is_close_friends))

  return (
    <div className="stories-section" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* Current User Story / Add Story Button */}
      <div className="story-item">
        <div
          className={`story-ring-container ${myGroup?.hasUnviewed ? 'has-unviewed' : ''}`}
          onClick={() => {
            if (myGroup) {
              onSelectStoryGroup(myGroup)
            } else {
              onOpenCreateStory()
            }
          }}
          title={myGroup ? 'View your story' : 'Add to your story'}
          style={{
            cursor: 'pointer',
            background: isMyCloseFriends ? 'linear-gradient(45deg, #10b981, #059669)' : undefined,
          }}
        >
          <img
            src={
              profile?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt="Your Story"
            className="story-avatar-img"
          />
          {isMyCloseFriends && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#ffffff',
                border: '2px solid var(--bg-primary, #000)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                zIndex: 2,
              }}
              title="Close Friends Story"
            >
              ★
            </div>
          )}
          <div
            className="create-story-badge"
            onClick={(e) => {
              e.stopPropagation()
              onOpenCreateStory()
            }}
            title="Create new story"
          >
            <Plus size={14} strokeWidth={3} />
          </div>
        </div>
        <span className="story-username">
          {myGroup ? 'Your story' : 'Add story'}
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading &&
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="story-item">
            <div className="skeleton" style={{ width: '68px', height: '68px', borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: '50px', height: '10px', marginTop: '4px' }} />
          </div>
        ))}

      {/* Other Users' Active Story Groups */}
      {otherGroups.map((group) => {
        const isCloseFriends = Boolean(group.stories.some((s) => s.is_close_friends))
        return (
          <div
            key={group.authorId}
            className="story-item"
            onClick={() => onSelectStoryGroup(group)}
            title={`View ${group.author?.username || 'user'}'s story${isCloseFriends ? ' (Close Friends)' : ''}`}
          >
            <div
              className={`story-ring-container ${group.hasUnviewed ? 'has-unviewed' : ''}`}
              style={{
                background: isCloseFriends ? 'linear-gradient(45deg, #10b981, #059669)' : undefined,
              }}
            >
              <img
                src={
                  group.author?.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                }
                alt={group.author?.username || 'User'}
                className="story-avatar-img"
              />
              {isCloseFriends && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    border: '2px solid var(--bg-primary, #000)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    zIndex: 2,
                  }}
                  title="Close Friends Story"
                >
                  ★
                </div>
              )}
            </div>
            <span className="story-username">{group.author?.username || 'User'}</span>
          </div>
        )
      })}
    </div>
  )
}
