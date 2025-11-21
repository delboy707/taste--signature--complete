# Taste Signature App - Testing Guide

## Quick Start Testing

### 1. Open the Application
```bash
cd "/Users/derekroberts/Sense Genie App"
open index.html
```

The app should open in your default browser. You should see:
- Purple gradient sidebar on the left
- "Dashboard Overview" title
- Empty state message: "No experiences logged yet"

---

## Phase 1 Tests: Critical Fixes

### Test 1.1: Emotional Data Collection (ALL Emotions)
**Expected**: Form should capture 5-6 emotions per stage, not just 2

**Steps**:
1. Click "Log Experience" in sidebar
2. Navigate through all stages
3. Check each stage has expanded emotions:
   - **Appearance**: 5 emotions (anticipation, desire, excitement, happiness, curiosity)
   - **Aroma**: 6 emotions (pleasure, comfort, nostalgia, happiness, energy, relaxation)
   - **Front of Mouth**: 4 emotions (excitement, satisfaction, happiness, pleasure)
   - **Mid/Rear Mouth**: 4 emotions (indulgence, comfort, satisfaction, pleasure)
   - **Aftertaste**: 3 emotions (satisfaction, completeness, happiness)

**Pass Criteria**: ✅ All emotion sliders are visible and functional

---

### Test 1.2: Correlation Disclaimer
**Expected**: Heatmap should show warning about methodology

**Steps**:
1. Log a test product (fill form completely)
2. Click "Emotional Mapping & Correlation" in sidebar
3. Select your product from dropdown
4. Scroll to "Sensory-to-Emotional Correlation Matrix"

**Pass Criteria**:
✅ Yellow warning box appears above heatmap
✅ Text says: "Correlation strength is calculated as a normalized product..."
✅ Legend explains strength categories

---

### Test 1.3: Form Autosave
**Expected**: Draft saves automatically and can be resumed

**Steps**:
1. Click "Log Experience"
2. Fill in Product Name: "Test Autosave"
3. Wait 2 seconds
4. Check top-right corner

**Pass Criteria**:
✅ "Draft saved ✓" notification appears briefly
✅ Refresh the page
✅ Alert asks: "Resume your in-progress entry from X minutes ago?"
✅ Clicking "OK" restores the form with "Test Autosave"

---

### Test 1.4: Chart Memory Leaks (Fixed)
**Expected**: No memory buildup when switching views

**Steps**:
1. Log at least 2 products
2. Open browser DevTools (F12)
3. Go to "Performance" or "Memory" tab
4. Click between views 20 times rapidly:
   - Shape of Taste → Need States → Comparison → Emotional Mapping → repeat

**Pass Criteria**:
✅ Memory usage stays stable (not increasing)
✅ No console errors
✅ Charts render smoothly

---

### Test 1.5: Form Validation (Basic)
**Expected**: Can't advance stages or submit with missing required fields

**Steps**:
1. Click "Log Experience"
2. Try clicking "Next Stage" without filling anything

**Pass Criteria**:
✅ Alert appears: "Please complete all required fields before proceeding"
✅ Red error banner shows at top of stage
✅ Required fields highlighted in red
✅ Cannot proceed until fixed

---

## Phase 2 Tests: UX Improvements

### Test 2.1: Guided Tour
**Expected**: Interactive walkthrough of Emotional Mapping

**Steps**:
1. Log a product first
2. Go to "Emotional Mapping & Correlation"
3. Select your product
4. Click "💡 Guide Me" button (top-right)

**Pass Criteria**:
✅ Cards highlight one at a time with pulsing outline
✅ Tooltip appears automatically for 4 seconds
✅ Auto-scrolls to each visualization
✅ Completes after 4 steps
✅ Alert says "Tour complete!"

---

### Test 2.2: Correlation Insights Panel
**Expected**: Actionable recommendations appear below heatmap

**Steps**:
1. Go to Emotional Mapping view
2. Select a product
3. Scroll below the correlation heatmap

**Pass Criteria**:
✅ "🎯 Key Insights" panel appears
✅ Shows top 5 correlations with strength badges
✅ 🔥 icon for strong (≥0.7)
✅ ⭐ icon for moderate (0.4-0.7)
✅ Green "💡 Formulation Tip" box at bottom

---

### Test 2.3: Mobile Responsiveness
**Expected**: App works on mobile devices

**Steps**:
1. Open DevTools (F12)
2. Click device toolbar icon (phone/tablet icon)
3. Select "iPhone 12 Pro" or similar
4. Navigate to Emotional Mapping view
5. Try scrolling the heatmap table

**Pass Criteria**:
✅ Sidebar collapses on mobile
✅ Heatmap scrolls horizontally
✅ "← Scroll to see more →" hint appears
✅ Emotion grid stacks vertically
✅ Charts resize to fit screen
✅ All text remains readable

---

### Test 2.4: Occasion Context Field
**Expected**: New dropdown for consumption occasion

**Steps**:
1. Click "Log Experience"
2. Look at Stage 1: Product Information
3. Scroll to bottom

**Pass Criteria**:
✅ "Consumption Occasion" dropdown exists
✅ Shows 12 options (Breakfast, Morning Snack, Lunch, etc.)
✅ "Serving Temperature" dropdown also present (Hot, Warm, Chilled, etc.)
✅ After submitting, go to History view
✅ Product card shows: "Occasion: breakfast" and "Temperature: chilled"

---

## Phase 3 Tests: Advanced Features

### Test 3.1: Portfolio Clustering View
**Expected**: Scatter plot showing emotional positioning

**Steps**:
1. Log at least 3 products with different emotional profiles
2. Click "Portfolio Map" in sidebar
3. Check all visualizations load

**Pass Criteria**:
✅ Scatter plot shows products as colored dots
✅ X/Y axis dropdowns work (change Indulgence → Comfort)
✅ Dots reposition when axes change
✅ "Emotional White Space Analysis" shows 2×2 grid
✅ Empty quadrants marked "✨ WHITE SPACE OPPORTUNITY"
✅ "Portfolio Diversity Score" shows 0-100 number
✅ Colored assessment (Green/Blue/Orange/Red)
✅ "Cluster Insights" panel shows recommendations

---

### Test 3.2: White Space Analysis
**Expected**: Identifies market gaps

**Steps**:
1. In Portfolio Map view
2. Look at "Emotional White Space Analysis" card

**Pass Criteria**:
✅ 4 quadrants displayed in 2×2 grid
✅ Quadrants show product counts or "WHITE SPACE"
✅ Green highlight for empty quadrants
✅ Gray for occupied quadrants

---

### Test 3.3: Diversity Score
**Expected**: Shannon index calculation

**Steps**:
1. Test with 1 product: Should be 0 (low diversity)
2. Add products from different need states
3. Watch score increase

**Pass Criteria**:
✅ Large number (0-100) displayed prominently
✅ Color changes: Red (<25) → Orange (25-49) → Blue (50-74) → Green (75+)
✅ Recommendation text changes based on score
✅ Shows need state distribution at bottom

---

### Test 3.4: Re-Test Tracking
**Expected**: Link follow-up tests to original

**Steps**:
1. Log product: "Chocolate Bar v1.0"
2. Click "Log Experience" again
3. At top of Stage 1, look for "Re-testing an existing product?"
4. Select "Chocolate Bar v1.0 - Test #1" from dropdown
5. Form should auto-fill

**Pass Criteria**:
✅ Dropdown shows existing products with test numbers
✅ Blue notification appears: "Re-testing: Chocolate Bar v1.0 - Form pre-filled"
✅ Product Name, Brand, Type auto-populated
✅ After submitting, dropdown updates to show "Test #2"
✅ In History view, products show test numbers

---

### Test 3.5: Accessibility - Colorblind Patterns
**Expected**: Heatmap uses patterns, not just colors

**Steps**:
1. Go to Emotional Mapping view
2. Select a product
3. Look closely at correlation heatmap cells

**Pass Criteria**:
✅ **Strong** (green): Diagonal stripes (45°)
✅ **Moderate** (light green): Vertical lines (90°)
✅ **Weak** (yellow): Horizontal lines (0°)
✅ **Neutral** (gray): No pattern
✅ Patterns visible even in grayscale/colorblind mode

---

### Test 3.6: Accessibility - Keyboard Navigation
**Expected**: Full keyboard control

**Steps**:
1. Click in address bar, then press Tab repeatedly
2. Navigate through the app using only keyboard

**Pass Criteria**:
✅ Tab key moves between interactive elements
✅ Blue outline shows current focus
✅ Can activate sidebar links with Enter
✅ Can adjust sliders with Arrow keys
✅ Can submit form with Enter on button
✅ "Skip to main content" link appears when focused (first Tab)

---

### Test 3.7: Accessibility - ARIA Labels
**Expected**: Screen reader friendly

**Steps**:
1. Right-click sidebar → Inspect Element
2. Check HTML attributes

**Pass Criteria**:
✅ `<aside role="navigation" aria-label="Main navigation">`
✅ `<main role="main" id="main-content">`
✅ `<header role="banner">`
✅ `aria-live="polite"` on content area
✅ Buttons have descriptive `aria-label` attributes

---

### Test 3.8: Advanced Validation
**Expected**: Helpful, specific error messages

**Steps**:
1. Click "Log Experience"
2. Leave Product Name blank
3. Leave Category unselected
4. Click "Next Stage"

**Pass Criteria**:
✅ Red banner appears at top with ⚠️ icon
✅ Text says "Please fix the following errors:"
✅ Bullet list shows specific issues:
   - "Product Name is required"
   - "Category is required"
✅ Fields with errors have red border and pink background
✅ Banner shakes on appearance (if motion enabled)
✅ Auto-scrolls to error
✅ Can't proceed until fixed
✅ Errors clear when corrected

---

### Test 3.9: Validation - Form Submission
**Expected**: Validates all stages before submitting

**Steps**:
1. Fill Stage 1 completely
2. Advance to Stage 7 (skipping 2-6)
3. Try to submit

**Pass Criteria**:
✅ Form prevents submission
✅ Navigates back to first incomplete stage (Stage 2)
✅ Shows validation errors for that stage
✅ Must complete all stages to submit

---

## Integration Tests

### Test I.1: Complete User Flow
**Scenario**: Log a full product experience

**Steps**:
1. Click "Log Experience"
2. Fill Stage 1:
   - Product Name: "Dark Chocolate 70%"
   - Brand: "Lindt"
   - Category: "Confectionery"
   - Occasion: "Relaxation"
   - Temperature: "Room Temperature"
3. Complete all 7 stages with varied slider values
4. Select Need State: "Escape"
5. Set Emotional Triggers to high values
6. Add notes: "Rich, smooth, slightly bitter"
7. Submit

**Pass Criteria**:
✅ Success message appears
✅ Form resets to Stage 1
✅ Dashboard shows "1" in Total Experiences
✅ History view shows the product
✅ Shape of Taste view shows line graph
✅ Emotional Mapping view shows all visualizations
✅ Portfolio Map view displays the product

---

### Test I.2: Import Sample Data
**Expected**: 15 sample products load

**Steps**:
1. Click "Import Data" in sidebar
2. Scroll to "Sample Data"
3. Click "Load 15 Sample Flavor Concepts"

**Pass Criteria**:
✅ Preview panel shows 15 products
✅ Success message: "Successfully imported 15 experiences"
✅ Dashboard shows "15" in Total Experiences
✅ Portfolio Map shows all 15 products scattered
✅ Diversity Score calculates (likely 50-75)
✅ White Space Analysis shows filled quadrants

---

### Test I.3: Export and Import
**Expected**: Data roundtrip works

**Steps**:
1. Load sample data (15 products)
2. Click "Export Data" button (top-right)
3. Save JSON file
4. Open DevTools Console
5. Run: `localStorage.clear()`
6. Refresh page (should be empty)
7. Click "Import Data"
8. Drag saved JSON file to upload area
9. Click "Import X Experiences"

**Pass Criteria**:
✅ Export downloads JSON file
✅ After clearing, dashboard shows 0 experiences
✅ Import preview shows all products
✅ After import, all 15 products restored
✅ All visualizations work correctly

---

### Test I.4: Comparison Tool
**Expected**: Side-by-side product comparison

**Steps**:
1. Load sample data
2. Click "Compare Products"
3. Check 3-4 products
4. Click "Compare Selected"

**Pass Criteria**:
✅ Checkboxes appear for all products
✅ Can select multiple products
✅ "Compare Selected" button appears
✅ Chart shows overlapping Shape of Taste lines
✅ Each product has different color
✅ Legend identifies each line
✅ Need State distribution compares products

---

## Performance Tests

### Test P.1: Large Dataset
**Expected**: App handles 50+ products

**Steps**:
1. Import sample data 3 times (45 products)
2. Add 5 more manually (50 total)
3. Navigate between views

**Pass Criteria**:
✅ All views load within 1 second
✅ Portfolio scatter plot renders smoothly
✅ Heatmap displays without lag
✅ No browser freezing
✅ Charts remain responsive

---

### Test P.2: Autosave Performance
**Expected**: Typing doesn't lag

**Steps**:
1. Click "Log Experience"
2. Type rapidly in Product Name field
3. Observe responsiveness

**Pass Criteria**:
✅ No typing delay
✅ Text appears instantly
✅ "Draft saved" notification doesn't interrupt typing
✅ Debounce prevents excessive saves (only saves 1 second after stopping)

---

## Browser Compatibility Tests

### Test B.1: Chrome/Edge
- [ ] All visualizations render
- [ ] Charts.js displays correctly
- [ ] LocalStorage works
- [ ] Autosave functions

### Test B.2: Firefox
- [ ] CSS gradients display
- [ ] Forms work correctly
- [ ] No console errors

### Test B.3: Safari
- [ ] Mobile responsiveness works
- [ ] Touch interactions smooth
- [ ] iOS compatibility

---

## Bug Reporting Template

If you find issues, report using this format:

```
**Bug Title**: [Short description]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:

**Actual Result**:

**Browser**: Chrome 120 / Firefox 121 / Safari 17
**Device**: Desktop / iPhone / Android
**Screenshots**: [if applicable]
```

---

## Quick Test Checklist

For rapid verification, test these critical paths:

- [ ] Log a product (full flow)
- [ ] View in Emotional Mapping
- [ ] Check correlation heatmap + insights
- [ ] Load sample data
- [ ] View Portfolio Map
- [ ] Check Diversity Score
- [ ] Re-test an existing product
- [ ] Try validation errors (leave fields blank)
- [ ] Test keyboard navigation (Tab through app)
- [ ] Test mobile view (DevTools)
- [ ] Export data
- [ ] Import data back

---

## Success Criteria Summary

✅ **Phase 1**: All emotions captured, autosave works, validation blocks invalid submissions
✅ **Phase 2**: Tour guides users, insights actionable, mobile fully responsive, occasion tracked
✅ **Phase 3**: Portfolio clusters shown, retests linked, keyboard accessible, errors helpful

**App is production-ready if**: 15/15 Phase tests pass + all integration tests pass.
