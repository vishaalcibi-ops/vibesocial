import { supabase, isSupabaseConfigured } from './supabase'
import type { Profile, FollowRequest } from '../types/database.types'
import { getBackendProvider } from './backendConfig'
import { profileServiceFirebase } from './firebase/profileService.firebase'

export const profileService = {
  async getProfileById(userId: string): Promise<Profile | null> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getProfileById(userId)
    }

    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile by ID:', error)
      return null
    }
    return data
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getProfileByUsername(username)
    }

    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile by username:', error)
      return null
    }
    return data
  },

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'username' | 'full_name' | 'bio' | 'website' | 'avatar_url'>>) {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.updateProfile(userId, updates)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data as Profile
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.uploadAvatar(userId, file)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    await this.updateProfile(userId, { avatar_url: data.publicUrl })
    return data.publicUrl
  },

  async getFollowStats(userId: string): Promise<{ followers: number; following: number }> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getFollowStats(userId)
    }

    if (!isSupabaseConfigured()) return { followers: 0, following: 0 }

    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

    return {
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
    }
  },

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.isFollowing(followerId, followedId)
    }

    if (!isSupabaseConfigured() || followerId === followedId) return false

    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle()

    return Boolean(data)
  },

  async followUser(followerId: string, followedId: string) {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.followUser(followerId, followedId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    if (followerId === followedId) throw new Error('You cannot follow yourself.')

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, followed_id: followedId })

    if (error) throw error
  },

  async unfollowUser(followerId: string, followedId: string) {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.unfollowUser(followerId, followedId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)

    if (error) throw error
  },

  async searchProfiles(query: string, limit = 20): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.searchProfiles(query, limit)
    }

    if (!isSupabaseConfigured() || !query.trim()) return []

    const cleanQuery = query.trim().toLowerCase()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
      .limit(limit)

    if (error) {
      console.error('Error searching profiles:', error)
      return []
    }
    return data || []
  },

  async getDiscoverUsers(currentUserId?: string, limit = 12): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getDiscoverUsers(currentUserId, limit)
    }

    if (!isSupabaseConfigured()) return []

    let query = supabase.from('profiles').select('*').limit(limit)
    if (currentUserId) {
      query = query.neq('id', currentUserId)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error getting discover users:', error)
      return []
    }
    return data || []
  },

  async getFollowers(userId: string): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getFollowers(userId)
    }
    return []
  },

  async getFollowing(userId: string): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getFollowing(userId)
    }
    return []
  },

  async getFollowingIds(userId: string): Promise<string[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getFollowingIds(userId)
    }
    if (!isSupabaseConfigured() || !userId) return []
    const { data } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', userId)
    return (data || []).map((row: any) => row.followed_id)
  },

  async getUserSettings(userId: string) {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getUserSettings(userId)
    }
    return {
      is_private: false,
      like_notifications: true,
      comment_notifications: true,
      follow_notifications: true,
      message_notifications: true,
      reduce_motion: false,
      theme: 'dark',
    }
  },

  async updateUserSettings(userId: string, settings: Record<string, any>): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.updateUserSettings(userId, settings)
    }
  },

  async exportUserData(userId: string): Promise<any> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.exportUserData(userId)
    }
    return null
  },

  async sendFollowRequest(requesterId: string, targetId: string): Promise<{ status: 'followed' | 'requested' }> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.sendFollowRequest(requesterId, targetId)
    }
    await this.followUser(requesterId, targetId)
    return { status: 'followed' }
  },

  async cancelFollowRequest(requesterId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.cancelFollowRequest(requesterId, targetId)
    }
  },

  async hasRequestedFollow(requesterId: string, targetId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.hasRequestedFollow(requesterId, targetId)
    }
    return false
  },

  async getFollowRequests(userId: string): Promise<FollowRequest[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getFollowRequests(userId)
    }
    return []
  },

  async acceptFollowRequest(targetId: string, requesterId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.acceptFollowRequest(targetId, requesterId)
    }
  },

  async declineFollowRequest(targetId: string, requesterId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.declineFollowRequest(targetId, requesterId)
    }
  },

  async blockUser(currentUserId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.blockUser(currentUserId, targetId)
    }
  },

  async unblockUser(currentUserId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.unblockUser(currentUserId, targetId)
    }
  },

  async getBlockedUsers(userId: string): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getBlockedUsers(userId)
    }
    return []
  },

  async isUserBlocked(currentUserId: string, targetId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.isUserBlocked(currentUserId, targetId)
    }
    return false
  },

  async restrictUser(currentUserId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.restrictUser(currentUserId, targetId)
    }
  },

  async unrestrictUser(currentUserId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.unrestrictUser(currentUserId, targetId)
    }
  },

  async getRestrictedUsers(userId: string): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getRestrictedUsers(userId)
    }
    return []
  },

  async isUserRestricted(currentUserId: string, targetId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.isUserRestricted(currentUserId, targetId)
    }
    return false
  },

  async updateActiveStatus(userId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.updateActiveStatus(userId)
    }
  },

  async hideStoryFrom(currentUserId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.hideStoryFrom(currentUserId, targetId)
    }
  },

  async unhideStoryFrom(currentUserId: string, targetId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.unhideStoryFrom(currentUserId, targetId)
    }
  },

  async getHiddenStoryUsers(userId: string): Promise<Profile[]> {
    if (getBackendProvider() === 'firebase') {
      return profileServiceFirebase.getHiddenStoryUsers(userId)
    }
    return []
  },
}

