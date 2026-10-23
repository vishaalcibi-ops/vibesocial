import { supabase, isSupabaseConfigured } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import { getBackendProvider } from './backendConfig'
import { authServiceFirebase } from './firebase/authService.firebase'

export const authService = {
  async signUp(email: string, password: string, username: string, fullName: string) {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.signUp(email, password, username, fullName)
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase credentials are not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
    }

    // Format username to valid format
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.]/g, '')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: fullName,
        },
      },
    })

    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.signIn(email, password)
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase credentials are not configured yet.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  async phoneSignIn(phoneNumber: string, username?: string, fullName?: string, avatarUrl?: string) {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.phoneSignIn(phoneNumber, username, fullName, avatarUrl)
    }
    // Fallback if provider is supabase
    return authServiceFirebase.phoneSignIn(phoneNumber, username, fullName, avatarUrl)
  },

  async signInWithGoogle() {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.signInWithGoogle()
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase credentials are not configured yet.')
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) throw error
    return data
  },

  async checkRedirectResult(): Promise<{ user: any | null; error?: Error } | null> {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.checkRedirectResult()
    }
    return null
  },

  async signOut() {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.signOut()
    }

    if (!isSupabaseConfigured()) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession(): Promise<Session | any | null> {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.getSession()
    }

    if (!isSupabaseConfigured()) return null
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.warn('Failed to retrieve session:', error)
      return null
    }
    return data.session
  },

  async getUser(): Promise<User | any | null> {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.getUser()
    }

    if (!isSupabaseConfigured()) return null
    const { data, error } = await supabase.auth.getUser()
    if (error) return null
    return data.user
  },

  async resetPassword(email: string) {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.resetPassword(email)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return data
  },

  async updatePassword(password: string) {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.updatePassword(password)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    return data
  },

  onAuthStateChange(callback: (session: any) => void) {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.onAuthStateChange(callback)
    }

    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} }
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
    return {
      unsubscribe: () => {
        data.subscription.unsubscribe()
      },
    }
  },

  getAuthProvider(): string {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.getAuthProvider()
    }
    return 'Email'
  },

  async deleteAccount(): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return authServiceFirebase.deleteAccount()
    }
  },
}
