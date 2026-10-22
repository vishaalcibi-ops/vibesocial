import React, { useState, useEffect } from 'react'
import {
  Settings,
  Bookmark,
  Grid,
  Send,
  Heart,
  MessageCircle,
  User,
  Film,
  Share2,
  Check,
  Lock,
  MoreHorizontal,
  Slash,
  UserX,
  ShieldAlert,
  Star,
  Eye,
} from 'lucide-react'
import type { Profile, Post, Reel } from '../../types/database.types'
import { profileService } from '../../services/profileService'
import { postService } from '../../services/postService'
import { reelService } from '../../services/reelService'
import { recentViewsService } from '../../services/recentViewsService'
import { useAuth } from '../../context/AuthContext'
import { EditProfileModal } from './EditProfileModal'
import { FollowListModal } from './FollowListModal'
import { CloseFriendsModal } from './CloseFriendsModal'
import { RecentViewsModal } from './RecentViewsModal'
import { PostDetailModal } from '../feed/PostDetailModal'
import { ReportModal } from '../common/ReportModal'

interface ProfileViewProps {
  userId: string
  onStartMessageWithUser: (userId: string) => void
  onOpenAuth: () => void
  onOpenSettings?: () => void
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
  onStartMessageWithUser,
  onOpenAuth,
  onOpenSettings,
}) => {
  const { user, profile: authProfile, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [reels, setReels] = useState<Reel[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts')
  const [stats, setStats] = useState({ followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [hasRequested, setHasRequested] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isRestricted, setIsRestricted] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false)
  const [showRecentViewsModal, setShowRecentViewsModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const isMe = user?.id === userId

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Automatically record profile visit when viewing another user's profile
  useEffect(() => {
    if (user && !isMe && authProfile) {
      recentViewsService.recordProfileView(user.id, userId, authProfile)
    }
  }, [user, userId, isMe, authProfile])

  const loadProfileData = async () => {
    setLoading(true)
    try {
      let p = await profileService.getProfileById(userId)

      // Fallback: If viewing current user's profile and database returned null, use authProfile or synthesize profile
      if (!p && isMe) {
        if (authProfile) {
          p = authProfile
        } else if (user) {
          const rawName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'user'
          const cleanUsername = rawName.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 25) || `user_${user.id.slice(0, 5)}`
          p = {
            id: user.id,
            username: cleanUsername,
            full_name: user.user_metadata?.full_name || cleanUsername,
            bio: '',
            avatar_url: null,
            website: '',
            is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        }
      }

      setProfile(p)

      const [statsRes, postsRes, reelsRes, followRes, requestRes, blockedRes, restrictedRes] = await Promise.all([
        profileService.getFollowStats(userId),
        postService.getProfilePosts(userId, user?.id),
        reelService.getUserReels(userId, user?.id),
        user && !isMe ? profileService.isFollowing(user.id, userId) : Promise.resolve(false),
        user && !isMe ? profileService.hasRequestedFollow(user.id, userId) : Promise.resolve(false),
        user && !isMe ? profileService.isUserBlocked(user.id, userId) : Promise.resolve(false),
        user && !isMe ? profileService.isUserRestricted(user.id, userId) : Promise.resolve(false),
      ])

      setStats(statsRes)
      setPosts(postsRes)
      setReels(reelsRes)
      setIsFollowing(followRes)
      setHasRequested(requestRes)
      setIsBlocked(blockedRes)
      setIsRestricted(restrictedRes)

      if (isMe && user) {
        const saved = await postService.getSavedPosts(user.id)
        setSavedPosts(saved)
      }
    } catch (e) {
      console.error('Error loading profile:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfileData()
  }, [userId, user])

  const handleFollowToggle = async () => {
    if (!user) {
      onOpenAuth()
      return
    }

    if (isFollowing) {
      // Unfollow
      setIsFollowing(false)
      setStats((prev) => ({
        ...prev,
        followers: Math.max(0, prev.followers - 1),
      }))

      try {
        await profileService.unfollowUser(user.id, userId)
      } catch (e) {
        setIsFollowing(true)
        setStats((prev) => ({
          ...prev,
          followers: prev.followers + 1,
        }))
      }
      return
    }

    if (hasRequested) {
      // Cancel request
      setHasRequested(false)
      try {
        await profileService.cancelFollowRequest(user.id, userId)
        showToast('Follow request cancelled')
      } catch (e) {
        setHasRequested(true)
      }
      return
    }

    // Follow or Send Request
    try {
      const res = await profileService.sendFollowRequest(user.id, userId)
      if (res.status === 'requested') {
        setHasRequested(true)
        showToast('Follow request sent')
      } else {
        setIsFollowing(true)
        setStats((prev) => ({
          ...prev,
          followers: prev.followers + 1,
        }))
        showToast('Following')
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to follow')
    }
  }

  const handleBlockToggle = async () => {
    if (!user) return
    setShowUserMenu(false)
    try {
      if (isBlocked) {
        await profileService.unblockUser(user.id, userId)
        setIsBlocked(false)
        showToast('User unblocked')
      } else {
        await profileService.blockUser(user.id, userId)
        setIsBlocked(true)
        setIsFollowing(false)
        setHasRequested(false)
        showToast('User blocked')
      }
    } catch {
      showToast('Action failed')
    }
  }

  const handleRestrictToggle = async () => {
    if (!user) return
    setShowUserMenu(false)
    try {
      if (isRestricted) {
        await profileService.unrestrictUser(user.id, userId)
        setIsRestricted(false)
        showToast('User unrestricted')
      } else {
        await profileService.restrictUser(user.id, userId)
        setIsRestricted(true)
        showToast('User restricted')
      }
    } catch {
      showToast('Action failed')
    }
  }

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || profile?.username} on VibeSocial`,
          url: profileUrl,
        })
        return
      } catch {
        // Fallback
      }
    }
    await navigator.clipboard.writeText(profileUrl)
    showToast('Profile link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="profile-view">
        <div style={{ display: 'flex', gap: '30px', padding: '20px' }}>
          <div className="skeleton" style={{ width: '130px', height: '130px', borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="skeleton" style={{ width: '180px', height: '24px' }} />
            <div className="skeleton" style={{ width: '260px', height: '18px' }} />
            <div className="skeleton" style={{ width: '100%', height: '40px' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    if (isMe && user) {
      const rawName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'user'
      const cleanUsername = rawName.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 25) || `user_${user.id.slice(0, 5)}`
      const fallback: Profile = authProfile || {
        id: user.id,
        username: cleanUsername,
        full_name: user.user_metadata?.full_name || cleanUsername,
        bio: '',
        avatar_url: null,
        website: '',
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setProfile(fallback)
      return null
    }

    if (!user && !userId) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <User size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: 'var(--color-pink)' }} />
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Sign in to View Profile
          </p>
          <p style={{ fontSize: '14px', maxWidth: '360px', margin: '0 auto 16px auto' }}>
            Please sign in or create an account to view your profile, posts, saved items, and followers.
          </p>
          {onOpenAuth && (
            <button className="btn-primary" onClick={onOpenAuth} style={{ margin: '0 auto' }}>
              Sign In / Register
            </button>
          )}
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>User Not Found</p>
        <p style={{ fontSize: '14px', marginBottom: '16px' }}>The user profile you are looking for does not exist or has been removed.</p>
        <button
          className="btn-secondary"
          onClick={() => loadProfileData()}
          style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          Retry
        </button>
      </div>
    )
  }

  const renderStatsCounters = (className = '') => (
    <div className={`profile-stats-row ${className}`}>
      <div className="stat-item">
        <strong>{posts.length}</strong>
        <span>posts</span>
      </div>
      <div
        className="stat-item"
        onClick={() => {
          setFollowModalTab('followers')
          setShowFollowModal(true)
        }}
        style={{ cursor: 'pointer' }}
        title="View followers"
      >
        <strong>{stats.followers.toLocaleString()}</strong>
        <span>followers</span>
      </div>
      <div
        className="stat-item"
        onClick={() => {
          setFollowModalTab('following')
          setShowFollowModal(true)
        }}
        style={{ cursor: 'pointer' }}
        title="View following"
      >
        <strong>{stats.following.toLocaleString()}</strong>
        <span>following</span>
      </div>
    </div>
  )

  const renderActionButtons = () => {
    if (isMe) {
      return (
        <div className="profile-action-buttons">
          <button
            className="btn-secondary"
            onClick={() => setShowEditModal(true)}
            aria-label="Edit Profile"
          >
            <span>Edit Profile</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowCloseFriendsModal(true)}
            title="Close Friends List"
            aria-label="Close Friends"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.08)',
              color: '#10b981',
              fontWeight: 600,
            }}
          >
            <Star size={14} fill="#10b981" />
            <span>Close Friends</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowRecentViewsModal(true)}
            title="Recent Profile Visitors"
            aria-label="Profile Visitors"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 600,
            }}
          >
            <Eye size={14} />
            <span>Recent Views</span>
          </button>

          {onOpenSettings && (
            <button
              className="btn-secondary profile-icon-btn"
              onClick={onOpenSettings}
              title="Account Settings"
              aria-label="Account Settings"
            >
              <Settings size={16} />
            </button>
          )}
          <button
            className="btn-secondary profile-icon-btn"
            onClick={handleShareProfile}
            title="Share profile"
            aria-label="Share profile"
          >
            <Share2 size={16} />
          </button>
        </div>
      )
    }

    return (
      <div className="profile-action-buttons" style={{ position: 'relative' }}>
        <button
          className={isFollowing || hasRequested ? 'btn-secondary' : 'btn-primary'}
          onClick={handleFollowToggle}
          disabled={isBlocked}
        >
          {isFollowing ? 'Following' : hasRequested ? 'Requested' : 'Follow'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => onStartMessageWithUser(userId)}
          disabled={isBlocked}
        >
          <Send size={15} />
          <span>Message</span>
        </button>
        <button
          className="btn-secondary profile-icon-btn"
          onClick={handleShareProfile}
          title="Share profile"
          aria-label="Share profile"
        >
          <Share2 size={16} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="btn-secondary profile-icon-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="More profile options"
            aria-label="More profile options"
          >
            <MoreHorizontal size={16} />
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '36px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
                width: '180px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  handleBlockToggle()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <UserX size={14} />
                <span>{isBlocked ? 'Unblock' : 'Block User'}</span>
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  handleRestrictToggle()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Slash size={14} />
                <span>{isRestricted ? 'Unrestrict' : 'Restrict User'}</span>
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  setShowReportModal(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ShieldAlert size={14} />
                <span>Report</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-view">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-header-top-row">
          <img
            src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
            alt={profile.username || profile.full_name || 'User'}
            className="profile-avatar-large"
          />
          {/* Mobile-only Stats: Positioned beside avatar on phone screens */}
          {renderStatsCounters('mobile-only-stats')}
        </div>

        <div className="profile-details">
          <div className="profile-top-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h1 className="profile-username-heading">{profile.username || profile.full_name || 'user'}</h1>
                {profile.is_verified && <span className="verified-icon">●</span>}
              </div>
              {profile.last_seen && profile.show_active_status !== false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: (Date.now() - new Date(profile.last_seen).getTime()) < 5 * 60 * 1000 ? '#22c55e' : 'var(--text-muted)',
                      display: 'inline-block',
                    }}
                  />
                  <span>
                    {(Date.now() - new Date(profile.last_seen).getTime()) < 5 * 60 * 1000
                      ? 'Active now'
                      : (Date.now() - new Date(profile.last_seen).getTime()) < 60 * 60 * 1000
                      ? `Active ${Math.floor((Date.now() - new Date(profile.last_seen).getTime()) / 60000)}m ago`
                      : `Active ${Math.floor((Date.now() - new Date(profile.last_seen).getTime()) / 3600000)}h ago`}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Action Buttons: Inside top-bar on desktop */}
            <div className="desktop-only-actions">
              {renderActionButtons()}
            </div>
          </div>

          {/* Desktop Stats Row: Positioned below username on desktop */}
          {renderStatsCounters('desktop-only-stats')}
          {/* Bio & Details */}
          <div className="profile-bio-block">
            {profile.full_name && <div className="profile-full-name">{profile.full_name}</div>}
            {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="profile-website"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          {/* Mobile Action Buttons: Full-width row below bio on phone screens */}
          <div className="mobile-only-actions">
            {renderActionButtons()}
          </div>
        </div>
      </div>

      {/* Profile Content or Locked/Blocked Views */}
      {isBlocked ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', borderTop: '1px solid var(--border-subtle)', marginTop: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
            <UserX size={30} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>You blocked this account</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto 16px auto' }}>
            You cannot view their posts or profile while they are blocked.
          </p>
          <button className="btn-secondary" onClick={handleBlockToggle} style={{ margin: '0 auto' }}>
            Unblock Account
          </button>
        </div>
      ) : !isMe && !isFollowing && profile.is_private ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', borderTop: '1px solid var(--border-subtle)', marginTop: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--text-primary)' }}>
            <Lock size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>This account is private</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto' }}>
            Follow this account to see their photos and videos.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs Row */}
          <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: activeTab === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'posts' ? '2px solid var(--text-primary)' : '2px solid transparent',
            paddingBottom: '8px',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          <Grid size={15} />
          <span>Posts</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: activeTab === 'reels' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'reels' ? '2px solid var(--text-primary)' : '2px solid transparent',
            paddingBottom: '8px',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          <Film size={15} />
          <span>Reels ({reels.length})</span>
        </button>

        {isMe && (
          <button
            onClick={() => setActiveTab('saved')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: activeTab === 'saved' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'saved' ? '2px solid var(--text-primary)' : '2px solid transparent',
              paddingBottom: '8px',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={15} />
            <span>Saved</span>
          </button>
        )}
      </div>

      {/* Grid of Posts / Reels / Saved */}
      {activeTab === 'reels' ? (
        reels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <Film size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              No Reels Yet
            </p>
            <p style={{ fontSize: '13px' }}>Videos published by this creator will appear here.</p>
          </div>
        ) : (
          <div className="explore-grid">
            {reels.map((reel) => (
              <div
                key={reel.id}
                className="explore-item"
                style={{ aspectRatio: '9/16' }}
              >
                <video src={reel.video_url} className="explore-img" style={{ objectFit: 'cover' }} />
                <div className="explore-overlay">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={18} fill="white" />
                    <span>{reel.likes_count || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={18} fill="white" />
                    <span>{reel.comments_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (activeTab === 'posts' ? posts : savedPosts).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {activeTab === 'posts' ? 'No Posts Yet' : 'No Saved Posts'}
          </p>
          <p style={{ fontSize: '13px' }}>
            {activeTab === 'posts'
              ? 'Photos and videos shared by this user will appear here.'
              : 'Save posts you love to revisit them later.'}
          </p>
        </div>
      ) : (
        <div className="explore-grid">
          {(activeTab === 'posts' ? posts : savedPosts).map((post) => {
            const media = post.media && post.media[0]
            return (
              <div
                key={post.id}
                className="explore-item"
                onClick={() => setSelectedPost(post)}
              >
                {media ? (
                  media.media_type === 'video' ? (
                    <video src={media.storage_path} className="explore-img" />
                  ) : (
                    <img src={media.storage_path} alt="Post thumbnail" className="explore-img" loading="lazy" />
                  )
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Post
                  </div>
                )}
                <div className="explore-overlay">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={18} fill="white" />
                    <span>{post.likes_count || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={18} fill="white" />
                    <span>{post.comments_count || 0}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
        </>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && authProfile && (
        <EditProfileModal
          profile={authProfile}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            setProfile(updated)
            refreshProfile()
          }}
        />
      )}

      {/* Followers & Following List Modal */}
      {showFollowModal && (
        <FollowListModal
          userId={userId}
          initialTab={followModalTab}
          isOpen={showFollowModal}
          onClose={() => setShowFollowModal(false)}
          onSelectProfile={(selectedId) => {
            setShowFollowModal(false)
            if (selectedId !== userId) {
              window.history.pushState({}, '', `/profile/${selectedId}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          onSelectProfile={(targetId) => {
            setSelectedPost(null)
            if (targetId !== userId) {
              window.history.pushState({}, '', `/profile/${targetId}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }}
          onPostUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }}
          onPostDeleted={(deletedId) => {
            setPosts((prev) => prev.filter((p) => p.id !== deletedId))
          }}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Report User Modal */}
      {showReportModal && profile && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetId={userId}
          targetType="user"
          targetTitle={`@${profile.username}`}
        />
      )}

      {/* Close Friends Management Modal */}
      {showCloseFriendsModal && user && (
        <CloseFriendsModal
          isOpen={showCloseFriendsModal}
          onClose={() => setShowCloseFriendsModal(false)}
          onUpdated={() => {
            showToast('Close Friends updated')
          }}
        />
      )}

      {/* Recent Profile Views Modal */}
      {showRecentViewsModal && (
        <RecentViewsModal
          isOpen={showRecentViewsModal}
          onClose={() => setShowRecentViewsModal(false)}
          profileId={userId}
          onSelectProfile={(targetId) => {
            setShowRecentViewsModal(false)
            if (targetId !== userId) {
              window.history.pushState({}, '', `/profile/${targetId}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }}
        />
      )}
    </div>
  )
}
