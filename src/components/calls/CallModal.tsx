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
  X,
} from 'lucide-react'
import type { CallSession, Profile } from '../../types/database.types'
import { callService } from '../../services/callService'
import { useAuth } from '../../context/AuthContext'

interface CallModalProps {
  isOpen: boolean
  onClose: () => void
  targetUser?: Partial<Profile> | null
  existingCallSession?: CallSession | null
  initialMode?: 'voice' | 'video'
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  existingCallSession = null,
  initialMode = 'voice',
}) => {
  const { user: currentAuthUser, profile: currentAuthProfile } = useAuth()
  const isIncomingAttendee = Boolean(existingCallSession)

  const [mode, setMode] = useState<'voice' | 'video'>(
    existingCallSession?.type || initialMode
  )
  const [callStatus, setCallStatus] = useState<
    'dialing' | 'ringing' | 'connected' | 'declined' | 'ended'
  >(isIncomingAttendee ? 'connected' : 'dialing')
  const [activeCallId, setActiveCallId] = useState<string | null>(
    existingCallSession?.id || null
  )
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(
    (existingCallSession?.type || initialMode) === 'video'
  )
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringtoneOscRef = useRef<OscillatorNode | null>(null)
  const ringIntervalRef = useRef<number | null>(null)

  // Resolve display user info
  const displayUser = isIncomingAttendee
    ? {
        id: existingCallSession?.caller_id,
        full_name: existingCallSession?.caller_name || 'Caller',
        username: existingCallSession?.caller_username || 'user',
        avatar_url: existingCallSession?.caller_avatar_url || null,
      }
    : targetUser

  useEffect(() => {
    if (existingCallSession) {
      setMode(existingCallSession.type)
      setIsVideoEnabled(existingCallSession.type === 'video')
      setActiveCallId(existingCallSession.id)
      setCallStatus('connected')
    } else {
      setMode(initialMode)
      setIsVideoEnabled(initialMode === 'video')
    }
  }, [existingCallSession, initialMode])

  // Outgoing dial/ring tone synthesis
  const startOutgoingTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const playRingBeep = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return
        const osc = audioContextRef.current.createOscillator()
        const gain = audioContextRef.current.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, audioContextRef.current.currentTime)
        gain.gain.setValueAtTime(0.08, audioContextRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContextRef.current.currentTime + 1.2
        )
        osc.connect(gain)
        gain.connect(audioContextRef.current.destination)
        osc.start()
        osc.stop(audioContextRef.current.currentTime + 1.2)
      }

      playRingBeep()
      ringIntervalRef.current = window.setInterval(playRingBeep, 3000)
    } catch {}
  }

  const stopOutgoingTone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current)
      ringIntervalRef.current = null
    }
    if (ringtoneOscRef.current) {
      try {
        ringtoneOscRef.current.stop()
        ringtoneOscRef.current.disconnect()
      } catch {}
      ringtoneOscRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {})
      } catch {}
      audioContextRef.current = null
    }
  }

  // Camera stream management
  const startCamera = async (facing: 'user' | 'environment') => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true,
        })
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      }
    } catch (err) {
      console.warn('Camera/Mic permission warning:', err)
    }
  }

  // Call lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopOutgoingTone()
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
      }
      return
    }

    let isDisposed = false
    let unsubscribeCallListener: (() => void) | null = null

    if (isIncomingAttendee && existingCallSession) {
      // Receiver is attending the call
      setCallStatus('connected')
      setCallDuration(0)
      timerIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)

      if (existingCallSession.type === 'video') {
        startCamera(facingMode)
      }

      // Listen for when caller ends call
      unsubscribeCallListener = callService.listenToCall(
        existingCallSession.id,
        (updated) => {
          if (isDisposed) return
          if (updated.status === 'ended' || updated.status === 'declined') {
            setCallStatus('ended')
            setTimeout(() => onClose(), 1200)
          }
        }
      )
    } else if (targetUser && currentAuthUser) {
      // Outgoing Caller: Initiate call to target user
      setCallStatus('dialing')
      setCallDuration(0)
      startOutgoingTone()

      const currentProfile: Profile = currentAuthProfile || {
        id: currentAuthUser.id,
        username: currentAuthUser.user_metadata?.username || 'user',
        full_name: currentAuthUser.user_metadata?.full_name || 'Vibe User',
        avatar_url: currentAuthUser.user_metadata?.avatar_url || null,
        bio: '',
        website: '',
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      callService
        .initiateCall({
          caller: currentProfile,
          receiver: targetUser,
          type: mode,
        })
        .then((session) => {
          if (isDisposed) return
          setActiveCallId(session.id)
          setCallStatus('ringing')

          // Real-time listener for receiver answering or declining!
          unsubscribeCallListener = callService.listenToCall(
            session.id,
            (updated) => {
              if (isDisposed) return
              if (updated.status === 'accepted') {
                stopOutgoingTone()
                setCallStatus('connected')
                if (!timerIntervalRef.current) {
                  timerIntervalRef.current = window.setInterval(() => {
                    setCallDuration((prev) => prev + 1)
                  }, 1000)
                }
              } else if (updated.status === 'declined') {
                stopOutgoingTone()
                setCallStatus('declined')
                setTimeout(() => onClose(), 1500)
              } else if (updated.status === 'ended') {
                stopOutgoingTone()
                setCallStatus('ended')
                setTimeout(() => onClose(), 1200)
              }
            }
          )
        })
        .catch((err) => {
          console.warn('Call initiate error:', err)
          setCallStatus('ringing')
        })

      if (mode === 'video') {
        startCamera(facingMode)
      }
    }

    return () => {
      isDisposed = true
      stopOutgoingTone()
      if (unsubscribeCallListener) unsubscribeCallListener()
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
      }
    }
  }, [isOpen, isIncomingAttendee, existingCallSession?.id, targetUser?.id])

  if (!isOpen || (!displayUser && !existingCallSession)) return null

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleEndCall = async () => {
    stopOutgoingTone()
    setCallStatus('ended')
    if (activeCallId) {
      try {
        await callService.endCall(activeCallId)
      } catch {}
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    setTimeout(() => {
      onClose()
    }, 600)
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

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacing)
    if (mode === 'video') {
      startCamera(nextFacing)
    }
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 9998,
        backgroundColor: 'rgba(5, 5, 10, 0.95)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="call-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          height: mode === 'video' ? '82vh' : 'auto',
          minHeight: mode === 'video' ? '540px' : '480px',
          maxHeight: '740px',
          background: 'linear-gradient(180deg, #181824 0%, #0e0e16 100%)',
          borderRadius: '36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '32px 24px 28px',
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.9), 0 0 50px rgba(131, 58, 180, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background:
              mode === 'video'
                ? 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(225, 48, 108, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Controls */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#cbd5e1',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {mode === 'video' ? <Video size={13} style={{ color: '#38bdf8' }} /> : <Phone size={13} style={{ color: '#4ade80' }} />}
            <span style={{ fontWeight: 600 }}>
              {mode === 'video' ? 'Instagram Video' : 'Instagram Audio'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleEndCall}
            aria-label="Close"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Middle Main Content */}
        {mode === 'video' ? (
          /* VIDEO CALL VIEW */
          <div
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              margin: '20px 0',
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#0a0a0f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Main Remote User Simulated Stream / Waiting Card */}
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #161824 0%, #0d0e17 100%)',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  padding: '3px',
                  background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)',
                  marginBottom: '16px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                }}
              >
                <img
                  src={
                    displayUser?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.full_name || 'User')}&background=4f46e5&color=fff&size=200`
                  }
                  alt={displayUser?.full_name || 'User'}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {displayUser?.full_name || displayUser?.username}
              </h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px' }}>
                @{displayUser?.username}
              </p>

              {/* Status Pill */}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background:
                    callStatus === 'connected'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : callStatus === 'declined'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                  color:
                    callStatus === 'connected'
                      ? '#34d399'
                      : callStatus === 'declined'
                      ? '#f87171'
                      : '#e2e8f0',
                }}
              >
                {callStatus === 'dialing' && 'Connecting to user...'}
                {callStatus === 'ringing' && 'Ringing... 🔔'}
                {callStatus === 'connected' && `Connected • ${formatDuration(callDuration)}`}
                {callStatus === 'declined' && 'Call Declined'}
                {callStatus === 'ended' && 'Call Ended'}
              </div>
            </div>

            {/* Local Video Stream PIP Floating Thumbnail */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                width: '104px',
                height: '144px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                background: '#1a1a24',
                zIndex: 20,
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  display: isVideoEnabled ? 'block' : 'none',
                }}
              />
              {!isVideoEnabled && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1e1e2d',
                    color: '#94a3b8',
                    fontSize: '10px',
                    gap: '4px',
                  }}
                >
                  <VideoOff size={20} />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VOICE CALL VIEW */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              margin: '36px 0 28px',
            }}
          >
            {/* Animated Profile Picture */}
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
              {callStatus === 'connected' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-10px',
                    borderRadius: '50%',
                    border: '2px solid rgba(16, 185, 129, 0.6)',
                    animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
              )}
              {callStatus === 'ringing' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-10px',
                    borderRadius: '50%',
                    border: '2px solid rgba(225, 48, 108, 0.5)',
                    animation: 'ping 1.8s infinite',
                  }}
                />
              )}

              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  padding: '3px',
                  background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                }}
              >
                <img
                  src={
                    displayUser?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.full_name || 'User')}&background=4f46e5&color=fff&size=200`
                  }
                  alt={displayUser?.full_name || 'User'}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    background: '#121212',
                  }}
                />
              </div>
            </div>

            {/* User Name & Details */}
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 6px',
                textAlign: 'center',
              }}
            >
              {displayUser?.full_name || displayUser?.username}
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#94a3b8',
                margin: '0 0 20px',
                textAlign: 'center',
              }}
            >
              @{displayUser?.username}
            </p>

            {/* Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: 600,
                background:
                  callStatus === 'connected'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : callStatus === 'declined'
                    ? 'rgba(239, 68, 68, 0.18)'
                    : 'rgba(255, 255, 255, 0.08)',
                color:
                  callStatus === 'connected'
                    ? '#34d399'
                    : callStatus === 'declined'
                    ? '#f87171'
                    : '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {callStatus === 'connected' && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#34d399',
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              )}
              {callStatus === 'dialing' && 'Connecting...'}
              {callStatus === 'ringing' && 'Ringing... 🔔'}
              {callStatus === 'connected' && `Connected • ${formatDuration(callDuration)}`}
              {callStatus === 'declined' && 'Call Declined'}
              {callStatus === 'ended' && 'Call Ended'}
            </div>

            {/* Audio Wave Indicator when connected */}
            {callStatus === 'connected' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '24px',
                  marginTop: '20px',
                }}
              >
                {[12, 22, 16, 26, 14, 20, 10].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: `${h}px`,
                      borderRadius: '2px',
                      background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
                      animation: `pulse 0.8s ease-in-out infinite alternate ${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Call Controls Toolbar */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 10,
          }}
        >
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Video Toggle / Flip if in Video Mode */}
          {mode === 'video' ? (
            <>
              <button
                type="button"
                onClick={handleToggleVideo}
                aria-label={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: isVideoEnabled ? 'rgba(255, 255, 255, 0.1)' : '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
              <button
                type="button"
                onClick={handleFlipCamera}
                aria-label="Flip camera"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RefreshCw size={20} />
              </button>
            </>
          ) : (
            /* Speaker On/Off Button */
            <button
              type="button"
              onClick={() => setIsSpeakerOn((prev) => !prev)}
              aria-label={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: isSpeakerOn ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          )}

          {/* End Call Button (Big Red Circle) */}
          <button
            type="button"
            onClick={handleEndCall}
            aria-label="End Call"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
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
        </div>
      </div>
    </div>
  )
}
