-- Migration: 004_create_designs_table.sql
-- Designs table to track customer-generated designs from public builder

-- Create designs table
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to printer and product
  printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  printer_product_id UUID NOT NULL REFERENCES printer_products(id) ON DELETE CASCADE,
  
  -- Unique design code for easy reference (e.g., "DTF-A7X3K2")
  design_code TEXT NOT NULL UNIQUE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'downloaded', 'expired')),
  
  -- Sheet data (JSON array)
  -- Each sheet: { sheet_number, height_inches, width_inches, variant_id, variant_name, variant_price, storage_path }
  sheets JSONB NOT NULL DEFAULT '[]',
  
  -- Total sheets count for quick access
  sheet_count INTEGER NOT NULL DEFAULT 1,
  
  -- Pricing
  total_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '72 hours'),
  
  -- Optional: customer email if captured
  customer_email TEXT
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_designs_printer_id ON designs(printer_id);
CREATE INDEX IF NOT EXISTS idx_designs_printer_product_id ON designs(printer_product_id);
CREATE INDEX IF NOT EXISTS idx_designs_design_code ON designs(design_code);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at);
CREATE INDEX IF NOT EXISTS idx_designs_expires_at ON designs(expires_at);

-- Enable Row Level Security
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Printers can view designs for their own store
CREATE POLICY "Printers can view their own designs"
  ON designs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = designs.printer_id
      AND printers.user_id = auth.uid()
    )
  );

-- Printers can update their own designs (mark as paid/downloaded)
CREATE POLICY "Printers can update their own designs"
  ON designs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = designs.printer_id
      AND printers.user_id = auth.uid()
    )
  );

-- Printers can delete their own designs
CREATE POLICY "Printers can delete their own designs"
  ON designs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM printers
      WHERE printers.id = designs.printer_id
      AND printers.user_id = auth.uid()
    )
  );

-- Public can insert designs (customers creating from public builder)
-- This allows unauthenticated users to create designs
CREATE POLICY "Anyone can create designs"
  ON designs FOR INSERT
  WITH CHECK (true);

-- Public can view designs by design_code (for status checking)
CREATE POLICY "Anyone can view designs by code"
  ON designs FOR SELECT
  USING (true);

-- Function to generate unique design code
CREATE OR REPLACE FUNCTION generate_design_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'DTF-';
  i INTEGER;
  attempts INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := 'DTF-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM designs WHERE design_code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique design code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate design code on insert
CREATE OR REPLACE FUNCTION set_design_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.design_code IS NULL OR NEW.design_code = '' THEN
    NEW.design_code := generate_design_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_design_code ON designs;
CREATE TRIGGER trigger_set_design_code
  BEFORE INSERT ON designs
  FOR EACH ROW
  EXECUTE FUNCTION set_design_code();
