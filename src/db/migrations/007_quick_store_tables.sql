-- Migration: 007_quick_store_tables.sql
-- Quick Store feature: Tables for printer mini-websites
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. QUICK STORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Store Identity
  slug TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Contact Information
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  google_maps_url TEXT,
  business_hours JSONB DEFAULT '[]',
  
  -- Appearance
  color_primary TEXT DEFAULT '#10b981',
  color_secondary TEXT DEFAULT '#3b82f6',
  color_background TEXT DEFAULT '#ffffff',
  color_text TEXT DEFAULT '#1f2937',
  banner_image_url TEXT,
  
  -- Homepage Content
  hero_title TEXT,
  hero_subtitle TEXT,
  about_title TEXT DEFAULT 'About Us',
  about_content TEXT,
  homepage_sections JSONB DEFAULT '["hero", "about", "products", "testimonials", "contact"]',
  
  -- Settings
  currency TEXT NOT NULL DEFAULT 'INR',
  measurement_unit TEXT NOT NULL DEFAULT 'inch' CHECK (measurement_unit IN ('inch', 'cm', 'meter', 'feet')),
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quick_stores_slug ON quick_stores(slug);
CREATE INDEX IF NOT EXISTS idx_quick_stores_user_id ON quick_stores(user_id);

-- RLS
ALTER TABLE quick_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quick store" ON quick_stores;
CREATE POLICY "Users can view their own quick store"
  ON quick_stores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quick store" ON quick_stores;
CREATE POLICY "Users can insert their own quick store"
  ON quick_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quick store" ON quick_stores;
CREATE POLICY "Users can update their own quick store"
  ON quick_stores FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quick store" ON quick_stores;
CREATE POLICY "Users can delete their own quick store"
  ON quick_stores FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view published stores" ON quick_stores;
CREATE POLICY "Public can view published stores"
  ON quick_stores FOR SELECT
  USING (is_active = true AND is_published = true);


-- ============================================
-- 2. TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_store_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id) ON DELETE CASCADE,
  
  customer_name TEXT NOT NULL,
  customer_location TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_store_id ON quick_store_testimonials(quick_store_id);

ALTER TABLE quick_store_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their testimonials" ON quick_store_testimonials;
CREATE POLICY "Users can manage their testimonials"
  ON quick_store_testimonials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_testimonials.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view active testimonials" ON quick_store_testimonials;
CREATE POLICY "Public can view active testimonials"
  ON quick_store_testimonials FOR SELECT
  USING (is_active = true);


-- ============================================
-- 3. QUICK STORE PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id) ON DELETE CASCADE,
  
  -- Product Info
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Dimensions
  roll_width_inches DECIMAL NOT NULL,
  
  -- Pricing Configuration
  show_pricing BOOLEAN DEFAULT true,
  pricing_basis TEXT NOT NULL DEFAULT 'area' CHECK (pricing_basis IN ('length', 'area')),
  pricing_type TEXT NOT NULL DEFAULT 'flat' CHECK (pricing_type IN ('flat', 'tiered')),
  tier_calculation TEXT DEFAULT 'slab' CHECK (tier_calculation IN ('incremental', 'slab')),
  
  -- Flat pricing
  flat_price DECIMAL,
  
  -- Tiered pricing (JSON array)
  pricing_tiers JSONB DEFAULT '[]',
  
  -- Minimum Order
  minimum_order DECIMAL DEFAULT 0,
  below_minimum_action TEXT DEFAULT 'block' CHECK (below_minimum_action IN ('block', 'charge_minimum')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_product_slug_per_store UNIQUE (quick_store_id, product_slug)
);

CREATE INDEX IF NOT EXISTS idx_qs_products_store_id ON quick_store_products(quick_store_id);
CREATE INDEX IF NOT EXISTS idx_qs_products_slug ON quick_store_products(quick_store_id, product_slug);

ALTER TABLE quick_store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their products" ON quick_store_products;
CREATE POLICY "Users can manage their products"
  ON quick_store_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_products.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view active products" ON quick_store_products;
CREATE POLICY "Public can view active products"
  ON quick_store_products FOR SELECT
  USING (is_active = true);


-- ============================================
-- 4. QUICK STORE ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES quick_store_products(id) ON DELETE SET NULL,
  
  -- Order Code
  order_code TEXT NOT NULL UNIQUE,
  
  -- Customer Info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_notes TEXT,
  
  -- Sheet Data (JSON array)
  sheets JSONB NOT NULL DEFAULT '[]',
  sheet_count INTEGER NOT NULL DEFAULT 1,
  total_length_inches DECIMAL NOT NULL,
  total_area_sq_inches DECIMAL NOT NULL,
  
  -- Pricing
  currency TEXT NOT NULL,
  pricing_basis TEXT NOT NULL,
  calculated_price DECIMAL,
  show_pricing BOOLEAN NOT NULL DEFAULT true,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'completed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  downloaded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Credits tracking
  credits_deducted INTEGER,
  deducted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qs_orders_store_id ON quick_store_orders(quick_store_id);
CREATE INDEX IF NOT EXISTS idx_qs_orders_code ON quick_store_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_qs_orders_status ON quick_store_orders(status);
CREATE INDEX IF NOT EXISTS idx_qs_orders_created ON quick_store_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qs_orders_phone ON quick_store_orders(customer_phone);

ALTER TABLE quick_store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their store orders" ON quick_store_orders;
CREATE POLICY "Users can view their store orders"
  ON quick_store_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_orders.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their store orders" ON quick_store_orders;
CREATE POLICY "Users can update their store orders"
  ON quick_store_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_orders.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can create orders" ON quick_store_orders;
CREATE POLICY "Anyone can create orders"
  ON quick_store_orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view orders by code" ON quick_store_orders;
CREATE POLICY "Anyone can view orders by code"
  ON quick_store_orders FOR SELECT
  USING (true);


-- ============================================
-- 5. ORDER CODE GENERATOR FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_qs_order_code(store_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INTEGER;
  attempts INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  prefix := UPPER(LEFT(store_slug, 3)) || '-';
  
  LOOP
    result := prefix;
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM quick_store_orders WHERE order_code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique order code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 6. RESERVED SLUGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reserved_slugs (
  slug TEXT PRIMARY KEY,
  reason TEXT
);

INSERT INTO reserved_slugs (slug, reason) VALUES
  ('www', 'System reserved'),
  ('app', 'System reserved'),
  ('api', 'System reserved'),
  ('admin', 'System reserved'),
  ('blog', 'System reserved'),
  ('help', 'System reserved'),
  ('support', 'System reserved'),
  ('status', 'System reserved'),
  ('mail', 'System reserved'),
  ('billing', 'System reserved'),
  ('dashboard', 'System reserved'),
  ('login', 'System reserved'),
  ('signup', 'System reserved'),
  ('auth', 'System reserved'),
  ('oauth', 'System reserved'),
  ('pricing', 'System reserved'),
  ('about', 'System reserved'),
  ('contact', 'System reserved'),
  ('terms', 'System reserved'),
  ('privacy', 'System reserved'),
  ('faq', 'System reserved'),
  ('docs', 'System reserved'),
  ('developer', 'System reserved'),
  ('developers', 'System reserved'),
  ('store', 'System reserved'),
  ('stores', 'System reserved'),
  ('quick-store', 'System reserved'),
  ('quickstore', 'System reserved'),
  ('test', 'System reserved'),
  ('demo', 'System reserved')
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- 7. ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_store_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'product_view', 'builder_open', 'order_submit')),
  page_path TEXT,
  product_id UUID,
  
  visitor_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_store ON quick_store_analytics(quick_store_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON quick_store_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON quick_store_analytics(event_type);

ALTER TABLE quick_store_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their analytics" ON quick_store_analytics;
CREATE POLICY "Users can view their analytics"
  ON quick_store_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_analytics.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can log analytics" ON quick_store_analytics;
CREATE POLICY "Anyone can log analytics"
  ON quick_store_analytics FOR INSERT
  WITH CHECK (true);


-- ============================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_quick_stores_updated_at ON quick_stores;
CREATE TRIGGER update_quick_stores_updated_at
  BEFORE UPDATE ON quick_stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qs_products_updated_at ON quick_store_products;
CREATE TRIGGER update_qs_products_updated_at
  BEFORE UPDATE ON quick_store_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 9. STORAGE BUCKET (Run separately in Supabase)
-- ============================================
-- Go to Supabase Dashboard > Storage > Create new bucket:
-- Name: quick-store-assets
-- Public: Yes
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, image/svg+xml

-- Then run these storage policies:
/*
DROP POLICY IF EXISTS "Users can upload QS assets" ON storage.objects;
CREATE POLICY "Users can upload QS assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'quick-store-assets' 
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update QS assets" ON storage.objects;
CREATE POLICY "Users can update QS assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'quick-store-assets'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can delete QS assets" ON storage.objects;
CREATE POLICY "Users can delete QS assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'quick-store-assets'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Public can view QS assets" ON storage.objects;
CREATE POLICY "Public can view QS assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'quick-store-assets');
*/
