# Changed Files — QS Builder Settings Fix

## Step 1: Replace these files in your project
Copy each file to the matching path in your project:

| File | What changed |
|------|-------------|
| `src/App.tsx` | Added QSBuilderSettings import + route |
| `src/hooks/useBuilderSettings.ts` | userId lookup with slug fallback + debug logging |
| `src/hooks/useSubdomain.ts` | buildStoreUrl always returns production subdomain |
| `src/services/builderSettingsService.ts` | Added getBuilderSettingsByUserId() |
| `src/services/quickStoreService.ts` | Added ensurePrinterForQS() + called from createQuickStore |
| `src/pages/storefront/StoreBuilder.tsx` | Uses { userId, slug } for settings lookup |
| `src/pages/quick-store/QuickStoreLayout.tsx` | Calls ensurePrinterForQS on every QS load |
| `src/pages/quick-store/QSBuilderSettings.tsx` | NEW — wrapper for Builder Settings tab |
| `src/pages/quick-store/index.ts` | Added QSBuilderSettings export |

## Step 2: Run the SQL in Supabase
Open Supabase → SQL Editor → run `RLS_POLICY.sql`

This adds anonymous SELECT policies on `printers` and `printer_builder_settings` 
so the public storefront builder can load settings without authentication.

## Step 3: Test
1. Open QS dashboard → console should show `[QS] Printer already exists for user:`
2. Go to Builder Settings tab → toggle OFF "Use Defaults" on Appearance → change colors → Save
3. Open storefront builder → console should show `[useBuilderSettings] Trying userId lookup:`
4. Changes should now reflect
