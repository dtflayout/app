-- Migration: 002_add_product_slug.sql
-- Add product_slug column for multi-product URL support
-- Allows URLs like: builder.dtflayout.com/store-slug/product-slug

-- Add product_slug column to printer_products table
ALTER TABLE printer_products 
ADD COLUMN IF NOT EXISTS product_slug TEXT;

-- Add unique constraint (slug must be unique per printer)
-- This allows different printers to have the same product slug
ALTER TABLE printer_products 
DROP CONSTRAINT IF EXISTS unique_printer_product_slug;

ALTER TABLE printer_products 
ADD CONSTRAINT unique_printer_product_slug UNIQUE (printer_id, product_slug);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_printer_products_slug ON printer_products(printer_id, product_slug);

-- Update existing products with auto-generated slugs (if any exist without slugs)
-- This generates a slug from the product name
UPDATE printer_products 
SET product_slug = LOWER(REGEXP_REPLACE(COALESCE(product_name, 'product'), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE product_slug IS NULL;

-- For products with duplicate slugs within the same printer, append a number
-- This is a one-time fix for existing data
DO $$
DECLARE
    rec RECORD;
    new_slug TEXT;
    counter INT;
BEGIN
    FOR rec IN (
        SELECT id, printer_id, product_slug
        FROM printer_products p1
        WHERE EXISTS (
            SELECT 1 
            FROM printer_products p2 
            WHERE p2.printer_id = p1.printer_id 
            AND p2.product_slug = p1.product_slug 
            AND p2.id < p1.id
        )
    ) LOOP
        counter := 2;
        new_slug := rec.product_slug || '-' || counter;
        
        WHILE EXISTS (
            SELECT 1 
            FROM printer_products 
            WHERE printer_id = rec.printer_id 
            AND product_slug = new_slug
        ) LOOP
            counter := counter + 1;
            new_slug := rec.product_slug || '-' || counter;
        END LOOP;
        
        UPDATE printer_products 
        SET product_slug = new_slug 
        WHERE id = rec.id;
    END LOOP;
END $$;
