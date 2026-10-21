import React, { useState } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'
import type { Profile } from '../../types/database.types'
import { profileService } from '../../services/profileService'

interface EditProfileModalProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: Profile) => void
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Avatar file exceeds 10MB limit.')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      let finalAvatarUrl = avatarUrl.trim() || profile.avatar_url
      if (avatarFile) {
        try {
          finalAvatarUrl = await profileService.uploadAvatar(profile.id, avatarFile)
        } catch (uploadErr: any) {
          // If storage is disabled (e.g. Firebase Spark free plan), show informative message if no URL provided
          if (!avatarUrl.trim()) {
            throw uploadErr
          }
        }
      }

      const updated = await profileService.updateProfile(profile.id, {
        full_name: fullName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        avatar_url: finalAvatarUrl || null,
      })

      onSuccess(updated)
      onClose()
    } catch (err: any) {
      console.error('Failed to update profile:', err)
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <span>Edit Profile</span>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '13px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Avatar Edit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={avatarPreview || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                alt="Avatar"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <label
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  background: 'var(--color-link)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{profile.username}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Change profile photo or enter URL below</div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Avatar Image URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value)
                setAvatarPreview(e.target.value || profile.avatar_url)
              }}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Website Link
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center', padding: '12px', marginTop: '6px' }}
          >
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
