# Global Cart Integration Feature

## Feature Objective

Enable global merchants (Shopify, WooCommerce, etc.) to integrate the DTF gang sheet builder without the platform being in the payment loop. When a customer creates a design on the builder, they are redirected to the merchant's e-commerce cart with the appropriate product variant pre-selected based on the actual sheet size. The merchant handles payment collection directly; the platform only facilitates design generation and cart redirection.

This approach allows precision pricing through 90 hidden product variants (e.g., 0.5m, 1.0m, 1.5m increments) while keeping customer experience seamless. Merchants provide complete "add to cart" URLs for each variant, and the system selects the closest match to the generated sheet size.

## High-Level Architecture

### Customer Flow
1. Customer visits merchant's website
2. Clicks "Build Gang Sheet" link → Opens builder at `build.dtflayout.global/{merchant-slug}`
3. Builder loads merchant configuration (variants, roll width)
4. Customer uploads images, clicks "Auto Build"
5. Sheet arranges to calculated height (e.g., 18.3 meters)
6. System finds closest variant >= 18.3m (selects 18.5m variant)
7. Customer sees price preview: "Actual: 18.3m | Billed: 18.5m | Price: ₹1,665"
8. Customer clicks "Add to Cart"
9. Design saved to database with status='pending'
10. Customer redirected to merchant's cart URL (e.g., `https://store.com/cart/add?id=12345`)
11. Customer completes payment on merchant's website
12. Merchant confirms payment in platform dashboard
13. Credits deducted, design status → 'paid', high-res download unlocked

### Variant Selection Logic
```
Given: sheet_height = 18.3 meters
Given: merchant has variants [0.5, 1.0, 1.5, 2.0, ..., 44.5, 45.0]
Select: smallest variant where variant.size >= sheet_height
Result: 18.5 meter variant selected
```

### Credit Deduction Logic
- Credits NOT deducted on design generation
- Credits deducted only when merchant confirms payment (manual or webhook)
- Design stays in 'pending' status until payment confirmed
- Auto-abandon designs after 48 hours without payment

## Data Models

### merchants table (existing, add columns)
```
builder_slug TEXT UNIQUE  -- e.g., "ninja-transfers"
roll_width INTEGER        -- e.g., 22 (inches)
```

### merchant_variants table (new)
```
id UUID PRIMARY KEY
merchant_id UUID REFERENCES merchants(id)
size_value DECIMAL        -- e.g., 0.5, 1.0, 1.5, 18.5, 45.0
size_unit TEXT            -- "meters" or "feet"
cart_url TEXT NOT NULL    -- Complete URL: "https://store.com/cart/add?id=45678901234"
display_price TEXT        -- Optional: "₹45", "₹1665" (for preview only)
sort_order INTEGER        -- For ordering: 1, 2, 3...
created_at TIMESTAMP
```

### designs table (existing, modify)
```
type TEXT DEFAULT 'customer'  -- 'customer' | 'standalone'
status TEXT DEFAULT 'pending' -- 'pending' | 'paid' | 'abandoned'
selected_variant_id UUID      -- References merchant_variants(id)
paid_at TIMESTAMP
abandoned_at TIMESTAMP
order_confirmed_by TEXT       -- 'merchant_manual' | 'webhook_auto'
```

### credit_transactions table (existing, modify type enum)
```
type TEXT  -- Add new types: 'deduction_customer', 'deduction_standalone'
design_id UUID  -- Reference to designs table
```

## File-Level Changes

### Database Migrations
**File**: `supabase/migrations/XXXXXX_add_global_cart_integration.sql`
- Create `merchant_variants` table
- Add columns to `merchants`: `builder_slug`, `roll_width`
- Add columns to `designs`: `type`, `status`, `selected_variant_id`, `paid_at`, `abandoned_at`, `order_confirmed_by`
- Add `design_id` column to `credit_transactions`
- Create indexes: `merchant_variants(merchant_id, size_value)`, `designs(merchant_id, status)`

### Merchant Dashboard - Variant Setup
**File**: `src/components/MerchantDashboard/VariantSetup.tsx` (new)
- Form to add/edit/delete merchant variants
- CSV upload functionality for bulk variant import
- Display current variants in sortable table
- "Test Link" button for each variant (opens cart_url in new tab)
- Validation: size_value > 0, cart_url is valid URL, no duplicate sizes

**File**: `src/components/MerchantDashboard/MerchantSettings.tsx` (modify)
- Add `builder_slug` input field (auto-generate from store name, allow edit)
- Add `roll_width` input field (dropdown: 22", 24", custom)
- Show generated builder URL: `https://build.dtflayout.global/{builder_slug}`
- Validation: builder_slug must be unique, alphanumeric + hyphens only

### Builder - Public Customer-Facing
**File**: `src/pages/Builder/[merchantSlug].tsx` (new or modify existing)
- Accept `merchantSlug` from URL params
- Fetch merchant configuration on mount (including all variants)
- Load merchant's roll_width into canvas config
- Do NOT show variant list to customer (hidden selection)

**File**: `src/components/Builder/PricePreview.tsx` (new)
- Calculate sheet height after auto-build
- Find selected variant using selection algorithm
- Display: "Actual Size: Xm | Billed As: Ym | Unused: Zm (N%)"
- Display: "Estimated Price: ₹XXXX"
- Show optimization suggestion if waste > 10%

**File**: `src/components/Builder/AddToCartButton.tsx` (new)
- Button: "Add to Cart" (disabled until design valid)
- On click:
  1. Calculate final sheet height
  2. Run variant selection algorithm
  3. Save design to database (status='pending')
  4. Do NOT deduct credits
  5. Redirect: `window.location.href = selectedVariant.cart_url`

### Merchant Dashboard - Order Management
**File**: `src/components/MerchantDashboard/PendingDesigns.tsx` (new)
- Fetch designs where merchant_id=current AND status='pending'
- Display table: design_code, created_at, sheet_height, customer_email (if captured)
- Actions: [Confirm Payment] [Mark Abandoned] [Preview]
- "Confirm Payment" triggers credit deduction + status='paid'
- Show warning if merchant has insufficient credits

**File**: `src/components/MerchantDashboard/PaidDesigns.tsx` (new)
- Fetch designs where merchant_id=current AND status='paid'
- Display table: design_code, paid_at, sheet_height
- Actions: [Download High-Res] [Download PDF] [View Details]
- Download buttons only enabled if status='paid'

### Utility Functions
**File**: `src/utils/variantSelection.ts` (new)
```
Function: selectVariant(sheetHeight, merchantVariants)
- Sort variants by size_value ascending
- Find first variant where size_value >= sheetHeight
- If no variant found (sheet > max), return largest variant
- Return: { variant, wastePercentage, isOptimal }
```

**File**: `src/utils/creditDeduction.ts` (new)
```
Function: deductCreditForDesign(designId, merchantId)
- Check merchant has credits_balance >= 1
- Use Postgres transaction:
  - Deduct 1 credit from merchant
  - Update design status='paid', paid_at=now()
  - Insert credit_transaction record
- Handle insufficient credits error
- Return success/error
```

### Background Jobs
**File**: `src/jobs/cleanupAbandonedDesigns.ts` (new, run daily via cron)
- Find designs where status='pending' AND created_at < NOW() - 48 hours
- Update status='abandoned', abandoned_at=now()
- Send notification to merchant (optional)

## Step-by-Step Implementation Plan

### Phase 1: Database & Models (Day 1)
1. Create migration file with new tables and columns
2. Run migration in development environment
3. Verify schema changes in Supabase dashboard
4. Create TypeScript types for new models

### Phase 2: Merchant Variant Setup (Day 2)
1. Build variant setup page UI (table + form)
2. Implement add/edit/delete variant operations
3. Add CSV upload parser (columns: size, cart_url)
4. Add URL validation for cart_url field
5. Add "Test Link" functionality (opens in new tab)
6. Prevent duplicate size_value for same merchant

### Phase 3: Builder Slug & Configuration (Day 2)
1. Add builder_slug field to merchant settings
2. Auto-generate slug from store name (lowercase, replace spaces with hyphens)
3. Validate slug uniqueness before save
4. Display generated builder URL to merchant
5. Allow merchant to test their builder URL

### Phase 4: Public Builder Modifications (Day 3)
1. Create or modify builder route to accept `/:merchantSlug`
2. Fetch merchant config on page load (with variants)
3. Configure canvas with merchant's roll_width
4. Implement variant selection algorithm utility
5. Build price preview component (shows actual vs billed)
6. Add waste percentage calculation and optimization suggestions

### Phase 5: Add to Cart Flow (Day 3-4)
1. Create AddToCartButton component
2. On click: calculate final sheet height from canvas
3. Run variant selection algorithm
4. Save design to database with:
   - type='customer'
   - status='pending'
   - selected_variant_id
   - DO NOT deduct credits
5. Redirect to selectedVariant.cart_url
6. Handle errors (no variants, save failed)

### Phase 6: Merchant Order Management (Day 4-5)
1. Build PendingDesigns component (fetch status='pending')
2. Build PaidDesigns component (fetch status='paid')
3. Implement "Confirm Payment" action:
   - Check credits_balance
   - Call deductCreditForDesign utility
   - Update UI on success/error
4. Implement "Mark Abandoned" action (status='abandoned')
5. Add download high-res functionality (only for paid designs)

### Phase 7: Background Cleanup (Day 5)
1. Create cleanupAbandonedDesigns job
2. Find pending designs > 48 hours old
3. Update to status='abandoned'
4. Schedule via Supabase Edge Functions or external cron

### Phase 8: Testing & Edge Cases (Day 6)
1. Test variant selection with edge cases
2. Test insufficient credits scenario
3. Test URL redirect works across browsers
4. Test CSV upload with malformed data
5. Test abandoned design cleanup
6. End-to-end test: create design → redirect → confirm payment → download

## Edge Cases & Validation Rules

### Variant Selection Edge Cases
1. **Sheet height exceeds max variant**: Select largest available variant, show warning
2. **No variants configured**: Block "Add to Cart", show error to customer
3. **Sheet height is 0 or negative**: Prevent generation, show error
4. **Exact match exists**: Select exact match, show 0% waste
5. **Waste > 20%**: Show optimization suggestion ("Remove 1 image to save ₹XXX")

### Credit Deduction Edge Cases
1. **Merchant has 0 credits**: Show error, prevent payment confirmation, prompt recharge
2. **Design already paid**: Prevent double-deduction, show "Already confirmed" message
3. **Design abandoned**: Do not allow payment confirmation
4. **Concurrent confirmations**: Use database transaction to prevent race condition

### URL & Data Validation
1. **cart_url must be valid URL**: Start with http:// or https://
2. **cart_url must be unique per merchant**: No duplicate URLs for same merchant
3. **size_value must be > 0**: Reject negative or zero sizes
4. **size_value must be unique per merchant**: No duplicate sizes
5. **builder_slug must be alphanumeric + hyphens**: No spaces, special chars
6. **builder_slug must be unique globally**: Check before save

### Redirect Edge Cases
1. **Redirect fails (network error)**: Show error, allow retry
2. **Customer closes tab before redirect**: Design stays pending (will auto-abandon)
3. **Merchant's cart URL is broken**: Customer sees 404, merchant should test links
4. **Customer goes back after redirect**: Design already saved, should not duplicate

### Abandoned Design Handling
1. **Auto-abandon after 48 hours**: Run daily cleanup job
2. **Merchant manually marks abandoned**: Allow immediate abandonment
3. **Restore abandoned design**: Not supported (merchant can create new)
4. **Abandoned designs shown separately**: Keep in database for analytics

## Non-Goals (Do Not Change)

1. **Do NOT modify existing India builder flow**: This is for global merchants only
2. **Do NOT implement payment processing**: Merchant handles all payments
3. **Do NOT build Shopify webhook integration**: Start with manual confirmation only
4. **Do NOT create multi-currency support**: Merchant sets prices in their store
5. **Do NOT auto-generate variants**: Merchant must create them manually or via CSV
6. **Do NOT modify existing credit purchase flow**: Only change deduction timing
7. **Do NOT build variant price calculation**: Merchant sets prices in their store
8. **Do NOT implement cart abandonment emails**: Merchant handles this
9. **Do NOT build variant analytics dashboard**: Out of scope for MVP
10. **Do NOT modify standalone builder flow**: This spec is for customer-generated only

## Success Criteria

- Merchant can add 90 variants via CSV upload in < 5 minutes
- Customer can create design and reach merchant's cart in < 2 clicks
- Variant selection is accurate within 0.5m precision
- Credits only deducted on confirmed payment
- Designs auto-abandon after 48 hours without payment
- Merchant can download high-res only for paid designs
- No double-deduction possible (transaction safety)
- Builder URL is shareable and loads merchant config correctly

## Testing Checklist

- [ ] Create merchant with builder_slug
- [ ] Upload 90 variants via CSV
- [ ] Test variant URLs open correctly
- [ ] Create design via public builder
- [ ] Verify variant selection accuracy
- [ ] Confirm redirect to cart URL works
- [ ] Verify design status='pending' after creation
- [ ] Confirm payment manually
- [ ] Verify credit deduction occurs
- [ ] Verify design status='paid' after confirmation
- [ ] Download high-res file
- [ ] Wait 48+ hours, verify auto-abandon runs
- [ ] Test insufficient credits scenario
- [ ] Test with 0 variants configured
- [ ] Test with sheet > max variant
