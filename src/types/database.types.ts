export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  username: string
  full_name: string
  bio: string
  avatar_url: string | null
  website: string
  is_verified: boolean
  is_private?: boolean
  phone_number?: string
  last_seen?: string
  show_active_status?: boolean
  created_at: string
  updated_at: string
}

export interface LyricLine {
  time: number // in seconds
  text: string
}

export interface AudioTrack {
  id?: string
  title: string
  artist: string
  audio_url: string
  artwork_url?: string
  duration?: number
  spotify_url?: string
  spotify_id?: string
  source?: 'spotify' | 'apple'
  lyrics?: LyricLine[]
}

export interface InstagramNote {
  id: string
  user_id: string
  text: string
  audio_track?: AudioTrack | null
  clip_start?: number
  clip_duration?: number
  selected_lyrics?: string
  created_at: string
  expires_at: string
  author?: Profile
  is_close_friends?: boolean
  audience?: 'followers' | 'close_friends'
}

export interface Post {
  id: string
  author_id: string
  caption: string
  location: string | null
  location_lat?: number | null
  location_lng?: number | null
  visibility: 'public' | 'followers_only' | 'private' | 'close_friends'
  is_close_friends?: boolean
  is_archived?: boolean
  created_at: string
  updated_at: string
  audio_track?: AudioTrack | null
  // Joined fields
  author?: Profile
  media?: PostMedia[]
  likes_count?: number
  comments_count?: number
  is_liked_by_me?: boolean
  is_saved_by_me?: boolean
}

export interface PostMedia {
  id: string
  post_id: string
  storage_path: string
  media_type: 'image' | 'video'
  media_order: number
  width?: number | null
  height?: number | null
  duration_sec?: number | null
}

export interface PostLike {
  user_id: string
  post_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  author?: Profile
}

export interface SavedPost {
  user_id: string
  post_id: string
  created_at: string
  post?: Post
}

export interface Follow {
  follower_id: string
  followed_id: string
  created_at: string
}

export interface Story {
  id: string
  author_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string
  created_at: string
  expires_at: string
  author?: Profile
  viewed?: boolean
  is_close_friends?: boolean
  audio_track?: AudioTrack | null
  filter?: string | null
  text_overlay?: string | null
  stickers?: any[] | null
  is_ai_labeled?: boolean
  is_paid_partnership?: boolean
  likes_count?: number
  is_liked_by_me?: boolean
}

export interface StoryHighlight {
  id: string
  user_id: string
  title: string
  cover_url: string
  stories: Story[]
  created_at: string
}

export interface StoryLike {
  story_id: string
  user_id: string
  created_at: string
  user?: Profile
}

export interface StoryView {
  story_id: string
  viewer_id: string
  viewed_at: string
  viewer?: Profile
}

export interface ProfileViewRecord {
  id: string
  profile_id: string
  viewer_id: string
  viewed_at: string
  viewer?: Profile
}

export interface Reel {
  id: string
  author_id: string
  video_url: string
  caption: string
  audio_title: string
  duration_sec: number | null
  created_at: string
  author?: Profile
  likes_count?: number
  comments_count?: number
  is_liked_by_me?: boolean
}

export interface ReelLike {
  user_id: string
  reel_id: string
  created_at: string
}

export interface ReelComment {
  id: string
  reel_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface Conversation {
  id: string
  title: string | null
  is_group: boolean
  created_at: string
  updated_at: string
  members?: ConversationMember[]
  last_message?: Message
  unread_count?: number
}

export interface ConversationMember {
  conversation_id: string
  user_id: string
  role: 'member' | 'admin'
  joined_at: string
  last_read_at: string
  profile?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  text_content: string
  media_url: string | null
  media_type: string | null
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface Notification {
  id: string
  recipient_id: string
  actor_id: string
  type: 'follow' | 'like_post' | 'comment_post' | 'like_reel' | 'message' | 'follow_request' | 'follow_request_accepted' | 'like_story' | 'mention'
  resource_id: string | null
  resource_type: string | null
  is_read: boolean
  created_at: string
  actor?: Profile
}

export interface FollowRequest {
  id: string
  requester_id: string
  target_id: string
  created_at: string
  requester?: Profile
}

export interface Hashtag {
  id: string
  tag: string
  created_at: string
  post_count?: number
}

export interface CallSession {
  id: string
  caller_id: string
  caller_name: string
  caller_username: string
  caller_avatar_url: string | null
  receiver_id: string
  receiver_name: string
  receiver_username: string
  receiver_avatar_url: string | null
  type: 'voice' | 'video'
  status: 'dialing' | 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed'
  created_at: string
  answered_at?: string | null
  ended_at?: string | null
}
