-- Migration 011: Fix floating point balance artifacts
-- Run this ONCE in Supabase SQL Editor (production)
-- This rounds all existing balances to clean integers

-- 1. Fix any floating point balances in credits table
UPDATE credits 
SET balance = ROUND(balance) 
WHERE balance != ROUND(balance);

-- 2. Fix any floating point values in credit_transactions
UPDATE credit_transactions 
SET credits_added = ROUND(credits_added),
    credits_before = ROUND(credits_before),
    credits_after = ROUND(credits_after)
WHERE credits_added != ROUND(credits_added)
   OR credits_before != ROUND(credits_before)
   OR credits_after != ROUND(credits_after);

-- 3. Reset test account balance (Alok's dev account — inflated from webhook replays)
-- UPDATE credits SET balance = 20000 WHERE user_id = 'c087ce6c-3df6-442f-aa98-578dfea6853c';
-- ^ Uncomment and run separately if needed
