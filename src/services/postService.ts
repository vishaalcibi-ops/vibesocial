import { supabase, isSupabaseConfigured } from './supabase'
import { getBackendProvider } from './backendConfig'
import { postServiceFirebase } from './firebase/postService.firebase'
import type { Post, Comment, PostMedia, AudioTrack } from '../types/database.types'

export const postService = {
  async getFeedPosts({
    limit = 10,
    offset = 0,
    currentUserId,
  }: {
    limit?: number
    offset?: number
    currentUserId?: string
  }): Promise<Post[]> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getFeedPosts({ limit, offset, currentUserId })
    }

    if (!isSupabaseConfigured()) return []

    // Fetch posts with author and media
    const { data: rawPosts, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(*),
        media:post_media(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching feed posts:', error)
      return []
    }

    if (!rawPosts || rawPosts.length === 0) return []

    // Enhance posts with like count, comment count, and user state
    const postIds = rawPosts.map((p) => p.id)

    const [likesRes, commentsRes, myLikesRes, mySavesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id'),
      supabase.from('comments').select('post_id'),
      currentUserId
        ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
      currentUserId
        ? supabase.from('saved_posts').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ])

    const myLikesSet = new Set((myLikesRes.data || []).map((l: { post_id: string }) => l.post_id))
    const mySavesSet = new Set((mySavesRes.data || []).map((s: { post_id: string }) => s.post_id))

    const likesCountMap = new Map<string, number>()
    ;(likesRes.data || []).forEach((l: { post_id: string }) => {
      likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1)
    })

    const commentsCountMap = new Map<string, number>()
    ;(commentsRes.data || []).forEach((c: { post_id: string }) => {
      commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1)
    })

    return rawPosts.map((post) => ({
      ...post,
      likes_count: likesCountMap.get(post.id) || 0,
      comments_count: commentsCountMap.get(post.id) || 0,
      is_liked_by_me: myLikesSet.has(post.id),
      is_saved_by_me: mySavesSet.has(post.id),
    }))
  },

  async getExplorePosts({
    limit = 30,
    offset = 0,
    currentUserId,
  }: {
    limit?: number
    offset?: number
    currentUserId?: string
  }): Promise<Post[]> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getExplorePosts({ limit, currentUserId })
    }
    return this.getFeedPosts({ limit, offset, currentUserId })
  },

  async getProfilePosts(authorId: string, currentUserId?: string): Promise<Post[]> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getProfilePosts(authorId, currentUserId)
    }

    if (!isSupabaseConfigured()) return []

    const { data: rawPosts, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(*),
        media:post_media(*)
      `)
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profile posts:', error)
      return []
    }

    if (!rawPosts) return []
    const postIds = rawPosts.map((p) => p.id)
    if (postIds.length === 0) return []

    const [likesRes, commentsRes, myLikesRes, mySavesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id').in('post_id', postIds),
      supabase.from('comments').select('post_id').in('post_id', postIds),
      currentUserId
        ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
      currentUserId
        ? supabase.from('saved_posts').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ])

    const myLikesSet = new Set((myLikesRes.data || []).map((l: { post_id: string }) => l.post_id))
    const mySavesSet = new Set((mySavesRes.data || []).map((s: { post_id: string }) => s.post_id))

    const likesCountMap = new Map<string, number>()
    ;(likesRes.data || []).forEach((l: { post_id: string }) => {
      likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1)
    })

    const commentsCountMap = new Map<string, number>()
    ;(commentsRes.data || []).forEach((c: { post_id: string }) => {
      commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1)
    })

    return rawPosts.map((post) => ({
      ...post,
      likes_count: likesCountMap.get(post.id) || 0,
      comments_count: commentsCountMap.get(post.id) || 0,
      is_liked_by_me: myLikesSet.has(post.id),
      is_saved_by_me: mySavesSet.has(post.id),
    }))
  },

  async createPost({
    authorId,
    caption,
    location,
    location_lat,
    location_lng,
    visibility,
    is_close_friends,
    files,
    mediaUrl,
    mediaType = 'text',
    audioTrack,
  }: {
    authorId: string
    caption: string
    location?: string
    location_lat?: number | null
    location_lng?: number | null
    visibility?: 'public' | 'close_friends'
    is_close_friends?: boolean
    files?: File[]
    mediaUrl?: string | null
    mediaType?: 'text' | 'image' | 'video'
    audioTrack?: AudioTrack | null
  }): Promise<Post> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.createPost({
        authorId,
        caption,
        location,
        location_lat,
        location_lng,
        visibility,
        is_close_friends,
        files,
        mediaUrl,
        mediaType,
        audioTrack,
      })
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    if (!files || files.length === 0) throw new Error('Please select at least one image or video.')

    // 1. Insert post record
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        caption: caption.trim(),
        location: location?.trim() || null,
        visibility: 'public',
      })
      .select('*, author:profiles(*)')
      .single()

    if (postError) throw postError

    // 2. Upload media files to storage and insert post_media records
    const uploadedMedia: PostMedia[] = []
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const isVideo = file.type.startsWith('video/')
        const ext = file.name.split('.').pop()
        const storagePath = `${authorId}/${post.id}_${i}_${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(storagePath)

        const { data: mediaRecord, error: mediaError } = await supabase
          .from('post_media')
          .insert({
            post_id: post.id,
            storage_path: publicUrlData.publicUrl,
            media_type: isVideo ? 'video' : 'image',
            media_order: i,
          })
          .select()
          .single()

        if (mediaError) throw mediaError
        uploadedMedia.push(mediaRecord)
      }
    } catch (err) {
      // Cleanup partially created post if media upload fails
      await supabase.from('posts').delete().eq('id', post.id)
      throw err
    }

    return {
      ...post,
      media: uploadedMedia,
      likes_count: 0,
      comments_count: 0,
      is_liked_by_me: false,
      is_saved_by_me: false,
    }
  },

  async deletePost(postId: string, authorId: string) {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.deletePost(postId, authorId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', authorId)

    if (error) throw error
  },

  async toggleLikePost(postId: string, userId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.toggleLikePost(postId, userId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingLike) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId })
      if (error) throw error
      return true
    }
  },

  async toggleSavePost(postId: string, userId: string): Promise<boolean> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.toggleSavePost(postId, userId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { data: existingSave } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingSave) {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('saved_posts')
        .insert({ post_id: postId, user_id: userId })
      if (error) throw error
      return true
    }
  },

  async getSavedPosts(userId: string): Promise<Post[]> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getSavedPosts(userId)
    }

    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        post:posts(
          *,
          author:profiles(*),
          media:post_media(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved posts:', error)
      return []
    }

    return (data || [])
      .map((item: any) => item.post)
      .filter(Boolean)
  },

  async getPostComments(postId: string): Promise<Comment[]> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getPostComments(postId)
    }

    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles(*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return []
    }

    return data || []
  },

  async addComment(postId: string, authorId: string, content: string, parentCommentId?: string): Promise<Comment> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.addComment(postId, authorId, content, parentCommentId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: authorId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select(`
        *,
        author:profiles(*)
      `)
      .single()

    if (error) throw error
    return data
  },

  async deleteComment(commentId: string, authorId: string, postId?: string) {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.deleteComment(commentId, authorId, postId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', authorId)

    if (error) throw error
  },

  async getPostById(postId: string, currentUserId?: string): Promise<Post | null> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getPostById(postId, currentUserId)
    }
    if (!isSupabaseConfigured()) return null
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles(*), media:post_media(*)')
      .eq('id', postId)
      .single()
    if (error || !data) return null
    return data
  },

  async updatePost(
    postId: string,
    authorId: string,
    updates: { caption?: string; location?: string }
  ): Promise<Post> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.updatePost(postId, authorId, updates)
    }
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .eq('author_id', authorId)
      .select('*, author:profiles(*), media:post_media(*)')
      .single()
    if (error) throw error
    return data
  },

  async getUserActivity(userId: string) {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getUserActivity(userId)
    }
    return { likedPosts: [], userPosts: [] }
  },

  async reportContent(
    reporterId: string,
    targetId: string,
    targetType: 'post' | 'user' | 'reel',
    reason: string,
    details?: string
  ) {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.reportContent(reporterId, targetId, targetType, reason, details)
    }
  },

  async archivePost(postId: string, authorId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.archivePost(postId, authorId)
    }
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    await supabase.from('posts').update({ is_archived: true }).eq('id', postId).eq('author_id', authorId)
  },

  async unarchivePost(postId: string, authorId: string): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.unarchivePost(postId, authorId)
    }
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
    await supabase.from('posts').update({ is_archived: false }).eq('id', postId).eq('author_id', authorId)
  },

  async getArchivedPosts(authorId: string): Promise<Post[]> {
    if (getBackendProvider() === 'firebase') {
      return postServiceFirebase.getArchivedPosts(authorId)
    }
    return []
  },
}

