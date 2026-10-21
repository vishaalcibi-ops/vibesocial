-- ==============================================================================
-- VibeSocial Storage Buckets & Policies Migration
-- Target: Supabase Storage
-- ==============================================================================

-- 1. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('posts', 'posts', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']),
    ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('stories', 'stories', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
    ('reels', 'reels', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/webm']),
    ('messages', 'messages', false, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies

-- POSTS BUCKET
CREATE POLICY "Public can view post media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload post media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'posts' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update or delete their own post media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'posts' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- AVATARS BUCKET
CREATE POLICY "Public can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload their avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- STORIES BUCKET
CREATE POLICY "Public can view stories"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'stories' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own story media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'stories' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- REELS BUCKET
CREATE POLICY "Public can view reels"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'reels');

CREATE POLICY "Authenticated users can upload reels"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'reels' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own reels"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'reels' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- MESSAGES BUCKET (Private access only)
CREATE POLICY "Conversation members can view message media"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'messages'
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_members.conversation_id::text = (storage.foldername(name))[1]
            AND conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Conversation members can upload message media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'messages'
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE conversation_members.conversation_id::text = (storage.foldername(name))[1]
            AND conversation_members.user_id = auth.uid()
        )
    );
