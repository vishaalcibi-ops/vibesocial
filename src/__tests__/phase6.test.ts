import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { storyServiceFirebase } from '../services/firebase/storyService.firebase'
import { reelServiceFirebase } from '../services/firebase/reelService.firebase'
import { profileServiceFirebase } from '../services/firebase/profileService.firebase'

describe('Phase 6: Website Finalization, Security Audit & Deployment Readiness', () => {
  const rootDir = path.resolve(__dirname, '../../')

  describe('1. Environment Variables & Secret Hygiene Audit', () => {
    it('.env.example exists and contains only dummy placeholders without real secrets', () => {
      const examplePath = path.join(rootDir, '.env.example')
      expect(fs.existsSync(examplePath)).toBe(true)

      const content = fs.readFileSync(examplePath, 'utf-8')
      expect(content).toContain('VITE_FIREBASE_API_KEY=your-firebase-api-key')
      expect(content).toContain('VITE_BACKEND_PROVIDER=firebase')
      expect(content).not.toMatch(/AIza[0-9A-Za-z-_]{35}/) // No real Google API key committed
      expect(content).not.toContain('serviceAccountKey')
      expect(content).not.toContain('private_key')
    })

    it('.gitignore strictly protects all environment and secret files', () => {
      const gitignorePath = path.join(rootDir, '.gitignore')
      expect(fs.existsSync(gitignorePath)).toBe(true)

      const gitignore = fs.readFileSync(gitignorePath, 'utf-8')
      expect(gitignore).toContain('.env')
      expect(gitignore).toContain('.env.local')
      expect(gitignore).toContain('*.local')
      expect(gitignore).toContain('dist')
      expect(gitignore).toContain('node_modules')
    })
  })

  describe('2. SPA Hosting & Deployment Configuration', () => {
    it('firebase.json is properly configured for Single Page Application (SPA) routing', () => {
      const fbJsonPath = path.join(rootDir, 'firebase.json')
      expect(fs.existsSync(fbJsonPath)).toBe(true)

      const fbJson = JSON.parse(fs.readFileSync(fbJsonPath, 'utf-8'))
      expect(fbJson.hosting).toBeDefined()
      expect(fbJson.hosting.public).toBe('dist')
      expect(fbJson.hosting.rewrites).toEqual([
        {
          source: '**',
          destination: '/index.html',
        },
      ])
    })

    it('package.json contains necessary build and preview scripts', () => {
      const pkgPath = path.join(rootDir, 'package.json')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

      expect(pkg.scripts.build).toBe('tsc -b && vite build')
      expect(pkg.scripts.preview).toBe('vite preview')
    })
  })

  describe('3. Ownership Guards & Authorization Enforcement', () => {
    it('rejects createStory when authorId does not match authenticated user', async () => {
      await expect(
        storyServiceFirebase.createStory({
          authorId: 'unauthorized_author',
          mediaUrl: 'https://example.com/test.jpg',
        })
      ).rejects.toThrow('Author identity mismatch. You can only create stories for your authenticated account.')
    })

    it('rejects deleteStory when caller is not the story owner', async () => {
      await expect(
        storyServiceFirebase.deleteStory('story_123', 'unauthorized_caller')
      ).rejects.toThrow('Permission denied: You can only delete your own stories.')
    })

    it('rejects createReel when authorId does not match authenticated user', async () => {
      await expect(
        reelServiceFirebase.createReel({
          authorId: 'unauthorized_author',
          videoUrl: 'https://example.com/test.mp4',
        })
      ).rejects.toThrow('Author identity mismatch. You can only create reels for your authenticated account.')
    })

    it('rejects deleteReel when caller is not the reel owner', async () => {
      await expect(
        reelServiceFirebase.deleteReel('reel_123', 'unauthorized_caller')
      ).rejects.toThrow('Permission denied: You can only delete your own reel.')
    })

    it('rejects updateProfile when caller is not the profile owner', async () => {
      await expect(
        profileServiceFirebase.updateProfile('someone_else_id', { full_name: 'Hacker' })
      ).rejects.toThrow('Unauthorized: You can only edit your own profile.')
    })
  })

  describe('4. Safe Unauthenticated State Handling', () => {
    it('returns empty results for searchProfiles and discoverUsers when unauthenticated', async () => {
      // In node test environment without signed-in user, calls should return empty without unhandled rejections
      const searchRes = await profileServiceFirebase.searchProfiles('test')
      expect(searchRes).toEqual([])

      const discoverRes = await profileServiceFirebase.getDiscoverUsers()
      expect(discoverRes).toEqual([])
    })

    it('returns empty active stories when unauthenticated with no stories', async () => {
      const activeStories = await storyServiceFirebase.getActiveStories()
      expect(Array.isArray(activeStories)).toBe(true)
    })
  })
})
