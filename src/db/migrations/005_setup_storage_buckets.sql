-- Migration: 005_setup_storage_buckets.sql
-- Set up Supabase storage buckets for printer assets and design files

-- Note: Run this in Supabase SQL Editor (storage schema requires admin access)

-- 1. Create printer-assets bucket (for logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'printer-assets', 
  'printer-assets', 
  true, 
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- 2. Create design-files bucket (for generated PNGs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files', 
  'design-files', 
  true, 
  104857600,  -- 100MB limit per file
  ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/png'];

-- Storage policies for printer-assets bucket

-- Allow authenticated users to upload to printer-assets
DROP POLICY IF EXISTS "Users can upload printer assets" ON storage.objects;
CREATE POLICY "Users can upload printer assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'printer-assets' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their assets
DROP POLICY IF EXISTS "Users can update printer assets" ON storage.objects;
CREATE POLICY "Users can update printer assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'printer-assets'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their assets
DROP POLICY IF EXISTS "Users can delete printer assets" ON storage.objects;
CREATE POLICY "Users can delete printer assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'printer-assets'
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to printer assets (logos need to be visible)
DROP POLICY IF EXISTS "Public can view printer assets" ON storage.objects;
CREATE POLICY "Public can view printer assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'printer-assets');

-- Storage policies for design-files bucket

-- Allow anyone to upload design files (public builder users)
DROP POLICY IF EXISTS "Anyone can upload design files" ON storage.objects;
CREATE POLICY "Anyone can upload design files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'design-files');

-- Allow public read access to design files
DROP POLICY IF EXISTS "Public can view design files" ON storage.objects;
CREATE POLICY "Public can view design files"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-files');

-- Allow authenticated users (printers) to delete design files
DROP POLICY IF EXISTS "Authenticated users can delete design files" ON storage.objects;
CREATE POLICY "Authenticated users can delete design files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'design-files'
  AND auth.uid() IS NOT NULL
);
