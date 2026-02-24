CLAUDE.md — Taste Signature App Agent Operating Manual

Project: Taste Signature — AI-powered sensory and emotional profiling for food & beverage
Stack: React · Firebase (Auth + Firestore) · Chart.js · Claude API (via CORS proxy) · Vercel
Methodology: "The Taste Signature Revealed" — 5-stage consumption journey mapping taste to emotions
Live URL: taste-signature-app.vercel.app
GitHub: github.com/delboy707/taste--signature--complete
Target Users: Sensory scientists, product developers, food brand innovation teams, R&D managers
Last updated: February 2026


IDENTITY & PURPOSE
Taste Signature is a B2B SaaS tool that replaces expensive sensory evaluation consultancy (typically £10K+) with AI-powered automated analysis. It maps food and beverage products through a proprietary 5-stage consumption journey (Appearance → Aroma → Front of Mouth → Mid/Rear Mouth → Aftertaste → Overall) and generates emotional profiles, consumer acceptance predictions, and competitive comparisons.
The app's core differentiator is the owner's 30+ years of sensory evaluation methodology. Every AI output must reflect this methodology accurately. The demo mode is the primary sales conversion tool — if the demo doesn't work flawlessly, prospects leave.
Your role is to maintain code quality, fix bugs without creating regressions, and protect the integrity of the sensory evaluation methodology embedded in the codebase.

ABSOLUTE RULES — NEVER VIOLATE THESE
1. API Key Security

The Anthropic API key is currently exposed in client-side config.js. This is a known technical debt. Do NOT make it worse. Never add additional API keys to client-side code.
For production: The API key should be moved to a backend proxy or Firebase Cloud Function. Any new AI features MUST use a server-side approach, not direct client-side API calls.
The CORS proxy pattern (corsproxy.io/?https://api.anthropic.com/v1/messages) is a temporary workaround for browser compatibility. Do not add additional CORS proxies without owner approval.

2. Config.js Integrity

config.js has a history of duplicate lines reappearing after edits. This has happened multiple times — duplicate CLAUDE_MODEL declarations, duplicate comment blocks, and duplicate API URL lines.
After ANY edit to config.js: verify there are NO duplicate variable declarations. Every key in the CONFIG object must appear exactly once.
Before committing config.js: run the file through a linter or manually count declarations. The file should contain exactly these keys (each once): ANTHROPIC_API_KEY, ANTHROPIC_API_URL, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, CLAUDE_TEMPERATURE, ENABLE_AI_INSIGHTS, ENABLE_NATURAL_LANGUAGE_QUERIES, AI_BUTTON_TEXT, AI_QUERY_PLACEHOLDER.

3. Demo Mode Must Never Break

Demo mode is the primary sales conversion tool. A broken demo means lost prospects. Any change that could affect demo data or the demo flow must be tested in demo mode before committing.
The demo data array must contain complete objects. Every item needs ALL required properties including name. The recurring crash pattern: updateDashboard() iterates over the demo data array and hits undefined elements because some items are missing properties or the array has gaps.
All dashboard panels must show meaningful content in demo mode. "No activity yet" and "No insights yet" are not acceptable when demo data is loaded. Every panel — Recent Activity, Quick Insights, Products Analyzed, Average Satisfaction, Top Need State — must display populated, impressive data.
After ANY change, test demo mode by: clicking "Try Demo Mode" from the login page → verify dashboard loads without console errors → check all stats populate → click through Shape of Taste, Emotion Analysis, and at least 3 sidebar features.

4. Duplicate Variable Declarations

emotion-inference.js has a history of declaring STAGE_EMOTIONS twice, causing a SyntaxError that breaks the entire emotion inference engine. This is the app's core analytical feature.
Before committing ANY JavaScript file: search the entire codebase for duplicate const or let declarations of the same variable name. Pay special attention to variables shared across multiple JS files loaded on the same page.
If a variable is needed in multiple files, consolidate it into a shared module or attach it to window in one place only.

5. Data Structure Consistency

The most common crash pattern in this app: code iterates over an array and hits undefined elements. This has caused crashes in updateDashboard() (line ~795), updateShapeOfTasteView() (line ~865), and other array-dependent views.
Every function that iterates over data arrays MUST include defensive checks:

javascript  // REQUIRED pattern — filter out undefined/null before iterating
  const validItems = dataArray.filter(item => item && item.name);
  validItems.forEach(item => { ... });

Never assume array elements exist. Always use optional chaining (item?.name) or explicit null checks before accessing properties.

6. Deployment & Testing

Run the app locally and test before pushing. Open in browser, check console for errors.
Test the demo mode flow end-to-end after every change.
Test on both desktop and mobile viewports. The menu/sidebar has known overlap issues at mobile widths.
After git push, wait 1-2 minutes for Vercel auto-deploy, then hard refresh the live site (Cmd+Shift+R) and verify window.AI_CONFIG loads in console.


KNOWN GOTCHAS — THINGS THAT HAVE BROKEN BEFORE
JavaScript Crashes (The Big Three)
These three crashes share the same root cause — data structure mismatches where code expects array elements that don't exist:

Demo mode crash — TypeError: Cannot read properties of undefined (reading 'name') at updateDashboard(). The window.loadDemoExperiences function loads demo data, then updateDashboard() tries to map over the array but some elements are undefined or missing the name property.
Shape of Taste crash — Same TypeError in updateShapeOfTasteView(). The product dropdown or visualization code iterates over products and hits undefined entries.
Emotion inference crash — SyntaxError: Identifier 'STAGE_EMOTIONS' has already been declared in emotion-inference.js. Duplicate const declaration either within the file or across files loaded on the same page.

The fix pattern for all three: Add defensive filtering before any array iteration, and audit for duplicate declarations across all JS files.
Config.js Corruption

Duplicate lines keep reappearing in config.js after edits — particularly CLAUDE_MODEL appearing twice and duplicate comment blocks.
Suspected cause: merge conflicts or copy-paste errors during manual editing.
Prevention: After every config.js edit, count the keys and verify no duplicates exist.

Menu/Sidebar Overlap

The hamburger "MENU" button overlaps the "Taste Signature" app title text, making it read "≡ MENU ... ature" on smaller viewports.
The sidebar contains 22 features across 6 categories (Data Capture, Analysis, Comparison, AI & Insights, Collaboration, Exports). Layout changes must account for this density.

Firebase Auth Edge Cases

Test login flow, signup flow, and demo mode as three separate paths. Changes to one auth path can break another.
The signup form asks for Company Information (name, industry, size) before personal details — this is intentional for B2B qualification. Do not reorder without owner approval.


ARCHITECTURE REFERENCE
Sensory Evaluation Framework (Core IP)
The app implements the owner's proprietary methodology from "The Taste Signature Revealed":
5-Stage Consumption Journey:
Stage 1: Appearance    → Visual assessment before tasting
Stage 2: Aroma         → Olfactory evaluation
Stage 3: Front of Mouth → Initial taste contact
Stage 4: Mid/Rear Mouth → Full flavour development
Stage 5: Aftertaste     → Lingering sensory experience
→ Overall Assessment    → Holistic evaluation
7-Stage Sensory Evaluation Form: ~40+ input fields using slider-based controls. A "Quick Entry" mode exists for faster data input. This form structure is the core IP — do not simplify, reorder, or remove stages without owner approval.
Emotional Mapping: Each sensory profile maps to emotional associations. The emotion-inference.js file contains the STAGE_EMOTIONS mapping that drives this. This is the app's analytical engine — handle with extreme care.
Tech Stack Details
Frontend:     Vanilla JS + HTML/CSS (NOT React components — plain JS with DOM manipulation)
Auth:         Firebase Authentication
Database:     Firebase Firestore
Charts:       Chart.js for visualizations
AI:           Claude API via CORS proxy (corsproxy.io)
Config:       config.js (client-side — API key exposed, known debt)
Hosting:      Vercel (auto-deploy from GitHub push)
Key files:    app.js (main logic), emotion-inference.js (core engine), config.js (API config)
Key File Map
app.js                  → Main application logic, dashboard, all view update functions
                          - updateDashboard() ~line 795
                          - updateShapeOfTasteView() ~line 865
                          - window.loadDemoExperiences ~line 716
emotion-inference.js    → Emotional mapping engine, STAGE_EMOTIONS variable
config.js               → API configuration (Anthropic key, model, URLs)
index.html              → Login/signup page with demo mode entry
Feature Map (22 features across 6 categories)
Data Capture:    Tasting Experience, Quick Entry, Batch Import, Product Library, Team Tastings
Analysis:        Sensory Profile, Shape of Taste, Emotion Analysis, Trend Analysis, Quality Metrics
Comparison:      Side-by-Side, Benchmark, Category Map
AI & Insights:   AI Insights, Natural Language Query, Predictive Analytics
Collaboration:   Team Notes, Share Results, Approval Workflow
Exports:         PDF Report, Excel Export, API Access

NAVIGATION RULES — HOW TO HANDLE COMMON SITUATIONS
When asked to fix a bug:

Read this CLAUDE.md first — check if it matches a known gotcha
Check if the bug is one of "The Big Three" (demo crash, Shape of Taste crash, emotion inference crash)
Search for duplicate variable declarations across all JS files
Implement the fix with defensive array checks
Test demo mode end-to-end
Check config.js for duplicate lines
Verify in browser console: no errors, window.AI_CONFIG loads correctly
Commit with descriptive message

When asked to modify the sensory evaluation form:

STOP and confirm with owner — this is core IP
Do not change the 5-stage consumption journey order
Do not remove or simplify the 7-stage evaluation form
Any additions must align with "The Taste Signature Revealed" methodology
Quick Entry mode must remain available as an alternative

When asked to add AI features:

Check if the feature requires an API call — if so, it should go through a server-side proxy, NOT direct client-side calls
Do not add new API keys to client-side code
New AI features should use the existing AI_CONFIG pattern in config.js
Test that AI responses handle errors gracefully (API down, rate limited, invalid response)

When asked to modify demo data:

Every demo item must have ALL required properties (name, product data, sensory scores, emotional data)
Demo data should showcase the app's best capabilities — impressive charts, meaningful insights, populated dashboards
Test the full demo flow after any change: login page → "Try Demo Mode" → dashboard → click through 5+ sidebar features
Verify ALL dashboard stats populate (Total Experiences, Products Analyzed, Average Satisfaction, Top Need State, Recent Activity, Quick Insights)

When asked to change the login/auth flow:

Test all three paths: login, signup, and demo mode
The signup company information fields (name, industry, size) are intentional — keep them
Firebase Auth configuration changes require owner approval
Never expose Firebase admin credentials in client-side code

When you encounter ambiguous requirements:
Ask the owner. Common ambiguities:

"Fix the dashboard" → Which view? Demo mode or authenticated user mode?
"Add a new chart" → Which Chart.js chart type? What data source?
"Update the AI" → Change the model? Modify the prompt? Add a new feature?
"It's broken" → Console errors? Visual bug? Data not loading?


SIGNALS — ADAPTIVE BEHAVIOUR RULES
SignalResponseOwner reports demo is brokenTHIS IS P0 — drop everything and fix demo mode first. Test all dashboard views.Console shows TypeError with "undefined reading 'name'"This is the recurring array iteration crash. Add .filter(item => item && item.name) before every array iteration in the affected function, then audit all other array iterations in the same file.Console shows SyntaxError about duplicate declarationSearch ALL JS files for the duplicate variable. Remove one instance. Check that the remaining one is accessible where needed.Owner reports config.js is broken againCheck for duplicate keys in the CONFIG object. Count every key — there should be exactly 9. Remove duplicates.Owner asks about data upload featureThis is the highest-priority missing feature. Users need CSV/Excel upload → automatic sensory + emotional analysis with NO manual entry. This requires: file parsing, data validation, mapping to the 5-stage framework, AI-powered analysis, and results display.Owner mentions "The Taste Signature Revealed"This is the owner's book and proprietary methodology. All sensory evaluation features must align with this methodology.A change fixes one view but breaks anotherThe app uses shared functions and data structures across views. After fixing any view, test: Dashboard, Shape of Taste, Emotion Analysis, and Demo Mode.Firebase/Firestore query returns emptyCheck auth state first. Firestore security rules may be blocking the read. Do not treat "auth blocked" as "no data exists."

QUALITY GATES — CHECKLIST BEFORE ANY COMMIT
Before committing changes, verify ALL that apply:

 No console errors when loading the app
 window.AI_CONFIG loads correctly in console
 config.js has no duplicate variable declarations
 emotion-inference.js has no duplicate variable declarations
 app.js has no new undefined property access patterns
 Demo mode loads without errors
 All 6 dashboard stats populate in demo mode
 Shape of Taste view loads without crash
 Login, signup, and demo mode all work as separate paths
 Sidebar menu doesn't overlap app title at mobile widths
 Chart.js visualizations render with data (not empty)
 Git commit message describes the change clearly


PROHIBITED ACTIONS
Do NOT do any of the following without explicit owner approval:

Expose additional API keys in client-side code
Change the 5-stage consumption journey structure or order
Simplify or remove fields from the 7-stage sensory evaluation form
Change Firebase project configuration or security rules
Modify the CORS proxy URL pattern
Remove the demo mode or "Try Demo Mode" button
Change the login page design (purple gradient is intentional branding)
Reorder the signup form fields (company info first is intentional)
Remove any of the 22 sidebar features without replacement
Change the emotional mapping methodology in emotion-inference.js


PROJECT HISTORY NOTES
This project has gone through multiple debugging cycles. The most damaging recurring issues:

The Big Three JS crashes — Demo mode, Shape of Taste, and emotion inference have all crashed due to the same patterns: undefined array elements and duplicate variable declarations. These three bugs are interconnected — fixing one without checking the others leads to a false sense of completion.
Config.js corruption — Duplicate lines keep reappearing in config.js, particularly CLAUDE_MODEL. This has happened at least 3 times. The file must be treated as fragile — verify after every edit.
Dashboard inconsistency in demo — Even when the demo doesn't crash, stats show contradictory data (8 experiences but 0 products analyzed). The demo data structure needs ALL fields populated, not just the minimum to avoid crashes.
API key exposure — The Anthropic API key is in client-side config.js. This is known technical debt. The long-term fix is a server-side proxy or Firebase Cloud Function. Any new AI features should use the server-side approach.

These four patterns account for the majority of rework. Guard against them on every commit.

CRITICAL MISSING FEATURE: DATA UPLOAD
The most important feature not yet built: automated data upload and analysis.
Users should be able to:

Upload a CSV or Excel file containing product sensory data
Have the app automatically parse and validate the data
Map the data to the 5-stage consumption journey framework
Generate sensory profiles and emotional associations automatically
Display results with Chart.js visualizations — NO manual entry required

This is the feature that transforms the app from a manual data entry tool into an automated consultancy replacement. It should be the next major development priority.
