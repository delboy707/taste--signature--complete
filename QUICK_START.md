# ⚡ Quick Start - Deploy to Vercel in 10 Minutes

## 🎯 What You'll Need

Before starting, have these ready:
- ✅ GitHub account
- ✅ Vercel account (free tier works!)
- ✅ Your Anthropic API key
- ✅ Your Firebase project credentials

---

## 📝 Step-by-Step Checklist

### **Step 1: Push to GitHub** (2 minutes)

```bash
# Navigate to your project
cd "/Users/derekroberts/Sense Genie App"

# Initialize Git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Taste Signature app"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/taste-signature-app.git
git branch -M main
git push -u origin main
```

✅ **Done!** Your code is on GitHub.

---

### **Step 2: Deploy to Vercel** (3 minutes)

1. **Go to:** https://vercel.com/new
2. **Click:** "Import Git Repository"
3. **Select:** Your `taste-signature-app` repo
4. **Framework:** Select "Other"
5. **Click:** "Deploy"

✅ **Done!** Your app is live (but needs env vars).

---

### **Step 3: Add Environment Variables** (3 minutes)

In Vercel dashboard, go to your project → **Settings** → **Environment Variables**

Add these **11 variables**:

```
VITE_ANTHROPIC_API_KEY
Value: YOUR_ANTHROPIC_API_KEY_HERE

VITE_FIREBASE_API_KEY
Value: YOUR_FIREBASE_API_KEY_HERE

VITE_FIREBASE_AUTH_DOMAIN
Value: your-project-id.firebaseapp.com

VITE_FIREBASE_PROJECT_ID
Value: your-project-id

VITE_FIREBASE_STORAGE_BUCKET
Value: your-project-id.firebasestorage.app

VITE_FIREBASE_MESSAGING_SENDER_ID
Value: YOUR_SENDER_ID

VITE_FIREBASE_APP_ID
Value: YOUR_APP_ID

VITE_CLAUDE_MODEL
Value: claude-sonnet-4-20250514

VITE_CLAUDE_MAX_TOKENS
Value: 4096

VITE_CLAUDE_TEMPERATURE
Value: 1.0
```

Click **"Save"** after each.

✅ **Done!** Environment variables configured.

---

### **Step 4: Redeploy** (1 minute)

1. Go to **Deployments** tab
2. Click the **"..."** menu on latest deployment
3. Click **"Redeploy"**
4. Wait ~30 seconds

✅ **Done!** Your app now has the env vars.

---

### **Step 5: Configure Firebase** (1 minute)

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: **taste-signature-ai-app**
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Vercel URL: `your-app-name.vercel.app`
6. Click **"Add"**

✅ **Done!** Firebase allows your Vercel domain.

---

## 🎉 You're Live!

Visit your app: `https://your-app-name.vercel.app`

### **Test These:**
- [ ] Create account
- [ ] Verify email
- [ ] Log in
- [ ] Add a taste experience
- [ ] Test AI insights
- [ ] Check tutorial appears

---

## ⚡ Even Faster: Use Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd "/Users/derekroberts/Sense Genie App"
vercel

# Add env vars via CLI
vercel env add VITE_ANTHROPIC_API_KEY production
# Paste your key when prompted
# Repeat for all variables...

# Deploy to production
vercel --prod
```

---

## 🔧 Common Issues

### **"API key not configured"**
- Check env vars are added in Vercel
- Click "Redeploy" after adding variables

### **"Firebase auth error"**
- Add your Vercel domain to Firebase Authorized Domains
- Wait 1-2 minutes for Firebase to update

### **"Cannot find config.js"**
- Config is now in environment variables
- No local config.js needed for Vercel

---

## 📚 Need More Help?

See **DEPLOYMENT_GUIDE.md** for detailed instructions.

---

## 🚀 That's It!

Your professional sensory analysis platform is now live and ready to use!

**Total Time:** ~10 minutes
**Cost:** $0 (free tiers)
**Result:** Production-ready app 🎉
