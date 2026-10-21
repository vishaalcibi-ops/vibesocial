import { db, auth, isFirebaseConfigured } from './firebase/firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const CLOSE_FRIENDS_STORAGE_PREFIX = 'vibesocial_close_friends_'

// Sample seed close friends for initial demo experience
const DEFAULT_CLOSE_FRIENDS = ['user_alex_sample', 'user_sarah_sample']

export const closeFriendsService = {
  getStoredCloseFriends(userId: string): string[] {
    try {
      const item = localStorage.getItem(`${CLOSE_FRIENDS_STORAGE_PREFIX}${userId}`)
      if (item) {
        return JSON.parse(item)
      }
    } catch (e) {
      console.warn('Error reading stored close friends:', e)
    }
    return DEFAULT_CLOSE_FRIENDS
  },

  setStoredCloseFriends(userId: string, friends: string[]) {
    try {
      localStorage.setItem(`${CLOSE_FRIENDS_STORAGE_PREFIX}${userId}`, JSON.stringify(friends))
    } catch (e) {
      console.warn('Error saving close friends locally:', e)
    }
  },

  async getCloseFriends(userId: string): Promise<string[]> {
    if (!userId) return []
    const local = this.getStoredCloseFriends(userId)

    if (isFirebaseConfigured() && auth.currentUser) {
      try {
        const userRef = doc(db, 'users', userId)
        const snap = await getDoc(userRef)
        if (snap.exists()) {
          const data = snap.data()
          if (Array.isArray(data.close_friends)) {
            const merged = Array.from(new Set([...data.close_friends, ...local]))
            this.setStoredCloseFriends(userId, merged)
            return merged
          }
        }
      } catch (err) {
        console.warn('Firestore get close friends error:', err)
      }
    }

    return local
  },

  async setCloseFriends(userId: string, friendIds: string[]): Promise<void> {
    const unique = Array.from(new Set(friendIds))
    this.setStoredCloseFriends(userId, unique)

    if (isFirebaseConfigured() && auth.currentUser && auth.currentUser.uid === userId) {
      try {
        const userRef = doc(db, 'users', userId)
        await setDoc(userRef, { close_friends: unique }, { merge: true })
      } catch (err) {
        console.warn('Firestore update close friends error:', err)
      }
    }
  },

  async toggleCloseFriend(userId: string, friendId: string): Promise<boolean> {
    const list = await this.getCloseFriends(userId)
    const exists = list.includes(friendId)
    const nextList = exists ? list.filter((id) => id !== friendId) : [...list, friendId]
    await this.setCloseFriends(userId, nextList)
    return !exists
  },

  async isCloseFriend(authorId: string, viewerId: string): Promise<boolean> {
    if (authorId === viewerId) return true
    const list = await this.getCloseFriends(authorId)
    return list.includes(viewerId)
  },
}
