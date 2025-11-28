# 🤖 Automated Testing Guide

## Quick Start - Run Tests in 2 Minutes!

### **Method 1: Browser-Based Test Runner** (Easiest) ⚡

1. **Open the test runner:**
   ```bash
   # Open in your browser
   open test-runner.html
   # Or double-click the file
   ```

2. **Enter your app URL:**
   - Default: `https://taste-signature-app.vercel.app`
   - Or your custom Vercel URL

3. **Click "Run All Tests"**
   - Runs 8 automated tests
   - Shows pass/fail for each
   - Total time: ~30 seconds

4. **View Results:**
   - Green = Pass ✅
   - Red = Fail ❌
   - Yellow = Warning ⚠️

---

## Test Suites Available

### 1. **Smoke Tests** (2 tests, 10 seconds)
- ✓ Page loads
- ✓ Critical assets load

**Run:** Click "Run Smoke Tests"

### 2. **Critical Tests** (4 tests, 20 seconds)
- ✓ Page loads
- ✓ Assets load
- ✓ Firebase config
- ✓ Navigation structure

**Run:** Click "Run Critical Tests Only"

### 3. **Full Test Suite** (8 tests, 30 seconds)
- ✓ Page load
- ✓ Assets (CSS, JS, manifests)
- ✓ Firebase configuration
- ✓ Chart.js integration
- ✓ Navigation structure
- ✓ Form elements
- ✓ Data operations
- ✓ Responsive design

**Run:** Click "Run All Tests"

---

## Individual Tests

### Test 1: Page Load
**What it tests:**
- App URL responds
- Page loads in < 3 seconds
- Title "Taste Signature" present
- HTTP 200 status

**Expected:** ✅ PASS

### Test 2: Assets Load
**What it tests:**
- `/styles.css` loads
- `/app.js` loads
- `/auth.js` loads
- `/firebase-config.js` loads
- `/manifest.json` loads

**Expected:** ✅ 5/5 assets load

### Test 3: Firebase Config
**What it tests:**
- Firebase API key present
- Auth domain configured
- Project ID set
- Firebase initialized

**Expected:** ✅ 4/4 checks pass

### Test 4: Chart.js
**What it tests:**
- Chart.js library loaded
- Canvas elements present

**Expected:** ✅ PASS

### Test 5: Navigation
**What it tests:**
All navigation items exist:
- Overview
- Log Experience
- Shape of Taste
- Need States
- Compare Products

**Expected:** ✅ 5/5 found

### Test 6: Forms
**What it tests:**
- Product Name input exists
- Sliders present
- Submit button found
- Form element exists

**Expected:** ✅ 3/4 or 4/4 pass

### Test 7: Data Operations
**What it tests:**
- FirestoreDataManager class
- Save function
- Load function
- Sync function

**Expected:** ✅ 3/4 or 4/4 pass

### Test 8: Responsive Design
**What it tests:**
- Mobile CSS loaded
- Media queries present
- Responsive features

**Expected:** ✅ 2/3 or 3/3 pass

---

## Reading Test Results

### ✅ Success (Green)
```
✅ PASS: Page loaded in 245ms
✓ Title found
✓ Status: 200
```
**Meaning:** Test passed completely

### ❌ Failure (Red)
```
❌ FAIL: HTTP 404
Page not found
```
**Meaning:** Test failed - needs fixing

### ⚠️ Warning (Yellow)
```
⚠️ WARNING: Chart.js or canvas elements missing
```
**Meaning:** Partial pass or uncertain result

---

## Test Summary Dashboard

After running tests, you'll see:

```
📊 Test Summary
┌─────────────┬────────┐
│ Passed      │   7    │
│ Failed      │   1    │
│ Skipped     │   0    │
│ Total Tests │   8    │
└─────────────┴────────┘
```

**Pass Rate:** Shows percentage of tests passed

---

## Troubleshooting

### ❌ "Failed to fetch"
**Problem:** Can't reach your app URL
**Solution:**
1. Check app is deployed
2. Verify URL is correct
3. Check internet connection

### ❌ "CORS Error"
**Problem:** Browser blocking cross-origin requests
**Solution:**
1. Open test-runner.html from same domain as app
2. Or use browser extension to disable CORS temporarily
3. Or deploy test-runner.html to Vercel

### ⚠️ "404 on assets"
**Problem:** Files not found
**Solution:**
1. Check Vercel deployment succeeded
2. Verify all files uploaded to GitHub
3. Check file names match exactly

### ❌ "Firebase config missing"
**Problem:** Firebase not configured
**Solution:**
1. Add environment variables in Vercel
2. Check firebase-config.js exists
3. Verify API keys are set

---

## Manual Testing Checklist

Use this for features that can't be automated:

### Critical Manual Tests (5 minutes)

- [ ] **Authentication Flow**
  - [ ] Sign up with new account
  - [ ] Email verification works
  - [ ] Login with credentials
  - [ ] Logout works

- [ ] **Log Experience Form**
  - [ ] Fill out all 7 stages
  - [ ] Submit successfully
  - [ ] Experience appears in dashboard

- [ ] **Data Sync**
  - [ ] Log experience on Device A
  - [ ] Open on Device B → Experience syncs

- [ ] **Charts Display**
  - [ ] Shape of Taste renders
  - [ ] Emotional Journey displays
  - [ ] Portfolio Map shows products

- [ ] **AI Insights** (if API key configured)
  - [ ] Enter query
  - [ ] Claude responds
  - [ ] Answer is relevant

---

## CI/CD Integration (Future)

To run tests automatically on every deployment:

### GitHub Actions Setup

Create `.github/workflows/test.yml`:

```yaml
name: Automated Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run Tests
        run: |
          # Install dependencies
          npm install -g http-server

          # Start server
          http-server . -p 8080 &

          # Wait for server
          sleep 5

          # Run automated tests (would need headless browser)
          echo "Tests would run here"
```

---

## Performance Testing

### Lighthouse Audit

1. Open app in Chrome
2. Press F12 → Lighthouse tab
3. Select "Mobile"
4. Click "Generate report"

**Target Scores:**
- Performance: > 70
- Accessibility: > 80
- Best Practices: > 80
- SEO: > 80

### Load Testing

For testing with many concurrent users:

```bash
# Install Apache Bench (macOS)
brew install apache2

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 https://taste-signature-app.vercel.app/
```

---

## Test Coverage Summary

| Category | Automated | Manual | Total |
|----------|-----------|--------|-------|
| Page Load | ✅ | - | 1 |
| Assets | ✅ | - | 5 |
| Config | ✅ | - | 4 |
| UI Elements | ✅ | - | 10 |
| Authentication | - | ✅ | 5 |
| Forms | ✅ | ✅ | 8 |
| Charts | ✅ | ✅ | 5 |
| Data Sync | - | ✅ | 3 |
| AI Features | - | ✅ | 2 |
| **Total** | **33** | **10** | **43** |

---

## Next Steps

After running automated tests:

### If All Pass ✅
1. Run manual authentication tests
2. Test on mobile device
3. Run Lighthouse audit
4. Deploy to production
5. Monitor for 24 hours

### If Any Fail ❌
1. Note which tests failed
2. Check browser console for errors
3. Review Vercel deployment logs
4. Fix issues
5. Re-run tests

---

## Support

**Questions?** Check:
1. Browser console (F12)
2. TESTING_CHECKLIST.md for detailed manual tests
3. Vercel deployment logs
4. Firebase console

---

**Happy Testing! 🧪**

The test-runner.html provides instant feedback on your app's health!
