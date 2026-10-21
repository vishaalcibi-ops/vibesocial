import { supabase, isSupabaseConfigured } from './supabase'
import { getBackendProvider } from './backendConfig'
import { reelServiceFirebase } from './firebase/reelService.firebase'
import type { Reel, ReelComment } from '../types/database.types'

export interface CreateReelOptions {
  authorId: string
  videoFile?: File | null
  videoUrl?: string | null
  caption?: string
  audioTitle?: string
}

export const reelService = {
  async getReels({
    limit = 20,
    offset = 0,
    currentUserId,
  }: {
    limit?: number
    offset?: number
    currentUserId?: string
  }): Promise<Reel[]> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.getReels({ limit, offset, currentUserId })
    }

    if (!isSupabaseConfigured()) return []

    const { data: rawReels, error } = await supabase
      .from('reels')
      .select(`
        *,
        author:profiles(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching reels:', error)
      return []
    }

    if (!rawReels || rawReels.length === 0) return []

    const reelIds = rawReels.map((r) => r.id)

    const [likesRes, myLikesRes] = await Promise.all([
      supabase.from('reel_likes').select('reel_id').in('reel_id', reelIds),
      currentUserId ? supabase.from('reel_likes').select('reel_id').eq('user_id', currentUserId).in('reel_id', reelIds) : Promise.resolve({ data: [] }),
    ])

    const myLikesSet = new Set((myLikesRes.data || []).map((l: { reel_id: string }) => l.reel_id))
    const likesCountMap = new Map<string, number>()
    ;(likesRes.data || []).forEach((l: { reel_id: string }) => {
      likesCountMap.set(l.reel_id, (likesCountMap.get(l.reel_id) || 0) + 1)
    })

    return rawReels.map((reel) => ({
      ...reel,
      likes_count: likesCountMap.get(reel.id) || 0,
      is_liked_by_me: myLikesSet.has(reel.id),
    }))
  },

  async createReel({
    authorId,
    videoFile,
    videoUrl,
    caption,
    audioTitle = 'Original Audio',
  }: CreateReelOptions): Promise<Reel> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.createReel({
        authorId,
        videoFile,
        videoUrl,
        caption,
        audioTitle,
      })
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    if (!videoFile && !videoUrl) {
      throw new Error('A video file or external video URL is required.')
    }

    let finalVideoUrl = videoUrl

    if (videoFile) {
      if (!videoFile.type.startsWith('video/')) {
        throw new Error('Only video files are supported for Reels.')
      }

      if (videoFile.size > 100 * 1024 * 1024) {
        throw new Error('Reel video size exceeds 100MB limit.')
      }

      const ext = videoFile.name.split('.').pop()
      const storagePath = `${authorId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(storagePath, videoFile, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('reels').getPublicUrl(storagePath)
      finalVideoUrl = publicUrlData.publicUrl
    }

    if (!finalVideoUrl) throw new Error('Could not determine video URL for Reel.')

    const { data: reel, error: insertError } = await supabase
      .from('reels')
      .insert({
        author_id: authorId,
        video_url: finalVideoUrl,
        caption: caption?.trim() || '',
        audio_title: audioTitle.trim() || 'Original Audio',
      })
      .select('*, author:profiles(*)')
      .single()

    if (insertError) throw insertError

    return {
      ...reel,
      likes_count: 0,
      is_liked_by_me: false,
    }
  },

  async toggleLikeReel(reelId: string, userId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.toggleLikeReel(reelId, userId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { data: existingLike } = await supabase
      .from('reel_likes')
      .select('reel_id')
      .eq('reel_id', reelId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingLike) {
      const { error } = await supabase
        .from('reel_likes')
        .delete()
        .eq('reel_id', reelId)
        .eq('user_id', userId)
      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('reel_likes')
        .insert({ reel_id: reelId, user_id: userId })
      if (error) throw error
      return true
    }
  },

  async getReelComments(reelId: string): Promise<ReelComment[]> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.getReelComments(reelId)
    }

    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('reel_comments')
      .select(`
        *,
        author:profiles(*)
      `)
      .eq('reel_id', reelId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('Could not fetch Supabase reel comments:', error)
      return []
    }
    return data || []
  },

  async addReelComment(reelId: string, authorId: string, content: string): Promise<ReelComment> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.addReelComment(reelId, authorId, content)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { data, error } = await supabase
      .from('reel_comments')
      .insert({
        reel_id: reelId,
        author_id: authorId,
        content: content.trim(),
      })
      .select('*, author:profiles(*)')
      .single()

    if (error) throw error
    return data
  },

  async deleteReelComment(reelId: string, commentId: string, authorId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.deleteReelComment(reelId, commentId, authorId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { error } = await supabase
      .from('reel_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', authorId)

    if (error) throw error
  },

  async deleteReel(reelId: string, authorId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.deleteReel(reelId, authorId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { error } = await supabase
      .from('reels')
      .delete()
      .eq('id', reelId)
      .eq('author_id', authorId)

    if (error) throw error
  },

  async getUserReels(userId: string, currentUserId?: string): Promise<Reel[]> {
    if (getBackendProvider() === 'firebase') {
      return await reelServiceFirebase.getUserReels(userId, currentUserId)
    }
    return []
  },
}
