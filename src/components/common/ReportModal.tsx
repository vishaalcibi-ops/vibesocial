import React, { useState } from 'react'
import { X, AlertCircle, CheckCircle2, Flag } from 'lucide-react'
import { postService } from '../../services/postService'
import { useAuth } from '../../context/AuthContext'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetId: string
  targetType: 'post' | 'user' | 'reel'
  targetTitle?: string
}

const REPORT_REASONS = [
  "It's spam or deceptive",
  'Hate speech or harassment',
  'Violence or dangerous content',
  'Nudity or sexual activity',
  'False information or scam',
  'Intellectual property violation',
  'I just dislike this content',
]

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetTitle,
}) => {
  const { user } = useAuth()
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setErrorMsg('You must be signed in to submit a report.')
      return
    }
    if (!selectedReason) {
      setErrorMsg('Please select a reason for the report.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      await postService.reportContent(user.id, targetId, targetType, selectedReason, details)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Report submission failed:', err)
      setErrorMsg(err?.message || 'Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flag size={18} color="var(--color-pink)" />
            <span id="report-modal-title" style={{ fontWeight: 700 }}>
              Report {targetType}
            </span>
          </div>
          <button onClick={onClose} className="action-btn" aria-label="Close report modal">
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Report Received</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '24px' }}>
              Thank you for letting us know. We take safety seriously and will review this content against VibeSocial Community Guidelines.
            </p>
            <button
              className="btn-primary"
              onClick={onClose}
              style={{ width: '100%', padding: '10px 0' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {targetTitle && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                Target: {targetTitle}
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ef4444',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Why are you reporting this {targetType}?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: selectedReason === reason ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                    border: selectedReason === reason ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    style={{ accentColor: 'var(--color-pink)' }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label htmlFor="report-details" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Additional information (optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide additional context to help our moderators..."
                rows={2}
                maxLength={500}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !selectedReason}
                style={{ flex: 1 }}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
