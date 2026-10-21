import React, { useState, useEffect } from 'react'
import {
  User,
  Shield,
  Lock,
  Bell,
  Moon,
  Sun,
  Eye,
  Download,
  Trash2,
  HelpCircle,
  Check,
  AlertCircle,
  LogOut,
  Archive,
  Slash,
  UserX,
  EyeOff,
  Search,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { profileService } from '../../services/profileService'
import { authService } from '../../services/authService'
import type { Profile } from '../../types/database.types'

type SettingsTab =
  | 'account'
  | 'security'
  | 'privacy'
  | 'notifications'
  | 'appearance'
  | 'accessibility'
  | 'data'
  | 'about'

export const SettingsView: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Account Form State
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')

  // Security State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [authProvider, setAuthProvider] = useState<string>('Email / Password')

  // Privacy & Notifications Settings State
  const [settings, setSettings] = useState({
    is_private: false,
    show_active_status: true,
    like_notifications: true,
    comment_notifications: true,
    follow_notifications: true,
    message_notifications: true,
    reduce_motion: false,
  })

  // Blocked, Restricted & Hidden Story Users State
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([])
  const [restrictedUsers, setRestrictedUsers] = useState<Profile[]>([])
  const [hiddenStoryUsers, setHiddenStoryUsers] = useState<Profile[]>([])
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<Profile[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  // Account Deletion State
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Load existing settings on mount
  useEffect(() => {
    if (user) {
      profileService.getUserSettings(user.id).then((s) => {
        setSettings((prev) => ({ ...prev, ...s }))
      })
      setAuthProvider(authService.getAuthProvider())
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setWebsite(profile.website || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg)
    setErrorMsg(null)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  const notifyError = (msg: string) => {
    setErrorMsg(msg)
    setSuccessMsg(null)
  }

  // --- Load Privacy Data on Tab Switch ---
  const loadPrivacyData = async () => {
    if (!user) return
    setPrivacyLoading(true)
    try {
      const [blocked, restricted, hidden] = await Promise.all([
        profileService.getBlockedUsers(user.id),
        profileService.getRestrictedUsers(user.id),
        profileService.getHiddenStoryUsers(user.id),
      ])
      setBlockedUsers(blocked)
      setRestrictedUsers(restricted)
      setHiddenStoryUsers(hidden)
    } catch (e) {
      console.error('Failed to load privacy data:', e)
    } finally {
      setPrivacyLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'privacy') {
      loadPrivacyData()
    }
  }, [activeTab, user])

  const handleUnblock = async (targetId: string) => {
    if (!user) return
    try {
      await profileService.unblockUser(user.id, targetId)
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId))
      notifySuccess('Account unblocked.')
    } catch {
      notifyError('Failed to unblock account.')
    }
  }

  const handleUnrestrict = async (targetId: string) => {
    if (!user) return
    try {
      await profileService.unrestrictUser(user.id, targetId)
      setRestrictedUsers((prev) => prev.filter((u) => u.id !== targetId))
      notifySuccess('Account unrestricted.')
    } catch {
      notifyError('Failed to unrestrict account.')
    }
  }

  const handleUnhideStory = async (targetId: string) => {
    if (!user) return
    try {
      await profileService.unhideStoryFrom(user.id, targetId)
      setHiddenStoryUsers((prev) => prev.filter((u) => u.id !== targetId))
      notifySuccess('Story unhidden from user.')
    } catch {
      notifyError('Failed to update story privacy.')
    }
  }

  const handleHideStory = async (targetUser: Profile) => {
    if (!user) return
    try {
      await profileService.hideStoryFrom(user.id, targetUser.id)
      setHiddenStoryUsers((prev) => [...prev.filter((u) => u.id !== targetUser.id), targetUser])
      setUserSearchQuery('')
      setUserSearchResults([])
      notifySuccess(`Story hidden from @${targetUser.username}`)
    } catch {
      notifyError('Failed to hide story.')
    }
  }

  const handleSearchUsers = async (query: string) => {
    setUserSearchQuery(query)
    if (!query.trim()) {
      setUserSearchResults([])
      return
    }
    setSearchingUsers(true)
    try {
      const results = await profileService.searchProfiles(query, 5)
      setUserSearchResults(results.filter((r) => r.id !== user?.id))
    } catch {
      setUserSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  // --- TAB A: Account Settings ---
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.]/g, '')
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        throw new Error('Username must be between 3 and 30 characters.')
      }

      await profileService.updateProfile(user.id, {
        full_name: fullName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        avatar_url: avatarUrl.trim() || null,
      })

      await refreshProfile()
      notifySuccess('Account profile updated successfully.')
    } catch (err: any) {
      notifyError(err?.message || 'Failed to update account.')
    } finally {
      setLoading(false)
    }
  }

  // --- TAB B: Security ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      notifyError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      notifyError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await authService.updatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      notifySuccess('Password updated successfully.')
    } catch (err: any) {
      notifyError(err?.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!user?.email) return
    setLoading(true)
    try {
      await authService.resetPassword(user.email)
      setResetEmailSent(true)
      notifySuccess(`Password reset email sent to ${user.email}`)
    } catch (err: any) {
      notifyError(err?.message || 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  // --- TAB C & D: Privacy & Notifications ---
  const handleToggleSetting = async (key: keyof typeof settings) => {
    if (!user) return
    const updated = {
      ...settings,
      [key]: !settings[key],
    }
    setSettings(updated)

    try {
      await profileService.updateUserSettings(user.id, updated)
      notifySuccess('Preference saved.')
    } catch (err: any) {
      notifyError('Failed to save preference.')
      setSettings(settings) // rollback
    }
  }

  // --- TAB G: Data & Export ---
  const handleExportData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await profileService.exportUserData(user.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vibesocial-data-${user.id.slice(0, 8)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notifySuccess('Account data exported successfully as JSON.')
    } catch (err: any) {
      notifyError('Failed to export account data.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    if (deleteConfirmation !== 'DELETE') {
      notifyError('Please type DELETE to confirm.')
      return
    }

    setLoading(true)
    try {
      await authService.deleteAccount()
      window.location.href = '/'
    } catch (err: any) {
      notifyError(err?.message || 'Failed to delete account. You may need to log out and back in first.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '935px',
        margin: '0 auto',
        display: 'flex',
        minHeight: '75vh',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Settings Navigation Sidebar */}
      <aside
        style={{
          width: '240px',
          borderRight: '1px solid var(--border-subtle)',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ padding: '0 20px 16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Settings</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
          {[
            { id: 'account', label: 'Edit Profile', icon: User },
            { id: 'security', label: 'Password & Security', icon: Lock },
            { id: 'privacy', label: 'Account Privacy', icon: Shield },
            { id: 'archive', label: 'Archive (Posts & Stories)', icon: Archive },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'appearance', label: 'Appearance', icon: Moon },
            { id: 'accessibility', label: 'Accessibility', icon: Eye },
            { id: 'data', label: 'Data & Account', icon: Download },
            { id: 'about', label: 'About & Help', icon: HelpCircle },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'archive') {
                    window.history.pushState({}, '', '/archive')
                    window.dispatchEvent(new PopStateEvent('popstate'))
                    return
                  }
                  setActiveTab(item.id as SettingsTab)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid var(--color-pink)' : '3px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--color-pink)' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Settings Content Area */}
      <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
        {/* Alerts */}
        {successMsg && (
          <div
            style={{
              marginBottom: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#10b981',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              marginBottom: '20px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Account Profile Tab */}
        {activeTab === 'account' && (
          <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Edit Profile</h3>

            {/* Avatar URL & Live Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                alt="Avatar Preview"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={50}
                placeholder="Your full name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                placeholder="username"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Letters, numbers, underscores, and dots only.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                rows={3}
                placeholder="Tell your story..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  resize: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', float: 'right' }}>
                {bio.length}/150
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
            >
              {loading ? 'Saving...' : 'Submit Changes'}
            </button>
          </form>
        )}

        {/* 2. Password & Security Tab */}
        {activeTab === 'security' && (
          <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Password & Security</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Manage your credentials and login methods.
              </p>
            </div>

            {/* Provider info */}
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Primary Sign-In Method
              </span>
              <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
                {authProvider} ({user?.email || 'Authenticated'})
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Change Password</h4>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !newPassword}
                style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            {/* Password Reset Email */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Forgot or Reset via Email</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Receive an official Firebase password reset email link to verify and change your password.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSendPasswordReset}
                disabled={loading || resetEmailSent}
              >
                {resetEmailSent ? 'Email Sent' : 'Send Password Reset Email'}
              </button>
            </div>

            {/* Logout Session */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Account Session</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Sign out of your active account session on this device.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={signOut}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Account Privacy Tab */}
        {activeTab === 'privacy' && (
          <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Account Privacy & Permissions</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Manage account visibility, active status, story privacy, and blocked or restricted users.
              </p>
            </div>

            {/* Private Account Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Private Account</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', marginTop: '4px' }}>
                  When your account is private, only people you approve can see your photos and videos. Your existing followers won't be affected.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.is_private}
                onChange={() => handleToggleSetting('is_private')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--color-pink)', cursor: 'pointer' }}
              />
            </div>

            {/* Activity Status Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Show Activity Status</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', marginTop: '4px' }}>
                  Allow accounts you follow and anyone you message to see when you were last active or are currently active. When disabled, you won't see active status of others.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.show_active_status}
                onChange={() => handleToggleSetting('show_active_status')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--color-pink)', cursor: 'pointer' }}
              />
            </div>

            {/* Archive Quick Access Banner */}
            <div
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(236, 72, 153, 0.12))',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--color-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Archive size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Posts & Stories Archive</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    View and restore your archived posts or past 24h stories.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  window.history.pushState({}, '', '/archive')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Open Archive
              </button>
            </div>

            {/* Hide Story From Section */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <EyeOff size={16} color="var(--color-pink)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Hide Story From</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Hide your 24-hour stories from specific accounts. They won't know you hid your stories from them.
              </p>

              {/* User search input for story hiding */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Search username to hide stories from..."
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', width: '100%' }}
                  />
                  {searchingUsers && <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Searching...</span>}
                </div>

                {/* Search Results Dropdown */}
                {userSearchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '42px',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 40,
                      overflow: 'hidden',
                    }}
                  >
                    {userSearchResults.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-light)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                            alt={u.username}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.username}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.full_name}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleHideStory(u)}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          Hide Story
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Currently Hidden Users List */}
              {hiddenStoryUsers.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  No accounts are hidden from your stories.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {hiddenStoryUsers.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={u.username}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.full_name}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnhideStory(u.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Unhide
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Accounts Section */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <UserX size={16} color="#ef4444" />
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Blocked Accounts</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Blocked users cannot find your profile, view your posts, or send you messages.
              </p>

              {privacyLoading ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading blocked accounts...</div>
              ) : blockedUsers.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  No accounts are currently blocked on this profile.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blockedUsers.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={u.username}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.full_name}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblock(u.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Restricted Accounts Section */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Slash size={16} color="var(--color-pink)" />
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Restricted Accounts</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Protect yourself from unwanted interactions without having to block or unfollow someone.
              </p>

              {privacyLoading ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading restricted accounts...</div>
              ) : restrictedUsers.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  No accounts are currently restricted.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {restrictedUsers.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={u.username}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.full_name}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnrestrict(u.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        Unrestrict
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Notifications Preferences Tab */}
        {activeTab === 'notifications' && (
          <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Notification Preferences</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Choose which social interactions trigger notifications for your account.
              </p>
            </div>

            {[
              { key: 'like_notifications' as const, label: 'Likes', desc: 'When someone likes your post or reel' },
              { key: 'comment_notifications' as const, label: 'Comments', desc: 'When someone comments on your post or reel' },
              { key: 'follow_notifications' as const, label: 'New Followers', desc: 'When someone starts following you' },
              { key: 'message_notifications' as const, label: 'Direct Messages', desc: 'When someone sends you a direct message' },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={() => handleToggleSetting(item.key)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-pink)', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 5. Appearance Tab */}
        {activeTab === 'appearance' && (
          <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Appearance</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Customize your visual theme across VibeSocial.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div
                onClick={() => setTheme('dark')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#0C1012',
                  border: theme === 'dark' ? '2px solid var(--color-pink)' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Moon size={24} color="#FFF" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, color: '#FFF' }}>Dark Mode</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Sleek and easy on the eyes</div>
              </div>

              <div
                onClick={() => setTheme('light')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#F8FAFC',
                  border: theme === 'light' ? '2px solid var(--color-pink)' : '1px solid rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Sun size={24} color="#000" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, color: '#000' }}>Light Mode</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Clean high-contrast theme</div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Accessibility Tab */}
        {activeTab === 'accessibility' && (
          <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Accessibility</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Make VibeSocial easier to navigate and interact with.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Reduce Motion</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '340px', marginTop: '4px' }}>
                  Minimize heart animations, spinner transitions, and reel auto-scroll speeds.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.reduce_motion}
                onChange={() => handleToggleSetting('reduce_motion')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--color-pink)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Keyboard Shortcuts</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Close dialog / modal</span>
                  <kbd style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px' }}>Esc</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Navigate items</span>
                  <kbd style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px' }}>Tab / Shift+Tab</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Submit forms / comments</span>
                  <kbd style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px' }}>Enter</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. Data & Account Management Tab */}
        {activeTab === 'data' && (
          <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Data & Account Management</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Download your account records or permanently delete your account.
              </p>
            </div>

            {/* Export data */}
            <div style={{ padding: '18px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Export Account Data</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Download an export copy of your profile info, followers count, and saved post references in JSON format.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportData}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={16} />
                <span>Download Data Export</span>
              </button>
            </div>

            {/* Account Deletion */}
            <div style={{ padding: '18px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                Delete Account
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Permanently delete your profile and authentication account. This action cannot be reversed.
              </p>

              {showDeleteModal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>
                    Type DELETE to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={loading || deleteConfirmation !== 'DELETE'}
                      style={{
                        padding: '8px 16px',
                        background: '#ef4444',
                        color: '#FFF',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: deleteConfirmation === 'DELETE' ? 'pointer' : 'not-allowed',
                        opacity: deleteConfirmation === 'DELETE' ? 1 : 0.6,
                      }}
                    >
                      {loading ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={15} />
                  <span>Request Account Deletion</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 8. About & Help Tab */}
        {activeTab === 'about' && (
          <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>About VibeSocial</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Application details, safety guidelines, and support contacts.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>App Name</span>
                <strong>VibeSocial Web</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Version</span>
                <strong>1.0.0</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Backend Architecture</span>
                <strong>Firebase Authentication & Firestore Database</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cloud Tier</span>
                <strong>Spark (Zero-Cost Free Tier)</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Terms & Privacy</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                VibeSocial respects user data privacy. All Firestore security rules restrict private information to authenticated owners. Media is hosted via secure external CDN URLs to preserve free plan limits.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Need Help?</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Found a bug or have questions? Contact support via GitHub or file an in-app report through the More menu.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
