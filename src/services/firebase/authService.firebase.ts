import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  deleteUser,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebaseConfig'
import type { Profile } from '../../types/database.types'

const formatFirebaseError = (err: any): Error => {
  const code = err?.code
  const msg = err?.message || ''

  if (code === 'permission-denied' || msg.includes('insufficient permissions')) {
    return new Error(
      'Firestore Security Rules are blocking writes. Please open Firebase Console > Firestore Database > Rules, paste the project rules, and click Publish.'
    )
  }

  switch (code) {
    case 'auth/invalid-credential':
      return new Error("Invalid email or password. If you have not created an account yet, click 'Sign up' below first.")
    case 'auth/user-not-found':
      return new Error("No account found with this email. Please click 'Sign up' first.")
    case 'auth/wrong-password':
      return new Error('Incorrect password. Please try again.')
    case 'auth/email-already-in-use':
      return new Error('This email is already registered. Please click "Log In" below instead.')
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters.')
    case 'auth/invalid-email':
      return new Error('Please enter a valid email address.')
    case 'auth/operation-not-allowed':
      return new Error('Email/Password provider is not enabled in your Firebase Console. Go to Build > Authentication > Sign-in method to enable it.')
    case 'auth/too-many-requests':
      return new Error('Too many failed attempts. Please wait a moment and try again.')
    case 'auth/network-request-failed':
      return new Error('Network error. Please check your internet connection.')
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new Error('Google sign-in was cancelled.')
    case 'auth/popup-blocked':
      return new Error('Popup blocked by browser. Please allow popups for this site and try again.')
    case 'auth/missing-initial-state':
      return new Error(
        'Browser storage restriction: missing initial state. Please enable cookies/storage or check domain proxy settings.'
      )
    case 'auth/redirect-cancelled-by-user':
      return new Error('Google sign-in was cancelled.')
    case 'auth/unauthorized-domain':
      return new Error('Domain unauthorized for Google Sign-In. Add localhost / your hosting domain to Firebase Console > Authentication > Settings > Authorized domains.')
    case 'auth/account-exists-with-different-credential':
      return new Error('An account already exists with this email using a different sign-in method. Please log in with password.')
    case 'auth/requires-recent-login':
      return new Error('This action is sensitive and requires recent authentication. Please log out and sign back in before retrying.')
    default:
      return new Error(msg || 'Authentication failed. Please try again.')
  }
}

export const ensureUserProfileExists = async (user: User): Promise<Profile> => {
  const rawName = user.displayName || user.email?.split('@')[0] || 'user'
  const cleanUsername =
    rawName
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, '')
      .slice(0, 25) || `user_${user.uid.slice(0, 5)}`

  const defaultProfile: Profile = {
    id: user.uid,
    username: cleanUsername,
    full_name: user.displayName || cleanUsername,
    bio: '',
    avatar_url: user.photoURL || null,
    website: '',
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Cache immediately in localStorage for instant phone APK access
  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem(`vibesocial_profile_${user.uid}`)
      if (!existing) {
        localStorage.setItem(`vibesocial_profile_${user.uid}`, JSON.stringify(defaultProfile))
      }
    } catch {}
  }

  try {
    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      const data = userDoc.data()
      const effectiveAvatar = data.avatar_url || user.photoURL || null
      const resolvedProfile: Profile = {
        id: userDoc.id,
        ...data,
        username: data.username || cleanUsername,
        full_name: data.full_name || user.displayName || cleanUsername,
        avatar_url: effectiveAvatar,
        is_private: Boolean(data.is_private || data.settings?.is_private),
        show_active_status: data.settings?.show_active_status !== false,
        last_seen: data.last_seen,
      } as Profile

      if (!data.avatar_url && user.photoURL) {
        setDoc(userDocRef, { avatar_url: user.photoURL }, { merge: true }).catch(() => {})
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`vibesocial_profile_${user.uid}`, JSON.stringify(resolvedProfile))
        } catch {}
      }
      return resolvedProfile
    }

    await setDoc(userDocRef, defaultProfile)
    return defaultProfile
  } catch (profileErr) {
    console.warn('Profile self-healing or lookup fallback:', profileErr)
    return defaultProfile
  }
}

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return (
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))
  )
}

let redirectCheckPromise: Promise<{ user: User | null; error?: Error } | null> | null = null

export const authServiceFirebase = {
  async signUp(email: string, password: string, username: string, fullName: string) {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase credentials are not configured yet. Please configure VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID in .env.local'
      )
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      throw new Error('Username must be between 3 and 30 characters (letters, numbers, underscore, dot).')
    }

    try {
      // 1. Create Auth Account
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const user = cred.user

      // 2. Set Firebase Auth Display Name
      await firebaseUpdateProfile(user, { displayName: fullName || cleanUsername })

      // 3. Create Firestore User Profile Document
      const profileData: Profile = {
        id: user.uid,
        username: cleanUsername,
        full_name: fullName || cleanUsername,
        bio: '',
        avatar_url: null,
        website: '',
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await setDoc(doc(db, 'users', user.uid), profileData)

      return { user, profile: profileData }
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },

  async signIn(email: string, password: string) {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase credentials are not configured yet.')
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const user = cred.user

      // Self-heal: ensure user profile document exists in Firestore
      await ensureUserProfileExists(user)

      return { user }
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },

  /**
   * Check and consume any pending redirect sign-in result on application startup.
   * Caches the in-flight resolution promise to prevent duplicate listeners or races.
   */
  async checkRedirectResult(): Promise<{ user: User | null; error?: Error } | null> {
    if (!isFirebaseConfigured()) return null
    if (redirectCheckPromise) return redirectCheckPromise

    redirectCheckPromise = (async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          await ensureUserProfileExists(result.user)
          return { user: result.user }
        }
        return null
      } catch (err: any) {
        if (
          err?.code === 'auth/popup-closed-by-user' ||
          err?.code === 'auth/cancelled-popup-request' ||
          err?.code === 'auth/redirect-cancelled-by-user'
        ) {
          return null
        }
        console.warn('Google redirect resolution error:', err)
        return { user: null, error: formatFirebaseError(err) }
      }
    })()

    return redirectCheckPromise
  },

  async signInWithGoogle(): Promise<{ user: User | null; redirected?: boolean }> {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase credentials are not configured yet.')
    }

    // 1. Native Mobile (Android APK) Flow: Native Credential Manager
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleSignIn.initialize({
          clientId: '147783519509-i5p5bp8l16d1hhgh3p0n28aeqdqk4f7u.apps.googleusercontent.com',
        })
        const res = await GoogleSignIn.signIn()
        const idToken = res?.idToken || (res as any)?.authentication?.idToken
        if (!idToken) {
          throw new Error('Google did not return an idToken: ' + JSON.stringify(res))
        }
        const credential = GoogleAuthProvider.credential(idToken)
        const cred = await signInWithCredential(auth, credential)
        await ensureUserProfileExists(cred.user)
        return { user: cred.user }
      } catch (nativeErr: any) {
        console.error('Native Google Sign-In error:', nativeErr)
        const errDetails = nativeErr?.message || nativeErr?.errorMessage || JSON.stringify(nativeErr)
        throw new Error(errDetails)
      }
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    const isMobile = isMobileDevice()

    // 2. Desktop flow: Popup is fast, non-navigating, and keeps state
    if (!isMobile) {
      try {
        const cred = await signInWithPopup(auth, provider)
        await ensureUserProfileExists(cred.user)
        return { user: cred.user }
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          throw new Error('Sign-in cancelled.')
        }
        throw formatFirebaseError(err)
      }
    }

    // 3. Web Mobile flow: Try popup first; if popup is blocked on mobile browser, fall back to redirect
    try {
      const cred = await signInWithPopup(auth, provider)
      await ensureUserProfileExists(cred.user)
      return { user: cred.user }
    } catch (popupErr: any) {
      const code = popupErr?.code
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        popupErr?.message?.includes('popup')
      ) {
        console.log('Mobile popup blocked/unsupported; executing supported signInWithRedirect...')
        await signInWithRedirect(auth, provider)
        return { user: null, redirected: true }
      }

      if (code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled.')
      }

      throw formatFirebaseError(popupErr)
    }
  },

  async signOut() {
    if (!isFirebaseConfigured()) return
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleSignIn.signOut()
      } catch (e) {
        // ignore native sign-out error
      }
    }
    await firebaseSignOut(auth)
  },

  async getUser(): Promise<User | null> {
    if (!isFirebaseConfigured()) return null
    if (typeof (auth as any).authStateReady === 'function') {
      await auth.authStateReady()
    }
    return auth.currentUser
  },

  async getSession() {
    if (!isFirebaseConfigured()) return null
    if (typeof (auth as any).authStateReady === 'function') {
      await auth.authStateReady()
    }
    const user = auth.currentUser
    if (!user) return null
    return {
      user: {
        id: user.uid,
        email: user.email,
        user_metadata: {
          full_name: user.displayName,
        },
      },
      access_token: await user.getIdToken(),
    }
  },

  async resetPassword(email: string) {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    const trimmed = (email || '').trim()
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      throw new Error('Please enter a valid email address.')
    }
    try {
      await sendPasswordResetEmail(auth, trimmed)
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },

  async updatePassword(password: string) {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    if (!auth.currentUser) throw new Error('No authenticated user found.')
    try {
      await firebaseUpdatePassword(auth.currentUser, password)
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },

  onAuthStateChange(callback: (session: any) => void) {
    if (!isFirebaseConfigured()) {
      return { unsubscribe: () => {} }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let token = ''
        try {
          token = await firebaseUser.getIdToken()
        } catch (tokenErr) {
          console.warn('Deferred token retrieval in onAuthStateChanged:', tokenErr)
        }

        callback({
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            user_metadata: {
              full_name: firebaseUser.displayName,
            },
          },
          access_token: token,
        })
      } else {
        callback(null)
      }
    })

    return {
      unsubscribe,
    }
  },

  getAuthProvider(): string {
    const user = auth.currentUser
    if (!user || !user.providerData.length) return 'email'
    const providerId = user.providerData[0].providerId
    if (providerId === 'google.com') return 'Google'
    if (providerId === 'password') return 'Email / Password'
    return providerId
  },

  async deleteAccount(): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user found.')

    const uid = user.uid

    try {
      // 1. Delete user profile document
      try {
        await deleteDoc(doc(db, 'users', uid))
      } catch (docErr) {
        console.warn('Could not remove user profile document before account deletion:', docErr)
      }

      // 2. Delete Firebase Auth account
      await deleteUser(user)
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },
}
