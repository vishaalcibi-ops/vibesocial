import { supabase, isSupabaseConfigured } from './supabase'
import type { Notification } from '../types/database.types'
import { getBackendProvider } from './backendConfig'
import { notificationServiceFirebase, type CreateNotificationParams } from './firebase/notificationService.firebase'

export const notificationService = {
  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    if (getBackendProvider() === 'firebase') {
      return notificationServiceFirebase.getUserNotifications(userId, limit)
    }

    if (!isSupabaseConfigured()) return []

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles(*)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  },

  async markNotificationAsRead(notificationId: string, userId?: string) {
    if (getBackendProvider() === 'firebase') {
      if (userId) {
        return notificationServiceFirebase.markNotificationAsRead(userId, notificationId)
      }
      return
    }

    if (!isSupabaseConfigured()) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) console.error('Error marking notification as read:', error)
  },

  async markAllNotificationsAsRead(userId: string) {
    if (getBackendProvider() === 'firebase') {
      return notificationServiceFirebase.markAllNotificationsAsRead(userId)
    }

    if (!isSupabaseConfigured()) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) console.error('Error marking all notifications as read:', error)
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (getBackendProvider() === 'firebase') {
      return notificationServiceFirebase.getUnreadCount(userId)
    }

    if (!isSupabaseConfigured()) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) return 0
    return count || 0
  },

  subscribeToNotifications(userId: string, onNewNotification: (notif: Notification) => void) {
    if (getBackendProvider() === 'firebase') {
      return notificationServiceFirebase.subscribeToNotifications(userId, onNewNotification)
    }

    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} }
    }

    const channel = supabase
      .channel(`notifs_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select(`
              *,
              actor:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            onNewNotification(data as Notification)
          } else {
            onNewNotification(payload.new as Notification)
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

  async createNotification(params: CreateNotificationParams): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return notificationServiceFirebase.createNotification(params)
    }
    // Supabase implementation if configured
    if (!isSupabaseConfigured() || params.recipientId === params.actorId) return

    try {
      await supabase.from('notifications').insert({
        recipient_id: params.recipientId,
        actor_id: params.actorId,
        type: params.type,
        resource_id: params.resourceId || null,
        resource_type: params.resourceType || null,
        is_read: false,
      })
    } catch (e) {
      console.warn('Could not insert Supabase notification:', e)
    }
  },

  async notifyMentionedUsers(params: {
    text?: string
    actorId: string
    resourceId?: string | null
    resourceType?: string
    explicitUserIds?: string[]
  }): Promise<void> {
    if (getBackendProvider() === 'firebase') {
      return notificationServiceFirebase.notifyMentionedUsers(params)
    }
  },
}
