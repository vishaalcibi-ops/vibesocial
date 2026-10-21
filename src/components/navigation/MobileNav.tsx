import React from 'react'
import { Home, Search, PlusSquare, Film, User, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface MobileNavProps {
  currentTab: string
  onTabChange: (tab: string) => void
  onOpenCreateMenu: () => void
  onOpenAuth: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onTabChange,
  onOpenCreateMenu,
  onOpenAuth,
}) => {
  const { user, profile } = useAuth()

  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`action-btn ${currentTab === 'feed' ? 'active' : ''}`}
        onClick={() => onTabChange('feed')}
        style={{ color: 'var(--text-primary)' }}
        title="Feed"
        aria-label="Feed"
      >
        <Home size={24} strokeWidth={currentTab === 'feed' ? 2.6 : 2} />
      </button>

      <button
        className={`action-btn ${currentTab === 'search' ? 'active' : ''}`}
        onClick={() => onTabChange('search')}
        style={{ color: 'var(--text-primary)' }}
        title="Search"
        aria-label="Search"
      >
        <Search size={24} strokeWidth={currentTab === 'search' ? 2.6 : 2} />
      </button>

      <button
        className="action-btn"
        onClick={() => {
          if (!user) onOpenAuth()
          else onOpenCreateMenu()
        }}
        style={{ color: 'var(--text-primary)' }}
        title="Create Post"
        aria-label="Create Post"
      >
        <PlusSquare size={24} strokeWidth={2} />
      </button>

      <button
        className={`action-btn ${currentTab === 'reels' ? 'active' : ''}`}
        onClick={() => onTabChange('reels')}
        style={{ color: 'var(--text-primary)' }}
        title="Reels"
        aria-label="Reels"
      >
        <Film size={24} strokeWidth={currentTab === 'reels' ? 2.6 : 2} />
      </button>

      <button
        className={`action-btn ${currentTab === 'profile' ? 'active' : ''}`}
        onClick={() => {
          if (!user) onOpenAuth()
          else onTabChange('profile')
        }}
        style={{ color: 'var(--text-primary)' }}
        title="Profile"
        aria-label="Profile"
      >
        {user ? (
          profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: currentTab === 'profile' ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
              }}
            />
          ) : (
            <User size={24} strokeWidth={currentTab === 'profile' ? 2.6 : 2} />
          )
        ) : (
          <LogIn size={24} strokeWidth={2} />
        )}
      </button>
    </nav>
  )
}
