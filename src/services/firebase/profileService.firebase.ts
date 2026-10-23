import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  writeBatch,
  getCountFromServer,
  orderBy,
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebaseConfig'
import type { Profile, FollowRequest } from '../../types/database.types'
import { notificationServiceFirebase } from './notificationService.firebase'
import { ensureUserProfileExists } from './authService.firebase'

export const profileServiceFirebase = {
  async getProfileById(userId: string): Promise<Profile | null> {
    if (!isFirebaseConfigured() || !userId) return null

    const cacheKey = `vibesocial_profile_${userId}`
    let cachedProfile: Profile | null = null
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) cachedProfile = JSON.parse(stored)
      } catch {}
    }

    try {
      const userRef = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = userSnap.data()
        const rawName = data.username || data.full_name || 'user'
        const cleanUsername = data.username || rawName.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 25) || `user_${userId.slice(0, 5)}`
        const profile: Profile = {
          id: userSnap.id,
          ...data,
          username: cleanUsername,
          full_name: data.full_name || cleanUsername,
          is_private: Boolean(data.is_private || data.settings?.is_private),
          show_active_status: data.settings?.show_active_status !== false,
          last_seen: data.last_seen,
        } as Profile

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(profile))
          } catch {}
        }
        return profile
      }

      // Check if userId was actually passed as a username (from URL route or deep-link)
      const byUsername = await this.getProfileByUsername(userId)
      if (byUsername) return byUsername

      // If viewing self and document not found, auto-heal from Firebase Auth user
      if (auth.currentUser && auth.currentUser.uid === userId) {
        return await ensureUserProfileExists(auth.currentUser)
      }

      return cachedProfile || null
    } catch (error) {
      console.error('Error fetching Firebase profile by ID:', error)
      if (cachedProfile) return cachedProfile
      if (auth.currentUser && auth.currentUser.uid === userId) {
        return await ensureUserProfileExists(auth.currentUser)
      }
      return null
    }
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    if (!isFirebaseConfigured() || !username) return null

    try {
      const cleanUsername = username.toLowerCase().trim()
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('username', '==', cleanUsername), limit(1))
      const querySnap = await getDocs(q)

      if (querySnap.empty) {
        return null
      }

      const docSnap = querySnap.docs[0]
      const data = docSnap.data()
      const profile: Profile = {
        id: docSnap.id,
        ...data,
        username: data.username || cleanUsername,
        full_name: data.full_name || cleanUsername,
        is_private: Boolean(data.is_private || data.settings?.is_private),
        show_active_status: data.settings?.show_active_status !== false,
        last_seen: data.last_seen,
      } as Profile

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`vibesocial_profile_${docSnap.id}`, JSON.stringify(profile))
        } catch {}
      }
      return profile
    } catch (error) {
      console.error('Error fetching Firebase profile by username:', error)
      return null
    }
  },

  _getLocalFollowing(userId: string): Set<string> {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(`vibesocial_following_${userId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  },

  _setLocalFollowing(userId: string, set: Set<string>) {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`vibesocial_following_${userId}`, JSON.stringify(Array.from(set)))
    } catch {}
  },

  _getLocalRequests(userId: string): Set<string> {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(`vibesocial_requests_${userId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  },

  _setLocalRequests(userId: string, set: Set<string>) {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`vibesocial_requests_${userId}`, JSON.stringify(Array.from(set)))
    } catch {}
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'username' | 'full_name' | 'bio' | 'website' | 'avatar_url'>>
  ): Promise<Profile> {
    if (!userId) throw new Error('User ID is required.')
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Unauthorized: You can only edit your own profile.')
    }

    let cleanUsername: string | undefined = undefined
    if (updates.username) {
      cleanUsername = updates.username.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30)
      if (cleanUsername.length < 3) {
        throw new Error('Username must be at least 3 characters.')
      }
    }

    const updatedData: any = {
      ...updates,
      ...(cleanUsername ? { username: cleanUsername } : {}),
      id: userId,
      updated_at: new Date().toISOString(),
    }

    // 1. Update localStorage immediately for instant UI feedback
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`vibesocial_profile_${userId}`)
        const existing = stored ? JSON.parse(stored) : {}
        const merged = { ...existing, ...updatedData }
        localStorage.setItem(`vibesocial_profile_${userId}`, JSON.stringify(merged))
      } catch {}
    }

    // 2. Persist to Firestore
    if (isFirebaseConfigured()) {
      try {
        const userRef = doc(db, 'users', userId)
        await setDoc(userRef, updatedData, { merge: true })
        const updatedSnap = await getDoc(userRef)
        if (updatedSnap.exists()) {
          const fresh = { id: updatedSnap.id, ...updatedSnap.data() } as Profile
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`vibesocial_profile_${userId}`, JSON.stringify(fresh))
            } catch {}
          }
          return fresh
        }
      } catch (err) {
        console.warn('Firestore updateProfile warning (saved locally):', err)
      }
    }

    return updatedData as Profile
  },

  async uploadAvatar(_userId: string, _file: File): Promise<string> {
    throw new Error('Firebase Storage is disabled on the Spark free plan. Direct binary avatar uploads are not allowed.')
  },

  async getFollowStats(userId: string): Promise<{ followers: number; following: number }> {
    if (!isFirebaseConfigured() || !userId) return { followers: 0, following: 0 }

    try {
      const followersRef = collection(db, 'users', userId, 'followers')
      const followingRef = collection(db, 'users', userId, 'following')

      const [followersSnap, followingSnap] = await Promise.all([
        getCountFromServer(followersRef),
        getCountFromServer(followingRef),
      ])

      return {
        followers: followersSnap.data().count,
        following: followingSnap.data().count,
      }
    } catch (error) {
      console.warn('Error fetching follow stats from Firestore, falling back to 0:', error)
      return { followers: 0, following: 0 }
    }
  },

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    if (!followerId || !followedId || followerId === followedId) {
      return false
    }

    if (this._getLocalFollowing(followerId).has(followedId)) {
      return true
    }

    if (!isFirebaseConfigured()) return false

    try {
      const followDocRef = doc(db, 'users', followedId, 'followers', followerId)
      const followSnap = await getDoc(followDocRef)
      if (followSnap.exists()) {
        const local = this._getLocalFollowing(followerId)
        local.add(followedId)
        this._setLocalFollowing(followerId, local)
        return true
      }
      return false
    } catch (error) {
      return this._getLocalFollowing(followerId).has(followedId)
    }
  },

  async followUser(followerId: string, followedId: string): Promise<void> {
    if (followerId === followedId) throw new Error('You cannot follow yourself.')

    // 1. Maintain local cache so user gets instant following state
    const local = this._getLocalFollowing(followerId)
    local.add(followedId)
    this._setLocalFollowing(followerId, local)

    // 2. Persist to Firestore
    if (isFirebaseConfigured()) {
      try {
        const timestamp = new Date().toISOString()
        const batch = writeBatch(db)

        const followerRef = doc(db, 'users', followedId, 'followers', followerId)
        batch.set(followerRef, {
          follower_id: followerId,
          followed_id: followedId,
          created_at: timestamp,
        })

        const followingRef = doc(db, 'users', followerId, 'following', followedId)
        batch.set(followingRef, {
          follower_id: followerId,
          followed_id: followedId,
          created_at: timestamp,
        })

        await batch.commit()

        notificationServiceFirebase.createNotification({
          recipientId: followedId,
          actorId: followerId,
          type: 'follow',
          resourceId: followerId,
          resourceType: 'user',
        }).catch(() => {})
      } catch (err) {
        console.warn('Firestore follow sync warning (maintained locally):', err)
      }
    }
  },

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    const local = this._getLocalFollowing(followerId)
    local.delete(followedId)
    this._setLocalFollowing(followerId, local)

    if (isFirebaseConfigured()) {
      try {
        const batch = writeBatch(db)
        const followerRef = doc(db, 'users', followedId, 'followers', followerId)
        const followingRef = doc(db, 'users', followerId, 'following', followedId)
        batch.delete(followerRef)
        batch.delete(followingRef)
        await batch.commit()
        notificationServiceFirebase.deleteNotification(followedId, `follow_${followerId}`).catch(() => {})
      } catch (err) {
        console.warn('Firestore unfollow sync warning:', err)
      }
    }
  },

  async sendFollowRequest(requesterId: string, targetId: string): Promise<{ status: 'followed' | 'requested' }> {
    if (requesterId === targetId) throw new Error('You cannot follow yourself.')

    let isPrivate = false
    try {
      if (isFirebaseConfigured()) {
        const targetDoc = await getDoc(doc(db, 'users', targetId))
        isPrivate = Boolean(targetDoc.data()?.is_private || targetDoc.data()?.settings?.is_private)
      }
    } catch {}

    if (!isPrivate) {
      await this.followUser(requesterId, targetId)
      return { status: 'followed' }
    }

    const requests = this._getLocalRequests(requesterId)
    requests.add(targetId)
    this._setLocalRequests(requesterId, requests)

    if (isFirebaseConfigured()) {
      try {
        const timestamp = new Date().toISOString()
        const reqRef = doc(db, 'users', targetId, 'followRequests', requesterId)
        await setDoc(reqRef, {
          requester_id: requesterId,
          target_id: targetId,
          created_at: timestamp,
        })

        notificationServiceFirebase.createNotification({
          recipientId: targetId,
          actorId: requesterId,
          type: 'follow_request',
          resourceId: requesterId,
          resourceType: 'user',
        }).catch(() => {})
      } catch (err) {
        console.warn('Follow request sync deferred (tracked locally):', err)
      }
    }

    return { status: 'requested' }
  },

  async cancelFollowRequest(requesterId: string, targetId: string): Promise<void> {
    const requests = this._getLocalRequests(requesterId)
    requests.delete(targetId)
    this._setLocalRequests(requesterId, requests)

    if (isFirebaseConfigured()) {
      try {
        const reqRef = doc(db, 'users', targetId, 'followRequests', requesterId)
        await deleteDoc(reqRef)
        notificationServiceFirebase.deleteNotification(targetId, `follow_request_${requesterId}`).catch(() => {})
      } catch {}
    }
  },

  async hasRequestedFollow(requesterId: string, targetId: string): Promise<boolean> {
    if (!requesterId || !targetId || requesterId === targetId) return false
    if (this._getLocalRequests(requesterId).has(targetId)) return true

    if (!isFirebaseConfigured()) return false
    try {
      const reqRef = doc(db, 'users', targetId, 'followRequests', requesterId)
      const snap = await getDoc(reqRef)
      if (snap.exists()) {
        const requests = this._getLocalRequests(requesterId)
        requests.add(targetId)
        this._setLocalRequests(requesterId, requests)
        return true
      }
      return false
    } catch {
      return this._getLocalRequests(requesterId).has(targetId)
    }
  },

  async getFollowRequests(userId: string): Promise<FollowRequest[]> {
    if (!isFirebaseConfigured() || !userId) return []
    if (!auth.currentUser || auth.currentUser.uid !== userId) return []
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'followRequests'))
      if (snap.empty) return []

      const requests = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = docSnap.data()
          const requesterProfile = await this.getProfileById(data.requester_id || docSnap.id)
          return {
            id: docSnap.id,
            requester_id: data.requester_id || docSnap.id,
            target_id: userId,
            created_at: data.created_at || new Date().toISOString(),
            requester: requesterProfile || undefined,
          }
        })
      )

      return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error fetching follow requests:', error)
      return []
    }
  },

  async acceptFollowRequest(targetId: string, requesterId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const timestamp = new Date().toISOString()
    const batch = writeBatch(db)

    // Add requester as follower of target
    const followerRef = doc(db, 'users', targetId, 'followers', requesterId)
    batch.set(followerRef, {
      follower_id: requesterId,
      followed_id: targetId,
      created_at: timestamp,
    })

    // Add target to requester's following
    const followingRef = doc(db, 'users', requesterId, 'following', targetId)
    batch.set(followingRef, {
      follower_id: requesterId,
      followed_id: targetId,
      created_at: timestamp,
    })

    // Remove the follow request
    const reqRef = doc(db, 'users', targetId, 'followRequests', requesterId)
    batch.delete(reqRef)

    await batch.commit()

    // Notify requester that their request was accepted
    await notificationServiceFirebase.createNotification({
      recipientId: requesterId,
      actorId: targetId,
      type: 'follow_request_accepted',
      resourceId: targetId,
      resourceType: 'user',
    })
  },

  async declineFollowRequest(targetId: string, requesterId: string): Promise<void> {
    if (!isFirebaseConfigured()) return
    const reqRef = doc(db, 'users', targetId, 'followRequests', requesterId)
    await deleteDoc(reqRef)
  },

  /**
   * Search real registered user profiles by username prefix and display name prefix.
   * Avoids downloading the entire collection by using indexed Firestore queries.
   */
  async searchProfiles(queryString: string, limitCount = 20): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !auth.currentUser || !queryString.trim()) return []

    try {
      const cleanQuery = queryString.trim().toLowerCase()
      const rawQuery = queryString.trim()
      const usersRef = collection(db, 'users')

      // Query 1: search by lowercase username prefix
      const usernameQuery = query(
        usersRef,
        where('username', '>=', cleanQuery),
        where('username', '<=', cleanQuery + '\uf8ff'),
        limit(limitCount)
      )

      // Query 2: search by full_name prefix (as typed)
      const nameQuery = query(
        usersRef,
        where('full_name', '>=', rawQuery),
        where('full_name', '<=', rawQuery + '\uf8ff'),
        limit(limitCount)
      )

      const [usernameSnap, nameSnap] = await Promise.all([
        getDocs(usernameQuery).catch(() => ({ docs: [] })),
        getDocs(nameQuery).catch(() => ({ docs: [] })),
      ])

      const resultsMap = new Map<string, Profile>()

      usernameSnap.docs.forEach((docSnap) => {
        resultsMap.set(docSnap.id, docSnap.data() as Profile)
      })

      nameSnap.docs.forEach((docSnap) => {
        if (!resultsMap.has(docSnap.id)) {
          resultsMap.set(docSnap.id, docSnap.data() as Profile)
        }
      })

      return Array.from(resultsMap.values()).slice(0, limitCount)
    } catch (error) {
      console.error('Error searching Firestore profiles:', error)
      return []
    }
  },

  /**
   * Fetch a list of registered users for the Discover section using real Firestore data.
   */
  async getDiscoverUsers(currentUserId?: string, limitCount = 12): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !auth.currentUser) return []

    try {
      const usersRef = collection(db, 'users')
      let snap
      try {
        const q = query(usersRef, orderBy('created_at', 'desc'), limit(limitCount + 4))
        snap = await getDocs(q)
      } catch {
        const q = query(usersRef, limit(limitCount + 4))
        snap = await getDocs(q)
      }

      if (snap.empty) return []

      const profiles: Profile[] = []
      snap.docs.forEach((docSnap) => {
        if (docSnap.id !== currentUserId) {
          profiles.push(docSnap.data() as Profile)
        }
      })

      return profiles.slice(0, limitCount)
    } catch (error) {
      console.warn('Error fetching discover users from Firestore:', error)
      return []
    }
  },

  async getFollowers(userId: string): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !userId) return []

    try {
      const followersColl = collection(db, 'users', userId, 'followers')
      const snap = await getDocs(followersColl)
      if (snap.empty) return []

      const followerIds = snap.docs.map((d) => d.data().follower_id || d.id)
      const profiles: Profile[] = []

      await Promise.all(
        followerIds.map(async (fid) => {
          try {
            const pDoc = await getDoc(doc(db, 'users', fid))
            if (pDoc.exists()) {
              profiles.push(pDoc.data() as Profile)
            }
          } catch {
            // Ignore missing profile
          }
        })
      )

      return profiles
    } catch (error) {
      console.error('Error fetching followers list:', error)
      return []
    }
  },

  async getFollowing(userId: string): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !userId) return []

    try {
      const followingColl = collection(db, 'users', userId, 'following')
      const snap = await getDocs(followingColl)
      if (snap.empty) return []

      const followedIds = snap.docs.map((d) => d.data().followed_id || d.id)
      const profiles: Profile[] = []

      await Promise.all(
        followedIds.map(async (fid) => {
          try {
            const pDoc = await getDoc(doc(db, 'users', fid))
            if (pDoc.exists()) {
              profiles.push(pDoc.data() as Profile)
            }
          } catch {
            // Ignore missing profile
          }
        })
      )

      return profiles
    } catch (error) {
      console.error('Error fetching following list:', error)
      return []
    }
  },

  async getFollowingIds(userId: string): Promise<string[]> {
    if (!isFirebaseConfigured() || !userId) return []
    try {
      const followingColl = collection(db, 'users', userId, 'following')
      const snap = await getDocs(followingColl)
      if (snap.empty) return []
      return snap.docs.map((d) => d.data().followed_id || d.id)
    } catch (error) {
      console.warn('Error fetching following IDs:', error)
      return []
    }
  },

  async getUserSettings(userId: string) {
    const defaultSettings = {
      is_private: false,
      like_notifications: true,
      comment_notifications: true,
      follow_notifications: true,
      message_notifications: true,
      reduce_motion: false,
      theme: 'dark',
    }

    if (!isFirebaseConfigured() || !userId) return defaultSettings

    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const data = userDoc.data()
        return {
          ...defaultSettings,
          ...(data.settings || {}),
        }
      }
      return defaultSettings
    } catch (error) {
      console.warn('Error fetching user settings, using defaults:', error)
      return defaultSettings
    }
  },

  async updateUserSettings(userId: string, newSettings: Record<string, any>): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Unauthorized settings update.')
    }

    const userRef = doc(db, 'users', userId)
    const payload: Record<string, any> = {
      settings: newSettings,
      updated_at: new Date().toISOString(),
    }
    if (newSettings.is_private !== undefined) {
      payload.is_private = Boolean(newSettings.is_private)
    }
    await setDoc(userRef, payload, { merge: true })
  },

  async blockUser(currentUserId: string, targetId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    if (currentUserId === targetId) throw new Error('Cannot block yourself.')

    const timestamp = new Date().toISOString()
    const blockRef = doc(db, 'users', currentUserId, 'blockedUsers', targetId)
    await setDoc(blockRef, {
      user_id: targetId,
      created_at: timestamp,
    })

    // If following or follower, remove relationships
    try {
      await this.unfollowUser(currentUserId, targetId)
    } catch {}
    try {
      await this.unfollowUser(targetId, currentUserId)
    } catch {}
  },

  async unblockUser(currentUserId: string, targetId: string): Promise<void> {
    if (!isFirebaseConfigured()) return
    const blockRef = doc(db, 'users', currentUserId, 'blockedUsers', targetId)
    await deleteDoc(blockRef)
  },

  async getBlockedUsers(userId: string): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !userId) return []
    if (!auth.currentUser || auth.currentUser.uid !== userId) return []
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'blockedUsers'))
      if (snap.empty) return []
      const profiles = await Promise.all(
        snap.docs.map(async (docSnap) => {
          return await this.getProfileById(docSnap.id)
        })
      )
      return profiles.filter(Boolean) as Profile[]
    } catch (error) {
      console.error('Error fetching blocked users:', error)
      return []
    }
  },

  async isUserBlocked(currentUserId: string, targetId: string): Promise<boolean> {
    if (!isFirebaseConfigured() || !currentUserId || !targetId) return false
    try {
      const snap = await getDoc(doc(db, 'users', currentUserId, 'blockedUsers', targetId))
      return snap.exists()
    } catch {
      return false
    }
  },

  async restrictUser(currentUserId: string, targetId: string): Promise<void> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')
    if (currentUserId === targetId) throw new Error('Cannot restrict yourself.')

    const timestamp = new Date().toISOString()
    const restrictRef = doc(db, 'users', currentUserId, 'restrictedUsers', targetId)
    await setDoc(restrictRef, {
      user_id: targetId,
      created_at: timestamp,
    })
  },

  async unrestrictUser(currentUserId: string, targetId: string): Promise<void> {
    if (!isFirebaseConfigured()) return
    const restrictRef = doc(db, 'users', currentUserId, 'restrictedUsers', targetId)
    await deleteDoc(restrictRef)
  },

  async getRestrictedUsers(userId: string): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !userId) return []
    if (!auth.currentUser || auth.currentUser.uid !== userId) return []
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'restrictedUsers'))
      if (snap.empty) return []
      const profiles = await Promise.all(
        snap.docs.map(async (docSnap) => {
          return await this.getProfileById(docSnap.id)
        })
      )
      return profiles.filter(Boolean) as Profile[]
    } catch (error) {
      console.error('Error fetching restricted users:', error)
      return []
    }
  },

  async isUserRestricted(currentUserId: string, targetId: string): Promise<boolean> {
    if (!isFirebaseConfigured() || !currentUserId || !targetId) return false
    try {
      const snap = await getDoc(doc(db, 'users', currentUserId, 'restrictedUsers', targetId))
      return snap.exists()
    } catch {
      return false
    }
  },

  async updateActiveStatus(userId: string): Promise<void> {
    if (!isFirebaseConfigured() || !userId) return
    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId) return

    try {
      const userRef = doc(db, 'users', userId)
      await setDoc(userRef, { last_seen: new Date().toISOString() }, { merge: true })
    } catch (err) {
      console.warn('Failed to update active status:', err)
    }
  },

  async hideStoryFrom(currentUserId: string, targetId: string): Promise<void> {
    if (!isFirebaseConfigured() || !currentUserId || !targetId) return
    const userRef = doc(db, 'users', currentUserId)
    const userDoc = await getDoc(userRef)
    const settings = userDoc.data()?.settings || {}
    const hiddenUsers: string[] = Array.isArray(settings.hidden_story_users) ? settings.hidden_story_users : []
    if (!hiddenUsers.includes(targetId)) {
      hiddenUsers.push(targetId)
      await setDoc(userRef, { settings: { ...settings, hidden_story_users: hiddenUsers } }, { merge: true })
    }
  },

  async unhideStoryFrom(currentUserId: string, targetId: string): Promise<void> {
    if (!isFirebaseConfigured() || !currentUserId || !targetId) return
    const userRef = doc(db, 'users', currentUserId)
    const userDoc = await getDoc(userRef)
    const settings = userDoc.data()?.settings || {}
    const hiddenUsers: string[] = (Array.isArray(settings.hidden_story_users) ? settings.hidden_story_users : []).filter(
      (id: string) => id !== targetId
    )
    await setDoc(userRef, { settings: { ...settings, hidden_story_users: hiddenUsers } }, { merge: true })
  },

  async getHiddenStoryUsers(userId: string): Promise<Profile[]> {
    if (!isFirebaseConfigured() || !userId) return []
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      const settings = userDoc.data()?.settings || {}
      const hiddenIds: string[] = Array.isArray(settings.hidden_story_users) ? settings.hidden_story_users : []
      if (hiddenIds.length === 0) return []
      const profiles = await Promise.all(hiddenIds.map((id) => this.getProfileById(id)))
      return profiles.filter(Boolean) as Profile[]
    } catch (err) {
      console.error('Error fetching hidden story users:', err)
      return []
    }
  },

  async exportUserData(userId: string): Promise<any> {
    if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.')

    const currentUser = auth.currentUser
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Unauthorized data export.')
    }

    const [userDoc, followersSnap, followingSnap, savedSnap] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(collection(db, 'users', userId, 'followers')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'users', userId, 'following')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'users', userId, 'savedPosts')).catch(() => ({ docs: [] })),
    ])

    return {
      account: {
        uid: currentUser.uid,
        email: currentUser.email,
        profile: userDoc.exists() ? userDoc.data() : null,
      },
      followersCount: followersSnap.docs.length,
      followingCount: followingSnap.docs.length,
      savedPostsCount: savedSnap.docs.length,
      exportedAt: new Date().toISOString(),
      platform: 'VibeSocial Web',
      version: '1.0.0',
    }
  },
}
