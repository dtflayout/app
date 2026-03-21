-- Migration: 001_printer_tables.sql
-- Website Integration feature: Tables for printer Shopify store integration
-- Allows printers to embed DTF builder on their Shopify stores

-- 1. Printers table
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  store_name TEXT,
  store_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Printer products table
CREATE TABLE IF NOT EXISTS printer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  shopify_product_url TEXT NOT NULL,
  shopify_product_id TEXT,
  product_name TEXT,
  size_unit TEXT NOT NULL CHECK (size_unit IN ('mm', 'cm', 'inch', 'feet', 'meter')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Printer variants table
CREATE TABLE IF NOT EXISTS printer_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_product_id UUID NOT NULL REFERENCES printer_products(id) ON DELETE CASCADE,
  shopify_variant_id TEXT NOT NULL,
  variant_name TEXT,
  size_value DECIMAL NOT NULL,
  price DECIMAL,
  cart_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_printers_slug ON printers(slug);
CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);
CREATE INDEX IF NOT EXISTS idx_printer_products_printer_id ON printer_products(printer_id);
CREATE INDEX IF NOT EXISTS idx_printer_variants_printer_product_id ON printer_variants(printer_product_id);
CREATE INDEX IF NOT EXISTS idx_printer_products_shopify_product_id ON printer_products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_printer_variants_shopify_variant_id ON printer_variants(shopify_variant_id);

-- Enable Row Level Security
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for printers table
-- Users can only view/insert/update/delete their own printer records
CREATE POLICY "Users can view their own printers"
  ON printers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own printers"
  ON printers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own printers"
  ON printers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own printers"
  ON printers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for printer_products table
-- Users can only access products for their own printers
CREATE POLICY "Users can view products for their printers"
  ON printer_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = printer_products.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products for their printers"
  ON printer_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = printer_products.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products for their printers"
  ON printer_products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = printer_products.printer_id
      AND printers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = printer_products.printer_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products for their printers"
  ON printer_products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = printer_products.printer_id
      AND printers.user_id = auth.uid()
    )
  );

-- RLS Policies for printer_variants table
-- Users can only access variants for their own printer products
CREATE POLICY "Users can view variants for their printer products"
  ON printer_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM printer_products
      INNER JOIN printers ON printers.id = printer_products.printer_id
      WHERE printer_products.id = printer_variants.printer_product_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variants for their printer products"
  ON printer_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM printer_products
      INNER JOIN printers ON printers.id = printer_products.printer_id
      WHERE printer_products.id = printer_variants.printer_product_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update variants for their printer products"
  ON printer_variants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM printer_products
      INNER JOIN printers ON printers.id = printer_products.printer_id
      WHERE printer_products.id = printer_variants.printer_product_id
      AND printers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM printer_products
      INNER JOIN printers ON printers.id = printer_products.printer_id
      WHERE printer_products.id = printer_variants.printer_product_id
      AND printers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variants for their printer products"
  ON printer_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM printer_products
      INNER JOIN printers ON printers.id = printer_products.printer_id
      WHERE printer_products.id = printer_variants.printer_product_id
      AND printers.user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_printers_updated_at
  BEFORE UPDATE ON printers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printer_products_updated_at
  BEFORE UPDATE ON printer_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
