-- ==============================================================================
-- VibeSocial Production Database Schema & Security Migration
-- Target: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    website TEXT NOT NULL DEFAULT '',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_.]+$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles (full_name);

-- ------------------------------------------------------------------------------
-- 2. POSTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT NOT NULL DEFAULT '',
    location TEXT,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers_only', 'private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. POST MEDIA TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_order INT NOT NULL DEFAULT 0,
    width INT,
    height INT,
    duration_sec NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media (post_id, media_order ASC);

-- ------------------------------------------------------------------------------
-- 4. FOLLOWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (follower_id, followed_id),
    CONSTRAINT prevent_self_follow CHECK (follower_id != followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows (followed_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);

-- ------------------------------------------------------------------------------
-- 5. POST LIKES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes (user_id);

-- ------------------------------------------------------------------------------
-- 6. COMMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT comment_not_empty CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 2200)
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments (parent_comment_id);

-- ------------------------------------------------------------------------------
-- 7. SAVED POSTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_posts (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. STORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    caption TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON public.stories (author_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories (expires_at DESC);

-- ------------------------------------------------------------------------------
-- 9. STORY VIEWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.story_views (
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views (story_id);

-- ------------------------------------------------------------------------------
-- 10. REELS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    audio_title TEXT NOT NULL DEFAULT 'Original Audio',
    duration_sec NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reels_created ON public.reels (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_author ON public.reels (author_id);

-- ------------------------------------------------------------------------------
-- 11. REEL LIKES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reel_likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, reel_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel ON public.reel_likes (reel_id);

-- ------------------------------------------------------------------------------
-- 12. CONVERSATIONS & MESSAGING TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members (user_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL DEFAULT '',
    media_url TEXT,
    media_type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('follow', 'like_post', 'comment_post', 'like_reel', 'message')),
    resource_id UUID,
    resource_type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 14. HASHTAGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

-- ==============================================================================
-- DATABASE TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Auto-provision profile on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    base_username TEXT;
    seq INT := 0;
BEGIN
    base_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1),
        'user'
    );
    -- Clean characters
    clean_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_.]', '', 'g'));
    IF length(clean_username) < 3 THEN
        clean_username := 'user_' || substr(md5(NEW.id::text), 1, 6);
    END IF;

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = clean_username) LOOP
        seq := seq + 1;
        clean_username := substr(base_username, 1, 20) || '_' || seq;
    END LOOP;

    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        clean_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', clean_username),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE OR REPLACE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Auto update conversation updated_at when a new message arrives
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_messages_update_conv
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Notifications: Follow Trigger
CREATE OR REPLACE FUNCTION public.handle_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.follower_id != NEW.followed_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id, resource_type)
        VALUES (NEW.followed_id, NEW.follower_id, 'follow', NEW.follower_id, 'profile');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_follow_notification
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_notification();

-- Notifications: Post Like Trigger
CREATE OR REPLACE FUNCTION public.handle_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_author_id UUID;
BEGIN
    SELECT author_id INTO target_author_id FROM public.posts WHERE id = NEW.post_id;
    IF target_author_id IS NOT NULL AND target_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id, resource_type)
        VALUES (target_author_id, NEW.user_id, 'like_post', NEW.post_id, 'post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_post_like_notification
    AFTER INSERT ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_notification();

-- Notifications: Comment Trigger
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_author_id UUID;
BEGIN
    SELECT author_id INTO target_author_id FROM public.posts WHERE id = NEW.post_id;
    IF target_author_id IS NOT NULL AND target_author_id != NEW.author_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id, resource_type)
        VALUES (target_author_id, NEW.author_id, 'comment_post', NEW.post_id, 'post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_comment_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_notification();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. POSTS POLICIES
CREATE POLICY "Public posts are viewable by everyone"
    ON public.posts FOR SELECT
    USING (
        visibility = 'public'
        OR auth.uid() = author_id
        OR (
            visibility = 'followers_only'
            AND EXISTS (
                SELECT 1 FROM public.follows
                WHERE follower_id = auth.uid() AND followed_id = posts.author_id
            )
        )
    );

CREATE POLICY "Authenticated users can create posts"
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts"
    ON public.posts FOR DELETE
    USING (auth.uid() = author_id);

-- 3. POST MEDIA POLICIES
CREATE POLICY "Post media viewable with post access"
    ON public.post_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_media.post_id
        )
    );

CREATE POLICY "Authors can insert media for their posts"
    ON public.post_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_media.post_id AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Authors can delete media of their posts"
    ON public.post_media FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_media.post_id AND posts.author_id = auth.uid()
        )
    );

-- 4. FOLLOWS POLICIES
CREATE POLICY "Follow relationships viewable by everyone"
    ON public.follows FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can follow"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- 5. POST LIKES POLICIES
CREATE POLICY "Post likes viewable by everyone"
    ON public.post_likes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can like posts"
    ON public.post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
    ON public.post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- 6. COMMENTS POLICIES
CREATE POLICY "Comments viewable by everyone who can see the post"
    ON public.comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = comments.post_id
        )
    );

CREATE POLICY "Authenticated users can create comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and post owners can delete comments"
    ON public.comments FOR DELETE
    USING (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = comments.post_id AND posts.author_id = auth.uid()
        )
    );

-- 7. SAVED POSTS POLICIES
CREATE POLICY "Users can view only their own saved posts"
    ON public.saved_posts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
    ON public.saved_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
    ON public.saved_posts FOR DELETE
    USING (auth.uid() = user_id);

-- 8. STORIES POLICIES
CREATE POLICY "Active stories viewable by authenticated users"
    ON public.stories FOR SELECT
    USING (
        expires_at > timezone('utc'::text, now())
        OR auth.uid() = author_id
    );

CREATE POLICY "Users can create stories"
    ON public.stories FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own stories"
    ON public.stories FOR DELETE
    USING (auth.uid() = author_id);

-- 9. STORY VIEWS POLICIES
CREATE POLICY "Story owners can view story viewer list"
    ON public.story_views FOR SELECT
    USING (
        auth.uid() = viewer_id
        OR EXISTS (
            SELECT 1 FROM public.stories
            WHERE stories.id = story_views.story_id AND stories.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can record viewing a story"
    ON public.story_views FOR INSERT
    WITH CHECK (auth.uid() = viewer_id);

-- 10. REELS POLICIES
CREATE POLICY "Reels viewable by everyone"
    ON public.reels FOR SELECT
    USING (true);

CREATE POLICY "Users can create reels"
    ON public.reels FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own reels"
    ON public.reels FOR DELETE
    USING (auth.uid() = author_id);

-- 11. REEL LIKES POLICIES
CREATE POLICY "Reel likes viewable by everyone"
    ON public.reel_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like reels"
    ON public.reel_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels"
    ON public.reel_likes FOR DELETE
    USING (auth.uid() = user_id);

-- 12. CONVERSATIONS & MESSAGES POLICIES
CREATE POLICY "Users can view conversations they are members of"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_members.conversation_id = conversations.id
            AND conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Members can view membership"
    ON public.conversation_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members AS cm
            WHERE cm.conversation_id = conversation_members.conversation_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add members or join conversations"
    ON public.conversation_members FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Members can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_members.conversation_id = messages.conversation_id
            AND conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can send messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_members.conversation_id = messages.conversation_id
            AND conversation_members.user_id = auth.uid()
        )
    );

-- 13. NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications read status"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = recipient_id);

-- 14. HASHTAGS POLICIES
CREATE POLICY "Hashtags viewable by everyone"
    ON public.hashtags FOR SELECT
    USING (true);

CREATE POLICY "Post hashtags viewable by everyone"
    ON public.post_hashtags FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create hashtags"
    ON public.hashtags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can link hashtags"
    ON public.post_hashtags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_hashtags.post_id AND posts.author_id = auth.uid()
        )
    );

-- ==============================================================================
-- REALTIME CONFIGURATION
-- ==============================================================================
-- Add tables to realtime publication if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping realtime publication adjustment: %', SQLERRM;
END $$;
