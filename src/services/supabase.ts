import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables
const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

// Optional localStorage overrides for seamless developer testing without restarting vite
const localUrl = typeof window !== 'undefined' ? localStorage.getItem('vibesocial_supabase_url') : null
const localKey = typeof window !== 'undefined' ? localStorage.getItem('vibesocial_supabase_key') : null

export const supabaseUrl = (envUrl && envUrl !== 'https://your-project-id.supabase.co' ? envUrl : localUrl) || ''
export const supabaseKey = (envKey && envKey !== 'your-supabase-anon-or-publishable-key' ? envKey : localKey) || ''

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseKey.length > 20
  )
}

// Fallback dummy URL and key to prevent createClient crashes before credentials are supplied
const effectiveUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co'
const effectiveKey = isSupabaseConfigured() ? supabaseKey : 'placeholder-anon-key-vibesocial'

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export const saveRuntimeSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vibesocial_supabase_url', url.trim())
    localStorage.setItem('vibesocial_supabase_key', key.trim())
    window.location.reload()
  }
}

export const clearRuntimeSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vibesocial_supabase_url')
    localStorage.removeItem('vibesocial_supabase_key')
    window.location.reload()
  }
}
