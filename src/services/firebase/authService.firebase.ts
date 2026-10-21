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
  deleteUser,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
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
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (!userDoc.exists()) {
          const cleanUsername = (user.displayName || user.email?.split('@')[0] || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9_.]/g, '')
          const profileData: Profile = {
            id: user.uid,
            username: cleanUsername || `user_${user.uid.slice(0, 5)}`,
            full_name: user.displayName || 'Vibe User',
            bio: '',
            avatar_url: null,
            website: '',
            is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          await setDoc(doc(db, 'users', user.uid), profileData)
        }
      } catch (profileErr) {
        console.warn('Profile sync on signIn deferred until rules published:', profileErr)
      }

      return { user }
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },

  async signInWithGoogle() {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase credentials are not configured yet.')
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const cred = await signInWithPopup(auth, provider)
      const user = cred.user

      // Ensure user profile document exists in Firestore (do not overwrite existing profile)
      try {
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        if (!userDoc.exists()) {
          const rawName = user.displayName || user.email?.split('@')[0] || 'user'
          const cleanUsername =
            rawName
              .toLowerCase()
              .replace(/[^a-z0-9_.]/g, '')
              .slice(0, 25) || `user_${user.uid.slice(0, 5)}`

          const profileData: Profile = {
            id: user.uid,
            username: cleanUsername,
            full_name: user.displayName || 'Vibe User',
            bio: '',
            avatar_url: user.photoURL || null,
            website: '',
            is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          await setDoc(userDocRef, profileData)
        }
      } catch (profileErr) {
        console.warn('Google profile sync on signIn deferred until rules published:', profileErr)
      }

      return { user }
    } catch (err: any) {
      throw formatFirebaseError(err)
    }
  },

  async signOut() {
    if (!isFirebaseConfigured()) return
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
        callback({
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            user_metadata: {
              full_name: firebaseUser.displayName,
            },
          },
          access_token: await firebaseUser.getIdToken(),
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
