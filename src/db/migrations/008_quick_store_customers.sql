-- Quick Store Customers & OTP Authentication
-- Run this migration in Supabase SQL Editor

-- ============================================
-- 1. CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_store_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  
  -- Stats (updated via triggers)
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Email must be unique per store
  UNIQUE(quick_store_id, email)
);

-- Index for lookups
CREATE INDEX idx_qs_customers_store ON quick_store_customers(quick_store_id);
CREATE INDEX idx_qs_customers_email ON quick_store_customers(quick_store_id, email);

-- ============================================
-- 2. OTP TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_store_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for OTP lookups
CREATE INDEX idx_qs_otps_lookup ON quick_store_otps(quick_store_id, email, otp_code);

-- Auto-cleanup old OTPs (optional - can run periodically)
-- DELETE FROM quick_store_otps WHERE expires_at < NOW() - INTERVAL '1 day';

-- ============================================
-- 3. ADD CUSTOMER_ID TO ORDERS
-- ============================================
ALTER TABLE quick_store_orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES quick_store_customers(id) ON DELETE SET NULL;

-- Index for customer order lookups
CREATE INDEX IF NOT EXISTS idx_qs_orders_customer ON quick_store_orders(customer_id);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE quick_store_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_store_otps ENABLE ROW LEVEL SECURITY;

-- Customers: Printers can manage their store's customers
CREATE POLICY "Printers can view own store customers"
  ON quick_store_customers FOR SELECT
  USING (
    quick_store_id IN (
      SELECT id FROM quick_stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Printers can update own store customers"
  ON quick_store_customers FOR UPDATE
  USING (
    quick_store_id IN (
      SELECT id FROM quick_stores WHERE user_id = auth.uid()
    )
  );

-- Public can insert (for registration) and read own data
CREATE POLICY "Public can create customers"
  ON quick_store_customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read own customer record"
  ON quick_store_customers FOR SELECT
  USING (true);

-- OTPs: Public access for auth flow
CREATE POLICY "Public can create OTPs"
  ON quick_store_otps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read OTPs"
  ON quick_store_otps FOR SELECT
  USING (true);

CREATE POLICY "Public can update OTPs"
  ON quick_store_otps FOR UPDATE
  USING (true);

-- ============================================
-- 5. FUNCTION: Update customer stats on order
-- ============================================
CREATE OR REPLACE FUNCTION update_customer_order_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if customer_id is set
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE quick_store_customers
    SET 
      total_orders = (
        SELECT COUNT(*) FROM quick_store_orders 
        WHERE customer_id = NEW.customer_id
      ),
      total_spent = (
        SELECT COALESCE(SUM(calculated_price), 0) FROM quick_store_orders 
        WHERE customer_id = NEW.customer_id AND calculated_price IS NOT NULL
      ),
      first_order_at = COALESCE(first_order_at, NEW.created_at),
      last_order_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when order is created
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON quick_store_orders;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT ON quick_store_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_stats();

-- ============================================
-- 6. FUNCTION: Generate OTP
-- ============================================
CREATE OR REPLACE FUNCTION generate_customer_otp(
  p_store_id UUID,
  p_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_otp TEXT;
BEGIN
  -- Generate 6-digit OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Invalidate any existing OTPs for this email
  UPDATE quick_store_otps 
  SET used_at = NOW() 
  WHERE quick_store_id = p_store_id 
    AND email = p_email 
    AND used_at IS NULL;
  
  -- Insert new OTP (expires in 10 minutes)
  INSERT INTO quick_store_otps (quick_store_id, email, otp_code, expires_at)
  VALUES (p_store_id, p_email, v_otp, NOW() + INTERVAL '10 minutes');
  
  RETURN v_otp;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCTION: Verify OTP
-- ============================================
CREATE OR REPLACE FUNCTION verify_customer_otp(
  p_store_id UUID,
  p_email TEXT,
  p_otp TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if valid OTP exists
  SELECT EXISTS(
    SELECT 1 FROM quick_store_otps
    WHERE quick_store_id = p_store_id
      AND email = p_email
      AND otp_code = p_otp
      AND expires_at > NOW()
      AND used_at IS NULL
  ) INTO v_valid;
  
  -- Mark OTP as used if valid
  IF v_valid THEN
    UPDATE quick_store_otps
    SET used_at = NOW()
    WHERE quick_store_id = p_store_id
      AND email = p_email
      AND otp_code = p_otp
      AND used_at IS NULL;
  END IF;
  
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql;
