# DTF Layout - Development Notes

## Important Guidelines

### Standalone Builder vs Public Builder - Keep In Sync!

**CRITICAL**: The Standalone Builder (`/app`) and Public Builder (`/builder/:printerSlug/:productSlug`) must have the same features and functionality unless explicitly specified otherwise.

Both builders share the same core component: `CollageCreator.tsx`

#### Differences (by design):
1. **Authentication**: Standalone requires login, Public does not
2. **Credits System**: Only applies to Standalone mode
3. **Top Bar**: Public builder has `PublicBuilderTopBar` with pricing/cart functionality
4. **Download vs Add to Cart**: Standalone downloads directly, Public uploads to Supabase and redirects to Shopify cart
5. **Sheet Width**: Standalone allows changing width; Public has fixed width from product settings (read-only)

#### Must Stay Identical:
- ✅ FloatingLayoutBar (generate, preview, spacing)
- ✅ Image upload and management
- ✅ Background removal
- ✅ Auto-trim
- ✅ Quantity controls
- ✅ Resize controls
- ✅ Layout generation algorithm
- ✅ Preview drawer
- ✅ Multi-sheet support
- ✅ Session recovery

#### When Adding New Features:
1. Check if the feature uses `builderMode` prop
2. If the feature should work in both modes, make sure it's not conditionally hidden
3. For credit-related features, use pattern: `builderMode === "standalone" && <credit-check>`
4. Test in BOTH `/app` and `/builder/test/test` routes

#### Current builderMode Conditionals in CollageCreator.tsx:
- `CreditWarningBanner` - Only in standalone (credits don't apply to public)
- `creditsDisabled` prop on FloatingLayoutBar - Only checks credits in standalone mode
- `widthReadOnly` prop on FloatingLayoutBar - True for public mode (width fixed by product)
- Download handlers - Only show in standalone (public uses Add to Cart flow)

---

## Builder Settings (Website Integration)

Printers can customize their public builder through the Builder Settings page (`/app/website-integration/builder-settings`).

### Settings Sections:

1. **Uploads**
   - Auto resize to 300 DPI
   - Transparent pixel warning
   - Trim warning

2. **Sheet Settings**
   - Display unit (inch/cm/mm)
   - Max height
   - Max number of sheets (1-5)
   - Default margin/spacing

3. **Tools**
   - Image trim mode (off/manual/auto)
   - Background remover toggle
   - Resolution levels (customizable DPI thresholds)
   - Minimum resolution enforcement

4. **Appearance**
   - Background color
   - Top bar color
   - Primary/Secondary colors
   - Text color

5. **Others**
   - Logo as loading spinner
   - Session saver toggle

### Database:
- `printer_builder_settings` table stores all settings
- Each section has a "Use Defaults" toggle
- Settings linked to `printer_id`

---

## Product Sheet Width

Each product has a fixed `sheet_width_inches` value that determines the canvas width in the public builder.

- Stored in `printer_products.sheet_width_inches` column
- Configured in ProductForm when creating/editing products
- Passed to CollageCreator via `initialCanvasWidth` prop
- Displayed as read-only in FloatingLayoutBar for public mode

---

## Session Storage

Sessions are scoped by route:
- Standalone: `session-standalone`
- Public: `session-public-{printerSlug}-{productSlug}`

This ensures users don't accidentally mix up their work between different products.

---

## File Structure

```
src/
├── components/
│   ├── CollageCreator.tsx      # Core builder (used by both modes)
│   ├── FloatingLayoutBar.tsx   # Bottom action bar
│   ├── PreviewDrawer.tsx       # Right-side preview panel
│   └── public-builder/
│       └── PublicBuilderTopBar.tsx  # Public builder specific top bar
├── pages/
│   ├── AppPage.tsx             # Standalone builder page
│   └── public-builder/
│       └── PublicBuilder.tsx   # Public builder page wrapper
│   └── website-integration/
│       ├── BuilderSettings.tsx # Builder customization settings
│       ├── ProductForm.tsx     # Product setup (includes sheet width)
│       └── ...
├── services/
│   ├── builderSettingsService.ts  # CRUD for builder settings
│   └── ...
├── types/
│   ├── builderSettings.ts      # Types for builder settings
│   └── ...
└── db/migrations/
    └── 006_builder_settings.sql # Database schema for settings
```

---

## ⚠️ Infrastructure — DO NOT CHANGE WITHOUT READING

### How Subdomain Routing Works

All `*.dtflayout.com` traffic flows through this chain:

```
Browser request → Cloudflare DNS (wildcard * CNAME, Proxied)
  → dtf-subdomain-proxy Worker (route *.dtflayout.com/*)
    → Checks reserved list → if reserved, passes through
    → If not reserved, proxies to dtflayout.com (Vercel) as a storefront
```

**The `dtf-subdomain-proxy` Worker's reserved list controls everything.** If a subdomain is reserved, the Worker skips it. If not, it's treated as a Quick Store storefront slug.

Current reserved list in the Worker: `['www', 'builder', 'app', 'api', 'admin', 'files']`

### How R2 File Serving Works (files.dtflayout.com)

Images (logos, banners, product images, design files) are stored in Cloudflare R2 bucket `dtf-storage` and served through a dedicated Worker:

```
files.dtflayout.com/store-assets/.../logo.png
  → dtf-subdomain-proxy sees "files" is reserved → passes through
  → r2-files Worker (custom domain: files.dtflayout.com) catches it
  → Reads from R2 bucket via binding (R2_BUCKET → dtf-storage)
  → Returns file with correct Content-Type
```

**Why a Worker instead of R2 Custom Domain?**
The `*.dtflayout.com` wildcard CNAME (Proxied) was intercepting `files.dtflayout.com` requests before R2's custom domain could handle them. The `dtf-subdomain-proxy` Worker runs at Cloudflare's edge before DNS resolution, so it was catching everything. A dedicated Worker with a custom domain assignment takes priority, solving the conflict.

### CRITICAL RULES — Breaking these will break image loading site-wide

1. **NEVER remove `files` from the `dtf-subdomain-proxy` Worker's reserved list.** If removed, the proxy will treat `files.dtflayout.com` as a storefront slug and forward all image requests to Vercel, which returns HTML instead of images.

2. **NEVER re-add `files.dtflayout.com` as an R2 bucket custom domain.** The `r2-files` Worker handles it. Adding it back creates a DNS conflict that breaks file serving.

3. **When adding a new non-Vercel subdomain** (e.g., `cdn.dtflayout.com`, `api2.dtflayout.com`), you MUST add it to THREE places:
   - `dtf-subdomain-proxy` Worker reserved list
   - `src/hooks/useSubdomain.ts` → `RESERVED_SUBDOMAINS` array
   - `src/hooks/useSubdomain.ts` → `isSlugReserved()` function's `RESERVED` array

4. **Cloudflare Free plan limit:** 100,000 Worker requests/day across ALL workers. Every image load counts. Monitor usage in Cloudflare Dashboard → Workers → Metrics. If approaching limit, upgrade to Workers Paid ($5/month for 10M requests).

### Vercel Domain Setup

```
builder.dtflayout.com  → CNAME to Vercel (DNS only, grey cloud)
dtflayout.com          → A record to 76.76.21.21 (DNS only)
www.dtflayout.com      → CNAME to cname.vercel-dns.com (DNS only)
*.dtflayout.com        → CNAME to dtflayout.com (Proxied, orange cloud)
```

**Do NOT add `*.dtflayout.com` as a domain in Vercel project settings.** The Cloudflare proxy + `dtf-subdomain-proxy` Worker handles wildcard routing. Adding a wildcard domain in Vercel causes SSL conflicts.

### Cloudflare Workers Summary

| Worker | Route/Domain | Purpose |
|--------|-------------|---------|
| `dtf-subdomain-proxy` | Route: `*.dtflayout.com/*` | Proxies store subdomains to Vercel, skips reserved ones |
| `r2-files` | Custom domain: `files.dtflayout.com` | Serves R2 bucket files with correct Content-Type |

### Environment Variables (R2 related)

| Variable | Location | Value |
|----------|----------|-------|
| `R2_PUBLIC_URL` | Vercel (server-side) | `https://files.dtflayout.com` |
| `VITE_R2_PUBLIC_URL` | Vercel (client-side) | `https://files.dtflayout.com` |
| `R2_BUCKET` | r2-files Worker binding | `dtf-storage` |
| `R2_ACCOUNT_ID` | Vercel | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Vercel | R2 API token |
| `R2_SECRET_ACCESS_KEY` | Vercel | R2 API secret |
| `R2_BUCKET_NAME` | Vercel | `dtf-storage` |
