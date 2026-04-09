# TODO List for DTF Layout Tool

**Last Updated:** April 3, 2026  
**Auth System:** Supabase Auth (email/password)  
**Payment Gateway:** Dodo Payments (India + Global)  
**Credits System:** Supabase `credits` table

---

## 🚨 Pre-Launch Checklist (April 4, 2026)

### Infrastructure Status (Verified ✅)
- [x] `https://dtflayout.com` → 307 redirect to www → 200 OK (Vercel)
- [x] `https://www.dtflayout.com` → 200 OK (Vercel)
- [x] `https://thaneprints.dtflayout.com` → 200 OK (Cloudflare proxy → Vercel)
- [x] `https://builder.dtflayout.com` → 200 OK (Vercel, DNS only CNAME)
- [x] `https://files.dtflayout.com` → R2 Worker serving images (Content-Type: image/png)
- [x] Logos loading across Quick Store dashboard, storefront, and builder
- [x] No hardcoded localhost URLs in codebase
- [x] CORS configured for `*.dtflayout.com` in all API routes
- [x] `files` in reserved subdomains (useSubdomain.ts + dtf-subdomain-proxy worker)
- [x] Sentry error monitoring integrated (client + server)

### Cloudflare DNS & Workers (Verify these match)
- [x] DNS `*` CNAME → `dtflayout.com` → **Proxied** (orange cloud)
- [x] DNS `builder` CNAME → Vercel → **DNS only** (grey cloud)
- [x] DNS `www` CNAME → `cname.vercel-dns.com` → **DNS only** (grey cloud)
- [x] Worker `dtf-subdomain-proxy` — route `*.dtflayout.com/*`, reserved list includes `files`
- [x] Worker `r2-files` — custom domain `files.dtflayout.com`, binding `R2_BUCKET` → `dtf-storage`
- [ ] No stale R2 custom domain on bucket (removed, Worker handles it now)

### Vercel Environment Variables (Check all exist)
- [ ] `VITE_SUPABASE_URL` — Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- [ ] `SUPABASE_URL` — same URL (for server-side API routes)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Settings → API → service_role key
- [ ] `SUPABASE_SERVICE_KEY` — same as service_role key (some API routes use this name)
- [ ] `CRON_SECRET` — any random string (for cron job auth)
- [ ] `DODO_PAYMENTS_API_KEY` — from Dodo Payments dashboard
- [ ] `DODO_WEBHOOK_KEY` — from Dodo Payments dashboard → Webhooks
- [ ] `DODO_LIVE_MODE` — set to `true` when ready for real payments (keep `false` for testing)
- [ ] `R2_ACCOUNT_ID` — Cloudflare account ID
- [ ] `R2_ACCESS_KEY_ID` — R2 API token access key
- [ ] `R2_SECRET_ACCESS_KEY` — R2 API token secret key
- [ ] `R2_BUCKET_NAME` — `dtf-storage`
- [ ] `R2_PUBLIC_URL` — `https://files.dtflayout.com`
- [ ] `VITE_R2_PUBLIC_URL` — `https://files.dtflayout.com`
- [ ] `VITE_SENTRY_DSN` — Sentry project DSN
- [ ] `SENTRY_DSN` — same DSN (for server-side)
- [ ] `UPSTASH_REDIS_REST_URL` — from Upstash dashboard (rate limiting)
- [ ] `UPSTASH_REDIS_REST_TOKEN` — from Upstash dashboard

### Vercel Cleanup
- [ ] Remove old Razorpay env vars: `VITE_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

### Supabase Tasks
- [ ] Run migration: `ALTER TABLE quick_stores ADD COLUMN show_business_hours boolean DEFAULT true;`
- [ ] Confirm PITR backups are enabled (Supabase Pro → Settings → Backups)
- [ ] Clean up stale Storage files: `DELETE FROM storage.objects WHERE bucket_id = 'design-files';` (6.5 GB)
- [ ] Clean up stale Storage files: `DELETE FROM storage.objects WHERE bucket_id = 'printer-assets';`
- [ ] Verify orders download from R2 (not Supabase) by testing a file download before deleting

### Dodo Payments
- [ ] Set webhook endpoint URL in Dodo dashboard: `https://dtflayout.com/api/dodo-webhook`
- [ ] Test a payment flow end-to-end (use test mode first — `DODO_LIVE_MODE=false`)
- [ ] Switch `DODO_LIVE_MODE` to `true` when ready for real payments

### End-to-End Testing
- [ ] Signup → free trial credits (10,000) claimed
- [ ] Generate layout → credits deducted correctly
- [ ] Supabase log created for usage
- [ ] Navbar credits update in real-time
- [ ] Low credit warning banner works
- [ ] Payment flow: Billing → choose plan → Dodo checkout → credits added
- [ ] Quick Store: customer places order → printer sees in Orders dashboard
- [ ] Quick Store: contact form → message appears in Messages inbox
- [ ] Website Integration: public builder → customer designs sheet → order submitted
- [ ] Multi-sheet flow: 3+ sheets at 300 DPI → export → upload to R2

---

## 🚨 Critical (Blockers for Launch)

### ~~Supabase Pro Upgrade Required~~
- ~~**Issue:** Large 300 DPI files (3+ sheets) exceed free tier 50MB limit~~
- **Status:** ✅ DONE

### Test Multi-Sheet Flow on Pro
- **What:** Full end-to-end test with 3+ sheets at 300 DPI
- **Status:** Ready to test (Supabase Pro active)
- **Checklist:**
  - [ ] Upload multiple images
  - [ ] Generate 3+ sheet layout
  - [ ] Export all sheets (300 DPI)
  - [ ] Upload to Supabase storage
  - [ ] Redirect to store cart / order submitted
- **Estimated Time:** 2-3 hours

---

## 🚀 Deployment Tasks (Do at launch time)

### Vercel Cron Job for Auto-Cleanup
- **What:** Expired orders auto-purge (marks pending→expired, deletes >30 day old expired orders + files)
- **File:** `api/cleanup-expired.ts` (already created)
- **Schedule:** Daily at 3 AM UTC (configured in `vercel.json`)
- **Requires:** Vercel Pro plan for cron ✅ (Pro active)
- **Env vars to add in Vercel dashboard:**
  - [ ] `CRON_SECRET` — any random string for auth
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Settings → API
- **Estimated Time:** 15 minutes

---

## ⚠️ High Priority (Post-Launch)

### Integrate Email Service for OTP (Quick Store)
- **What:** Currently OTPs logged to console — need real email delivery
- **Suggested:** Resend (simple API, good free tier)
- **Location:** `src/services/qsCustomerService.ts` → `requestOTP()` function
- **Estimated Time:** 1-2 hours

### Implement Password Reset
- **Location:** `src/pages/AuthPage.tsx`
- **What:** Add "Forgot Password" functionality using Supabase Auth
- **Estimated Time:** 1 hour

### Integrate Dodo Payments (if not done)
- **What:** Replace Razorpay with Dodo for both India and global payments
- **Status:** Pending
- **Files to Update:**
  - `api/create-order.ts`
  - `api/verify-payment.ts`
  - `src/pages/Billing.tsx`
  - `src/services/paymentService.ts`
- **Estimated Time:** 4-6 hours

---

## 🌐 Website Integration

### ✅ Completed
- [x] Store Setup (name, URL, slug, logo, currency)
- [x] Products Management (list, add, edit, delete with variants)
- [x] Product Form (variant fetch, size mapping, slug — platform-generic labels)
- [x] Orders Page (list, filter, search, mark paid, download, delete)
- [x] Orders — Kanban view with drag-and-drop (Pending → Paid → Downloaded)
- [x] Orders — Table view with bulk select, Mark as Paid, Download Files
- [x] Orders — Date range picker with presets (Today, This Week, Last 7/30 Days, etc.)
- [x] Orders — Stats cards that reflect selected date range
- [x] Orders — Clear Expired button for bulk cleanup
- [x] Orders — Real file downloads (fetch+blob, not window.open)
- [x] Orders — View toggle (Kanban/Table) with kanban as default
- [x] Orders — Search highlighting in kanban cards
- [x] Orders — Fixed dialog overflow for tall sheet previews
- [x] Orders — Fixed decimal precision for sheet dimensions (.toFixed(2))
- [x] Orders — Green status badges for Paid/Downloaded
- [x] Orders — Hidden "Mark as Paid" for expired orders
- [x] Orders — No page blink on tab switch (silent background refresh)
- [x] Public Builder - Single sheet flow
- [x] Public Builder - Multi-sheet support (layout, export, upload, cart redirect)
- [x] Public Builder - Cart line item properties (Design Code, Sheets, Sheet X of Y)
- [x] Database Schema (printers, products, variants, designs tables)
- [x] Storage Buckets (design-files, printer-assets)
- [x] Builder Settings (appearance, tools, uploads customization)
- [x] Builder Settings — separate WI/QS settings via `context` column (migration 013)
- [x] Builder Settings — colors wired to QS storefront (top bar, background, text, primary)
- [x] Builder Settings — default margin/spacing synced on async load
- [x] Platform-agnostic labeling (Tier 1+2) — "Shopify" → generic in all dashboard UI and marketing pages
- [x] RLS policies for anonymous builder settings access (migration 012)
- [x] Analytics metadata column fix (400 error on storefront)

### ⏳ Pending
- [ ] **Roll Width Configuration** - Currently hardcoded to 22"
- [ ] **Customer Email Capture** - Optional email capture before cart redirect
- [ ] **Progress Feedback** - "Exporting sheet 1 of 3..." during export
- [ ] **Multi-Platform Support (Tier 3)** - Add WooCommerce + custom platform support
  - Add `platform` dropdown to StoreSetup (`'shopify' | 'woocommerce' | 'custom'`)
  - Make `shopify_product_url` nullable in DB, rename to `product_url`
  - ProductForm: conditional flow — Shopify auto-fetch vs. manual variant entry for other platforms
  - `buildCartUrl`: WooCommerce variant (`?add-to-cart={id}`), custom (download-only or webhook)
  - `fetchShopifyVariants` → `fetchVariants` with platform switch
  - Platform-aware cart URL building in `publicBuilderService.ts`
  - Estimated Time: 4-6 hours
  - **Note:** Build as additive code paths (`if shopify → existing code | if woocommerce → new`). Existing Shopify flow stays untouched.

### 🔮 Future
- [ ] CSV import for bulk variant upload
- [ ] Shopify webhook for auto-confirm payment
- [ ] Analytics dashboard (conversion tracking, revenue)
- [ ] WooCommerce variant auto-fetch
- [ ] Custom platform manual variant entry + webhook checkout

---

## 🏪 Quick Store

### ✅ Completed
- [x] Store Setup (name, slug, logo, colors, contact info)
- [x] Homepage Editor (hero, about, testimonials, features, FAQ, footer — all inline with multiple layout variants)
- [x] Products Management (list, add, edit with pricing tiers)
- [x] Orders Management (list, filter, status updates, download sheets)
- [x] Public Storefront (homepage, products, product detail, contact)
- [x] Storefront Layout (4 header styles, multiple footer styles, customer login modal)
- [x] Builder Integration (CollageCreator with area/length pricing)
- [x] Order Submission Flow (customer info modal, sheet upload)
- [x] Customer Accounts System (email OTP login, 20-day sessions)
- [x] Customer Dashboard (order history, profile)
- [x] Printer Customer Management (list, detail, order history)
- [x] All storefront pages (StoreBuilder, StoreContact, StoreOrderStatus, StoreNotFound, StoreAccount)
- [x] All storefront components (PricingTable, OrderStatusTracker, CustomerLoginModal, OrderSubmitModal, OrderSummaryPanel, QSBuilderTopBar)

### ⏳ Pending
- [ ] **Integrate Email Service for OTP** - Currently OTPs logged to console
  - Suggested: Resend (simple API, good free tier)
  - Location: `src/services/qsCustomerService.ts` -> `requestOTP()` function
  - Estimated Time: 1-2 hours

- [ ] **Link Orders to Customer Accounts** - Auto-link `customer_id` when logged in
  - Location: `src/pages/storefront/StoreBuilder.tsx` -> `handleExportComplete()`
  
- [ ] **Pre-fill Customer Info** - Auto-fill name/phone from logged-in account
  - Location: `src/components/quick-store/OrderSubmitModal.tsx`

- [ ] **Guest Checkout Option** - Allow orders without account creation

### 🔮 Future
- [ ] Customer-specific pricing/discounts
- [ ] Order notifications via email
- [ ] Bulk customer import
- [ ] Customer notes/tags for printers

---

## 📌 Medium Priority

### Implement Password Reset
- **Location:** `src/pages/AuthPage.tsx`
- **What:** Add "Forgot Password" functionality using Supabase Auth
- **Estimated Time:** 1 hour

### Usage History Backup
- **What:** Store logs in browser localStorage as backup
- **Estimated Time:** 30 minutes

---

## 🔵 Low Priority (Future)

### Email Notifications
- **What:** Send email after generation with summary
- **Estimated Time:** 2-3 hours

### Optimize Layout Algorithm
- **What:** Improve packing efficiency, reduce wasted space
- **Estimated Time:** 4-6 hours

---

## ✅ Completed (Historical)

**Authentication Migration:**
- [x] Migrated from Outseta to Supabase Auth
- [x] Email/password authentication
- [x] Credits system in Supabase
- [x] Protected routes with ProtectedRoute component

**Core Features:**
- [x] Square inch calculation system
- [x] Usage logging to Supabase
- [x] Confirmation dialog before generation
- [x] Insufficient credits modal
- [x] Sheet Logs page
- [x] Low credit warning system
- [x] Error handling dialogs
- [x] TODO.md project tracking

**March 2026 Orders Page Overhaul:**
- [x] Kanban view with 3 columns (Pending/Paid/Downloaded) + drag-and-drop
- [x] Table view with multi-select checkboxes + bulk actions
- [x] View toggle (Kanban default, Table for bulk ops)
- [x] Date range picker with quick presets + custom calendar
- [x] Stats cards reflecting filtered date range
- [x] Real file downloads via fetch+blob (replaces window.open)
- [x] Clear Expired button on expired stat card
- [x] Cron job API route for auto-purging expired orders (`api/cleanup-expired.ts`)
- [x] Fixed: dialog overflow, decimal precision, status colors, tab-switch blink

---

## 🔗 Key Files Reference

### Authentication
- `src/contexts/AuthContext.tsx` - Supabase Auth provider
- `src/contexts/CreditsContext.tsx` - Credits management
- `src/pages/AuthPage.tsx` - Login/Signup page

### Website Integration
- `src/pages/public-builder/PublicBuilder.tsx` - Public builder wrapper
- `src/pages/website-integration/Orders.tsx` - Orders with Kanban + Table views
- `src/services/publicBuilderService.ts` - Design save/upload
- `src/services/printerService.ts` - Printer/product CRUD
- `src/services/orderService.ts` - Order management
- `src/services/builderSettingsService.ts` - Builder customization
- `api/cleanup-expired.ts` - Cron job for expired order cleanup

### Quick Store
- `src/pages/storefront/StorefrontApp.tsx` - Customer-facing app
- `src/pages/storefront/StorefrontLayout.tsx` - Header/footer variants (all inline)
- `src/pages/storefront/StoreHome.tsx` - Homepage with hero/features/FAQ (all inline)
- `src/services/quickStoreService.ts` - Store CRUD
- `src/services/qsOrderService.ts` - Order management
- `src/services/qsCustomerService.ts` - Customer auth/OTP

### Core Builder
- `src/components/CollageCreator.tsx` - Shared builder component
- `src/utils/layoutAlgorithm.ts` - Packing algorithm
- `src/utils/multiSheetExport.ts` - Multi-sheet export

---

**Note:** Update this file as tasks are completed or new ones are discovered.
