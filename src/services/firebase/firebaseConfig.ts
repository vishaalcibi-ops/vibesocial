import { initializeApp, getApps, getApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import type { FirebaseStorage } from 'firebase/storage'

// Environment variables
const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
const envStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined
const envSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined
const envAppId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined

const clean = (val?: string | null) => (val ? val.trim().replace(/^["']|["']$/g, '') : '')

// Optional localStorage overrides for seamless browser testing
const localApiKey = typeof window !== 'undefined' ? localStorage.getItem('vibesocial_fb_api_key') : null
const localAppId = typeof window !== 'undefined' ? localStorage.getItem('vibesocial_fb_app_id') : null

// Compute authDomain dynamically:
// When running in a web browser on Vercel or a custom public domain, authDomain must match
// window.location.hostname so third-party storage partitioning (CHIPS / ITP) does not block
// sessionStorage during signInWithRedirect and OAuth flows (Firebase official redirect best practices).
export const resolveAuthDomain = (): string => {
  const explicit = clean(envAuthDomain)
  if (explicit && explicit !== 'vibesocial-app-906a8.firebaseapp.com') {
    return explicit
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname.toLowerCase()
    // If running in a web browser on Vercel, Netlify, or any custom domain (exclude localhost and emulator)
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      !host.endsWith('.local') &&
      !host.includes('capacitor')
    ) {
      return host
    }
  }

  return 'vibesocial-sigma.vercel.app'
}

export const firebaseApiKey = clean(envApiKey && envApiKey !== 'your-firebase-api-key' ? envApiKey : localApiKey)
export const firebaseAuthDomain = resolveAuthDomain()
export const firebaseProjectId = clean(envProjectId) || 'vibesocial-app-906a8'
export const firebaseStorageBucket = clean(envStorageBucket) || 'vibesocial-app-906a8.firebasestorage.app'
export const firebaseSenderId = clean(envSenderId)
export const firebaseAppId = clean(envAppId && envAppId !== 'your-app-id' ? envAppId : localAppId)
export const firebaseMeasurementId = clean(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined)

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseApiKey &&
    firebaseApiKey.startsWith('AIza') &&
    firebaseProjectId &&
    !firebaseProjectId.includes('ACTUAL') &&
    firebaseAppId &&
    !firebaseAppId.includes('ACTUAL')
  )
}

const firebaseConfig = {
  apiKey: isFirebaseConfigured() ? firebaseApiKey : 'AIzaSyPlaceholderDummyKeyForInitialization0',
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseSenderId,
  appId: isFirebaseConfigured() ? firebaseAppId : '1:123456789012:web:abcdef1234567890',
  measurementId: firebaseMeasurementId || undefined,
}

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Services
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
export const storage: FirebaseStorage = getStorage(app)

export const saveRuntimeFirebaseConfig = (apiKey: string, appId: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vibesocial_fb_api_key', apiKey.trim())
    localStorage.setItem('vibesocial_fb_app_id', appId.trim())
    window.location.reload()
  }
}
