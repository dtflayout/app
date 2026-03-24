# Dodo Payments — Deployment Checklist

## Files Changed (copy to your repo)

### API Routes
- `api/dodo-webhook.ts` — Added test product to PRODUCT_CREDITS map + Math.round on balance
- `api/claim-free-trial.ts` — Math.round on balance + logs to credit_transactions table

### Frontend
- `src/pages/PaymentSuccess.tsx` — Added failed state with retry button
- `src/pages/Billing.tsx` — Now reads from credit_transactions (was reading empty credit_ledger)

### Tests (NEW)
- `vitest.config.ts` — Test configuration
- `api/__tests__/setup.ts` — Shared env vars and mock setup
- `api/__tests__/helpers.ts` — Mock request/response helpers
- `api/__tests__/claim-free-trial.test.ts` — 6 tests
- `api/__tests__/create-checkout.test.ts` — 9 tests
- `api/__tests__/dodo-webhook.test.ts` — 10 tests

### SQL Migration
- `src/db/migrations/011_fix_floating_point_balances.sql`

---

## Deployment Steps

### Step 1: Run SQL migration (Supabase Dashboard → SQL Editor)
```sql
-- Fix existing floating point balances
UPDATE credits SET balance = ROUND(balance) WHERE balance != ROUND(balance);
UPDATE credit_transactions 
SET credits_added = ROUND(credits_added),
    credits_before = ROUND(credits_before),
    credits_after = ROUND(credits_after)
WHERE credits_added != ROUND(credits_added)
   OR credits_before != ROUND(credits_before)
   OR credits_after != ROUND(credits_after);
```

### Step 2: Reset test balance (optional)
```sql
UPDATE credits SET balance = 20000 WHERE user_id = 'c087ce6c-3df6-442f-aa98-578dfea6853c';
```

### Step 3: Push code to GitHub
```bash
git checkout dev
# Copy all changed files into your local repo
git add -A
git commit -m "fix: Dodo payment fixes — floating point, billing page, failure handling, tests"
git push origin dev
```

### Step 4: Merge to main (triggers Vercel deploy)
```bash
git checkout main
git merge dev
git push origin main
```

### Step 5: Dodo Dashboard — Live Mode Setup
1. Go to Dodo Dashboard → switch to **Live Mode**
2. Webhooks → Create/update endpoint URL:
   `https://www.dtflayout.com/api/dodo-webhook` (with www!)
3. Copy the live webhook signing secret

### Step 6: Vercel Env Vars
1. Replace `DODO_PAYMENTS_API_KEY` → live mode API key
2. Replace `DODO_WEBHOOK_KEY` → live mode webhook signing secret
3. Set `DODO_LIVE_MODE` = `true`
4. Delete old vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `VITE_RAZORPAY_KEY_ID`
5. Redeploy (Vercel → Deployments → Redeploy latest)

### Step 7: Verify
- [ ] Test free trial → check Billing page shows "Free Trial" entry
- [ ] Test paid plan → completes Dodo checkout → credits appear
- [ ] Test failed payment → shows red error card with "Try Again"
- [ ] Billing page shows all recharges with correct amounts
- [ ] No floating point artifacts in balance display
- [ ] Run `npm run test` — all 25 tests pass
