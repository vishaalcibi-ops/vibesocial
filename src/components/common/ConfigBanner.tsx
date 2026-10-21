import React, { useState } from 'react'
import { isSupabaseConfigured, saveRuntimeSupabaseConfig } from '../../services/supabase'
import { isFirebaseConfigured, saveRuntimeFirebaseConfig } from '../../services/firebase/firebaseConfig'
import { getBackendProvider } from '../../services/backendConfig'
import { Database, Key, Sparkles, CheckCircle2, Copy, Flame, ShieldAlert } from 'lucide-react'

export const ConfigBanner: React.FC = () => {
  const provider = getBackendProvider()
  const isConfigured = provider === 'firebase' ? isFirebaseConfigured() : isSupabaseConfigured()

  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [fbApiKey, setFbApiKey] = useState('')
  const [fbAppId, setFbAppId] = useState('')
  const [copied, setCopied] = useState(false)

  if (isConfigured) return null

  const handleSupabaseSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim() && key.trim()) {
      saveRuntimeSupabaseConfig(url, key)
    }
  }

  const handleFirebaseSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (fbApiKey.trim() && fbAppId.trim()) {
      saveRuntimeFirebaseConfig(fbApiKey, fbAppId)
    }
  }

  const copyMigrationPath = () => {
    navigator.clipboard.writeText('supabase/migrations/20261015000000_vibesocial_schema.sql')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (provider === 'firebase') {
    return (
      <div className="config-banner">
        <div className="config-banner-title">
          <Flame size={22} color="#f59e0b" />
          <span>VibeSocial Setup — Firebase (vibesocial-app-906a8)</span>
        </div>
        <p className="config-banner-desc">
          Your project is set to use <strong>Firebase (Spark Free Plan)</strong>. To activate live authentication and
          Firestore user profiles, enter your Firebase Web App credentials below (or add them to <code>.env.local</code>).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <ShieldAlert size={14} color="#38bdf8" />
          <span>Spark Plan Safe: Cloud Storage is disabled to guarantee zero billing and stay 100% free.</span>
        </div>

        <form onSubmit={handleFirebaseSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                <Key size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Firebase Web API Key (AIzaSy...)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={fbApiKey}
                onChange={(e) => setFbApiKey(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                <Flame size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Firebase Web App ID (1:1234...:web:...)
              </label>
              <input
                type="text"
                placeholder="1:123456789012:web:abcdef1234567890"
                value={fbAppId}
                onChange={(e) => setFbAppId(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button type="submit" className="btn-primary">
              Connect Firebase
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Credentials are saved in your browser localStorage or your <code>.env.local</code>.
            </span>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="config-banner">
      <div className="config-banner-title">
        <Sparkles size={22} className="verified-icon" />
        <span>VibeSocial Setup — Supabase Database Connection</span>
      </div>
      <p className="config-banner-desc">
        To activate real authentication, PostgreSQL queries, media storage, and Realtime messaging, enter your Supabase Project URL and Publishable / Anon Key below. Alternatively, configure them in your local <code>.env.local</code>.
      </p>

      <form onSubmit={handleSupabaseSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <Database size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <Key size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Publishable / Anon Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
          <button type="submit" className="btn-primary">
            Connect Supabase
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={copyMigrationPath}
            title="Click to copy migration path"
          >
            {copied ? <CheckCircle2 size={15} color="#22c55e" /> : <Copy size={15} />}
            {copied ? 'Migration Path Copied!' : 'Copy SQL Migration File Path'}
          </button>
        </div>
      </form>
    </div>
  )
}
