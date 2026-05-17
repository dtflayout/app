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
- ✅ Main dashboard — Business-first command center with KPI cards (orders, revenue, credits, pending actions), 30-day stacked area chart by source, action items panel, conditional channel health (WI/QS), unified activity feed. No new DB tables needed.

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
- **Setup:** ✅ gtag.js script in `index.html` with Measurement ID `G-7FMLD6EJCV`. Configured Apr 14, 2026.
- **Auto-tracked by GA4:** page_view, scroll depth, session duration, UTM params, geo, device, referrer, bounce rate.
- **Custom events via `src/lib/ga.ts`:** `trackCTA(label, dest)`, `trackCalculator(action, values)`, `trackDemoBuilder(action, values)`, `trackSectionView(section)`, `trackEvent(name, params)` (generic, used by unified analytics module). All fire `gtag('event', ...)`.
- **Cold email link format:** `dtflayout.com/go/{code}` (tracked short links, see Section 11)
- **GA4 Enhanced Measurement:** Enable in GA4 settings for automatic scroll depth, outbound clicks, site search, video engagement, file downloads.

---

## 11. ANALYTICS INFRASTRUCTURE (added Apr 14, 2026)

### Stack
| Platform | Purpose | Cost | Status |
|----------|---------|------|--------|
| **PostHog** | Product analytics, session recordings, funnels, retention | Free (1M events/mo) | ✅ LIVE |
| **GA4** | Marketing overview, SEO, Google Ads integration | Free | ✅ LIVE |
| **Microsoft Clarity** | Session recordings + heatmaps | Free | ✅ LIVE |
| **Custom Supabase** | Cold email attribution stitching | Included in Pro plan | ✅ Tables created |

### PostHog
- **Project:** "DTF Layout" on US cloud (`us.posthog.com`)
- **SDK:** `posthog-js` (npm package), initialized in `src/main.tsx`
- **Env vars:** `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` (in .env + Vercel)
- **Autocapture:** Enabled — tracks clicks, pageviews, form submissions automatically
- **Session recording:** Enabled (free: 5,000/month)
- **User identification:** `analytics.identify()` called in `AuthContext.tsx` on login/signup; `analytics.reset()` on logout

### Microsoft Clarity
- **Project ID:** `wbnfbu1ji4`
- **Setup:** Script tag in `index.html`
- **Features:** Session recordings, heatmaps, scroll maps, click maps

### GA4
- **Measurement ID:** `G-7FMLD6EJCV`
- **Setup:** gtag.js script in `index.html`
- **Custom events:** Via `src/lib/ga.ts` — `trackEvent()`, `trackCTA()`, `trackCalculator()`, `trackDemoBuilder()`, `trackSectionView()`

### Files
| File | Purpose |
|------|---------|
| `src/lib/posthog.ts` | PostHog init, identify, track, reset, super properties |
| `src/lib/analytics.ts` | Unified analytics module (wraps PostHog + GA4 + server-side). Exports `analytics` object + `trackEvents` helpers |
| `src/lib/ga.ts` | GA4 helpers (updated Apr 14: added `trackEvent` export for unified module) |
| `api/go.ts` | Link redirect: `/go/:code` → logs click to `link_clicks` → 302 redirects with UTMs + `ref` param |
| `api/track.ts` | Server-side event logging for 10 critical attribution events → `visit_events` table |
| `scripts/generate-tracked-links.ts` | CLI: bulk-generate short tracked links from Outscraper CSV for Instantly |

### Database Tables (migration 015)
- **`tracked_links`** — Short code → destination URL + prospect info + UTMs + batch_id. Indexed on `code` (WHERE is_active).
- **`link_clicks`** — Every click on a tracked link (FK to tracked_links). Stores IP, user-agent, referer.
- **`visit_events`** — Critical attribution events only (page_view, signup, purchase). Stores anonymous_id, user_id, UTMs, tracked_link_code.

### Key Patterns
- **Anonymous ID stitching:** Client generates `dtf_anon_id` (localStorage), persists across sessions. On signup, `analytics.identify()` sends it to PostHog + Supabase, linking all pre-signup events to the user.
- **UTM persistence:** First-touch UTMs saved once (never overwritten). Last-touch UTMs always updated. Both attached to PostHog user profile via `setUserPropertiesOnce`.
- **Server-side logging:** Only 10 critical events go to Supabase (`visit_events`). Everything else stays in PostHog. Controlled by `SERVER_EVENTS` whitelist in `analytics.ts`.
- **Link redirect flow:** Cold email `dtflayout.com/go/abc123` → Vercel rewrite to `api/go?c=abc123` → lookup in `tracked_links` → log to `link_clicks` → 302 redirect to destination with UTMs + `ref=abc123` param → client-side `analytics.init()` captures UTMs and `ref` code.

### Cold Email Link Generation
```bash
# Single link
npx tsx scripts/generate-tracked-links.ts --campaign us_texas_wave1 --content email_1 --single "john@shop.com" "PrintShop" "John"

# Bulk from Outscraper CSV
npx tsx scripts/generate-tracked-links.ts --campaign us_texas_wave1 --content email_1 --csv prospects.csv
# Output: tracked-links_us_texas_wave1_email_1.csv → import to Instantly, use {{tracked_link}}
```

### CSP (Content-Security-Policy) in vercel.json
All analytics domains are whitelisted in CSP as of Apr 14, 2026:
- `script-src`: posthog (`us-assets.posthog.com`, `us-assets.i.posthog.com`, `us.i.posthog.com`, `us.posthog.com`), clarity (`www.clarity.ms`, `scripts.clarity.ms`), GA4 (`googletagmanager.com`, `google-analytics.com`), sentry (`*.sentry.io`)
- `img-src`: clarity (`c.clarity.ms`, `c.bing.com`), GA4 (`google-analytics.com`)
- `connect-src`: `https:` (wildcard — covers all analytics endpoints)

### Vercel Config
- **Rewrite:** `{ "source": "/go/:code", "destination": "/api/go?c=:code" }` — must be BEFORE the catch-all `/(.*) → /index.html` rewrite
- **Env vars:** `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (both in .env + Vercel, All Environments)

### Retention & Cleanup
- `visit_events`: Add 180-day purge to `cleanup-expired.ts` (TODO)
- `link_clicks`: No auto-purge (low volume, valuable forever)
- PostHog free tier: 1-year data retention
- GA4: 14-month data retention (default, extendable in settings)

### TODO (post-setup)
- Wire `trackEvents` helpers into specific components (onboarding wizard, builder, orders, credits)
- Set up PostHog dashboards (acquisition funnel, activation, engagement, revenue)
- Enable GA4 Enhanced Measurement in GA4 settings
- Add `visit_events` 180-day purge to `cleanup-expired.ts`
- Email `sales@posthog.com` for 25% startup discount

---

### Session Log Update

| Date | Summary | Items Changed |
|------|---------|---------------|
| 2026-04-14 | Full analytics infrastructure setup. (1) PostHog: installed `posthog-js`, created `src/lib/posthog.ts` (init, identify, track, reset), initialized in `src/main.tsx`, identify/reset wired into `AuthContext.tsx`. (2) GA4: created property `G-7FMLD6EJCV`, replaced placeholder in `index.html`, updated `src/lib/ga.ts` with `trackEvent` export. (3) Microsoft Clarity: created project `wbnfbu1ji4`, added script to `index.html`. (4) Unified analytics: created `src/lib/analytics.ts` (wraps PostHog + GA4 + server, anonymous ID stitching, UTM persistence, typed event helpers). (5) Link tracking: created `api/go.ts` (short link redirect with click logging), `api/track.ts` (server-side event logging), `scripts/generate-tracked-links.ts` (CLI for bulk link generation). (6) Database: ran migration 015 (tracked_links, link_clicks, visit_events tables with RLS). (7) CSP: iteratively added all analytics domains to `vercel.json` script-src and img-src (PostHog, Clarity, Sentry, Bing). (8) Vercel: added `/go/:code` rewrite before catch-all, added PostHog env vars. All three platforms verified live with zero CSP errors. | New: src/lib/posthog.ts, src/lib/analytics.ts, api/go.ts, api/track.ts, scripts/generate-tracked-links.ts, migration 015. Modified: src/main.tsx, src/lib/ga.ts, src/contexts/AuthContext.tsx, index.html, vercel.json, .env, CLAUDE_CONTEXT.md |
| 2026-04-15 | Built main dashboard page. Created `src/services/dashboardService.ts` — parallel data fetcher aggregating KPIs (total orders, revenue, credits balance, pending actions with WI/QS split), 30-day usage chart (grouped by date + source), action items (pending WI + new QS orders), channel health (conditional on setup_completed), and activity feed (unified timeline from usage_logs, designs, quick_store_orders, credit_transactions). Replaced placeholder `src/pages/Dashboard.tsx` with full implementation: 4 KPI cards with trend badges + sparklines, stacked area chart (Recharts, color-coded by source), action items panel with clickable order rows, conditional WI/QS channel health cards (hidden if not set up), and activity feed with color-coded dots + relative timestamps. Quick actions bar: Refresh, New Sheet, Buy Credits, WI Orders, QS Orders. Uses existing design system (shadcn/ui Card, Badge, Button, Tooltip; Lucide icons; font-heading for numbers; indigo/violet palette). Module-level `_dashboardLoaded` flag prevents re-fetch on tab switches. Loading state uses existing Skeletons. No new DB tables or columns needed — all data from existing tables. | New: src/services/dashboardService.ts. Modified: src/pages/Dashboard.tsx, CLAUDE_CONTEXT.md |
| 2026-04-16 | Demo builder fixes on `/demo/builder-live`. (1) Added `isDemoMode?: boolean` prop to `CollageCreator`. When true, suppresses ALL credit gating: hides `CreditWarningBanner`, passes `creditsDisabled={false}` to `FloatingLayoutBar`, AND skips the pre-generation insufficient-credits check in `proceedWithGeneration` (line ~1376). Without the third piece, demo users at 0 credits could click Generate but would hit the "Insufficient Credits" modal during layout calculation. Main builder at 0 credits still blocks generation — gating is `builderMode === "standalone" && !isDemoMode`. Download interception remains in `DemoBuilderLive` via `onClickCapture` handler → signup modal. (2) Moved "Click to Customize" floating button from `top: 50%` to `top: 62%` (user request — slightly lower than center). (3) Full mobile responsiveness pass on demo page: drawer width changed from fixed `420px` to `width: 420, maxWidth: "100vw"`, top bar padding/fonts scale down with `sm:` breakpoints, store name no longer hidden on mobile (was `hidden sm:block`, now always shown with `truncate`). Added inline `<style>` rules targeting new classNames (`.demo-customize-btn`, `.demo-drawer`, `.demo-signup-modal`, etc.): below 640px the customize button becomes icon-only with smaller padding, drawer takes full viewport; below 420px drawer paddings tighten further. (4) Made `FloatingLayoutBar` mobile-responsive (shared across WI/QS/demo). Width `w-full sm:w-[92%] md:w-[85%] lg:w-[80%]`, layout stacks `flex-col md:flex-row` on mobile, removed fixed `w-[180px]`/`w-[80px]`, shortened labels, smaller heights/fonts below sm. Desktop layout at md+ is pixel-identical. (5) Made `Toolbox` mobile-responsive (shared across all builders). Buttons `w-9 h-9 sm:w-11 sm:h-11 md:w-[3.25rem] md:h-[3.25rem]` (36/44/52px), icons `w-4 h-4 sm:w-5 sm:h-5`, flex container `justify-between sm:justify-center gap-0 sm:gap-4 md:gap-6 lg:gap-8` — on mobile the 8 tools auto-distribute across container width instead of using fixed centered gaps (fixes overflow on phones). Labels `text-[10px] sm:text-xs`. Desktop layout at md+ is pixel-identical. | Modified: src/components/CollageCreator.tsx, src/pages/marketing/DemoBuilderLive.tsx, src/components/FloatingLayoutBar.tsx, src/components/Toolbox.tsx, CLAUDE_CONTEXT.md |
| 2026-04-29 | Built Order Automation "Coming Soon" page. New route `/app/order-automation` (printer dashboard, ProtectedRoute). New table `feature_waitlist` (id, email, feature_slug, user_id, source, user_agent, referrer, created_at) with UNIQUE on (email, feature_slug). RLS: anon+authenticated INSERT, authenticated SELECT own rows only. Service `waitlistService.ts` uses `.upsert(..., {ignoreDuplicates:true})` so duplicate submits surface as success. Page composed of 7 sections — hero (eyebrow tag, two CTAs, glassmorphism teaser card with mouse-tilt), 4-step illustrated flow with dashed connector arrows on lg+, mock screenshot inside macOS-style browser frame (4 inline abstract SVG placeholders — burst/wave/rose/letterform — no copyrighted IP), 3-up bento benefit grid with platform pills, primary email capture, FAQ accordion (shadcn), dark footer CTA strip. Decorative elements: dashed-border squares, dot grid, animated indigo/violet orbs (using existing `animate-float` keyframe). Copy centralized in `src/components/order-automation/copy.ts`. Entrance animations via tiny `RevealOnScroll` IntersectionObserver wrapper (honors `prefers-reduced-motion`). Sidebar: extended MenuItem with `badgeVariant?: 'new'|'soon'`, added "Order Automation" entry near Image Enhancer with violet "Soon" pill (Wand2 icon). See section 12 below for the convention. Migration 016 ready to run. Verified: `tsc -p tsconfig.app.json` clean on all new/modified files; `vite build` ✓ 3707 modules (38s, no errors). | New: src/db/migrations/016_feature_waitlist.sql, src/services/waitlistService.ts, src/pages/OrderAutomation.tsx, src/components/order-automation/{copy.ts, RevealOnScroll.tsx, StepCard.tsx, BenefitCard.tsx, MockBrowserFrame.tsx, MockOrderAutomation.tsx, WaitlistForm.tsx, index.ts}. Modified: src/App.tsx, src/components/AppSidebar.tsx, CLAUDE_CONTEXT.md |

---

## 12. COMING SOON PAGES (convention)

> Pattern for future "Coming Soon" pages: SKU Library, Pre-flight Checker, Image Library, etc. First instance: Order Automation (Apr 29, 2026).

### Shared infrastructure
- **Table:** `feature_waitlist` (migration 016). Reused across all upcoming features — distinguish via `feature_slug` column. Current slugs: `order-automation`. Future: `sku-library`, `preflight-checker`, etc.
- **Service:** `src/services/waitlistService.ts` — `joinFeatureWaitlist({ email, featureSlug, source, userId })`. Uses `.upsert` with `ignoreDuplicates:true` — duplicate submissions return success, so the form always shows the same confirmation regardless.
- **RLS:** anon+authenticated can INSERT; authenticated can SELECT only their own rows; no UPDATE/DELETE.
- **Component library:** `src/components/order-automation/` — most components are generic enough to lift into a shared `feature-waitlist/` folder if/when the second Coming Soon page is built. Specifically:
  - `WaitlistForm.tsx` — already takes `featureSlug` via copy.ts; reusable.
  - `MockBrowserFrame.tsx` — already generic.
  - `RevealOnScroll.tsx`, `StepCard.tsx`, `BenefitCard.tsx` — already generic.
  - `MockOrderAutomation.tsx` and `copy.ts` — feature-specific. Each new "Coming Soon" page gets its own.

### Adding a new "Coming Soon" page
1. **Pick a slug.** Add to copy.ts: `FEATURE.slug = 'sku-library'` (or whatever). No migration needed — `feature_waitlist.feature_slug` is just VARCHAR.
2. **Copy file.** Duplicate `src/components/order-automation/copy.ts` → `src/components/<feature>/copy.ts`. Tweak HERO/STEPS/BENEFITS/FAQS/MOCK_*.
3. **Mock screenshot.** Build a feature-specific Mock<Feature>.tsx — same browser-frame wrapper, different inner content. Keep abstract SVG placeholders only — no copyrighted IP.
4. **Page.** Duplicate `src/pages/OrderAutomation.tsx` → `src/pages/<Feature>.tsx`. Replace `MockOrderAutomation` and `from "@/components/order-automation"` imports.
5. **Route.** Add `/app/<feature-slug>` to `src/App.tsx` inside `<ProtectedRoute>`.
6. **Sidebar.** Add a `MenuItem` entry to `src/components/AppSidebar.tsx` with `badge: "Soon"` and `badgeVariant: "soon"` (violet pill). Use a Lucide icon that visually differs from neighbors.

### Sidebar badge variants
- `badgeVariant: "new"` (default) → orange pill (`bg-orange-500/20 text-orange-400`). Used for shipped-but-recent features (e.g. Quick Store).
- `badgeVariant: "soon"` → violet pill (`bg-violet-500/20 text-violet-300`). Used for unreleased "Coming Soon" features.

### Design tokens applied (Order Automation page)
- Headings: Bricolage Grotesque, 700–800 weight. Tracking: tight (`-0.025em` on hero, default elsewhere).
- Body: Inter, 400–600 weight.
- Hero gradient text: `bg-gradient-to-br from-indigo-600 via-violet-600 to-violet-500 bg-clip-text`.
- Pill buttons: `rounded-full bg-gradient-to-br from-indigo-600 to-violet-600` with deep indigo shadow `0_10px_28px_rgba(79,70,229,0.34)`.
- Decorative squares: `1.5px dashed rgba(79,70,229,0.18)`, slight rotation, `borderRadius: size * 0.22`.
- Dot grid: `radial-gradient(circle, rgba(79,70,229,0.18) 1px, transparent 1px)` at 32px tile.
- Orbs: `radial-gradient(circle, rgba(99,102,241|167,139,250|124,58,237 0.14–0.22) 0%, transparent 65%)`, `blur-3xl`, animated via existing `animate-float` keyframe (in `tailwind.config.ts`). Vary `animationDuration` 9–14s and `animationDelay` per orb to avoid synced bobbing.
- Card shadows: `0_2px_8px_rgba(15,23,42,0.04)` resting → `0_12px_36px_rgba(79,70,229,0.12)` hover, with `-translate-y-0.5` lift.
- Footer dark band: `bg-gradient-to-br from-[#0F0D2E] via-[#1E1B4B] to-[#312E81]` (matches sidebar gradient).

### Pre-launch tasks for Order Automation specifically
- ⬜ Run migration 016 against Supabase Pro
- ⬜ Optional: add admin SELECT on `feature_waitlist` via service-role-only API route to surface signup count on dashboard
- ⬜ Optional: weekly cron to email Alok the new signups for the week (reuse Resend infra from `send-contact.ts`)
- ⬜ When feature ships: send launch email to all rows where `feature_slug = 'order-automation'` (use Resend audiences), grant bonus credits to first 50 by `created_at ASC`
| 2026-04-29 (revision) | Round 2 of Order Automation page. (1) Fixed StepCard icon overlap — `inline-flex` on icon block was flowing inline next to the "Step 01" label, causing visual collision. Changed to `flex` (block-level); same fix preemptively applied to BenefitCard. (2) Updated all "20+ minutes" copy references to "30+ minutes" (in subheadings, hero badge points, and benefit title); bumped the derived "100+ hours/year" to "150+ hours/year" to reflect the new math. (3) Reordered sidebar so the last 4 entries are History → Billing → Settings → Help & Support; tools/features (Image Enhancer, Order Automation, Website Integration, Quick Store) moved together above the account/admin block. (4) Soon badge color changed from violet (`bg-violet-500/20 text-violet-300`) to emerald (`bg-emerald-500/20 text-emerald-300`) per founder feedback. (5) Created marketing-site version of the page at `/product/order-automation`. Refactored: extracted the body of the dashboard page into a shared `<OrderAutomationContent pageContext="dashboard"|"marketing" />` component. Both dashboard and marketing pages render the same body — chrome differs (AppLayout/sidebar vs MarketingNav + inline marketing footer). The `pageContext` prop adjusts (a) section `scroll-mt-*` (marketing has fixed top nav, needs more offset) and (b) the WaitlistForm `source` tag prefix (`mkt_*` vs `app_*`) so analytics can split conversion by surface. Added "Order Automation" to MarketingNav products dropdown with an emerald "Soon" pill (both desktop and mobile). Added entry to the marketing footer's Product column. (6) Important: feature_waitlist email capture is currently DB-only — no confirmation emails are sent to the user, no admin notifications. Wiring this up is a TODO (use Resend, same pattern as send-contact.ts). | New: src/components/order-automation/OrderAutomationContent.tsx, src/pages/marketing/OrderAutomation.tsx. Modified: src/pages/OrderAutomation.tsx (now a thin wrapper), src/components/order-automation/{StepCard.tsx, BenefitCard.tsx, copy.ts, index.ts}, src/components/AppSidebar.tsx, src/components/marketing/MarketingNav.tsx, src/App.tsx, CLAUDE_CONTEXT.md |
| 2026-04-29 (round 3) | Closed the marketing footer duplication loose end. Added "Order Automation" entry to the Product column of every marketing page footer (13 files): Home, GangSheetBuilder, WebsiteIntegration, QuickStore, DemoBuilder, DemoWebsiteIntegration, Contact, Faq, Pricing, PrivacyPolicy, RefundPolicy, SavingsCalculatorPage, TermsConditions. Two existing format variants (compact `{l:"X",to:"Y"}` and spaced `{ l: "X", to: "Y" }`) handled separately to avoid corrupting either. Insertion order: between Quick Store and Pricing in all cases. Build verified clean. Underlying duplication remains (each page still inlines its own footer markup) — extracting to a shared `<MarketingFooter />` component is still on the table as a follow-up. | Modified: src/pages/marketing/{Home, GangSheetBuilder, WebsiteIntegration, QuickStore, DemoBuilder, DemoWebsiteIntegration, Contact, Faq, Pricing, PrivacyPolicy, RefundPolicy, SavingsCalculatorPage, TermsConditions}.tsx, CLAUDE_CONTEXT.md |
