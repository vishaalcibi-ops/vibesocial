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
      const p = await profileService.getProfileById(userId)
      setProfile(p)
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

    // Initial session load
    authService.getSession().then(async (sess) => {
      if (!isMounted) return
      setSession(sess as AuthSession | null)
      setUser(sess?.user ?? null)
      if (sess?.user) {
        await loadUserProfile(sess.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { unsubscribe } = authService.onAuthStateChange(async (sess) => {
      if (!isMounted) return
      setSession(sess as AuthSession | null)
      setUser(sess?.user ?? null)
      if (sess?.user) {
        await loadUserProfile(sess.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
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
