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
