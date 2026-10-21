import { db, auth, isFirebaseConfigured } from './firebase/firebaseConfig'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import type { InstagramNote, AudioTrack, Profile } from '../types/database.types'
import { TRENDING_TRACKS } from './musicService'
import { closeFriendsService } from './closeFriendsService'
import { profileService } from './profileService'

const LOCAL_STORAGE_NOTES_KEY = 'vibesocial_instagram_notes'

// Seed notes so the tray has vibrant live content with real music immediately
const DEFAULT_SAMPLE_NOTES: InstagramNote[] = [
  {
    id: 'sample-note-1',
    user_id: 'user_alex_sample',
    text: 'Late night vibes 🌙🎧',
    audio_track: TRENDING_TRACKS[0], // Starboy
    clip_start: 18,
    clip_duration: 15,
    selected_lyrics: "Look what you've done, I'm a motherfuckin' starboy",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'user_alex_sample',
      username: 'alex_vibes',
      full_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'Music & creative developer',
      website: 'https://alexvibes.dev',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'sample-note-2',
    user_id: 'user_sarah_sample',
    text: 'On repeat all day ✨',
    audio_track: TRENDING_TRACKS[1], // Levitating
    clip_start: 16,
    clip_duration: 15,
    selected_lyrics: "Glitter in the sky, glitter in my eyes",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'user_sarah_sample',
      username: 'sarah_creates',
      full_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      bio: 'Photographer & traveler',
      website: 'https://sarahchen.me',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'sample-note-3',
    user_id: 'user_elena_sample',
    text: 'Weekend countdown begins! 🚀',
    audio_track: TRENDING_TRACKS[5], // As It Was
    clip_start: 11,
    clip_duration: 15,
    selected_lyrics: "In this world, it's just us",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'user_elena_sample',
      username: 'elena_dance',
      full_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Dancer & choreographer',
      website: '',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
]

export const noteService = {
  getStoredNotes(): InstagramNote[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY)
      if (stored) {
        const parsed: InstagramNote[] = JSON.parse(stored)
        // Keep non-expired
        const now = Date.now()
        const valid = parsed.filter((n) => new Date(n.expires_at).getTime() > now)
        return valid
      }
    } catch (e) {
      console.warn('Failed to parse local notes:', e)
    }
    return []
  },

  setStoredNotes(notes: InstagramNote[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(notes))
    } catch (e) {
      console.warn('Failed to save notes locally:', e)
    }
  },

  async getActiveNotes(currentUserId?: string): Promise<InstagramNote[]> {
    const now = Date.now()
    const localNotes = this.getStoredNotes()
    let combinedNotes: InstagramNote[] = [...localNotes]

    // Fetch from Firestore if configured
    if (isFirebaseConfigured()) {
      try {
        const notesRef = collection(db, 'notes')
        const q = query(notesRef, orderBy('createdAt', 'desc'))
        const snap = await Promise.race([
          getDocs(q),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
        ])
        if (snap && !snap.empty) {
          const remoteNotes: InstagramNote[] = snap.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              user_id: data.userId,
              text: data.text || '',
              audio_track: data.audioTrack || null,
              clip_start: data.clipStart ?? data.clip_start ?? 0,
              clip_duration: data.clipDuration ?? data.clip_duration ?? 15,
              selected_lyrics: data.selectedLyrics ?? data.selected_lyrics ?? '',
              created_at: data.createdAt,
              expires_at: data.expiresAt,
              is_close_friends: Boolean(data.isCloseFriends),
              audience: data.audience || (data.isCloseFriends ? 'close_friends' : 'followers'),
              author: {
                id: data.userId,
                username: data.username || 'user',
                full_name: data.displayName || data.username || 'User',
                avatar_url: data.avatarUrl || null,
                bio: '',
                website: '',
                is_verified: Boolean(data.isVerified),
                created_at: data.createdAt,
                updated_at: data.createdAt,
              },
            }
          })

          // Merge by user_id
          const userMap = new Map<string, InstagramNote>()
          remoteNotes.forEach((rn) => userMap.set(rn.user_id, rn))
          localNotes.forEach((ln) => {
            if (!userMap.has(ln.user_id)) userMap.set(ln.user_id, ln)
          })
          combinedNotes = Array.from(userMap.values())
        }
      } catch (err) {
        console.warn('Firestore fetch notes fallback to local:', err)
      }
    }

    // Add default sample notes if not already present
    DEFAULT_SAMPLE_NOTES.forEach((sample) => {
      if (!combinedNotes.some((n) => n.user_id === sample.user_id)) {
        combinedNotes.push(sample)
      }
    })

    // Filter out expired notes
    const active = combinedNotes.filter(
      (n) => new Date(n.expires_at).getTime() > now
    )

    this.setStoredNotes(active)

    const viewerId = currentUserId || auth.currentUser?.uid

    // If no viewer is specified (e.g. unauthenticated test suites), return active notes
    if (!viewerId) {
      return active
    }

    // Load following IDs for viewer to restrict notes to followers only
    let followingIds = new Set<string>()
    try {
      const fIds = await profileService.getFollowingIds(viewerId)
      followingIds = new Set(fIds)
    } catch (err) {
      console.warn('Failed to load following IDs for notes visibility:', err)
    }

    // Filter notes:
    // 1. Author can always see their own note
    // 2. Demo/sample notes remain visible for initial discovery
    // 3. For any other real user note with music/audio or text, viewer MUST be a follower
    // 4. If close friends, viewer must be on author's close friends list
    const filteredNotes = await Promise.all(
      active.map(async (n) => {
        // Author's own note
        if (n.user_id === viewerId) {
          return n
        }

        // Demo sample notes
        if (n.id.startsWith('sample-note') || n.user_id.includes('sample')) {
          return n
        }

        // Real user note: viewer MUST be following author (i.e. viewer is a follower)
        const isFollower = followingIds.has(n.user_id)
        if (!isFollower) {
          return null
        }

        // If close friends note, viewer must also be in close friends
        if (n.is_close_friends || n.audience === 'close_friends') {
          const isFriend = await closeFriendsService.isCloseFriend(n.user_id, viewerId)
          return isFriend ? n : null
        }

        return n
      })
    )

    return filteredNotes.filter((n): n is InstagramNote => n !== null)
  },

  async createOrUpdateNote({
    userId,
    text,
    audioTrack,
    clipStart = 0,
    clipDuration = 15,
    selectedLyrics = '',
    userProfile,
    isCloseFriends = false,
    audience,
  }: {
    userId: string
    text: string
    audioTrack?: AudioTrack | null
    clipStart?: number
    clipDuration?: number
    selectedLyrics?: string
    userProfile?: Profile | null
    isCloseFriends?: boolean
    audience?: 'followers' | 'close_friends'
  }): Promise<InstagramNote> {
    const noteId = `note_${userId}`
    const createdAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const isCF = Boolean(isCloseFriends || audience === 'close_friends')

    const author: Profile = {
      id: userId,
      username: userProfile?.username || auth.currentUser?.email?.split('@')[0] || 'user',
      full_name: userProfile?.full_name || auth.currentUser?.displayName || 'User',
      avatar_url: userProfile?.avatar_url || null,
      bio: userProfile?.bio || '',
      website: userProfile?.website || '',
      is_verified: Boolean(userProfile?.is_verified),
      created_at: createdAt,
      updated_at: createdAt,
    }

    const note: InstagramNote = {
      id: noteId,
      user_id: userId,
      text: text.trim().slice(0, 60), // Instagram notes are max 60 chars
      audio_track: audioTrack || null,
      clip_start: clipStart,
      clip_duration: clipDuration,
      selected_lyrics: selectedLyrics,
      created_at: createdAt,
      expires_at: expiresAt,
      is_close_friends: isCF,
      audience: isCF ? 'close_friends' : 'followers',
      author,
    }

    // Save to Firestore
    if (isFirebaseConfigured() && auth.currentUser) {
      try {
        const noteDocRef = doc(db, 'notes', noteId)
        await setDoc(noteDocRef, {
          userId,
          username: author.username,
          displayName: author.full_name,
          avatarUrl: author.avatar_url,
          isVerified: author.is_verified,
          text: note.text,
          clipStart,
          clipDuration,
          selectedLyrics,
          isCloseFriends: isCF,
          audience: isCF ? 'close_friends' : 'followers',
          audioTrack: note.audio_track
            ? {
                id: note.audio_track.id || '',
                title: note.audio_track.title,
                artist: note.audio_track.artist,
                audio_url: note.audio_track.audio_url,
                artwork_url: note.audio_track.artwork_url || '',
                duration: note.audio_track.duration || 30,
                spotify_url: note.audio_track.spotify_url || '',
                spotify_id: note.audio_track.spotify_id || '',
                source: note.audio_track.source || 'spotify',
                lyrics: note.audio_track.lyrics || [],
              }
            : null,
          createdAt,
          expiresAt,
        })
      } catch (err) {
        console.warn('Firestore set note error, using local fallback:', err)
      }
    }

    // Update local cache
    const existing = this.getStoredNotes().filter((n) => n.user_id !== userId)
    existing.unshift(note)
    this.setStoredNotes(existing)

    return note
  },

  async deleteNote(noteId: string, userId: string): Promise<void> {
    if (isFirebaseConfigured() && auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'notes', noteId))
      } catch (err) {
        console.warn('Failed to delete note from Firestore:', err)
      }
    }

    const updated = this.getStoredNotes().filter(
      (n) => n.id !== noteId && n.user_id !== userId
    )
    this.setStoredNotes(updated)
  },
}
