import React, { useState, useEffect, useRef } from 'react'
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Smartphone,
  X,
  ExternalLink,
} from 'lucide-react'
import type { Profile } from '../../types/database.types'

interface CallModalProps {
  isOpen: boolean
  onClose: () => void
  targetUser: Partial<Profile> | null
  initialMode?: 'voice' | 'video'
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  initialMode = 'voice',
}) => {
  const [mode, setMode] = useState<'voice' | 'video'>(initialMode)
  const [callStatus, setCallStatus] = useState<'dialing' | 'ringing' | 'connected' | 'ended'>('dialing')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialMode === 'video')
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [customPhoneInput, setCustomPhoneInput] = useState(targetUser?.phone_number || '')
  const [showDirectPhonePrompt, setShowDirectPhonePrompt] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringtoneOscRef = useRef<OscillatorNode | null>(null)

  useEffect(() => {
    setMode(initialMode)
    setIsVideoEnabled(initialMode === 'video')
  }, [initialMode])

  useEffect(() => {
    if (targetUser?.phone_number) {
      setCustomPhoneInput(targetUser.phone_number)
    }
  }, [targetUser])

  // Synthesize realistic phone ringtone using Web Audio API
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime) // standard dialing tone

      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      ringtoneOscRef.current = osc
    } catch {
      // AudioContext policy fallback
    }
  }

  const stopRingtone = () => {
    try {
      if (ringtoneOscRef.current) {
        ringtoneOscRef.current.stop()
        ringtoneOscRef.current.disconnect()
        ringtoneOscRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    } catch {}
  }

  // Handle call lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopRingtone()
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
      }
      return
    }

    setCallStatus('dialing')
    setCallDuration(0)
    startRingtone()

    // Transition: Dialing -> Ringing (after 1.5s) -> Connected (after 4s)
    const ringTimeout = setTimeout(() => {
      setCallStatus('ringing')
    }, 1500)

    const connectTimeout = setTimeout(() => {
      stopRingtone()
      setCallStatus('connected')
      timerIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }, 4500)

    // Request camera if in video mode
    if (mode === 'video') {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
          }
        })
        .catch((err) => {
          console.warn('Camera/Mic permission unavailable:', err)
        })
    }

    return () => {
      clearTimeout(ringTimeout)
      clearTimeout(connectTimeout)
      stopRingtone()
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isOpen, mode])

  if (!isOpen || !targetUser) return null

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleEndCall = () => {
    stopRingtone()
    setCallStatus('ended')
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    setTimeout(() => {
      onClose()
    }, 800)
  }

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next
        })
      }
      return next
    })
  }

  const handleToggleVideo = () => {
    setIsVideoEnabled((prev) => {
      const next = !prev
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = next
        })
      }
      return next
    })
  }

  // Trigger real cellular phone call via native dialer
  const handleTriggerRealPhoneCall = (phoneToCall?: string) => {
    const rawNum = phoneToCall || customPhoneInput || targetUser.phone_number
    if (!rawNum) {
      setShowDirectPhonePrompt(true)
      return
    }
    const cleanNum = rawNum.replace(/[^0-9+]/g, '')
    // window.open('tel:...') triggers native phone dialer on Android and iOS
    window.location.href = `tel:${cleanNum}`
  }

  return (
    <div
      className="modal-backdrop"
      onClick={handleEndCall}
      style={{
        zIndex: 200,
        backgroundColor: 'rgba(5, 5, 5, 0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="call-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '82vh',
          maxHeight: '720px',
          background: 'linear-gradient(180deg, #1c1c1e 0%, #0d0d0e 100%)',
          borderRadius: '28px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '32px 24px 28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Top Bar: Mode Indicator & Close */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#f3f4f6',
            }}
          >
            {mode === 'video' ? <Video size={14} color="#ec4899" /> : <Phone size={14} color="#10b981" />}
            <span>{mode === 'video' ? 'Vibe Video Call' : 'Vibe Voice Call'}</span>
          </div>

          <button
            onClick={handleEndCall}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d1d5db',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Center Calling Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 10, width: '100%' }}>
          {/* Pulsing Avatar Frame */}
          <div style={{ position: 'relative' }}>
            {callStatus === 'ringing' || callStatus === 'dialing' ? (
              <div
                style={{
                  position: 'absolute',
                  inset: '-12px',
                  borderRadius: '50%',
                  border: '2px solid rgba(236, 72, 153, 0.5)',
                  animation: 'pulse 1.8s infinite',
                }}
              />
            ) : null}
            <img
              src={
                targetUser.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
              }
              alt={targetUser.username || 'User'}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            />
          </div>

          {/* Caller Details */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
              {targetUser.full_name || targetUser.username || 'VibeSocial User'}
            </h2>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 8px' }}>
              @{targetUser.username || 'user'}
            </p>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '12px',
                background: callStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: callStatus === 'connected' ? '#34d399' : '#e5e7eb',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {callStatus === 'dialing' && 'Connecting...'}
              {callStatus === 'ringing' && 'Ringing... 🔔'}
              {callStatus === 'connected' && `Connected • ${formatDuration(callDuration)}`}
              {callStatus === 'ended' && 'Call Ended'}
            </div>
          </div>

          {/* Direct Cellular Phone Call Button */}
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => handleTriggerRealPhoneCall()}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '16px',
                padding: '8px 16px',
                color: '#34d399',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Smartphone size={15} />
              <span>
                {targetUser.phone_number
                  ? `Dial Real Phone: ${targetUser.phone_number}`
                  : 'Dial Real Phone (SIM Cellular)'}
              </span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Video Preview (PIP box) if Video Mode */}
        {mode === 'video' && (
          <div
            style={{
              position: 'absolute',
              top: '80px',
              right: '20px',
              width: '90px',
              height: '130px',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#000',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
              zIndex: 25,
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!isVideoEnabled && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                }}
              >
                <VideoOff size={20} />
              </div>
            )}
          </div>
        )}

        {/* Direct Phone Number Input Sheet if missing */}
        {showDirectPhonePrompt && (
          <div
            style={{
              position: 'absolute',
              bottom: '100px',
              left: '20px',
              right: '20px',
              background: '#2c2c2e',
              borderRadius: '18px',
              padding: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              zIndex: 35,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Enter Mobile Number to Call</span>
              <button
                onClick={() => setShowDirectPhonePrompt(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={customPhoneInput}
                onChange={(e) => setCustomPhoneInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#1c1c1e',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <button
                type="button"
                onClick={() => handleTriggerRealPhoneCall(customPhoneInput)}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Call
              </button>
            </div>
          </div>
        )}

        {/* Bottom Call Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 10,
            width: '100%',
          }}
        >
          {/* Mute Mic Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Toggle Video (in video mode) */}
          {mode === 'video' ? (
            <button
              type="button"
              onClick={handleToggleVideo}
              aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: !isVideoEnabled ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
          ) : (
            /* Speaker Toggle (in voice mode) */
            <button
              type="button"
              onClick={() => setIsSpeakerOn((p) => !p)}
              aria-label={isSpeakerOn ? 'Turn speaker off' : 'Turn speaker on'}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: isSpeakerOn ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          )}

          {/* Switch Voice / Video Mode */}
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'voice' ? 'video' : 'voice'))}
            title={mode === 'voice' ? 'Switch to Video Call' : 'Switch to Voice Call'}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={20} />
          </button>

          {/* End Call Button (Big Red) */}
          <button
            type="button"
            onClick={handleEndCall}
            aria-label="End Call"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ef4444',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
              transform: 'scale(1.05)',
            }}
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  )
}
