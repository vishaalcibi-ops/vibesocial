import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { profileService } from '../services/profileService'
import { isBackendConfigured } from '../services/backendConfig'
import type { Profile } from '../types/database.types'

export interface AuthUser {
  id: string
  email?: string | null
  user_metadata?: {
    full_name?: string | null
    [key: string]: any
  }
}

export interface AuthSession {
  user: AuthUser
  access_token?: string
}

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  session: AuthSession | null
  loading: boolean
  isConfigured: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isConfigured: false,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [configured] = useState(isBackendConfigured())

  const loadUserProfile = async (userId: string) => {
    try {
      // 1. Check cached profile in localStorage for instant display on phone APK
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(`vibesocial_profile_${userId}`)
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed && parsed.id === userId) {
              setProfile((prev) => prev || parsed)
            }
          }
        } catch {}
      }

      // 2. Fetch fresh profile from backend
      const p = await profileService.getProfileById(userId)
      if (p) {
        setProfile(p)
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    let isMounted = true

    const initAuth = async () => {
      // 1. Process and resolve any pending redirect sign-in from Google
      try {
        const redirectRes = await authService.checkRedirectResult()
        if (redirectRes?.error) {
          console.warn('Google redirect sign-in notification:', redirectRes.error.message)
        }
      } catch (redirectErr) {
        console.warn('Redirect result check:', redirectErr)
      }

      // 2. Retrieve initial authenticated session
      try {
        const sess = await authService.getSession()
        if (!isMounted) return
        setSession(sess as AuthSession | null)
        setUser(sess?.user ?? null)
        if (sess?.user) {
          loadUserProfile(sess.user.id).catch(console.error)
        }
      } catch (sessErr) {
        console.error('Session retrieval error:', sessErr)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { unsubscribe } = authService.onAuthStateChange(async (sess) => {
      if (!isMounted) return
      setSession(sess as AuthSession | null)
      setUser(sess?.user ?? null)
      setLoading(false)
      if (sess?.user) {
        loadUserProfile(sess.user.id).catch(console.error)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [configured])

  const handleSignOut = async () => {
    await authService.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured: configured,
        refreshProfile,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
