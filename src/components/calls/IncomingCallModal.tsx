import React, { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import type { CallSession } from '../../types/database.types'
import { callService } from '../../services/callService'

interface IncomingCallModalProps {
  call: CallSession | null
  onAccept: (call: CallSession) => void
  onDecline: (call: CallSession) => void
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringtoneIntervalRef = useRef<number | null>(null)

  // Play repeating melodic Instagram incoming ringtone
  const startIncomingRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const playMelodyNote = (freq: number, startTime: number, duration: number) => {
        if (!ctx || ctx.state === 'closed') return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)

        gain.gain.setValueAtTime(0.12, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      // Instagram-style double chime motif: (E5 -> G#5 -> B5)
      const playTonePattern = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return
        const now = audioContextRef.current.currentTime
        playMelodyNote(659.25, now, 0.2) // E5
        playMelodyNote(830.61, now + 0.18, 0.2) // G#5
        playMelodyNote(987.77, now + 0.36, 0.35) // B5

        playMelodyNote(659.25, now + 0.7, 0.2)
        playMelodyNote(987.77, now + 0.88, 0.4)
      }

      playTonePattern()
      ringtoneIntervalRef.current = window.setInterval(playTonePattern, 2400)

      // Device vibration on mobile
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.([400, 200, 400, 200, 600])
        } catch {}
      }
    } catch {}
  }

  const stopIncomingRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current)
      ringtoneIntervalRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {})
      } catch {}
      audioContextRef.current = null
    }
  }

  useEffect(() => {
    if (call) {
      startIncomingRingtone()
    } else {
      stopIncomingRingtone()
    }
    return () => {
      stopIncomingRingtone()
    }
  }, [call?.id])

  if (!call) return null

  const handleAccept = async () => {
    stopIncomingRingtone()
    try {
      await callService.acceptCall(call.id)
    } catch {}
    onAccept(call)
  }

  const handleDecline = async () => {
    stopIncomingRingtone()
    try {
      await callService.declineCall(call.id)
    } catch {}
    onDecline(call)
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(5, 5, 10, 0.94)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        className="incoming-call-card"
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'linear-gradient(180deg, rgba(30, 30, 45, 0.85) 0%, rgba(15, 15, 25, 0.95) 100%)',
          borderRadius: '32px',
          padding: '36px 24px 32px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(131, 58, 180, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(225, 48, 108, 0.25) 0%, rgba(131, 58, 180, 0.15) 50%, transparent 75%)',
            pointerEvents: 'none',
          }}
        />

        {/* Call Type Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#e2e8f0',
            letterSpacing: '0.3px',
            marginBottom: '24px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {call.type === 'video' ? (
            <Video size={14} style={{ color: '#38bdf8' }} />
          ) : (
            <Phone size={14} style={{ color: '#4ade80' }} />
          )}
          <span>Incoming {call.type === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Pulsing Avatar Container */}
        <div
          style={{
            position: 'relative',
            width: '128px',
            height: '128px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Animated Wave Rings */}
          <div
            style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '50%',
              border: '2px solid rgba(225, 48, 108, 0.6)',
              animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
              padding: '3px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#121212',
              }}
            />
          </div>

          <img
            src={
              call.caller_avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(call.caller_name || 'User')}&background=4f46e5&color=fff&size=200`
            }
            alt={call.caller_name}
            style={{
              width: '112px',
              height: '112px',
              borderRadius: '50%',
              objectFit: 'cover',
              position: 'relative',
              zIndex: 2,
              border: '3px solid #1a1a24',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>

        {/* Caller Info */}
        <h3
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 6px',
            letterSpacing: '-0.3px',
          }}
        >
          {call.caller_name || call.caller_username}
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.65)',
            margin: '0 0 16px',
          }}
        >
          @{call.caller_username}
        </p>

        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#38bdf8',
            margin: '0 0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#38bdf8',
              display: 'inline-block',
              animation: 'pulse 1.5s infinite',
            }}
          />
          Ringing...
        </p>

        {/* Action Controls: Decline (Red) and Accept (Green) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 16px',
          }}
        >
          {/* Decline Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDecline}
              aria-label="Decline Call"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.45)',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <PhoneOff size={28} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f87171' }}>Decline</span>
          </div>

          {/* Accept Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleAccept}
              aria-label="Accept Call"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.45)',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {call.type === 'video' ? <Video size={28} /> : <Phone size={28} />}
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>Accept</span>
          </div>
        </div>
      </div>
    </div>
  )
}
