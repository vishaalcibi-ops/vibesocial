import React, { useState } from 'react'
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Heart,
  Send,
  Film,
  X,
} from 'lucide-react'
import { authService } from '../../services/authService'
import { usePlatform } from '../../hooks/usePlatform'

interface LoginPageProps {
  onNavigate: (path: string) => void
  onAuthSuccess?: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onAuthSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const { isAndroid } = usePlatform()
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    const isMobileUA =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    return isMobileUA || window.innerWidth <= 1024 || isAndroid
  })

  React.useEffect(() => {
    const handleResize = () => {
      const isMobileUA =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileUA || window.innerWidth <= 1024 || isAndroid)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isAndroid])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.')
      return
    }
    if (!password) {
      setErrorMsg('Please enter your password.')
      return
    }

    setLoading(true)
    try {
      await authService.signIn(cleanEmail, password)
      if (onAuthSuccess) onAuthSuccess()
      onNavigate('/')
    } catch (err: any) {
      console.error('Login error:', err)
      setErrorMsg(err.message || 'Failed to sign in. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMsg(null)
    setGoogleLoading(true)
    try {
      await authService.signInWithGoogle()
      if (onAuthSuccess) onAuthSuccess()
      onNavigate('/')
    } catch (err: any) {
      console.error('Google Sign-In error:', err)
      setErrorMsg(err.message || 'Failed to sign in with Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(null)
    const clean = forgotEmail.trim()
    if (!clean || !clean.includes('@')) {
      setForgotError('Please enter a valid email address.')
      return
    }

    setForgotLoading(true)
    try {
      await authService.resetPassword(clean)
      setForgotSuccess(true)
    } catch (err: any) {
      console.error('Forgot password error:', err)
      setForgotError(err.message || 'Failed to send password reset email.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div
      className="login-page-wrapper"
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : 'stretch',
        justifyContent: isMobile ? 'center' : 'flex-start',
        background: '#0C1012',
        color: '#FFFFFF',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* =========================================================================
          LEFT PROMOTIONAL SECTION (Desktop / Tablet only)
          Background: #0C1012 (Deep rich dark)
      ========================================================================== */}
      {!isMobile && (
        <div
          className="login-promo-section"
          style={{
            flex: '1.1',
            background: '#0C1012',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 56px',
            position: 'relative',
            overflow: 'hidden',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            boxSizing: 'border-box',
          }}
        >
        {/* Subtle Background Glows */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top: Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
            }}
          >
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(90deg, #FFFFFF, #E2E8F0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            VibeSocial
          </span>
        </div>

        {/* Middle: Headline & Visual Promotional Collage */}
        <div style={{ margin: 'auto 0', zIndex: 2, padding: '24px 0' }}>
          {/* Main Promotional Headline */}
          <h1
            style={{
              fontSize: 'clamp(32px, 3.6vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              marginBottom: '18px',
              maxWidth: '540px',
            }}
          >
            See{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #ec4899, #a855f7, #f97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              everyday moments
            </span>{' '}
            with your{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              community
            </span>
            .
          </h1>
          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              color: '#94A3B8',
              maxWidth: '460px',
              marginBottom: '36px',
            }}
          >
            Share authentic photos, watch vertical reels, connect with direct messages, and explore
            real stories from creators worldwide.
          </p>

          {/* Visual Floating Collage of VibeSocial Content */}
          <div
            style={{
              position: 'relative',
              height: '320px',
              maxWidth: '500px',
            }}
          >
            {/* Card 1: Feed Post Mockup */}
            <div
              style={{
                position: 'absolute',
                top: '0px',
                left: '0px',
                width: '260px',
                background: '#1A2024',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                transform: 'rotate(-3deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Elena"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F9' }}>
                    elena_vibes
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Goa, India</div>
                </div>
              </div>
              <div style={{ borderRadius: '10px', overflow: 'hidden', height: '150px', background: '#000' }}>
                <img
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80"
                  alt="Beach Sunset"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ec4899', fontSize: '11px', fontWeight: 700 }}>
                  <Heart size={14} fill="#ec4899" />
                  <span>1.4k</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94A3B8', fontSize: '11px' }}>
                  <Send size={13} />
                  <span>342</span>
                </div>
              </div>
            </div>

            {/* Card 2: Vertical Reel Card */}
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '10px',
                width: '180px',
                height: '260px',
                background: '#1A2024',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                transform: 'rotate(4deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&auto=format&fit=crop&q=80"
                alt="Reel Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(6px)',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Film size={11} color="#ec4899" />
                  <span>Reel</span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                    Neon Night City 🌃
                  </div>
                  <div style={{ fontSize: '9px', color: '#CBD5E1' }}>🎵 Lo-Fi Waves • Trending</div>
                </div>
              </div>
            </div>

            {/* Floating Badge 3: Story Ring */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '120px',
                background: 'rgba(26, 32, 36, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: '8px 14px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                zIndex: 3,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  padding: '2px',
                  background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100&auto=format&fit=crop&q=80"
                  alt="Story"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Story Active</div>
                <div style={{ fontSize: '9px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                  Live now
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* =========================================================================
          RIGHT AUTHENTICATION SECTION (Desktop & Mobile)
          Background: #1F1F1F (Dark Charcoal, Sleek Instagram-Inspired)
      ========================================================================== */}
      <div
        className="login-auth-section"
        style={{
          flex: isMobile ? '1 1 100%' : '0.9',
          width: '100%',
          maxWidth: '100%',
          background: isMobile ? '#0C1012' : '#1F1F1F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '32px 16px' : '40px 24px',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Mobile Header (Visible on smaller viewports) */}
        {isMobile && (
          <div
            className="login-mobile-brand"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>VibeSocial</span>
          </div>
        )}

        {/* Auth Form Container Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Form Header */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.3px',
                marginBottom: '8px',
                color: '#FFFFFF',
              }}
            >
              Log in to VibeSocial
            </h2>
            <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
              Enter your email and password to access your feed.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#F87171',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email Input */}
            <div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    color: '#71717A',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px 0 42px',
                    background: '#121212',
                    border: '1px solid #333333',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0095F6')}
                  onBlur={(e) => (e.target.style.borderColor = '#333333')}
                />
              </div>
            </div>

            {/* Password Input with Show/Hide toggle */}
            <div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    color: '#71717A',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 42px 0 42px',
                    background: '#121212',
                    border: '1px solid #333333',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0095F6')}
                  onBlur={(e) => (e.target.style.borderColor = '#333333')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#71717A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '46px',
                marginTop: '4px',
                background: '#0095F6',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s, opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1877F2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0095F6')}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email)
                  setForgotSuccess(false)
                  setForgotError(null)
                  setShowForgotModal(true)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
              >
                Forgot password?
              </button>
            </div>
          </form>

          {/* Divider: OR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '22px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#333333' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#71717A', letterSpacing: '0.5px' }}>
              OR
            </span>
            <div style={{ flex: 1, height: '1px', background: '#333333' }} />
          </div>

          {/* Real Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%',
              height: '46px',
              background: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              color: '#1F1F1F',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: googleLoading ? 'wait' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F4F5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
          >
            {/* Official Multi-Color Google G Logo */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                fill="#4285F4"
              />
              <path
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.15C3.26 21.36 7.37 24 12 24z"
                fill="#34A853"
              />
              <path
                d="M5.27 14.24c-.25-.72-.39-1.49-.39-2.24s.14-1.52.39-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l3.99-3.15z"
                fill="#FBBC05"
              />
              <path
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.64 1.28 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                fill="#EA4335"
              />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Secondary Outlined Button: Create New Account */}
          <button
            type="button"
            onClick={() => onNavigate('/signup')}
            style={{
              width: '100%',
              height: '46px',
              marginTop: '12px',
              background: 'transparent',
              border: '1px solid #3F3F46',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FFFFFF'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3F3F46'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Create new account
          </button>

          {/* Footer Branding */}
          <div
            style={{
              marginTop: '36px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#71717A',
            }}
          >
            from VibeSocial • © 2026 VibeSocial
          </div>
        </div>
      </div>

      {/* =========================================================================
          FORGOT PASSWORD MODAL (Real Firebase Email Reset)
      ========================================================================== */}
      {showForgotModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowForgotModal(false)}
          style={{ zIndex: 200 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              background: '#1F1F1F',
              border: '1px solid #333333',
              borderRadius: '16px',
              padding: '24px',
              color: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Reset Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {forgotSuccess ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <Check size={24} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                  Reset Link Sent!
                </h4>
                <p style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.5, marginBottom: '20px' }}>
                  We have sent password reset instructions to <strong>{forgotEmail}</strong>. Please
                  check your inbox and spam folder.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    width: '100%',
                    height: '42px',
                    background: '#0095F6',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.5, margin: 0 }}>
                  Enter the email address registered with your VibeSocial account, and we will send you an official Firebase link to reset your password.
                </p>

                {forgotError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#F87171',
                      fontSize: '12px',
                    }}
                  >
                    {forgotError}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '14px',
                      color: '#71717A',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 14px 0 42px',
                      background: '#121212',
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={{
                      flex: 1,
                      height: '42px',
                      background: 'transparent',
                      border: '1px solid #3F3F46',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1,
                      height: '42px',
                      background: '#0095F6',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: forgotLoading ? 'wait' : 'pointer',
                    }}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default LoginPage
