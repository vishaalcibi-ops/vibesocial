import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore'
import { db, auth, isFirebaseConfigured } from './firebase/firebaseConfig'
import type { CallSession, Profile } from '../types/database.types'

const CALL_STORAGE_KEY_PREFIX = 'vibesocial_call_'
const INCOMING_CALL_EVENT_KEY = 'vibesocial_incoming_call_signal'
const CALL_UPDATE_EVENT_KEY = 'vibesocial_call_update_signal'

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key)
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        return (globalThis as any).localStorage.getItem(key)
      }
    } catch {}
    return null
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val)
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(key, val)
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(key)
      }
    } catch {}
  },
}

let broadcastChannel: BroadcastChannel | null = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('vibesocial_calls_bus')
  }
} catch {
  // Ignore BroadcastChannel errors in environments without support
}

export const callService = {
  getStableConversationId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort()
    return `dm_${sorted[0]}_${sorted[1]}`
  },

  /**
   * Start an in-app voice or video call to another user
   */
  async initiateCall({
    caller,
    receiver,
    type,
  }: {
    caller: Profile
    receiver: Partial<Profile>
    type: 'voice' | 'video'
  }): Promise<CallSession> {
    if (!caller?.id || !receiver?.id) {
      throw new Error('Both caller and receiver are required to initiate a call.')
    }

    const conversationId = this.getStableConversationId(caller.id, receiver.id)
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newCall: CallSession = {
      id: callId,
      caller_id: caller.id,
      caller_name: caller.full_name || caller.username || 'User',
      caller_username: caller.username || 'user',
      caller_avatar_url: caller.avatar_url || null,
      receiver_id: receiver.id,
      receiver_name: receiver.full_name || receiver.username || 'User',
      receiver_username: receiver.username || 'user',
      receiver_avatar_url: receiver.avatar_url || null,
      type,
      status: 'ringing',
      created_at: new Date().toISOString(),
      answered_at: null,
      ended_at: null,
      conversation_id: conversationId,
    }

    // 1. Save locally for instant tab/window/fallback sync
    try {
      safeStorage.setItem(`${CALL_STORAGE_KEY_PREFIX}${callId}`, JSON.stringify(newCall))
      safeStorage.setItem(
        INCOMING_CALL_EVENT_KEY,
        JSON.stringify({ timestamp: Date.now(), call: newCall })
      )
    } catch {}

    // Broadcast across windows/tabs
    try {
      broadcastChannel?.postMessage({ type: 'CALL_INITIATED', call: newCall })
    } catch {}

    // 2. Real-Time Conversation Sync (Guaranteed permissions in Firestore)
    if (isFirebaseConfigured() && db) {
      const actorId = auth.currentUser?.uid || caller.id
      const timestamp = new Date().toISOString()

      // Primary Channel: Set activeCall on direct conversation
      try {
        const convRef = doc(db, 'conversations', conversationId)
        await setDoc(
          convRef,
          {
            memberIds: [caller.id, receiver.id],
            is_group: false,
            activeCall: newCall,
            updatedAt: timestamp,
          },
          { merge: true }
        )

        // Send call message in conversation thread
        const msgsRef = collection(db, 'conversations', conversationId, 'messages')
        await setDoc(doc(msgsRef), {
          conversationId,
          senderId: actorId,
          textContent: `[VIBE_CALL:${type}:${callId}:ringing]`,
          mediaUrl: null,
          mediaType: null,
          is_read: false,
          createdAt: timestamp,
        })
      } catch (convErr) {
        console.warn('Conversation calling channel notice:', convErr)
      }

      // Secondary Channel: Notifications subcollection
      try {
        const notifRef = doc(db, 'users', receiver.id, 'notifications', `incoming_call_${callId}`)
        await setDoc(notifRef, {
          id: `incoming_call_${callId}`,
          recipient_id: receiver.id,
          actor_id: actorId,
          type: 'call_incoming',
          resource_id: JSON.stringify(newCall),
          resource_type: type,
          is_read: false,
          created_at: timestamp,
        })
      } catch {}
    }

    return newCall
  },

  /**
   * Listen for incoming calls for a specific user (Receiver side)
   */
  listenForIncomingCalls(
    currentUserId: string,
    onIncoming: (call: CallSession) => void
  ): () => void {
    if (!currentUserId) return () => {}

    let isDisposed = false
    let unsubs: (() => void)[] = []
    const receivedCallIds = new Set<string>()

    const handleIncomingCall = (call: CallSession) => {
      if (isDisposed || !call?.id) return
      if (call.status !== 'ringing') return
      if (call.receiver_id !== currentUserId) return
      if (receivedCallIds.has(call.id)) return

      receivedCallIds.add(call.id)
      onIncoming(call)
    }

    // 1. BroadcastChannel listener (Instant local/browser tabs)
    const handleBroadcast = (event: MessageEvent) => {
      if (isDisposed) return
      const data = event.data
      if (data?.type === 'CALL_INITIATED' && data.call) {
        handleIncomingCall(data.call)
      }
    }

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast)
      unsubs.push(() => broadcastChannel?.removeEventListener('message', handleBroadcast))
    }

    // 2. Storage event listener (multi-tab / offline fallback)
    const handleStorage = (e: StorageEvent) => {
      if (isDisposed) return
      if (e.key === INCOMING_CALL_EVENT_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.call) {
            handleIncomingCall(parsed.call)
          }
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
      unsubs.push(() => window.removeEventListener('storage', handleStorage))
    }

    // 3. Primary Firestore Channel: Conversations query listener
    if (isFirebaseConfigured() && db) {
      try {
        const convsQuery = query(
          collection(db, 'conversations'),
          where('memberIds', 'array-contains', currentUserId)
        )
        const unsubConvs = onSnapshot(
          convsQuery,
          (snapshot) => {
            if (isDisposed) return
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data()
              if (
                data.activeCall &&
                data.activeCall.receiver_id === currentUserId &&
                data.activeCall.status === 'ringing'
              ) {
                handleIncomingCall(data.activeCall as CallSession)
              }
            })
          },
          (err) => {
            console.warn('Realtime conversations call listener notice:', err)
          }
        )
        unsubs.push(unsubConvs)
      } catch (err) {
        console.warn('Failed to subscribe firestore conversations call:', err)
      }

      // 4. Secondary Firestore Channel: Notifications subcollection listener
      try {
        const notifsRef = collection(db, 'users', currentUserId, 'notifications')
        const unsubNotifs = onSnapshot(
          notifsRef,
          (snap) => {
            if (isDisposed) return
            snap.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data()
                if (data.type === 'call_incoming' && data.resource_id) {
                  try {
                    const parsedCall = JSON.parse(data.resource_id) as CallSession
                    if (parsedCall.status === 'ringing') {
                      handleIncomingCall(parsedCall)
                    }
                  } catch {}
                }
              }
            })
          },
          () => {}
        )
        unsubs.push(unsubNotifs)
      } catch {}
    }

    return () => {
      isDisposed = true
      unsubs.forEach((unsub) => {
        try {
          unsub()
        } catch {}
      })
    }
  },

  /**
   * Listen for updates on a specific active call (Status changes: accepted, declined, ended)
   */
  listenToCall(
    callId: string,
    onUpdate: (call: CallSession) => void,
    conversationId?: string
  ): () => void {
    if (!callId) return () => {}

    let isDisposed = false
    let unsubs: (() => void)[] = []

    const notifyUpdate = (call: CallSession) => {
      if (isDisposed || !call) return
      onUpdate(call)
    }

    // 1. BroadcastChannel
    const handleBroadcast = (event: MessageEvent) => {
      if (isDisposed) return
      const data = event.data
      if (data?.call && data.call.id === callId) {
        notifyUpdate(data.call)
      }
    }

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast)
      unsubs.push(() => broadcastChannel?.removeEventListener('message', handleBroadcast))
    }

    // 2. Storage event
    const handleStorage = (e: StorageEvent) => {
      if (isDisposed) return
      if (e.key === CALL_UPDATE_EVENT_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.call && parsed.call.id === callId) {
            notifyUpdate(parsed.call)
          }
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
      unsubs.push(() => window.removeEventListener('storage', handleStorage))
    }

    // 3. Conversation listener
    const stored = this.getStoredCall(callId)
    const convId = conversationId || stored?.conversation_id
    if (convId && isFirebaseConfigured() && db) {
      try {
        const convRef = doc(db, 'conversations', convId)
        const unsubConv = onSnapshot(
          convRef,
          (snap) => {
            if (isDisposed) return
            if (snap.exists()) {
              const data = snap.data()
              if (data.activeCall && data.activeCall.id === callId) {
                notifyUpdate(data.activeCall as CallSession)
              } else if (!data.activeCall && (stored?.status === 'accepted' || data.updatedAt)) {
                notifyUpdate({ ...(stored || {} as any), id: callId, status: 'ended' })
              }
            }
          },
          (err) => {
            console.warn('listenToCall snapshot error:', err)
          }
        )
        unsubs.push(unsubConv)
      } catch {}
    }

    return () => {
      isDisposed = true
      unsubs.forEach((unsub) => {
        try {
          unsub()
        } catch {}
      })
    }
  },

  /**
   * Receiver accepts the incoming call
   */
  async acceptCall(callId: string, session?: CallSession): Promise<void> {
    const answeredAt = new Date().toISOString()
    const stored = session || this.getStoredCall(callId)
    const updatedCall: CallSession = {
      ...(stored || {
        id: callId,
        caller_id: '',
        caller_name: 'Caller',
        caller_username: 'user',
        caller_avatar_url: null,
        receiver_id: '',
        receiver_name: 'Receiver',
        receiver_username: 'user',
        receiver_avatar_url: null,
        type: 'voice',
        created_at: new Date().toISOString(),
      }),
      status: 'accepted',
      answered_at: answeredAt,
    }

    this._broadcastCallUpdate(callId, updatedCall)

    if (isFirebaseConfigured() && db) {
      const actorId = auth.currentUser?.uid || updatedCall.receiver_id
      const convId = updatedCall.conversation_id || this.getStableConversationId(updatedCall.caller_id, updatedCall.receiver_id)

      // 1. Update activeCall on direct conversation
      try {
        const convRef = doc(db, 'conversations', convId)
        await setDoc(
          convRef,
          {
            activeCall: updatedCall,
            updatedAt: answeredAt,
          },
          { merge: true }
        )

        // Send accepted message in conversation
        const msgsRef = collection(db, 'conversations', convId, 'messages')
        await setDoc(doc(msgsRef), {
          conversationId: convId,
          senderId: actorId,
          textContent: `[VIBE_CALL:${updatedCall.type}:${callId}:accepted]`,
          mediaUrl: null,
          mediaType: null,
          is_read: false,
          createdAt: answeredAt,
        })
      } catch (err) {
        console.warn('Accept call conversation sync error:', err)
      }

      // 2. Remove incoming notification from receiver's subcollection
      if (updatedCall.receiver_id) {
        try {
          const myNotifRef = doc(
            db,
            'users',
            updatedCall.receiver_id,
            'notifications',
            `incoming_call_${callId}`
          )
          await deleteDoc(myNotifRef)
        } catch {}
      }
    }
  },

  /**
   * Receiver declines the incoming call
   */
  async declineCall(callId: string, session?: CallSession): Promise<void> {
    const endedAt = new Date().toISOString()
    const stored = session || this.getStoredCall(callId)
    const updatedCall: CallSession = {
      ...(stored || {
        id: callId,
        caller_id: '',
        caller_name: 'Caller',
        caller_username: 'user',
        caller_avatar_url: null,
        receiver_id: '',
        receiver_name: 'Receiver',
        receiver_username: 'user',
        receiver_avatar_url: null,
        type: 'voice',
        created_at: new Date().toISOString(),
      }),
      status: 'declined',
      ended_at: endedAt,
    }

    this._broadcastCallUpdate(callId, updatedCall)

    if (isFirebaseConfigured() && db) {
      const actorId = auth.currentUser?.uid || updatedCall.receiver_id
      const convId = updatedCall.conversation_id || this.getStableConversationId(updatedCall.caller_id, updatedCall.receiver_id)

      try {
        const convRef = doc(db, 'conversations', convId)
        await setDoc(
          convRef,
          {
            activeCall: updatedCall,
            updatedAt: endedAt,
          },
          { merge: true }
        )

        const msgsRef = collection(db, 'conversations', convId, 'messages')
        await setDoc(doc(msgsRef), {
          conversationId: convId,
          senderId: actorId,
          textContent: `[VIBE_CALL:${updatedCall.type}:${callId}:declined]`,
          mediaUrl: null,
          mediaType: null,
          is_read: false,
          createdAt: endedAt,
        })
      } catch {}

      if (updatedCall.receiver_id) {
        try {
          const myNotifRef = doc(
            db,
            'users',
            updatedCall.receiver_id,
            'notifications',
            `incoming_call_${callId}`
          )
          await deleteDoc(myNotifRef)
        } catch {}
      }
    }
  },

  /**
   * End the call from either caller or receiver
   */
  async endCall(callId: string, session?: CallSession): Promise<void> {
    const endedAt = new Date().toISOString()
    const stored = session || this.getStoredCall(callId)
    const updatedCall: CallSession = {
      ...(stored || {
        id: callId,
        caller_id: '',
        caller_name: 'Caller',
        caller_username: 'user',
        caller_avatar_url: null,
        receiver_id: '',
        receiver_name: 'Receiver',
        receiver_username: 'user',
        receiver_avatar_url: null,
        type: 'voice',
        created_at: new Date().toISOString(),
      }),
      status: 'ended',
      ended_at: endedAt,
    }

    this._broadcastCallUpdate(callId, updatedCall)

    if (isFirebaseConfigured() && db) {
      const actorId = auth.currentUser?.uid || updatedCall.caller_id || updatedCall.receiver_id
      const convId = updatedCall.conversation_id || this.getStableConversationId(updatedCall.caller_id, updatedCall.receiver_id)

      try {
        const convRef = doc(db, 'conversations', convId)
        await setDoc(
          convRef,
          {
            activeCall: null,
            webrtcOffer: null,
            webrtcAnswer: null,
            callerCandidates: null,
            receiverCandidates: null,
            updatedAt: endedAt,
          },
          { merge: true }
        )

        const msgsRef = collection(db, 'conversations', convId, 'messages')
        await setDoc(doc(msgsRef), {
          conversationId: convId,
          senderId: actorId,
          textContent: `[VIBE_CALL:${updatedCall.type}:${callId}:ended]`,
          mediaUrl: null,
          mediaType: null,
          is_read: false,
          createdAt: endedAt,
        })
      } catch {}
    }
  },

  /**
   * Send WebRTC SDP Offer
   */
  async sendWebRtcOffer(conversationId: string, offer: any) {
    if (!conversationId || !isFirebaseConfigured() || !db) return
    try {
      const convRef = doc(db, 'conversations', conversationId)
      await setDoc(
        convRef,
        {
          webrtcOffer: offer,
          callerCandidates: [],
          receiverCandidates: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch {}
  },

  /**
   * Send WebRTC SDP Answer
   */
  async sendWebRtcAnswer(conversationId: string, answer: any) {
    if (!conversationId || !isFirebaseConfigured() || !db) return
    try {
      const convRef = doc(db, 'conversations', conversationId)
      await setDoc(
        convRef,
        {
          webrtcAnswer: answer,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch {}
  },

  /**
   * Send ICE Candidate
   */
  async sendIceCandidate(conversationId: string, role: 'caller' | 'receiver', candidate: any) {
    if (!conversationId || !isFirebaseConfigured() || !db) return
    try {
      const convRef = doc(db, 'conversations', conversationId)
      const field = role === 'caller' ? 'callerCandidates' : 'receiverCandidates'
      const candJson = JSON.stringify(candidate)
      await setDoc(
        convRef,
        {
          [field]: arrayUnion(candJson),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch {}
  },

  /**
   * Subscribe to WebRTC conversation signals
   */
  subscribeWebRtcSignals(conversationId: string, onSignal: (data: any) => void): () => void {
    if (!conversationId || !isFirebaseConfigured() || !db) return () => {}
    const convRef = doc(db, 'conversations', conversationId)
    const unsub = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        onSignal(snap.data())
      }
    })
    return unsub
  },

  /**
   * Retrieve cached call from safeStorage
   */
  getStoredCall(callId: string): CallSession | null {
    try {
      const stored = safeStorage.getItem(`${CALL_STORAGE_KEY_PREFIX}${callId}`)
      if (stored) {
        return JSON.parse(stored) as CallSession
      }
    } catch {}
    return null
  },

  /**
   * Internal helper to update local and broadcast state
   */
  _broadcastCallUpdate(callId: string, fullCall: CallSession) {
    try {
      safeStorage.setItem(`${CALL_STORAGE_KEY_PREFIX}${callId}`, JSON.stringify(fullCall))
      safeStorage.setItem(
        CALL_UPDATE_EVENT_KEY,
        JSON.stringify({ timestamp: Date.now(), call: fullCall })
      )
      broadcastChannel?.postMessage({ type: 'CALL_UPDATED', call: fullCall })
    } catch {}
  },
}
