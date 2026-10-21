import React, { useState } from 'react'
import { authService } from '../../services/authService'
import { isBackendConfigured, getBackendProvider } from '../../services/backendConfig'
import { X, Sparkles, Mail, Lock, User, AtSign, AlertCircle } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)

    if (!isBackendConfigured()) {
      setErrorMsg(
        getBackendProvider() === 'firebase'
          ? 'Firebase credentials are not configured yet. Please configure VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID in .env.local or enter them in the setup banner above.'
          : 'Supabase is not configured yet. Please provide your Supabase URL & Key in the setup banner above.'
      )
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error('Please choose a username.')
        }
        await authService.signUp(email, password, username, fullName)
        if (getBackendProvider() === 'firebase') {
          onSuccess()
          onClose()
        } else {
          setInfoMsg('Account created successfully! Check your email if email confirmation is enabled, or sign in now.')
          setIsSignUp(false)
        }
      } else {
        await authService.signIn(email, password)
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} className="verified-icon" />
            <span>{isSignUp ? 'Create your VibeSocial Account' : 'Welcome back to VibeSocial'}</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{ background: 'var(--color-like-bg)', border: '1px solid var(--color-like)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-like)', fontSize: '13px' }}>
              <AlertCircle size={16} flex-shrink="0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px', color: '#16a34a', fontSize: '13px' }}>
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isSignUp && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <AtSign size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                      style={{ width: '100%', paddingLeft: '38px' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Alex Mercer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ width: '100%', paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', marginTop: '8px', padding: '10px' }}
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setErrorMsg(null)
              }}
              style={{ color: 'var(--color-link)', fontWeight: 600 }}
            >
              {isSignUp ? 'Log in' : 'Create an account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
