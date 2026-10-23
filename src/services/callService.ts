import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase/firebaseConfig'
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

    // 2. Persist to Firestore if configured
    if (isFirebaseConfigured() && db) {
      try {
        const callRef = doc(db, 'calls', callId)
        await setDoc(callRef, newCall)
      } catch (err) {
        console.warn('Firestore call save fallback to local:', err)
      }
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

    // 1. BroadcastChannel listener
    const handleBroadcast = (event: MessageEvent) => {
      if (isDisposed) return
      const data = event.data
      if (
        data?.type === 'CALL_INITIATED' &&
        data.call?.receiver_id === currentUserId &&
        data.call?.status === 'ringing'
      ) {
        onIncoming(data.call)
      }
    }

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast)
      unsubs.push(() => broadcastChannel?.removeEventListener('message', handleBroadcast))
    }

    // 2. Storage event listener (multi-tab support)
    const handleStorage = (e: StorageEvent) => {
      if (isDisposed) return
      if (e.key === INCOMING_CALL_EVENT_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (
            parsed.call &&
            parsed.call.receiver_id === currentUserId &&
            parsed.call.status === 'ringing'
          ) {
            onIncoming(parsed.call)
          }
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
      unsubs.push(() => window.removeEventListener('storage', handleStorage))
    }

    // 3. Firestore onSnapshot listener
    if (isFirebaseConfigured() && db) {
      try {
        const q = query(
          collection(db, 'calls'),
          where('receiver_id', '==', currentUserId),
          where('status', '==', 'ringing')
        )
        const unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            if (isDisposed) return
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const call = change.doc.data() as CallSession
                if (call.status === 'ringing') {
                  onIncoming(call)
                }
              }
            })
          },
          (err) => {
            console.warn('Firestore listenForIncomingCalls notice:', err)
          }
        )
        unsubs.push(unsubFirestore)
      } catch (err) {
        console.warn('Failed to subscribe firestore incoming calls:', err)
      }
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
  listenToCall(callId: string, onUpdate: (call: CallSession) => void): () => void {
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

    // 3. Firestore document onSnapshot
    if (isFirebaseConfigured() && db) {
      try {
        const callRef = doc(db, 'calls', callId)
        const unsubFirestore = onSnapshot(
          callRef,
          (snap) => {
            if (isDisposed) return
            if (snap.exists()) {
              notifyUpdate(snap.data() as CallSession)
            }
          },
          (err) => {
            console.warn('Firestore call snapshot notice:', err)
          }
        )
        unsubs.push(unsubFirestore)
      } catch (err) {
        console.warn('Failed to subscribe firestore call session:', err)
      }
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
  async acceptCall(callId: string): Promise<void> {
    const answeredAt = new Date().toISOString()
    const updatePayload: Partial<CallSession> = {
      status: 'accepted',
      answered_at: answeredAt,
    }

    this._broadcastCallUpdate(callId, updatePayload)

    if (isFirebaseConfigured() && db) {
      try {
        const callRef = doc(db, 'calls', callId)
        await updateDoc(callRef, updatePayload)
      } catch (err) {
        console.warn('Firestore acceptCall error fallback:', err)
      }
    }
  },

  /**
   * Receiver declines the incoming call
   */
  async declineCall(callId: string): Promise<void> {
    const endedAt = new Date().toISOString()
    const updatePayload: Partial<CallSession> = {
      status: 'declined',
      ended_at: endedAt,
    }

    this._broadcastCallUpdate(callId, updatePayload)

    if (isFirebaseConfigured() && db) {
      try {
        const callRef = doc(db, 'calls', callId)
        await updateDoc(callRef, updatePayload)
      } catch (err) {
        console.warn('Firestore declineCall error fallback:', err)
      }
    }
  },

  /**
   * End the call from either caller or receiver
   */
  async endCall(callId: string): Promise<void> {
    const endedAt = new Date().toISOString()
    const updatePayload: Partial<CallSession> = {
      status: 'ended',
      ended_at: endedAt,
    }

    this._broadcastCallUpdate(callId, updatePayload)

    if (isFirebaseConfigured() && db) {
      try {
        const callRef = doc(db, 'calls', callId)
        await updateDoc(callRef, updatePayload)
      } catch (err) {
        console.warn('Firestore endCall error fallback:', err)
      }
    }
  },

  /**
   * Internal helper to update local and broadcast state
   */
  _broadcastCallUpdate(callId: string, partial: Partial<CallSession>) {
    try {
      const stored = safeStorage.getItem(`${CALL_STORAGE_KEY_PREFIX}${callId}`)
      let fullCall: CallSession
      if (stored) {
        fullCall = { ...JSON.parse(stored), ...partial }
      } else {
        fullCall = {
          id: callId,
          caller_id: '',
          caller_name: '',
          caller_username: '',
          caller_avatar_url: null,
          receiver_id: '',
          receiver_name: '',
          receiver_username: '',
          receiver_avatar_url: null,
          type: 'voice',
          status: 'ended',
          created_at: new Date().toISOString(),
          ...partial,
        } as CallSession
      }
      safeStorage.setItem(`${CALL_STORAGE_KEY_PREFIX}${callId}`, JSON.stringify(fullCall))
      safeStorage.setItem(
        CALL_UPDATE_EVENT_KEY,
        JSON.stringify({ timestamp: Date.now(), call: fullCall })
      )
      broadcastChannel?.postMessage({ type: 'CALL_UPDATED', call: fullCall })
    } catch {}
  },
}
