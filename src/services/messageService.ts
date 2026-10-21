import { supabase, isSupabaseConfigured } from './supabase'
import type { Conversation, Message } from '../types/database.types'
import { getBackendProvider } from './backendConfig'
import { messageServiceFirebase } from './firebase/messageService.firebase'

export const messageService = {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.getUserConversations(userId)
    }

    if (!isSupabaseConfigured()) return []

    // 1. Get conversation memberships
    const { data: memberships, error: memError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)

    if (memError || !memberships || memberships.length === 0) {
      return []
    }

    const conversationIds = memberships.map((m) => m.conversation_id)

    // 2. Fetch conversations with all members and profiles
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members(
          *,
          profile:profiles(*)
        )
      `)
      .in('id', conversationIds)
      .order('updated_at', { ascending: false })

    if (convError || !conversations) {
      console.error('Error fetching conversations:', convError)
      return []
    }

    // 3. Fetch latest message and unread count for each
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', userId)

        return {
          ...conv,
          last_message: messages && messages[0] ? messages[0] : undefined,
          unread_count: count || 0,
        }
      })
    )

    return enriched
  },

  async getOrCreateDirectConversation(currentUserId: string, targetUserId: string): Promise<string> {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.getOrCreateDirectConversation(currentUserId, targetUserId)
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    // Check if a 1-on-1 conversation already exists between these two users
    const { data: myMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', currentUserId)

    if (myMemberships && myMemberships.length > 0) {
      const myConvIds = myMemberships.map((m) => m.conversation_id)

      const { data: mutualMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds)

      if (mutualMemberships && mutualMemberships.length > 0) {
        return mutualMemberships[0].conversation_id
      }
    }

    // Create a new conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({ is_group: false })
      .select()
      .single()

    if (createError) throw createError

    // Add both members
    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: newConv.id, user_id: currentUserId, role: 'member' },
        { conversation_id: newConv.id, user_id: targetUserId, role: 'member' },
      ])

    if (membersError) throw membersError

    return newConv.id
  },

  async getConversationMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.getConversationMessages(conversationId, limit)
    }

    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  },

  async sendMessage({
    conversationId,
    senderId,
    textContent,
    file,
  }: {
    conversationId: string
    senderId: string
    textContent: string
    file?: File
  }): Promise<Message> {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.sendMessage({ conversationId, senderId, textContent, file })
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

    let mediaUrl: string | null = null
    let mediaType: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const storagePath = `${conversationId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('messages')
        .upload(storagePath, file, { cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('messages').getPublicUrl(storagePath)
      mediaUrl = urlData.publicUrl
      mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text_content: textContent.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select(`
        *,
        sender:profiles(*)
      `)
      .single()

    if (error) throw error
    return data
  },

  async markConversationAsRead(conversationId: string, userId: string) {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.markConversationAsRead(conversationId, userId)
    }

    if (!isSupabaseConfigured()) return

    await Promise.all([
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false),
      supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId),
    ])
  },

  subscribeToConversation(conversationId: string, onNewMessage: (msg: Message) => void) {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.subscribeToConversation(conversationId, onNewMessage)
    }

    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} }
    }

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: fullMsg } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (fullMsg) {
            onNewMessage(fullMsg as Message)
          } else {
            onNewMessage(payload.new as Message)
          }
        }
      )
      .subscribe()

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel)
      },
    }
  },

  subscribeToUserConversations(userId: string, onUpdate: (conversations: Conversation[]) => void) {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.subscribeToUserConversations(userId, onUpdate)
    }

    return { unsubscribe: () => {} }
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (getBackendProvider() === 'firebase') {
      return messageServiceFirebase.getUnreadCount(userId)
    }

    if (!isSupabaseConfigured() || !userId) return 0

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', userId)

    if (error) return 0
    return count || 0
  },
}
