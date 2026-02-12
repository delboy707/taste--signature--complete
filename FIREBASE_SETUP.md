# Firebase Setup Instructions

## ✅ Completed Steps

Your Firebase authentication is already configured and working! Here's what's been set up:

1. **Firebase Authentication** - Email/password login with verification
2. **Firestore Database** - User-isolated data storage
3. **Security Rules** - Users can only access their own data
4. **Auto-migration** - Local data automatically syncs to cloud

---

## 🔒 Required: Deploy Firestore Security Rules

To secure your database, deploy the security rules:

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase in your project

```bash
cd /path/to/your/project
firebase init firestore
```

Select:
- **Use existing project**: `taste-signature-ai-app`
- **Firestore rules file**: `firestore.rules` (already created)
- **Firestore indexes file**: Press Enter for default

### Step 4: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

✅ **Done!** Your database is now secured. Users can only access their own data.

---

## 🔐 Optional: Move Anthropic API Key to Backend (Recommended for Production)

Currently, your Anthropic API key is in `config.js` (client-side). For production, move it to Firebase Functions:

### Step 1: Initialize Firebase Functions

```bash
firebase init functions
```

Select:
- **Language**: JavaScript
- **ESLint**: Yes
- **Install dependencies**: Yes

### Step 2: Set API Key as Secret

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Paste your API key when prompted (get yours from https://console.anthropic.com/)

### Step 3: Create Proxy Function

Create `functions/index.js`:

```javascript
const functions = require("firebase-functions");
const { defineSecret } = require('firebase-functions/params');

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

exports.callClaude = functions
  .runWith({ secrets: [anthropicApiKey] })
  .https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { userMessage, systemPrompt, model, maxTokens, temperature } = data;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey.value(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: maxTokens || 4096,
          temperature: temperature || 1.0,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const result = await response.json();
      return { success: true, content: result.content[0].text };

    } catch (error) {
      console.error('Claude API Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message
      );
    }
  });
```

### Step 4: Deploy Function

```bash
firebase deploy --only functions
```

### Step 5: Update claude-api.js

Replace the `sendMessage` method in `claude-api.js`:

```javascript
async sendMessage(userMessage, systemPrompt = '') {
    if (!this.isConfigured) {
        throw new Error('API key not configured');
    }

    try {
        // Call Firebase Function instead of direct API
        const callClaude = firebase.functions().httpsCallable('callClaude');
        const result = await callClaude({
            userMessage: userMessage,
            systemPrompt: systemPrompt,
            model: this.model,
            maxTokens: window.AI_CONFIG.CLAUDE_MAX_TOKENS,
            temperature: window.AI_CONFIG.CLAUDE_TEMPERATURE
        });

        return result.data.content;

    } catch (error) {
        console.error('Claude API Error:', error);
        throw error;
    }
}
```

### Step 6: Remove API Key from config.js

Update `config.js`:

```javascript
const CONFIG = {
    // API key now secured in Firebase Functions
    ANTHROPIC_API_KEY: 'SECURED_IN_BACKEND',
    // ... rest of config
};

function validateAPIKey() {
    // Check if Functions are available
    return typeof firebase !== 'undefined' && firebase.functions;
}
```

---

## 📊 Enable Firebase Authentication Email Verification

In Firebase Console:
1. Go to **Authentication** → **Templates**
2. Customize email verification template
3. Enable **Email link sign-in** if desired

---

## 🔥 Current Architecture

### Without Firebase Functions (Current):
```
User Browser → Claude API (API key exposed in browser)
User Browser → Firestore (user data, secured by rules)
```

### With Firebase Functions (Recommended):
```
User Browser → Firebase Function → Claude API (API key hidden)
User Browser → Firestore (user data, secured by rules)
```

---

## 🎯 What's Next?

**Immediate (Required):**
1. Deploy Firestore security rules (5 minutes)

**Recommended for Production:**
2. Move API key to Firebase Functions (30 minutes)
3. Set up custom domain
4. Enable Firebase Hosting

**Optional Enhancements:**
- Google/GitHub OAuth login
- Email templates customization
- Usage analytics
- Rate limiting
- Backup automation

---

## 🧪 Testing Your Setup

1. **Test Authentication:**
   - Create account
   - Verify email
   - Login
   - Logout

2. **Test Data Isolation:**
   - Create 2 accounts
   - Add data to Account 1
   - Login to Account 2
   - Verify Account 2 cannot see Account 1's data

3. **Test Cloud Sync:**
   - Add experience
   - Logout
   - Login
   - Verify data persisted

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Firebase Console → Firestore → Rules
3. Verify email verification is enabled
4. Check that security rules are deployed

Current Firebase Project: **taste-signature-ai-app**
