# TODO List for DTF Layout Tool

## 🚨 Critical (Blockers for Launch)

### Fix Outseta CreditsBalance Update
- **Issue:** Outseta API returns 401 when trying to update CreditsBalance custom property
- **Status:** Blocked - both Basic Auth and Bearer Token fail
- **Why Blocked:** API endpoint /api/v1/crm/accounts/{id} doesn't allow updating custom properties
- **Solution Needed:** Research Outseta's custom properties API or contact support
- **Estimated Time:** 1-2 hours research + implementation
- **Workaround:** Currently updating UI only, credits not synced to Outseta
- **Added:** Day 2 - 2025-11-20

### Move API Credentials to Backend
- **Issue:** Outseta API Secret exposed on client side (in browser)
- **Status:** Acceptable for MVP testing, critical for production
- **Security Risk:** Anyone can inspect and steal API credentials
- **Solution:** Create backend API endpoint (Vercel/Netlify function) that proxies Outseta calls
- **Estimated Time:** 2-3 hours
- **Priority:** Must fix before public launch
- **Added:** Day 1 - 2025-11-19

---

## ⚠️ High Priority (Needed Before Launch)

### End-to-End Testing
- **What:** Test complete flow from signup to generation to credit deduction
- **Status:** Pending Outseta fix
- **Checklist:**
  - [ ] Signup with 700 free credits
  - [ ] Generate layout
  - [ ] Credits deducted correctly
  - [ ] Supabase log created
  - [ ] Navbar updates
  - [ ] Low credit warning works
- **Estimated Time:** 1 hour

---

## 📌 Medium Priority

### Usage History in localStorage (Backup)
- **What:** Store logs in browser as backup if Supabase fails
- **Estimated Time:** 30 minutes

---

## 🔵 Low Priority (Future Improvements)

### Fix Email Verification Redirect
- **Issue:** Redirect URL uses temporary Codespaces URL that changes
- **Status:** Workaround exists (manually verify in Outseta)
- **Solution:** Configure proper domain in Outseta settings
- **Priority:** Low for MVP, fix when deploying to production domain

### Add Email Notifications
- **What:** Send email after generation with summary
- **Estimated Time:** 2-3 hours

### Optimize Layout Algorithm
- **What:** Improve packing efficiency, reduce wasted space
- **Estimated Time:** 4-6 hours

---

## ✅ Completed (Day 1-2)

**Day 1 (2025-11-19):**
- [x] Outseta authentication integration
- [x] Protected routes
- [x] Credits display in navbar

**Day 2 (2025-11-20):**
- [x] Square inch calculation system
- [x] Supabase setup and database table
- [x] Usage logging to Supabase with full transaction details
- [x] Confirmation dialog before generation
- [x] Insufficient credits modal
- [x] Dual authentication attempt (Basic + Bearer)
- [x] Credit deduction flow with Outseta API workaround
- [x] Sheet Logs page - Generation history with stats
- [x] Low credit warning system:
  - Dynamic navbar badge with 4-level alerts
  - Dismissible warning banners
  - Button disable state when credits = 0
- [x] Error handling dialogs
- [x] Logout button functionality
- [x] Navigation between Create and History pages
- [x] TODO.md project tracking document

---

## 📅 Timeline

**Day 2 (Complete - 2025-11-20):**
- ✅ Implemented Outseta workaround
- ✅ Built Sheet Logs page
- ✅ Tested with Supabase logging
- ✅ Added comprehensive warning system

**Day 3:**
- Razorpay integration
- Pricing page
- Fix logout button
- Revisit Outseta sync if time permits

**Day 4:**
- Marketing pages
- Security fixes (move to backend)
- Final testing
- Deploy

**After Launch:**
- Address remaining TODOs based on user feedback

---

## 🔗 Related Files

- `/src/lib/outsetaApi.ts` - Outseta API integration
- `/src/lib/supabaseClient.ts` - Supabase client
- `/src/lib/usageLogger.ts` - Usage logging function
- `/src/components/CollageCreator.tsx` - Main app with credit logic

---

**Last Updated:** 2025-11-20 (Day 2 Complete)

**Note:** Update this file as tasks are completed or new ones are discovered.
