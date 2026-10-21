import { db, auth, isFirebaseConfigured } from './firebase/firebaseConfig'
import { collection, doc, setDoc, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore'
import type { ProfileViewRecord, Profile } from '../types/database.types'

const LOCAL_STORAGE_VIEWS_PREFIX = 'vibesocial_profile_views_'

const SAMPLE_VIEWERS: ProfileViewRecord[] = [
  {
    id: 'view_1',
    profile_id: '',
    viewer_id: 'user_alex_sample',
    viewed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    viewer: {
      id: 'user_alex_sample',
      username: 'alex_vibes',
      full_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      bio: 'Music creator',
      website: '',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'view_2',
    profile_id: '',
    viewer_id: 'user_sarah_sample',
    viewed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    viewer: {
      id: 'user_sarah_sample',
      username: 'sarah_creates',
      full_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      bio: 'Photographer',
      website: '',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'view_3',
    profile_id: '',
    viewer_id: 'user_elena_sample',
    viewed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 hours ago
    viewer: {
      id: 'user_elena_sample',
      username: 'elena_dance',
      full_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      bio: 'Dancer',
      website: '',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
]

export const recentViewsService = {
  getStoredViews(profileId: string): ProfileViewRecord[] {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_VIEWS_PREFIX}${profileId}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Error reading stored profile views:', e)
    }
    return SAMPLE_VIEWERS.map((v) => ({ ...v, profile_id: profileId }))
  },

  setStoredViews(profileId: string, views: ProfileViewRecord[]) {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_VIEWS_PREFIX}${profileId}`, JSON.stringify(views))
    } catch (e) {
      console.warn('Error saving profile views locally:', e)
    }
  },

  async recordProfileView(viewerId: string, profileId: string, viewerProfile?: Profile | null): Promise<void> {
    if (!viewerId || !profileId || viewerId === profileId) return

    const now = new Date().toISOString()
    const viewRecord: ProfileViewRecord = {
      id: `view_${viewerId}_${Date.now()}`,
      profile_id: profileId,
      viewer_id: viewerId,
      viewed_at: now,
      viewer: viewerProfile || {
        id: viewerId,
        username: auth.currentUser?.email?.split('@')[0] || 'user',
        full_name: auth.currentUser?.displayName || 'User',
        avatar_url: null,
        bio: '',
        website: '',
        is_verified: false,
        created_at: now,
        updated_at: now,
      },
    }

    // Save to local cache
    const existing = this.getStoredViews(profileId).filter((v) => v.viewer_id !== viewerId)
    existing.unshift(viewRecord)
    this.setStoredViews(profileId, existing.slice(0, 50))

    // Save to Firestore if authenticated user
    if (isFirebaseConfigured() && auth.currentUser) {
      try {
        const viewDocRef = doc(db, 'users', profileId, 'profileViews', viewerId)
        await Promise.race([
          setDoc(
            viewDocRef,
            {
              viewerId,
              profileId,
              viewedAt: now,
              viewerUsername: viewRecord.viewer?.username || 'user',
              viewerDisplayName: viewRecord.viewer?.full_name || 'User',
              viewerAvatarUrl: viewRecord.viewer?.avatar_url || null,
            },
            { merge: true }
          ),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ])
      } catch (err) {
        console.warn('Firestore record profile view error:', err)
      }
    }
  },

  async getRecentProfileViews(profileId: string): Promise<ProfileViewRecord[]> {
    if (!profileId) return []
    const local = this.getStoredViews(profileId)

    if (isFirebaseConfigured()) {
      try {
        const viewsColl = collection(db, 'users', profileId, 'profileViews')
        const q = query(viewsColl, orderBy('viewedAt', 'desc'), firestoreLimit(30))
        const snap = await Promise.race([
          getDocs(q),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
        ])
        if (snap && !snap.empty) {
          const remoteViews: ProfileViewRecord[] = snap.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              profile_id: profileId,
              viewer_id: data.viewerId || docSnap.id,
              viewed_at: data.viewedAt || new Date().toISOString(),
              viewer: {
                id: data.viewerId || docSnap.id,
                username: data.viewerUsername || 'user',
                full_name: data.viewerDisplayName || data.viewerUsername || 'User',
                avatar_url: data.viewerAvatarUrl || null,
                bio: '',
                website: '',
                is_verified: false,
                created_at: data.viewedAt,
                updated_at: data.viewedAt,
              },
            }
          })

          const map = new Map<string, ProfileViewRecord>()
          remoteViews.forEach((v) => map.set(v.viewer_id, v))
          local.forEach((v) => {
            if (!map.has(v.viewer_id)) map.set(v.viewer_id, v)
          })

          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime()
          )
          this.setStoredViews(profileId, combined)
          return combined
        }
      } catch (err) {
        console.warn('Firestore fetch profile views error:', err)
      }
    }

    return local
  },

  async getRecentViews(profileId: string): Promise<ProfileViewRecord[]> {
    return this.getRecentProfileViews(profileId)
  },
}
