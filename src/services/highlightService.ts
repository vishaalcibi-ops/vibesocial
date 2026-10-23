import { db, isFirebaseConfigured } from './firebase/firebaseConfig'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import type { Story } from '../types/database.types'

export interface StoryHighlight {
  id: string
  user_id: string
  title: string
  cover_url: string
  stories: Story[]
  created_at: string
}

export const highlightService = {
  async getUserHighlights(userId: string): Promise<StoryHighlight[]> {
    if (!userId) return []

    if (isFirebaseConfigured()) {
      try {
        const highlightsRef = collection(db, 'highlights')
        const q = query(highlightsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q).catch(() => null)
        if (snap && !snap.empty) {
          return snap.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              user_id: data.userId,
              title: data.title || 'Highlight',
              cover_url: data.coverUrl || 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300',
              stories: Array.isArray(data.stories) ? data.stories : [],
              created_at: data.createdAt || new Date().toISOString(),
            }
          })
        }
      } catch (err) {
        console.warn('Firestore getUserHighlights fallback to localStorage:', err)
      }
    }

    // Local storage fallback
    try {
      const stored = localStorage.getItem(`vibesocial_highlights_${userId}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {}

    // Default sample highlight if none exist
    return [
      {
        id: `default_hl_${userId}`,
        user_id: userId,
        title: 'Memories ✨',
        cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
        stories: [],
        created_at: new Date().toISOString(),
      },
    ]
  },

  async createHighlight(userId: string, title: string, coverUrl: string, stories: Story[]): Promise<StoryHighlight> {
    const highlightId = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()
    const newHighlight: StoryHighlight = {
      id: highlightId,
      user_id: userId,
      title: title.trim() || 'Highlight',
      cover_url: coverUrl || stories[0]?.media_url || 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300',
      stories,
      created_at: now,
    }

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(db, 'highlights', highlightId), {
          id: highlightId,
          userId,
          title: newHighlight.title,
          coverUrl: newHighlight.cover_url,
          stories: newHighlight.stories,
          createdAt: now,
        })
      } catch (err) {
        console.warn('Error saving highlight to Firestore, saving locally:', err)
      }
    }

    // Save to local storage
    try {
      const existing = await this.getUserHighlights(userId)
      const updated = [newHighlight, ...existing.filter((h) => h.id !== `default_hl_${userId}`)]
      localStorage.setItem(`vibesocial_highlights_${userId}`, JSON.stringify(updated))
    } catch {}

    return newHighlight
  },

  async addStoryToHighlight(userId: string, highlightId: string, story: Story): Promise<void> {
    const highlights = await this.getUserHighlights(userId)
    const target = highlights.find((h) => h.id === highlightId)
    if (!target) return

    const updatedStories = [...target.stories.filter((s) => s.id !== story.id), story]
    target.stories = updatedStories

    if (isFirebaseConfigured()) {
      try {
        await setDoc(
          doc(db, 'highlights', highlightId),
          {
            stories: updatedStories,
          },
          { merge: true }
        )
      } catch (err) {
        console.warn('Error updating highlight in Firestore:', err)
      }
    }

    try {
      localStorage.setItem(`vibesocial_highlights_${userId}`, JSON.stringify(highlights))
    } catch {}
  },

  async deleteHighlight(userId: string, highlightId: string): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await deleteDoc(doc(db, 'highlights', highlightId))
      } catch {}
    }

    try {
      const existing = await this.getUserHighlights(userId)
      const filtered = existing.filter((h) => h.id !== highlightId)
      localStorage.setItem(`vibesocial_highlights_${userId}`, JSON.stringify(filtered))
    } catch {}
  },
}
