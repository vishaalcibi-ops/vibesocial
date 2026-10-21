import React, { useState, useRef, useEffect } from 'react'
import {
  Home,
  Search,
  Compass,
  Film,
  Send,
  Heart,
  PlusSquare,
  User,
  LogOut,
  Sparkles,
  LogIn,
  Moon,
  Sun,
  Menu,
  Settings,
  Clock,
  Bookmark,
  Archive,
  Flag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

interface SidebarProps {
  currentTab: string
  onTabChange: (tab: string) => void
  onOpenCreateMenu: () => void
  onOpenAuth: () => void
  onOpenReport?: () => void
  unreadMessagesCount?: number
  unreadNotificationsCount?: number
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenCreateMenu,
  onOpenAuth,
  onOpenReport,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
}) => {
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement | null>(null)

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMoreMenu])

  return (
    <aside className="app-sidebar">
      {/* Brand Header / Wordmark */}
      <div className="brand-header" onClick={() => onTabChange('feed')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo-icon">
          <Sparkles size={18} />
        </div>
        <span className="brand-title">VibeSocial</span>
      </div>

      {/* Main Nav Links */}
      <nav className="nav-links">
        <button
          className={`nav-item ${currentTab === 'feed' ? 'active' : ''}`}
          onClick={() => onTabChange('feed')}
          title="Home"
          aria-label="Home"
        >
          <Home size={24} strokeWidth={currentTab === 'feed' ? 2.6 : 2} />
          <span>Home</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'search' ? 'active' : ''}`}
          onClick={() => onTabChange('search')}
          title="Search"
          aria-label="Search"
        >
          <Search size={24} strokeWidth={currentTab === 'search' ? 2.6 : 2} />
          <span>Search</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'explore' ? 'active' : ''}`}
          onClick={() => onTabChange('explore')}
          title="Explore"
          aria-label="Explore"
        >
          <Compass size={24} strokeWidth={currentTab === 'explore' ? 2.6 : 2} />
          <span>Explore</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'reels' ? 'active' : ''}`}
          onClick={() => onTabChange('reels')}
          title="Reels"
          aria-label="Reels"
        >
          <Film size={24} strokeWidth={currentTab === 'reels' ? 2.6 : 2} />
          <span>Reels</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'messages' ? 'active' : ''}`}
          onClick={() => {
            if (!user) onOpenAuth()
            else onTabChange('messages')
          }}
          title="Messages"
          aria-label="Messages"
        >
          <Send size={24} strokeWidth={currentTab === 'messages' ? 2.6 : 2} />
          <span>Messages</span>
          {unreadMessagesCount > 0 && <span className="badge">{unreadMessagesCount}</span>}
        </button>

        <button
          className={`nav-item ${currentTab === 'notifications' ? 'active' : ''}`}
          onClick={() => {
            if (!user) onOpenAuth()
            else onTabChange('notifications')
          }}
          title="Notifications"
          aria-label="Notifications"
        >
          <Heart size={24} strokeWidth={currentTab === 'notifications' ? 2.6 : 2} />
          <span>Notifications</span>
          {unreadNotificationsCount > 0 && <span className="badge">{unreadNotificationsCount}</span>}
        </button>

        <button
          className="nav-item"
          onClick={() => {
            if (!user) onOpenAuth()
            else onOpenCreateMenu()
          }}
          title="Create"
          aria-label="Create"
        >
          <PlusSquare size={24} strokeWidth={2} />
          <span>Create</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => {
            if (!user) onOpenAuth()
            else onTabChange('profile')
          }}
          title="Profile"
          aria-label="Profile"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
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
          )}
          <span>{user ? (profile?.username || 'Profile') : 'Profile'}</span>
        </button>
      </nav>

      {/* Bottom Controls: More Menu & Auth */}
      <div className="sidebar-bottom-controls" style={{ position: 'relative' }} ref={moreMenuRef}>
        {/* Floating More Menu Popover */}
        {showMoreMenu && (
          <div
            style={{
              position: 'absolute',
              bottom: '54px',
              left: '12px',
              width: '240px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 100,
            }}
          >
            <button
              onClick={() => {
                setShowMoreMenu(false)
                onTabChange('settings')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setShowMoreMenu(false)
                onTabChange('activity')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Clock size={18} />
              <span>Your Activity</span>
            </button>

            <button
              onClick={() => {
                setShowMoreMenu(false)
                onTabChange('saved')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Bookmark size={18} />
              <span>Saved</span>
            </button>

            <button
              onClick={() => {
                setShowMoreMenu(false)
                onTabChange('archive')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Archive size={18} />
              <span>Archive</span>
            </button>

            <button
              onClick={() => {
                toggleTheme()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>Switch Appearance</span>
            </button>

            {onOpenReport && (
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  onOpenReport()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Flag size={18} />
                <span>Report a problem</span>
              </button>
            )}

            {user && (
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  signOut()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid var(--border-subtle)',
                  borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={18} />
                <span>Log out</span>
              </button>
            )}
          </div>
        )}

        {/* More Trigger Button */}
        {user ? (
          <button
            className={`nav-item ${showMoreMenu ? 'active' : ''}`}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More"
            aria-label="More options"
            aria-haspopup="true"
            aria-expanded={showMoreMenu}
          >
            <Menu size={24} strokeWidth={showMoreMenu ? 2.6 : 2} />
            <span>More</span>
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={onOpenAuth}
            style={{ width: '100%', marginTop: '6px' }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  )
}
