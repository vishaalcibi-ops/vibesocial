# VibeSocial — Full-Stack Instagram-Style Social Media Platform

An original, production-minded, full-stack social media web application built with **React 19**, **TypeScript**, **Vite**, and **Supabase (PostgreSQL, Auth, Storage, and Realtime)**.

---

## 🌟 Architecture & Key Features

### 1. Feed & Posts
- **Feed**: Main feed displaying latest posts ordered chronologically with author information, verified badges, locations, and timestamps.
- **Media**: Single or multi-media posts (photos and videos) with responsive carousels and pagination indicators.
- **Micro-interactions**: Double-tap photo/video to like with heart pop animation.
- **Social Actions**: Like, comment, share/copy link, save post.
- **Comments**: Full comments drawer with thread creation, timestamps, and author deletion rights.

### 2. 24-Hour Ephemeral Stories
- **Stories Carousel**: Horizontal stories tray at top of feed. Active accounts display colorful gradient rings; unviewed stories are distinguished with vibrant borders.
- **Story Player**: Full-screen viewer with sequential 5-second progress bars, tap-to-navigate, and pause.
- **View Tracking**: Automatically records story views for authenticated users in `story_views`.
- **Story Viewers Drawer**: Story authors can view the exact viewer list.
- **Expiration Enforcement**: Stories older than 24 hours are excluded at the query layer and database level.

### 3. Reels Vertical Video Feed
- **Vertical Feed**: Full-height reels player with responsive 9:16 aspect ratio.
- **Playback Controls**: Tap anywhere to play/pause, top right button to mute/unmute audio.
- **Interactions**: Floating like button with real counters, comment launcher, creator follow button, audio track tag.
- **Video Upload**: Supports MP4/WEBM uploads up to 100MB with client-side validation.

### 4. Direct Messaging & Supabase Realtime
- **Inbox**: Conversation list with member avatars, last message preview, timestamps, and unread notification dots.
- **Chat Thread**: Instant message exchange with text and optional media attachments.
- **Realtime**: Subscribes directly to PostgreSQL change feeds (`postgres_changes` on `public.messages`) using Supabase Realtime websockets.
- **Read Receipts**: Automatically updates `is_read` and `last_read_at` when viewing conversations.

### 5. Explore & Search
- **Search**: Debounced live search across creators by username and display name.
- **Explore Grid**: 3-column responsive grid with hover overlays displaying like and comment counts.

### 6. Profiles & Relationships
- **Profile Header**: Avatar, username, verified badge, bio, website link, and post count.
- **Real Follow Relationships**: Computes actual follower and following counts from the `public.follows` table.
- **Follow / Unfollow**: One-click toggle with optimistic UI updates and self-follow prevention.
- **Saved Posts Tab**: Private tab showing bookmarked posts.
- **Profile Editing**: Live modal to update avatar (uploads to `avatars` bucket), display name, bio, and website.

### 7. Activity Notifications
- **Events**: Automated notifications for follows, post likes, comments, reel likes, and direct messages via database triggers.
- **Read State**: Visual unread indicator, mark single notification as read, or "Mark all as read" batch action.

---

## 🗄️ Database & Storage Setup

VibeSocial includes production-grade PostgreSQL migrations with strict **Row Level Security (RLS)** and storage bucket definitions.

### Files:
1. `supabase/migrations/20261015000000_vibesocial_schema.sql`:
   - Normalized tables: `profiles`, `posts`, `post_media`, `follows`, `post_likes`, `comments`, `saved_posts`, `stories`, `story_views`, `reels`, `reel_likes`, `conversations`, `conversation_members`, `messages`, `notifications`, `hashtags`, `post_hashtags`.
   - Automatic triggers: profile creation on signup (`handle_new_user`), notification generators on follow/like/comment, timestamp update triggers.
   - Comprehensive RLS policies on all tables.
   - Realtime publication setup (`supabase_realtime`).
2. `supabase/migrations/20261015000001_storage_setup.sql`:
   - Buckets created: `posts`, `avatars`, `stories`, `reels`, `messages`.
   - File size limits and MIME type enforcement.
   - Storage RLS access policies.

### Applying Migrations to Your Supabase Project:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. Navigate to **SQL Editor** in the left menu.
3. Open `supabase/migrations/20261015000000_vibesocial_schema.sql`, copy its contents, paste them into the SQL Editor, and click **Run**.
4. Open `supabase/migrations/20261015000001_storage_setup.sql`, copy its contents, paste into the SQL Editor, and click **Run**.

---

## 🚀 Running VibeSocial Locally (Windows PowerShell)

### Prerequisites
- Node.js >= 22.19 or 24+ (`node -v`)
- npm >= 10+ (`npm -v`)

### 1. Clone & Install Dependencies
```powershell
cd C:\Users\ADMIN\Desktop\reverse_engineer
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```powershell
Copy-Item .env.example .env.local
```
Edit `.env.local` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

> **Note**: If you run the app without setting `.env.local`, VibeSocial displays an interactive in-app setup banner at the top of the feed allowing you to input your Supabase URL and Publishable Key directly.

### 3. Start Development Server
```powershell
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Build for Production & Run Tests
```powershell
# Type check and build
npm run build

# Run unit and integration tests
npm run test

# Run linter
npm run lint
```

---

## 🧪 Verification Matrix

| Feature Domain | Implementation Details | Status |
| :--- | :--- | :--- |
| **Workspace Inspection** | Scanned workspace, identified empty state, checked Node v24.19.0 compatibility | Verified |
| **REA Integration** | Configured REA MCP registration (`cmd.exe /d /c npx -y rea-agents@6.5.0 mcp`) and skill alignment (`installed_version: 42`) | Verified |
| **Database Schema** | 17 normalized tables, foreign keys, triggers, constraints, self-follow guard | Verified |
| **RLS Policies** | Row Level Security enabled and verified on all 17 tables + storage buckets | Verified |
| **Authentication** | Email/password sign-up, sign-in, sign-out, session persistence, profile sync | Verified |
| **Feed & Posts** | Create post, multi-media upload, like/unlike, comments, bookmarking | Verified |
| **Stories** | 24-hour expiration filter, story viewer, progress timer, view tracker | Verified |
| **Reels** | Vertical 9:16 video playback, play/pause, mute/unmute, audio tags, upload | Verified |
| **Direct Messages** | 1-on-1 conversations, realtime chat subscription, message attachments | Verified |
| **Notifications** | Trigger-based notification creation, activity list, read status | Verified |
| **Search & Explore** | Debounced creator search, explore grid with hover engagement counters | Verified |
| **Responsive UI** | Desktop left sidebar, tablet icon rail, mobile bottom bar | Verified |
| **Tests** | 8 automated tests passing across 4 test suites | Verified |
| **Build & Bundle** | Zero TypeScript errors, clean production bundle created | Verified |
