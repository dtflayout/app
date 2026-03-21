-- Migration: 003_add_printer_currency.sql
-- Add currency column to printers table for price display on public builder

-- Add currency column
ALTER TABLE printers 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add comment for clarity
COMMENT ON COLUMN printers.currency IS 'Currency code for price display (USD, EUR, GBP, INR, etc.)';

-- Update existing records to have USD as default (if any)
UPDATE printers SET currency = 'USD' WHERE currency IS NULL;
