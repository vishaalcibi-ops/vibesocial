import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Firestore Schema & Field Consistency Review', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules')
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8')

  it('enforces default-deny with no global wildcard read/write grants', () => {
    // Ensure no insecure match /{document=**} allow rules exist
    expect(rulesContent).not.toMatch(/match\s*\/\{document=\*\*\}[^}]*allow\s+read,\s*write/i)
    expect(rulesContent).not.toMatch(/match\s*\/\{document=\*\*\}[^}]*allow\s+write/i)
  })

  it('validates user profile fields and security rules in /users/{userId}', () => {
    expect(rulesContent).toContain('match /users/{userId}')
    // Field constraints on creation
    expect(rulesContent).toContain('request.resource.data.id == userId')
    expect(rulesContent).toContain('request.resource.data.username is string')
    expect(rulesContent).toContain('request.resource.data.username.size() >= 3')
    expect(rulesContent).toContain('request.resource.data.username.size() <= 30')
    expect(rulesContent).toContain('request.resource.data.is_verified == false')
    // Prevents self-verification privilege escalation on update
    expect(rulesContent).toContain('request.resource.data.is_verified == resource.data.is_verified')
    // Forbids profile deletion
    expect(rulesContent).toContain('allow delete: if false;')
  })

  it('validates followers and following subcollections prevent self-follow', () => {
    expect(rulesContent).toContain('match /followers/{followerId}')
    expect(rulesContent).toContain('allow create: if isOwner(followerId) && followerId != userId;')
    expect(rulesContent).toContain('allow delete: if isOwner(followerId);')

    expect(rulesContent).toContain('match /following/{followedId}')
    expect(rulesContent).toContain('allow create: if isOwner(userId) && userId != followedId;')
    expect(rulesContent).toContain('allow delete: if isOwner(userId);')
  })

  it('validates post creation rules prevent author spoofing and pre-set counters', () => {
    expect(rulesContent).toContain('match /posts/{postId}')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.likeCount == 0')
    expect(rulesContent).toContain('request.resource.data.commentCount == 0')
    expect(rulesContent).toContain('request.resource.data.caption.size() <= 2200')
    expect(rulesContent).toContain("request.resource.data.mediaType in ['text', 'image', 'video']")
  })

  it('validates post update rules enforce isValidPostCounterUpdate() for non-authors', () => {
    expect(rulesContent).toContain('function isValidPostCounterUpdate()')
    expect(rulesContent).toContain("diff.affectedKeys().hasOnly(['likeCount', 'commentCount', 'updatedAt'])")
    expect(rulesContent).toContain('request.resource.data.likeCount >= 0')
    expect(rulesContent).toContain('request.resource.data.commentCount >= 0')
    // Author can update post details but author ID and createdAt remain immutable
    expect(rulesContent).toContain('request.resource.data.authorId == resource.data.authorId')
    expect(rulesContent).toContain('request.resource.data.createdAt == resource.data.createdAt')
  })

  it('validates like ownership in /posts/{postId}/likes/{userId}', () => {
    expect(rulesContent).toContain('match /likes/{userId}')
    expect(rulesContent).toContain('allow create: if isOwner(userId) && request.resource.data.userId == userId;')
    expect(rulesContent).toContain('allow delete: if isOwner(userId);')
  })

  it('validates comment creation and deletion permissions in /posts/{postId}/comments/{commentId}', () => {
    expect(rulesContent).toContain('match /comments/{commentId}')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.content is string')
    expect(rulesContent).toContain('request.resource.data.content.size() > 0')
    expect(rulesContent).toContain('request.resource.data.content.size() <= 500')
    // Deletion allowed for comment author OR post author
    expect(rulesContent).toContain('resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('get(/databases/$(database)/documents/posts/$(postId)).data.authorId == request.auth.uid')
    // Editing comments is disallowed
    expect(rulesContent).toContain('allow update: if false;')
  })

  it('validates private conversations and message isolation in /conversations', () => {
    expect(rulesContent).toContain('match /conversations/{conversationId}')
    // Only conversation members can read or update
    expect(rulesContent).toContain('request.auth.uid in resource.data.memberIds')
    expect(rulesContent).toContain('request.auth.uid in request.resource.data.memberIds')
    expect(rulesContent).toContain('request.resource.data.memberIds.size() >= 2')
    // Cannot delete conversations
    expect(rulesContent).toContain('allow delete: if false;')

    // Messages subcollection
    expect(rulesContent).toContain('match /messages/{messageId}')
    expect(rulesContent).toContain('request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.memberIds')
    expect(rulesContent).toContain('request.resource.data.senderId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.textContent is string')
    expect(rulesContent).toContain('request.resource.data.textContent.size() <= 1000')
    expect(rulesContent).toContain('resource.data.senderId == request.auth.uid')
  })

  it('validates stories security rules and views subcollection permissions', () => {
    expect(rulesContent).toContain('match /stories/{storyId}')
    expect(rulesContent).toContain('allow read: if true;')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.mediaUrl is string')
    expect(rulesContent).toContain("request.resource.data.mediaType in ['image', 'video']")
    expect(rulesContent).toContain('allow delete: if isAuthenticated() && resource.data.authorId == request.auth.uid;')

    // Story views
    expect(rulesContent).toContain('match /views/{viewerId}')
    expect(rulesContent).toContain('allow read: if isAuthenticated();')
    expect(rulesContent).toContain('allow create, update: if isOwner(viewerId);')
  })

  it('validates reels security rules, counter updates, likes and comments permissions', () => {
    expect(rulesContent).toContain('match /reels/{reelId}')
    expect(rulesContent).toContain('allow read: if true;')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.videoUrl is string')
    expect(rulesContent).toContain('request.resource.data.likeCount == 0')
    expect(rulesContent).toContain('request.resource.data.commentCount == 0')
    expect(rulesContent).toContain('isValidReelCounterUpdate()')
    expect(rulesContent).toContain('allow delete: if isAuthenticated() && resource.data.authorId == request.auth.uid;')

    // Reel likes
    expect(rulesContent).toContain('match /likes/{userId}')
    expect(rulesContent).toContain('allow create, delete: if isOwner(userId);')

    // Reel comments
    expect(rulesContent).toContain('match /comments/{commentId}')
    expect(rulesContent).toContain('request.resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('request.resource.data.content is string')
    expect(rulesContent).toContain('request.resource.data.content.size() <= 500')
    expect(rulesContent).toContain('resource.data.authorId == request.auth.uid')
    expect(rulesContent).toContain('get(/databases/$(database)/documents/reels/$(reelId)).data.authorId == request.auth.uid')
  })
})

