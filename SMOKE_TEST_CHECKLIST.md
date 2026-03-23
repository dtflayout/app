# DTF Layout — Pre-Deploy Smoke Test Checklist

Run through this before every production deployment. ~5 minutes.

Use Razorpay **test mode** for all payment steps.

---

## Auth & Onboarding

- [ ] Sign up with a new test email
- [ ] Verify 10,000 free trial credits appear on dashboard
- [ ] Sign out — confirm protected routes redirect to `/auth`
- [ ] Sign back in — confirm credits persist

## Public Builder (Website Integration)

- [ ] Open the public builder via a store embed URL
- [ ] Upload 2–3 images and generate a single-sheet layout
- [ ] Verify the layout renders correctly at expected DPI
- [ ] Test multi-sheet flow (2+ sheets if enough images)
- [ ] Complete a test checkout — verify Razorpay modal opens
- [ ] After payment, confirm design file is downloadable

## Quick Store Storefront

- [ ] Open a Quick Store storefront via its subdomain/slug
- [ ] Browse products — verify images, prices, and variants load
- [ ] Open the builder from a product page
- [ ] Submit a customer order on the Quick Store
- [ ] Check that the order appears in the store owner's dashboard
- [ ] Verify the customer receives order confirmation (if email enabled)

## Credits & Payments

- [ ] Process a test payment via Razorpay test mode
- [ ] Verify credits were added to the account after payment
- [ ] Check the transaction appears in the transactions table
- [ ] Attempt a second identical payment — confirm no double-credit (unique constraint)
- [ ] Use credits on a design — verify balance decreases correctly

## Dashboard & Management

- [ ] View the store dashboard — verify analytics load
- [ ] Edit a product (price, image, variant) and confirm it saves
- [ ] Check the orders page — recent orders should be visible
- [ ] Download a generated design file from the orders page

## Edge Cases

- [ ] Try generating with 0 credits — confirm graceful "insufficient credits" error
- [ ] Upload an extremely large image (5MB+) — confirm it processes or shows a size warning
- [ ] Open the app on mobile browser — confirm responsive layout works
- [ ] Open a Quick Store link in incognito — confirm public access works

---

## Post-Deploy Verification (after Vercel deploy completes)

- [ ] Visit https://dtflayout.com — confirm site loads without errors
- [ ] Open browser DevTools Console — check for no red errors on load
- [ ] Check Vercel Functions logs — confirm no 500 errors in last 10 minutes
- [ ] If DB migration was run: verify new columns/tables exist in Supabase

---

**If any check fails:** Use Vercel instant rollback (Dashboard → Deployments → last good deploy → Promote to Production). DB migrations are additive only, so rollback is safe.
