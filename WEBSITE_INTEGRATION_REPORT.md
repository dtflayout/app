# DTF Layout - Website Integration Report

**Generated:** February 26, 2026  
**Scope:** Website Integration Feature - Pre-Launch Analysis

---

## 📋 EXECUTIVE SUMMARY

The Website Integration feature enables DTF printers to embed a public gang sheet builder on their Shopify stores. Customers create layouts, select the appropriate size variant based on sheet height, and get redirected to Shopify cart with the design files uploaded to storage.

**Current Status:** Core functionality complete. Pending Supabase Pro upgrade for large file testing.

---

## 🛑 ON-HOLD / PENDING TASKS (Website Integration Only)

### 🔴 CRITICAL - Blockers

| # | Task | Status | Est. Time |
|---|------|--------|-----------|
| 1 | **Supabase Pro Upgrade** - 300 DPI multi-sheet files exceed 50MB free tier | BLOCKED | 30 mins |
| 2 | **Test Multi-Sheet Flow** - End-to-end with 3+ sheets at 300 DPI | BLOCKED | 2-3 hrs |

### 🟠 HIGH PRIORITY - Before Launch

| # | Task | Location | Est. Time |
|---|------|----------|-----------|
| 3 | **Roll Width Configuration** | `PublicBuilder.tsx` | 1 hr |
| | Currently hardcoded to 22". Should read from product settings. | | |
| 4 | **Export Progress Feedback** | `PublicBuilder.tsx` | 1 hr |
| | Add "Exporting sheet 1 of 3..." during multi-sheet export | | |
| 5 | **Customer Email Capture** | `PublicBuilderTopBar.tsx` | 1-2 hrs |
| | Optional email capture modal before cart redirect | | |

### 🟡 MEDIUM PRIORITY - Post-Launch

| # | Task | Est. Time |
|---|------|-----------|
| 6 | Auto-expire designs cron job (48hr cleanup) | 2-3 hrs |
| 7 | CSV import for bulk variant upload | 4 hrs |
| 8 | Shopify webhook for auto-confirm payment | 4-6 hrs |

---

## 🏗️ ARCHITECTURE OVERVIEW

### Tech Stack
- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Canvas:** Fabric.js
- **Database:** Supabase (PostgreSQL)
- **Auth (Printers):** Supabase Auth (email/password)
- **Auth (Public Builder):** None required
- **Storage:** Supabase Storage
- **Hosting:** Vercel
- **Payments:** Dodo Payments (to be integrated)

### Website Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSITE INTEGRATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRINTER DASHBOARD (/app/website-integration)                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Store Setup (name, URL, slug, logo, currency)         │    │
│  │ • Products (Shopify variants with size mapping)         │    │
│  │ • Orders (view, download, mark paid)                    │    │
│  │ • Builder Settings (colors, tools, behavior)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  PUBLIC BUILDER (/builder/:printerSlug/:productSlug)            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • No auth required                                       │    │
│  │ • Loads printer config + product variants                │    │
│  │ • Customer uploads images, generates layout              │    │
│  │ • Variant matched per sheet based on height              │    │
│  │ • Export → Upload to storage → Redirect to Shopify cart  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Core: CollageCreator

The `CollageCreator.tsx` component is used by ALL three products:

| Product | Route | Mode Prop | Auth | Credits |
|---------|-------|-----------|------|---------|
| Standalone | `/app` | `"standalone"` | Required | Deducted on generate |
| Website Int. | `/builder/:slug/:slug` | `"public"` | None | Deducted on download |
| Quick Store | `{slug}.dtflayout.com` | `"quickstore"` | Optional | Deducted on download |

**⚠️ IMPORTANT:** Changes to CollageCreator affect ALL products!

---

## 💾 DATABASE SCHEMA (Website Integration)

### Tables

| Table | Purpose |
|-------|---------|
| `printers` | Printer accounts linked to Supabase auth users |
| `printer_products` | Products with Shopify links and sheet width |
| `printer_variants` | Size variants with prices and cart URLs |
| `printer_builder_settings` | Builder customization (colors, tools, etc.) |
| `designs` | Customer-created designs with sheet data |

### Entity Relationships

```
printers (1)
    │
    ├── printer_products (N)
    │       │
    │       └── printer_variants (N)
    │
    ├── printer_builder_settings (1)
    │
    └── designs (N)
```

### Key Columns

**printers:**
- `id`, `user_id`, `store_id`, `slug`, `store_name`, `store_url`, `logo_url`, `currency`

**printer_products:**
- `id`, `printer_id`, `shopify_product_url`, `product_name`, `product_slug`, `size_unit`, `sheet_width_inches`

**printer_variants:**
- `id`, `printer_product_id`, `shopify_variant_id`, `variant_name`, `size_value`, `price`, `cart_url`

**designs:**
- `id`, `design_code`, `printer_id`, `printer_product_id`, `sheets` (JSONB), `sheet_count`, `total_price`, `status`, `expires_at`

---

## 🔄 DATA FLOW: Customer Journey

```
1. Customer visits: /builder/{printerSlug}/{productSlug}
                           │
2. Load printer config ────┘
   • getPublicPrinter(slug)
   • getPublicProduct(printerId, productSlug)
   • getBuilderSettingsBySlug(slug)
                           │
3. Customer uploads images ◄┘
   • Images stored in browser memory
   • Thumbnails generated for preview
                           │
4. Generate Layout ────────┘
   • layoutAlgorithm.ts packs images
   • Multi-sheet if needed (multiSheetPacker.ts)
   • Each sheet gets heightInches calculated
                           │
5. Variant Matching ───────┘
   • findMatchingVariant(heightInches, variants, sizeUnit)
   • Selects smallest variant >= sheet height
   • TopBar shows pricing per sheet
                           │
6. "Add to Cart" clicked ──┘
   │
   ├── saveDesign() → generates design_code (e.g., DTF-A7X3K2)
   ├── uploadSheetFile() → {store_id}/{design_code}/sheet_1.png
   ├── uploadPreviewFile() → {store_id}/{design_code}/preview_1.png
   └── buildCartUrl() → Shopify cart URL with variant IDs
                           │
7. Redirect to Shopify ────┘
   • Customer completes payment on Shopify
   • Printer sees order in dashboard
   • Downloads files, credits deducted
```

---

## 📁 FILE STRUCTURE (Website Integration)

```
src/
├── pages/
│   ├── public-builder/
│   │   ├── index.ts
│   │   └── PublicBuilder.tsx      # Main public builder page
│   └── website-integration/
│       ├── index.ts
│       ├── WebsiteIntegrationLayout.tsx  # Dashboard layout
│       ├── StoreSetup.tsx         # Store configuration
│       ├── Products.tsx           # Product list
│       ├── ProductForm.tsx        # Add/edit product
│       ├── Orders.tsx             # Order management
│       └── BuilderSettings.tsx    # Builder customization
│
├── components/
│   ├── CollageCreator.tsx         # SHARED core builder
│   ├── public-builder/
│   │   ├── index.ts
│   │   └── PublicBuilderTopBar.tsx  # Pricing & cart button
│   └── FloatingLayoutBar.tsx      # Generate/preview controls
│
├── services/
│   ├── publicBuilderService.ts    # Design save, upload, cart URL
│   ├── printerService.ts          # Printer/product CRUD
│   ├── orderService.ts            # Order management
│   └── builderSettingsService.ts  # Settings CRUD
│
├── types/
│   ├── publicBuilder.ts           # Public builder types
│   └── builderSettings.ts         # Settings types
│
└── db/migrations/
    ├── 001_printer_tables.sql     # printers, products, variants
    ├── 002_add_product_slug.sql
    ├── 003_add_printer_currency.sql
    ├── 004_create_designs_table.sql
    └── 005_setup_storage_buckets.sql
```

---

## 📊 STORAGE CONFIGURATION

### Buckets

| Bucket | Public | Size Limit | Purpose |
|--------|--------|------------|---------|
| `printer-assets` | Yes | 5MB | Logos |
| `design-files` | Yes | 100MB | Sheet PNGs |

### File Paths

```
design-files/
  └── {store_id}/
      └── {design_code}/
          ├── sheet_1.png      # Full resolution (300 DPI)
          ├── sheet_2.png
          ├── preview_1.png    # Low-res preview
          └── preview_2.png
```

### ⚠️ Storage Limits

- **Free Tier:** 50MB per file, 1GB total
- **Pro Plan:** 5GB per file, 100GB total

**Current Issue:** 300 DPI multi-sheet exports can exceed 50MB. Need Pro upgrade.

---

## 🔐 SECURITY

### Row Level Security (RLS)

All tables have RLS enabled:
- **Printers/Products/Variants/Settings:** User can only access their own
- **Designs:** Anyone can INSERT (customers), Printer can SELECT/UPDATE/DELETE

### Public Access Points

| Endpoint | Access | Purpose |
|----------|--------|---------|
| `/builder/:slug/:slug` | Public | Customer builder |
| `getPublicPrinter()` | Public | Load printer config |
| `getPublicProduct()` | Public | Load product + variants |
| `saveDesign()` | Public | Save customer design |
| `uploadSheetFile()` | Public | Upload design files |

### Sensitive Operations

| Operation | Access | Notes |
|-----------|--------|-------|
| Update design status | Authenticated | Printer only |
| Download design files | Authenticated | Printer only, credits deducted |
| Delete designs | Authenticated | Printer only |
| Modify products | Authenticated | Printer only |

---

## 📋 PRE-LAUNCH CHECKLIST

### Supabase
- [ ] Upgrade to Pro plan
- [ ] Verify storage buckets exist
- [ ] Verify RLS policies active
- [ ] Test file upload with 100MB+ files

### Testing
- [ ] Single-sheet flow end-to-end
- [ ] Multi-sheet flow (3+ sheets, 300 DPI)
- [ ] Variant matching edge cases
- [ ] Cart redirect with different Shopify themes
- [ ] Order management in printer dashboard
- [ ] File download functionality

### Vercel
- [ ] Environment variables set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `DODO_API_KEY` (when integrated)

---

## 🎯 RECOMMENDED LAUNCH SEQUENCE

### Phase 1: Infrastructure (Day 1)
1. Upgrade Supabase to Pro
2. Verify storage works with large files
3. Test upload/download flow

### Phase 2: Testing (Day 2)
1. Single-sheet Website Integration flow
2. Multi-sheet flow with 3+ sheets
3. Fix any bugs discovered

### Phase 3: Polish (Day 3)
1. Add export progress feedback
2. Fix roll width configuration
3. Final testing

### Phase 4: Launch (Day 4)
1. Deploy to production
2. Monitor for issues
3. Collect user feedback

---

## 📝 BUILDER SETTINGS REFERENCE

Printers can customize their public builder via `/app/website-integration/builder-settings`:

### Uploads Section
- Auto resize to 300 DPI
- Transparent pixel warning
- Trim warning

### Sheet Settings
- Display unit (inch/cm/mm)
- Max height
- Max sheets (1-5)
- Default margin/spacing

### Tools
- Image trim mode (off/manual/auto)
- Background remover toggle
- Resolution thresholds (optimal/good/bad/terrible DPI)
- Minimum resolution enforcement

### Appearance
- Background color
- Top bar color
- Primary/secondary colors
- Text color

### Others
- Logo as loading spinner
- Session saver toggle

---

*Report generated from DTF Layout codebase analysis*
