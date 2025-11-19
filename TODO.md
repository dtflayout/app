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

### Build "Sheet Logs" Page
- **What:** Display user's generation history from Supabase
- **Status:** Not started (infrastructure ready)
- **Dependencies:** Supabase logging working (✅ Done)
- **Features:** Table showing date, sq.inches used, sheet size, remaining balance
- **Estimated Time:** 1-2 hours
- **Planned:** Day 2

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

### Fix Logout Button
- **Issue:** Logout button shows but doesn't actually log out user
- **Status:** Not implemented
- **Solution:** Call Outseta.logout() and redirect to /auth
- **Estimated Time:** 15-30 minutes
- **Added:** Day 1 - 2025-11-19

### Add Low Credit Warnings
- **What:** Warn users when credits < 1000 sq.in
- **Where:** Show warning badge in navbar, banner on app
- **Estimated Time:** 30 minutes

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

- [x] Outseta authentication integration (Day 1)
- [x] Protected routes (Day 1)
- [x] Credits display in navbar (Day 1)
- [x] Square inch calculation system (Day 2)
- [x] Supabase setup and database table (Day 2)
- [x] Usage logging to Supabase (Day 2)
- [x] Confirmation dialog before generation (Day 2)
- [x] Insufficient credits modal (Day 2)
- [x] Dual authentication attempt (Basic + Bearer) (Day 2)

---

## 📅 Timeline

**Day 2 (Today - Remaining):**
- Implement Outseta workaround
- Build Sheet Logs page
- Test with Supabase logging

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

**Last Updated:** 2025-11-19

**Note:** Update this file as tasks are completed or new ones are discovered.
