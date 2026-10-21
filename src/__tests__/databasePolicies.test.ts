import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('PostgreSQL Schema & Security Policies Verification', () => {
  const schemaPath = path.resolve(__dirname, '../../supabase/migrations/20261015000000_vibesocial_schema.sql')
  const storagePath = path.resolve(__dirname, '../../supabase/migrations/20261015000001_storage_setup.sql')

  it('contains the primary SQL migration file', () => {
    expect(fs.existsSync(schemaPath)).toBe(true)
    const sql = fs.readFileSync(schemaPath, 'utf8')

    // Verify all required tables are declared
    const requiredTables = [
      'profiles',
      'posts',
      'post_media',
      'follows',
      'post_likes',
      'comments',
      'saved_posts',
      'stories',
      'story_views',
      'reels',
      'reel_likes',
      'conversations',
      'conversation_members',
      'messages',
      'notifications',
      'hashtags',
      'post_hashtags',
    ]

    for (const table of requiredTables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`)
    }

    // Verify Row Level Security is enabled on every table
    for (const table of requiredTables) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`)
    }

    // Verify Self-Follow Prevention
    expect(sql).toContain('CONSTRAINT prevent_self_follow CHECK (follower_id != followed_id)')

    // Verify Auth user creation trigger
    expect(sql).toContain('CREATE TRIGGER on_auth_user_created')

    // Verify Realtime publication setup
    expect(sql).toContain('supabase_realtime')
  })

  it('contains the Supabase Storage migration file with required buckets and policies', () => {
    expect(fs.existsSync(storagePath)).toBe(true)
    const storageSql = fs.readFileSync(storagePath, 'utf8')

    // Verify buckets
    expect(storageSql).toContain("'posts'")
    expect(storageSql).toContain("'avatars'")
    expect(storageSql).toContain("'stories'")
    expect(storageSql).toContain("'reels'")
    expect(storageSql).toContain("'messages'")

    // Verify RLS policies on storage.objects
    expect(storageSql).toContain('CREATE POLICY "Public can view post media"')
    expect(storageSql).toContain('CREATE POLICY "Conversation members can view message media"')
  })
})
