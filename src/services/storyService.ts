import { supabase, isSupabaseConfigured } from './supabase'
import { getBackendProvider } from './backendConfig'
import { storyServiceFirebase } from './firebase/storyService.firebase'
import type { Story, StoryView } from '../types/database.types'

export interface CreateStoryOptions {
  authorId: string
  file?: File | null
  mediaUrl?: string | null
  mediaType?: 'image' | 'video'
  caption?: string
  isCloseFriends?: boolean
}

export const storyService = {
  async getActiveStories(currentUserId?: string): Promise<{ authorId: string; author: any; stories: Story[]; hasUnviewed: boolean }[]> {
    if (getBackendProvider() === 'firebase') {
      return await storyServiceFirebase.getActiveStories(currentUserId)
    }

    if (!isSupabaseConfigured()) return []

    const now = new Date().toISOString()
    const { data: rawStories, error } = await supabase
      .from('stories')
      .select(`
        *,
        author:profiles(*)
      `)
      .gt('expires_at', now)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching stories:', error)
      return []
    }

    if (!rawStories || rawStories.length === 0) return []

    // Fetch views for current user
    let viewedStoryIds = new Set<string>()
    if (currentUserId) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', currentUserId)
      if (views) {
        viewedStoryIds = new Set(views.map((v) => v.story_id))
      }
    }

    // Group stories by author
    const authorMap = new Map<string, { authorId: string; author: any; stories: Story[]; hasUnviewed: boolean }>()

    for (const story of rawStories) {
      const isViewed = viewedStoryIds.has(story.id)
      const storyWithView: Story = { ...story, viewed: isViewed }

      if (!authorMap.has(story.author_id)) {
        authorMap.set(story.author_id, {
          authorId: story.author_id,
          author: story.author,
          stories: [storyWithView],
          hasUnviewed: !isViewed,
        })
      } else {
        const entry = authorMap.get(story.author_id)!
        entry.stories.push(storyWithView)
        if (!isViewed) {
          entry.hasUnviewed = true
        }
      }
    }

    return Array.from(authorMap.values())
  },

  async createStory({
    authorId,
    file,
    mediaUrl,
    mediaType,
    caption,
    isCloseFriends,
  }: CreateStoryOptions): Promise<Story> {
    if (getBackendProvider() === 'firebase') {
      return await storyServiceFirebase.createStory({
        authorId,
        file,
        mediaUrl,
        mediaType,
        caption,
        isCloseFriends,
      })
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    if (!file && !mediaUrl) {
      throw new Error('A media file or external media URL is required.')
    }

    let finalMediaUrl = mediaUrl
    let detectedType = mediaType || 'image'

    if (file) {
      const isVideo = file.type.startsWith('video/')
      detectedType = isVideo ? 'video' : 'image'
      const ext = file.name.split('.').pop()
      const storagePath = `${authorId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('stories').getPublicUrl(storagePath)
      finalMediaUrl = publicUrlData.publicUrl
    }

    if (!finalMediaUrl) throw new Error('Could not determine media URL for story.')

    const { data: story, error: insertError } = await supabase
      .from('stories')
      .insert({
        author_id: authorId,
        media_url: finalMediaUrl,
        media_type: detectedType,
        caption: caption?.trim() || '',
      })
      .select('*, author:profiles(*)')
      .single()

    if (insertError) throw insertError
    return story
  },

  async markStoryViewed(storyId: string, viewerId: string) {
    if (getBackendProvider() === 'firebase') {
      return await storyServiceFirebase.markStoryViewed(storyId, viewerId)
    }

    if (!isSupabaseConfigured()) return

    await supabase
      .from('story_views')
      .insert({ story_id: storyId, viewer_id: viewerId })
      .select()
      .maybeSingle()
  },

  async getStoryViewers(storyId: string): Promise<StoryView[]> {
    if (getBackendProvider() === 'firebase') {
      return await storyServiceFirebase.getStoryViewers(storyId)
    }

    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('story_views')
      .select(`
        *,
        viewer:profiles(*)
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false })

    if (error) {
      console.error('Error fetching story viewers:', error)
      return []
    }
    return data || []
  },

  async deleteStory(storyId: string, authorId: string) {
    if (getBackendProvider() === 'firebase') {
      return await storyServiceFirebase.deleteStory(storyId, authorId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('author_id', authorId)

    if (error) throw error
  },

  async getArchivedStories(authorId: string): Promise<Story[]> {
    if (getBackendProvider() === 'firebase') {
      return await storyServiceFirebase.getArchivedStories(authorId)
    }
    return []
  },
}

