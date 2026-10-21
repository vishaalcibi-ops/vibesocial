import { isSupabaseConfigured } from './supabase'
import { isFirebaseConfigured } from './firebase/firebaseConfig'

export type BackendProvider = 'firebase' | 'supabase'

export const getBackendProvider = (): BackendProvider => {
  const provider = import.meta.env.VITE_BACKEND_PROVIDER
  return provider === 'supabase' ? 'supabase' : 'firebase'
}

export const isBackendConfigured = (): boolean => {
  const provider = getBackendProvider()
  if (provider === 'firebase') {
    return isFirebaseConfigured()
  }
  return isSupabaseConfigured()
}
