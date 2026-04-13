# CLAUDE_CONTEXT.md — DTF Layout Project Memory

> **PURPOSE:** This file is the single source of truth for all past decisions, completed work, outstanding issues, and architecture context for the DTF Layout project. It lives in the repo root and must be read by Claude at the start of every session before doing any work.
>
> **RULES:**
> 1. Every session that makes changes or findings MUST update this file before ending
> 2. Never re-audit or re-flag items marked as ✅ DONE
> 3. When moving an item from TODO to DONE, add the date and a one-line summary of what was done
> 4. This file is append-friendly — add new sections at the bottom, don't restructure existing ones

---

## 1. PROJECT OVERVIEW

- **Product:** DTF Layout (dtflayout.com) — B2B SaaS for Direct-to-Film printing industry
- **Two products:** Website Integration (hosted gang sheet builder) + Quick Store (branded storefront)
- **Stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase + Vercel + Cloudflare + R2 + Dodo Payments
- **Repo:** GitHub org `dtflayout`, repo `dtflayout/app` (currently public — should go private before launch)
- **Branches:** `main` (production, branch-protected) → `dev` (working). Push to dev → PR → merge to main.
- **Founder:** Alok, based in Mumbai. Solo developer. Also runs Culture Shauq (Shopify t-shirt brand).

---

## 2. ARCHITECTURE DECISIONS (settled — do not revisit)

| Decision | Chosen | Why | Date |
|----------|--------|-----|------|
| Auth provider | Supabase Auth (removed Outseta completely) | Native, simpler, JWT-based | Mar 2026 |
| Payments | Dodo Payments (migrated from Razorpay) | Works for India + global, single provider | Mar 2026 |
| File storage | Cloudflare R2 via presigned URLs (removed Supabase Storage) | No body size limits, cheaper | Mar 2026 |
| Credit model | Prepaid credits (sq. inches), no subscriptions | Simpler for DTF printers who have variable usage | Nov 2025 |
| Layout DPI | 150 DPI standard (300 DPI optional page exists) | 300 DPI crashes browsers at 13+ images | Nov 2025 |
| Customer auth (QS) | Email + OTP via Resend (not Supabase Auth) | Per-store customers, passwordless, lower friction | Apr 2026 |
| Design system | Bricolage Grotesque headings + Inter body, indigo/violet palette | Pexo-style, consistent across marketing + app | Mar 2026 |
| Marketing pages | Inline styles (no Tailwind/shadcn) | Different rendering context | Mar 2026 |
| Subdomain routing | Cloudflare Worker `dtf-subdomain-proxy` proxies to Vercel | Avoids nameserver delegation to Vercel | Apr 2026 |
| R2 file serving | Cloudflare Worker `r2-files` on `files.dtflayout.com` | Dedicated worker, never re-add as R2 custom domain | Apr 2026 |

---

## 3. INFRASTRUCTURE NOTES (do not re-diagnose)

- **DNS conflict (resolved Apr 2026):** Cloudflare wildcard Worker was intercepting `files.dtflayout.com`. Fixed with dedicated `r2-files` Worker. Never re-add `files.dtflayout.com` as an R2 bucket custom domain.
- **Supabase ISP block (resolved):** Indian ISPs block Supabase directly. Fixed with custom domain + Cloudflare proxy.
- **Vercel Pro:** Required for subdomain support and cron jobs. Connected to `dtflayout/app`, auto-deploys from `main`.
- **Cloudflare Free plan:** 100K Worker requests/day limit.
- **Subdomain reserved list:** Must be kept in sync between `dtf-subdomain-proxy` Worker AND `src/hooks/useSubdomain.ts` `RESERVED_SUBDOMAINS` array. Currently includes: www, app, api, admin, blog, help, files, support, status, mail, billing, dashboard, login, signup, auth, oauth, pricing, about, contact, terms, privacy, faq, docs, developer, developers, store, stores, quick-store, quickstore, test, demo, builder.

---

## 4. SECURITY WORK — COMPLETED ✅

### 4.1 Auth & Access Control
- ✅ **claim-free-trial.ts JWT validation** — Validates Bearer token via `anonClient.auth.getUser(token)`, ignores client-supplied user_id. Fixed Apr 10, 2026.
- ✅ **create-checkout.ts JWT validation** — Same pattern. Uses JWT-verified user_id/email. Fixed Mar 2026.
- ✅ **Atomic credit RPCs** — `deduct_credits_atomic`, `add_credits_atomic`, `claim_free_trial_atomic` all use `SELECT ... FOR UPDATE` in Postgres. Prevents double-spending and race conditions. Fixed Mar 2026.
- ✅ **FREE_TRIAL_CREDITS mismatch fixed** — Unified to 20,000 sq.in. Removed old client-side `claimFreeTrial` function from CreditsContext. Fixed Apr 10, 2026.
- ✅ **Disposable email blocking** — `claim-free-trial.ts` checks against blocklist of ~50 disposable email domains. Added Apr 2026.
- ✅ **Outseta fully removed** — Deleted `outseta-activity.ts`, login/signup pages, toolkit dependency, env vars. Confirmed Mar 2026.

### 4.2 CORS
- ✅ **claim-free-trial.ts** — Uses regex: `/^https:\/\/[\w-]+\.dtflayout\.com$/`. Fixed Mar 2026.
- ✅ **create-checkout.ts** — Same regex pattern. Fixed Mar 2026.
- ✅ **dodo-webhook.ts** — No CORS needed (server-to-server). Correct.
- ⚠️ **r2-presign.ts** — Uses `origin.endsWith(".dtflayout.com")` which is bypassable. SEE TODO #5.1.
- ⚠️ **r2-delete.ts** — Same `endsWith` issue. SEE TODO #5.1.

### 4.3 Rate Limiting
- ✅ **Upstash Redis rate limiting** — `paymentLimiter` (5/60s), `generalLimiter` (20/60s), `publicLimiter` (30/60s). Applied to all API routes. Fixed Mar 2026.
- ✅ **QS order rate limits** — 50 orders/day per store, 10 orders/day per phone number. Client-side check in `qsOrderService.ts`.

### 4.4 Infrastructure Security
- ✅ **Security headers in vercel.json** — X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy, CSP. Added Mar 2026. CSP `connect-src` widened to `https:` on Apr 11, 2026 — required because printers enter arbitrary Shopify/WooCommerce URLs for variant fetching.
- ✅ **Strict cron auth** — `cleanup-expired.ts` requires `Bearer ${CRON_SECRET}` header, fails if env var not set. Fixed Mar 2026.
- ✅ **Webhook signature verification** — `dodo-webhook.ts` uses `standardwebhooks` library to verify Dodo signatures. Added Mar 2026.
- ✅ **Idempotent webhook processing** — Checks `credit_transactions` for existing `payment_id` before adding credits. Added Mar 2026.
- ✅ **R2 key prefix validation** — Only `design-files/`, `store-assets/`, `printer-assets/` allowed. Path traversal blocked (`..`, `//`). Added Mar 2026.
- ✅ **R2 content type validation** — Only image MIME types allowed for presigned uploads. Added Mar 2026.
- ✅ **R2 delete ownership verification** — Checks store/printer ownership via Supabase before allowing deletes (except `printer-assets/`, see TODO #5.3). Added Mar 2026.

### 4.5 Code Quality
- ✅ **PII stripped from console.log** — Emails replaced with [REDACTED] or just user IDs. Verified across all API routes and services. Fixed Mar 2026.
- ✅ **Sentry integrated** — Client-side (React ErrorBoundary) and server-side (API routes). `api/lib/sentry.ts` + `src/lib/sentry.ts`. Added Mar 2026.

### 4.6 Database
- ✅ **CHECK constraint on credits.balance** — `balance >= 0` prevents negative balances. Added Mar 2026.
- ✅ **RLS on credit_transactions** — Append-only (no UPDATE/DELETE). Added Mar 2026.
- ✅ **RLS on printers** — `Anyone can view active printers` (SELECT where is_active = true). Added Apr 2026.
- ✅ **RLS on printer_builder_settings** — `Anyone can view builder settings` (SELECT). Added Apr 2026.
- ✅ **RLS on ALL tables** — Every table has RLS enabled via migrations 001-013. Tables covered: credits, credit_transactions, profiles, printers, printer_products, printer_variants, printer_builder_settings, designs, quick_stores, quick_store_products, quick_store_orders, quick_store_customers, quick_store_analytics, quick_store_messages, quick_store_testimonials, quick_store_otps. Verified Apr 11, 2026.
- ⚠️ **Some SELECT policies were overly permissive** — Fixed via `014_tighten_rls_policies.sql` on Apr 11, 2026. Tightened `quick_store_customers`, added `credit_transactions` SELECT/INSERT, added public read for `printer_products`/`printer_variants`.
- ✅ **Analytics 90-day retention purge** — Added to `cleanup-expired.ts` cron. Added Mar 2026.
- ✅ **quick_store_analytics_daily aggregation table** — Created. Mar 2026.

### 4.7 Input Validation
- ✅ **Reserved slug validation** — All 4 slug entry points (WISetupWizard, WI StoreSetup, QSSetupWizard, QS StoreSetup) now check `isSlugReserved()` before saving. QS setup also shows instant "taken" indicator for reserved slugs. Fixed Apr 11, 2026.

---

## 5. SECURITY WORK — TODO (outstanding as of Apr 11, 2026)

### ~~5.1~~ ✅ DONE: CORS `endsWith` bypass on R2 endpoints
**Fixed Apr 11, 2026.** Replaced `endsWith` with regex in `r2-presign.ts` and `r2-delete.ts`.

### ~~5.2~~ ✅ DONE: RLS SELECT policies tightened
**Fixed Apr 11, 2026.** Ran `014_tighten_rls_policies.sql`. Tightened `quick_store_customers` SELECT to active stores only, added `credit_transactions` SELECT/INSERT for users, added public read for `printer_products`/`printer_variants`. Cleaned up duplicate policies.

### ~~5.3~~ ✅ DONE: `printer-assets/` ownership bypass in r2-delete
**Fixed Apr 11, 2026.** Now verifies user owns the printer via `store_id` or `user_id` match.

### ~~5.4~~ ✅ DONE: Stored XSS via `live_chat_script` innerHTML
**Fixed Apr 11, 2026.** Disabled script execution in both `StoreBuilder.tsx` and `PublicBuilder.tsx`. Printers can still save their widget code in settings, but it won't execute. To re-enable: add a domain whitelist (e.g. Tawk.to, Crisp, Intercom) that validates the `src` attribute of any `<script>` tag before injection. ~15 min job when needed.

### 5.5 🟠 HIGH: Customer auth is localStorage-only (no server-side session)
**Files:** `src/services/qsCustomerService.ts`, `src/contexts/CustomerAuthContext.tsx`
**Issue:** After OTP verification, customer UUID stored in localStorage (30-day expiry). No session token validation on subsequent requests. Forged localStorage = account takeover.
**Fix:** Return signed session token from verify-otp API, validate on data access. OR ensure RLS prevents cross-customer access.
**Status:** NOT STARTED — OTP login implemented (Apr 11, 2026) but session model unchanged. Auth switched from password to OTP via `api/send-otp.ts` + `api/verify-otp.ts` using Resend for email delivery.

### ~~5.6~~ ✅ DONE: `r2-presign` MAX_FILE_SIZE enforcement
**Fixed Apr 11, 2026.** Client sends `contentLength` with presign request. Server validates against 100MB limit and passes `ContentLength` to PutObjectCommand.

### ~~5.7~~ ✅ DONE: ilike search pattern injection
**Fixed Apr 11, 2026.** Added `replace(/[%_\\]/g, '\\$&')` escaping in `qsCustomerService.ts` and `qsOrderService.ts`.

### ~~5.8~~ ✅ DONE: Order codes are predictable
**Fixed Apr 11, 2026.** Client-side fallback now uses `crypto.getRandomValues` with same charset as DB function. DB function was already random.

### 5.9 🟡 MEDIUM: CSP allows `unsafe-inline` and `unsafe-eval`
**File:** `vercel.json`
**Issue:** Weakens XSS protection, especially combined with live_chat_script issue.
**Fix:** Move to nonce-based CSP or tighten script-src.
**Status:** NOT STARTED

### ~~5.10~~ ✅ DONE: Cleanup cron doesn't delete paid/downloaded WI files
**Fixed Apr 11, 2026.** Added Step 3 in `cleanup-expired.ts` that deletes R2 files + DB records for WI orders with status `paid` or `downloaded` where `expires_at < thirtyDaysAgo`.

### ~~5.11~~ ✅ DONE: Missing `Vary: Origin` on R2 CORS responses
**Fixed Apr 11, 2026.** Added `res.setHeader("Vary", "Origin")` to `r2-presign.ts` and `r2-delete.ts`.

### ~~5.12~~ ✅ DONE: Google OAuth redirect hardcoded to `/builder-150`
**Fixed Apr 11, 2026.** Changed redirect to `/app/dashboard`. Stores intended path in sessionStorage before OAuth for future use.

### ~~5.13~~ ✅ DONE: `.env` with real Supabase anon key in public repo
**Verified Apr 11, 2026.** `git log --all --full-history -- .env` returned empty — file was never committed. No rotation needed. Repo should still go private before launch (see deployment checklist 6.11).

---

## 6. DEPLOYMENT CHECKLIST (pre-launch)

| # | Task | Status |
|---|------|--------|
| 6.1 | Rename `App.original.tsx` → `App.tsx` (removes coming soon page) | ✅ DONE (Apr 11, 2026) |
| 6.2 | Add `CRON_SECRET` env var in Vercel | ✅ DONE (verified Apr 11, 2026) |
| 6.3 | Add `SUPABASE_SERVICE_ROLE_KEY` env var in Vercel | ✅ DONE (verified Apr 11, 2026) |
| 6.4 | Verify cron job `api/cleanup-expired.ts` runs daily (Vercel Pro required) | ✅ DONE — manual run returned 200, "Purged 0 records older than 90 days" (Apr 11, 2026) |
| 6.5 | Set `DODO_LIVE_MODE=true` when ready for real payments | ⬜ NOT DONE — flip when ready |
| 6.6 | Test full multi-sheet public builder flow (3+ sheets at 300 DPI) after Supabase Pro | ⬜ NOT DONE |
| 6.7 | Enable Supabase Pro + PITR backups | ⬜ NOT DONE |
| 6.8 | Verify Upstash Redis env vars set (rate limiting active) | ✅ DONE (verified Apr 11, 2026) |
| 6.9 | Verify `DODO_WEBHOOK_KEY` set | ✅ DONE (verified Apr 11, 2026) |
| 6.10 | Verify `DODO_PAYMENTS_API_KEY` set | ✅ DONE (verified Apr 11, 2026) |
| 6.11 | Make GitHub repo private | ⬜ NOT DONE |
| 6.12 | Verify `RESEND_API_KEY` env var set in Vercel | ✅ DONE (Apr 11, 2026) |

---

## 7. FEATURE WORK — COMPLETED

- ✅ Quick Store Kanban + Table view with drag-and-drop, bulk actions, date range picker
- ✅ Website Integration orders with credit deduction on approval
- ✅ BuilderSettings white-labeling (Google Fonts, button styles, color themes, favicon)
- ✅ Multi-sheet support in CollageCreator
- ✅ Marketing pages (Pricing with savings calculator, FAQ, Contact)
- ✅ Cold email infrastructure (Instantly.ai, dtflayout.co sending domain, Outscraper prospecting tool)
- ✅ Order expiry system (10 days from paid/downloaded, 30-day grace before deletion)
- ✅ Customer auth via email OTP (Resend for email delivery, Supabase RPC for OTP generate/verify, localStorage session with 30-day expiry)
- ✅ Session recovery modal for interrupted builder sessions
- ✅ Skeleton loading states across all pages
- ✅ Demo pages with GA4 tracking (interactive builder demo at `/demo/builder` with live customization, standalone savings calculator at `/savings-calculator`, "Try Demo" banner on WI marketing page)

---

## 8. FEATURE WORK — TODO / PLANNED

### Manual Testing Status (as of Apr 11, 2026)
- ✅ A (WI Printer Setup) — tested Apr 11
- ✅ B (Products & Variants) — tested Apr 11
- ✅ C (Public Builder WI) — tested Apr 11
- ✅ D (WI Printer Orders) — tested Apr 11
- ✅ E (QS Setup) — tested Apr 11
- ✅ F4-F10 (Customer Auth) — tested Apr 11 (OTP-based)
- ⬜ F11-F12 (Rate limits) — skipped, logic verified in code
- ✅ G (QS Printer Orders) — tested Apr 11
- ⬜ H (Billing & Payments) — needs Dodo live mode
- ⬜ I (Edge Cases) — not tested
- ✅ J (Deployment Verification) — env vars verified, cron confirmed

- ✅ Demo pages — Interactive builder demo at `/demo/builder` (live customization: 7 color pickers, font picker, button style, logo upload, store name) + savings calculator at `/savings-calculator`. GA4 tracking. "Try Demo" section added to WI marketing page. Created Apr 13, 2026.
- ⬜ Image editing tools (background remover, auto-trim, enhancer, stroke/outline, eraser)
- ⬜ Real-ESRGAN AI upscaling via Replicate API
- ⬜ Shopify App Store listing
- ⬜ YouTube comparison videos (vs Drip Apps / Kixxl)
- ⬜ Unique constraint on `credit_transactions(user_id, payment_id)` — waiting for Dodo integration since payment_ids were NULL during Razorpay era
- ✅ Fix `quick_store_analytics` 400 (Bad Request) — CHECK constraint on `event_type` was too narrow; missed 6 event types added later (contact_view, contact_submit, whatsapp_click, phone_click, email_click, order_status_view). Widened constraint via ALTER TABLE. Fixed Apr 11, 2026.
- ✅ Add credit deduction confirmation dialog to WI orders — matches QS behavior. All 3 "Mark as Paid" entry points (dropdown, kanban drag, detail panel) plus bulk action now show confirmation with credit balance preview. Fixed Apr 11, 2026.

---

## 9. SESSION LOG

> Add a brief entry after every work session. Format: `YYYY-MM-DD | Summary | Items changed`

| Date | Summary | Items Changed |
|------|---------|---------------|
| 2025-11-13 | Initial SaaS architecture discussion | Stack decided |
| 2025-11-21 | GitHub repo setup, Outseta integration, credit system, generation history | Core app |
| 2025-11-23 | Razorpay integration planning, pricing tiers | Payments |
| 2026-03-24 | Pre-launch playbook: 17/20 tasks done. Security hardening, PII cleanup, Outseta removal, Sentry, rate limiting, atomic RPCs | Sections 4.1–4.6 |
| 2026-04-02 | DNS/Cloudflare configuration, subdomain routing, R2 file serving fix | Section 3 |
| 2026-04-03 | Builder settings RLS, storefront builder fix, pre-launch infra checklist | Sections 4.6, 6 |
| 2026-04-10 | Trial flow audit: JWT fix on claim-free-trial, credits mismatch fix, manual test checklist | Sections 4.1, 4.6 |
| 2026-04-11 | Full security audit. Created CLAUDE_CONTEXT.md. Fixed all 13 security issues (5.1–5.13). Also found and fixed reserved slug validation bug (A6) — www/api/files/admin were accepted as store slugs. Added `isSlugReserved` checks to all 4 setup pages. Remaining post-launch: 5.5 (customer auth hardening), 5.9 (CSP tightening). | All sections |
| 2026-04-11 | Fixed quick_store_analytics 400 bug (CHECK constraint missing 6 event types). Added WI credit deduction confirmation dialog matching QS behavior. | Sections 8, Orders.tsx |
| 2026-04-11 | Replaced Quick Store customer auth from email+password to email+OTP. Set up Resend (domain verified, API key in Vercel). Created `api/send-otp.ts` and `api/verify-otp.ts`. Rewrote `CustomerLoginModal.tsx` (2-step: email → 6-digit code with auto-submit, paste, resend cooldown). Replaced `customerLogin`/`customerRegister` with `sendCustomerOtp`/`verifyCustomerOtp` in service. Session bumped from 20→30 days. | Sections 2, 5.5, 6, 7, 9 |
| 2026-04-11 | Manual testing session. Fixed analytics 400 (CHECK constraint widened for 6 new event types). Added WI paid confirmation dialog. Fixed CSP `connect-src` blocking Shopify variant fetches (widened to `https:`). Tested B1-B7 (Products & Variants ✅), E1-E8 (QS Setup ✅), F4-F10 (Customer Auth ✅). Verified all Vercel env vars set. Confirmed cron job runs (200, 0 purged). Updated deployment checklist: 6.1-6.4, 6.8-6.10, 6.12 all ✅. Remaining for launch: 6.5 (Dodo live), 6.7 (Supabase Pro), 6.11 (repo private). | Sections 4.4, 6, 8, vercel.json, Orders.tsx |
| 2026-04-13 | Demo pages & GA4 tracking. Created: (1) `src/lib/ga.ts` — lightweight GA4 event helpers (trackCTA, trackCalculator, trackDemoBuilder, trackSectionView). (2) `/demo/builder` — interactive builder demo page (`DemoBuilder.tsx`): faithful 300 DPI builder preview with live customization controls (7 color pickers with hex display, font dropdown + custom Google Font input, button style picker, temporary logo upload via blob URL, store name input, reset to defaults). Preview matches actual PublicBuilder layout (top bar → body with upload zone/toolbox/image cards → action bar). All interactions tracked via GA4 custom events. (3) `/savings-calculator` — standalone savings calculator (extracted from Pricing page) with GA4 tracking on every interaction (width, price, competitor, sheets slider, plan changes, CTA clicks with full context). (4) Added "Try Live Demo" banner section to existing `WebsiteIntegration.tsx` marketing page, linking to `/demo/builder`. (5) Added GA4 gtag.js script to `index.html` (placeholder `G-XXXXXXXXXX`). Routes added to App.tsx. | New files: src/lib/ga.ts, src/pages/marketing/DemoBuilder.tsx, src/pages/marketing/SavingsCalculatorPage.tsx. Modified: App.tsx, index.html, WebsiteIntegration.tsx, CLAUDE_CONTEXT.md |

---

## 10. DEMO & TRACKING ARCHITECTURE

### Demo Pages (created Apr 13, 2026)
- **`/demo/builder`** — Interactive builder demo page for cold email outreach. Printers can customize the builder appearance live: 7 color zones (Background, Top Bar, Action Bar, Primary, Text, Toolbox Icons, Image Card) with native color pickers + hex display, font picker (20 curated Google Fonts + custom name input), button style (Pill/Rounded/Square), logo upload (temp blob URL, session-only), store name. Preview is a faithful replica of the actual 300 DPI PublicBuilder (top bar with logo/store name/sheet dimensions/Add to Cart → body with upload zone/toolbox/image cards → action bar). Reset to defaults button. GA4 tracks every customization change.
- **`/savings-calculator`** — Standalone savings calculator page. Full calculator from Pricing page with dedicated hero. Every interaction tracked via GA4 (slider moves debounced at 500ms, dropdown changes, plan switches). CTA clicks include full context (competitor, sheets, plan, monthly/yearly savings).
- **WI marketing page** — Added "Try Live Demo" banner section (dark gradient card with mini builder preview) linking to `/demo/builder`. Inserted before the CTA section.

### Tracking: GA4 (Google Analytics 4)
- **Setup:** gtag.js script added to `index.html` with placeholder `G-XXXXXXXXXX`. Replace with actual Measurement ID from analytics.google.com.
- **Auto-tracked by GA4:** page_view, scroll depth, session duration, UTM params, geo, device, referrer, bounce rate.
- **Custom events via `src/lib/ga.ts`:** `trackCTA(label, dest)`, `trackCalculator(action, values)`, `trackDemoBuilder(action, values)`, `trackSectionView(section)`. All fire `gtag('event', ...)`.
- **Cold email link format:** `dtflayout.com/demo/builder?utm_source=instantly&utm_medium=email&utm_campaign={campaign_name}&utm_content={email_variant}`
- **GA4 Enhanced Measurement:** Enable in GA4 settings for automatic scroll depth, outbound clicks, site search, video engagement, file downloads.
- **TODO:** Create GA4 property and replace `G-XXXXXXXXXX` in `index.html`.
