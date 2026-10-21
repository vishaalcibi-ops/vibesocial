import React, { useState } from 'react'
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Check,
} from 'lucide-react'
import { authService } from '../../services/authService'

interface SignupPageProps {
  onNavigate: (path: string) => void
  onAuthSuccess?: () => void
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate, onAuthSuccess }) => {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanFullName = fullName.trim()
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanFullName) {
      setErrorMsg('Please enter your full name.')
      return
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters long (letters, numbers, underscores).')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.')
      return
    }

    setLoading(true)
    try {
      await authService.signUp(cleanEmail, password, cleanUsername, cleanFullName)
      setSuccessMsg('Account created successfully! Welcome to VibeSocial.')
      setTimeout(() => {
        if (onAuthSuccess) {
          onAuthSuccess()
        } else {
          onNavigate('/')
        }
      }, 700)
    } catch (err: any) {
      console.error('Signup error:', err)
      setErrorMsg(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setErrorMsg(null)
    setGoogleLoading(true)
    try {
      const res = await authService.signInWithGoogle()
      if (res && (res as any).redirected) {
        return
      }
      if (onAuthSuccess) {
        onAuthSuccess()
      } else {
        onNavigate('/')
      }
    } catch (err: any) {
      if (
        err?.message?.includes('cancelled') ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return
      }
      console.error('Google signup error:', err)
      setErrorMsg(err.message || 'Google sign-in was not completed.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0C1012',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        color: '#FFFFFF',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#1F1F1F',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #FF007F, #7928CA, #0070F3)',
              marginBottom: 14,
              boxShadow: '0 8px 24px rgba(255, 0, 127, 0.35)',
            }}
          >
            <Sparkles size={28} color="#FFFFFF" />
          </div>
          <h1
            style={{
              margin: '0 0 6px 0',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(90deg, #FFFFFF, #E2E8F0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Join VibeSocial
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#A0A0A0' }}>
            Sign up to share moments, watch Reels, and connect with your community.
          </p>
        </div>

        {/* Quick Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.16)',
            backgroundColor: '#2A2A2A',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease',
            marginBottom: 20,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#333333')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2A2A2A')}
        >
          {googleLoading ? (
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#FFFFFF',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{googleLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
        </button>

        {/* OR Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '0 0 20px 0',
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          <span
            style={{
              padding: '0 14px',
              color: '#888888',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            OR
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#FCA5A5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 16,
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#86EFAC',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Check size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Full Name */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CCCCCC',
                marginBottom: 6,
              }}
            >
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px 0 38px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <User
                size={16}
                color="#777777"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CCCCCC',
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="janedoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px 0 38px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 13,
                  color: '#777777',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                @
              </span>
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CCCCCC',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px 0 38px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Mail
                size={16}
                color="#777777"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CCCCCC',
                marginBottom: 6,
              }}
            >
              Password (6+ chars)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 40px 0 38px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Lock
                size={16}
                color="#777777"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 13,
                  background: 'none',
                  border: 'none',
                  color: '#888888',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CCCCCC',
                marginBottom: 6,
              }}
            >
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 40px 0 38px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Lock
                size={16}
                color="#777777"
                style={{ position: 'absolute', left: 12, top: 14 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 13,
                  background: 'none',
                  border: 'none',
                  color: '#888888',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              height: 44,
              marginTop: 10,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #FF007F, #7928CA, #0070F3)',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 4px 16px rgba(255, 0, 127, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s ease',
            }}
          >
            {loading ? (
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFFFFF',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            fontSize: 14,
            color: '#A0A0A0',
          }}
        >
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0095F6',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              fontSize: 14,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Log in
          </button>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#666666' }}>
          By signing up, you agree to VibeSocial's Terms, Privacy Policy, and Community Guidelines.
        </div>
      </div>
    </div>
  )
}
