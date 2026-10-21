import React, { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Sidebar } from './components/navigation/Sidebar'
import { MobileNav } from './components/navigation/MobileNav'
import { AndroidHeader } from './components/navigation/AndroidHeader'
import { usePlatform } from './hooks/usePlatform'
import { FeedView } from './components/feed/FeedView'
import { SearchView } from './components/search/SearchView'
import { ExploreView } from './components/explore/ExploreView'
import { ReelsView } from './components/reels/ReelsView'
import { MessagesView } from './components/messages/MessagesView'
import { NotificationsView } from './components/notifications/NotificationsView'
import { ProfileView } from './components/profile/ProfileView'
import { SettingsView } from './components/settings/SettingsView'
import { ActivityView } from './components/activity/ActivityView'
import { SavedView } from './components/saved/SavedView'
import { ArchiveView } from './components/archive/ArchiveView'
import { CreatePostModal } from './components/upload/CreatePostModal'
import { CreateStoryModal } from './components/upload/CreateStoryModal'
import { CreateMenuModal } from './components/upload/CreateMenuModal'
import { PostDetailModal } from './components/feed/PostDetailModal'
import { ReportModal } from './components/common/ReportModal'
import { AuthModal } from './components/auth/AuthModal'
import { LoginPage } from './components/auth/LoginPage'
import { SignupPage } from './components/auth/SignupPage'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { notificationService } from './services/notificationService'
import { messageService } from './services/messageService'
import { postService } from './services/postService'
import { profileService } from './services/profileService'
import type { Post } from './types/database.types'

type TabType =
  | 'feed'
  | 'search'
  | 'explore'
  | 'reels'
  | 'messages'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'activity'
  | 'saved'
  | 'archive'

interface RouteInfo {
  tab: TabType
  profileId: string | null
  postId: string | null
}

const pathToTab = (pathname: string): RouteInfo => {
  const clean = pathname.toLowerCase().replace(/\/$/, '')
  if (clean === '/search') return { tab: 'search', profileId: null, postId: null }
  if (clean === '/explore') return { tab: 'explore', profileId: null, postId: null }
  if (clean === '/reels') return { tab: 'reels', profileId: null, postId: null }
  if (clean === '/messages') return { tab: 'messages', profileId: null, postId: null }
  if (clean === '/notifications') return { tab: 'notifications', profileId: null, postId: null }
  if (clean === '/settings') return { tab: 'settings', profileId: null, postId: null }
  if (clean === '/activity') return { tab: 'activity', profileId: null, postId: null }
  if (clean === '/saved') return { tab: 'saved', profileId: null, postId: null }
  if (clean === '/archive') return { tab: 'archive', profileId: null, postId: null }
  if (clean === '/profile') return { tab: 'profile', profileId: null, postId: null }
  if (clean.startsWith('/profile/')) {
    const segments = pathname.split('/')
    const pid = segments[2] || null
    return { tab: 'profile', profileId: pid, postId: null }
  }
  if (clean.startsWith('/p/')) {
    const segments = pathname.split('/')
    const pid = segments[2] || null
    return { tab: 'feed', profileId: null, postId: pid }
  }
  return { tab: 'feed', profileId: null, postId: null }
}

const tabToPath = (tab: TabType, profileId?: string | null): string => {
  if (tab === 'feed') return '/'
  if (tab === 'profile' && profileId) return `/profile/${profileId}`
  return `/${tab}`
}

const VibeSocialApp: React.FC = () => {
  const { user, loading } = useAuth()
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const [guestMode, setGuestMode] = useState(false)

  // Initialize active tab and profile from URL
  const initialRoute = pathToTab(window.location.pathname)
  const [currentTab, setCurrentTab] = useState<TabType>(initialRoute.tab)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initialRoute.profileId)
  const [messageTargetUserId, setMessageTargetUserId] = useState<string | null>(null)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [createPostInitialTab, setCreatePostInitialTab] = useState<'post' | 'reel'>('post')
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showGlobalReport, setShowGlobalReport] = useState(false)
  const [selectedDetailPost, setSelectedDetailPost] = useState<Post | null>(null)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [feedRefreshKey, setFeedRefreshKey] = useState(0)
  const { theme } = useTheme()
  const { isAndroid } = usePlatform()

  // Native Capacitor lifecycle: hide splash screen and theme status bar
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    SplashScreen.hide().catch(() => {})

    if (theme === 'dark') {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {})
    } else {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {})
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {})
    }
  }, [theme])

  // Native Android hardware back-button handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerPromise = CapApp.addListener('backButton', () => {
      if (showAuthModal) {
        setShowAuthModal(false)
      } else if (showGlobalReport) {
        setShowGlobalReport(false)
      } else if (selectedDetailPost) {
        setSelectedDetailPost(null)
      } else if (showCreateStory) {
        setShowCreateStory(false)
      } else if (showCreatePost) {
        setShowCreatePost(false)
      } else if (showCreateMenu) {
        setShowCreateMenu(false)
      } else if (selectedProfileId) {
        setSelectedProfileId(null)
      } else if (messageTargetUserId) {
        setMessageTargetUserId(null)
      } else if (currentTab !== 'feed') {
        handleTabChange('feed')
      } else {
        CapApp.exitApp()
      }
    })

    return () => {
      listenerPromise.then((handle) => handle.remove()).catch(() => {})
    }
  }, [
    showAuthModal,
    showGlobalReport,
    selectedDetailPost,
    showCreateStory,
    showCreatePost,
    showCreateMenu,
    selectedProfileId,
    messageTargetUserId,
    currentTab,
  ])

  // Navigation helper
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
    setCurrentPath(path)
    const { tab, profileId } = pathToTab(path)
    setCurrentTab(tab)
    if (profileId) setSelectedProfileId(profileId)
  }

  // Handle browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      setCurrentPath(path)
      const { tab, profileId, postId } = pathToTab(path)
      setCurrentTab(tab)
      setSelectedProfileId(profileId)
      if (postId) {
        postService.getPostById(postId, user?.id).then((p) => {
          if (p) setSelectedDetailPost(p)
        })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [user])

  // If URL has /p/:postId on mount, fetch and open modal
  useEffect(() => {
    if (initialRoute.postId) {
      postService.getPostById(initialRoute.postId, user?.id).then((p) => {
        if (p) setSelectedDetailPost(p)
      })
    }
  }, [initialRoute.postId, user])

  // If user is authenticated and hits /login or /signup, redirect cleanly to feed
  useEffect(() => {
    if (!loading && user) {
      if (currentPath === '/login' || currentPath === '/signup') {
        window.history.replaceState({}, '', '/')
        setCurrentPath('/')
        setCurrentTab('feed')
      }
    }
  }, [loading, user, currentPath])

  // Fetch unread notifications & messages count
  useEffect(() => {
    if (user?.id) {
      notificationService
        .getUnreadCount(user.id)
        .then(setUnreadNotificationsCount)
        .catch(() => setUnreadNotificationsCount(0))

      let subNotifs: { unsubscribe: () => void } | undefined
      try {
        subNotifs = notificationService.subscribeToNotifications(user.id, () => {
          setUnreadNotificationsCount((prev) => prev + 1)
        })
      } catch (err) {
        console.warn('Could not subscribe to notifications:', err)
      }

      messageService
        .getUnreadCount(user.id)
        .then(setUnreadMessagesCount)
        .catch(() => setUnreadMessagesCount(0))

      return () => {
        if (subNotifs && typeof subNotifs.unsubscribe === 'function') {
          try {
            subNotifs.unsubscribe()
          } catch {}
        }
      }
    } else {
      setUnreadNotificationsCount(0)
      setUnreadMessagesCount(0)
    }
  }, [user, currentTab])

  // Update active status (last_seen) periodically
  useEffect(() => {
    if (user?.id) {
      profileService.updateActiveStatus(user.id).catch(() => {})
      const interval = setInterval(() => {
        profileService.updateActiveStatus(user.id).catch(() => {})
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  const handleTabChange = (tab: string) => {
    const t = tab as TabType
    setSelectedProfileId(null)
    setMessageTargetUserId(null)
    setCurrentTab(t)
    const newPath = tabToPath(t, null)
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath)
      setCurrentPath(newPath)
    }
  }

  const handleSelectProfile = (userId: string) => {
    setSelectedProfileId(userId)
    setCurrentTab('profile')
    const newPath = `/profile/${userId}`
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath)
      setCurrentPath(newPath)
    }
  }

  const handleStartMessageWithUser = (targetUserId: string) => {
    if (!user) {
      navigate('/login')
      return
    }
    setMessageTargetUserId(targetUserId)
    setCurrentTab('messages')
    const newPath = '/messages'
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath)
      setCurrentPath(newPath)
    }
  }

  // 1. Session Restoration / Loading State
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#0C1012',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #FF007F, #7928CA, #0070F3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(255, 0, 127, 0.35)',
          }}
        >
          <Sparkles size={28} color="#FFFFFF" />
        </div>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#FFFFFF',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    )
  }

  // 2. Unauthenticated Visitor Routing
  if (!user && !guestMode) {
    if (currentPath === '/signup') {
      return (
        <SignupPage
          onNavigate={navigate}
          onAuthSuccess={() => {
            navigate('/')
          }}
          onExploreGuest={() => {
            setGuestMode(true)
            navigate('/')
          }}
        />
      )
    }

    return (
      <LoginPage
        onNavigate={navigate}
        onAuthSuccess={() => {
          navigate('/')
        }}
        onExploreGuest={() => {
          setGuestMode(true)
          navigate('/')
        }}
      />
    )
  }

  // 3. Authenticated Social Experience
  const activeProfileUserId = selectedProfileId || user?.id || 'guest_user'

  return (
    <div className={`app-container ${isAndroid ? 'android-mode' : 'web-mode'}`}>
      {/* Dedicated Native Android Header (Top Navigation & Status Bar) */}
      {isAndroid && (
        <AndroidHeader
          currentTab={currentTab}
          selectedProfileId={selectedProfileId}
          onTabChange={handleTabChange}
          onBack={() => {
            if (selectedProfileId) {
              setSelectedProfileId(null)
            } else if (currentTab !== 'feed') {
              handleTabChange('feed')
            }
          }}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          onOpenSettings={() => handleTabChange('settings')}
        />
      )}

      {/* Desktop/Tablet Sidebar Navigation (Web only) */}
      {!isAndroid && (
        <Sidebar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onOpenCreateMenu={() => setShowCreateMenu(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenReport={() => setShowGlobalReport(true)}
          unreadMessagesCount={unreadMessagesCount}
          unreadNotificationsCount={unreadNotificationsCount}
        />
      )}

      {/* Main Content Area */}
      <main className="main-wrapper">
        <ErrorBoundary fallbackTitle="Content temporarily unavailable">
          {currentTab === 'feed' && (
            <FeedView
              key={`feed-${feedRefreshKey}`}
              onOpenCreatePost={() => {
                setCreatePostInitialTab('post')
                setShowCreatePost(true)
              }}
              onOpenCreateStory={() => setShowCreateStory(true)}
              onSelectProfile={handleSelectProfile}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentTab === 'search' && (
            <SearchView
              onSelectProfile={handleSelectProfile}
              onStartMessageWithUser={handleStartMessageWithUser}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentTab === 'explore' && (
            <ExploreView
              onSelectProfile={handleSelectProfile}
              onSelectPost={(post) => setSelectedDetailPost(post)}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentTab === 'reels' && (
            <ReelsView
              onSelectProfile={handleSelectProfile}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentTab === 'messages' && (
            <MessagesView
              initialTargetUserId={messageTargetUserId}
              onSelectProfile={handleSelectProfile}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationsView
              onSelectProfile={handleSelectProfile}
              onStartMessageWithUser={handleStartMessageWithUser}
              onSelectPost={(postId) => {
                postService.getPostById(postId, user?.id).then((p) => {
                  if (p) setSelectedDetailPost(p)
                })
              }}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              userId={activeProfileUserId}
              onStartMessageWithUser={handleStartMessageWithUser}
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenSettings={() => handleTabChange('settings')}
            />
          )}

          {currentTab === 'settings' && <SettingsView />}

          {currentTab === 'activity' && (
            <ActivityView
              onSelectProfile={handleSelectProfile}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentTab === 'saved' && (
            <SavedView
              onSelectProfile={handleSelectProfile}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentTab === 'archive' && (
            <ArchiveView
              onBack={() => handleTabChange('profile')}
              onPostClick={(post) => setSelectedDetailPost(post)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenCreateMenu={() => setShowCreateMenu(true)}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Create Menu Modal (Post, Reel, Story choice) */}
      <CreateMenuModal
        isOpen={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
        onSelectPost={() => {
          setCreatePostInitialTab('post')
          setShowCreatePost(true)
        }}
        onSelectReel={() => {
          setCreatePostInitialTab('reel')
          setShowCreatePost(true)
        }}
        onSelectStory={() => {
          setShowCreateStory(true)
        }}
      />

      {/* Create Post / Reel Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        initialTab={createPostInitialTab}
        onClose={() => setShowCreatePost(false)}
        onSuccess={() => {
          setFeedRefreshKey((prev) => prev + 1)
          setCurrentTab('feed')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onReelSuccess={() => {
          setCurrentTab('reels')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onSuccess={() => {
          setFeedRefreshKey((prev) => prev + 1)
          setCurrentTab('feed')
        }}
      />

      {/* Post Detail Modal */}
      {selectedDetailPost && (
        <PostDetailModal
          post={selectedDetailPost}
          isOpen={Boolean(selectedDetailPost)}
          onClose={() => setSelectedDetailPost(null)}
          onSelectProfile={handleSelectProfile}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}

      {/* Global Report Modal */}
      {showGlobalReport && (
        <ReportModal
          isOpen={showGlobalReport}
          onClose={() => setShowGlobalReport(false)}
          targetId={user?.id || ''}
          targetType="user"
          targetTitle="General Platform Feedback / Issue"
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VibeSocialApp />
      </AuthProvider>
    </ThemeProvider>
  )
}
