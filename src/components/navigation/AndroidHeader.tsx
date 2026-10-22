import React, { useState } from 'react'
import { Sparkles, Heart, Send, ArrowLeft, Settings as SettingsIcon, RotateCw } from 'lucide-react'

interface AndroidHeaderProps {
  currentTab: string
  selectedProfileId: string | null
  onTabChange: (tab: string) => void
  onBack: () => void
  unreadNotificationsCount?: number
  unreadMessagesCount?: number
  onOpenSettings?: () => void
  onRefresh?: () => void | Promise<void>
}

const TAB_TITLES: Record<string, string> = {
  feed: 'VibeSocial',
  search: 'Search',
  explore: 'Explore',
  reels: 'Reels',
  messages: 'Direct',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  activity: 'Your Activity',
  saved: 'Saved',
  archive: 'Archive',
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  currentTab,
  selectedProfileId,
  onTabChange,
  onBack,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  onOpenSettings,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isFeed = currentTab === 'feed'
  const isProfile = currentTab === 'profile'
  const title = TAB_TITLES[currentTab] || 'VibeSocial'

  const handleRefreshClick = async () => {
    if (isRefreshing || !onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setIsRefreshing(false), 700)
    }
  }

  return (
    <header className="android-top-bar" role="banner">
      {isFeed ? (
        // Feed Header: Brand on left, Notifications & Messages on right
        <>
          <div
            className="android-brand"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <div className="brand-logo-icon" style={{ width: '26px', height: '26px' }}>
              <Sparkles size={15} />
            </div>
            <span className="brand-title" style={{ display: 'inline', fontSize: '20px' }}>
              VibeSocial
            </span>
          </div>

          <div className="android-actions">
            {/* In-app Refresh Button */}
            {onRefresh && (
              <button
                className="android-icon-btn"
                onClick={handleRefreshClick}
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw
                  size={20}
                  strokeWidth={2.2}
                  style={{
                    transition: 'transform 0.4s ease',
                    animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none',
                  }}
                />
              </button>
            )}

            {/* Notifications Heart */}
            <button
              className="android-icon-btn"
              onClick={() => onTabChange('notifications')}
              aria-label="Notifications"
              title="Notifications"
            >
              <Heart size={24} strokeWidth={2} />
              {unreadNotificationsCount > 0 && (
                <span className="android-badge">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Direct Messages */}
            <button
              className="android-icon-btn"
              onClick={() => onTabChange('messages')}
              aria-label="Messages"
              title="Messages"
            >
              <Send size={22} strokeWidth={2} style={{ transform: 'rotate(-20deg)', marginTop: '-2px' }} />
              {unreadMessagesCount > 0 && (
                <span className="android-badge">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
          </div>
        </>
      ) : (
        // Sub-page Header: Back button + Title
        <>
          <div className="android-nav-left">
            <button
              className="android-icon-btn"
              onClick={onBack}
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft size={22} strokeWidth={2.4} />
            </button>
            <h1 className="android-page-title">{title}</h1>
          </div>

          <div className="android-actions">
            {/* In-app Refresh Button */}
            {onRefresh && (
              <button
                className="android-icon-btn"
                onClick={handleRefreshClick}
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw
                  size={20}
                  strokeWidth={2.2}
                  style={{
                    transition: 'transform 0.4s ease',
                    animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none',
                  }}
                />
              </button>
            )}

            {isProfile && onOpenSettings && !selectedProfileId && (
              <button
                className="android-icon-btn"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon size={22} />
              </button>
            )}
            {currentTab !== 'messages' && (
              <button
                className="android-icon-btn"
                onClick={() => onTabChange('messages')}
                aria-label="Messages"
                title="Messages"
              >
                <Send size={22} strokeWidth={2} style={{ transform: 'rotate(-20deg)', marginTop: '-2px' }} />
                {unreadMessagesCount > 0 && (
                  <span className="android-badge">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </header>
  )
}
