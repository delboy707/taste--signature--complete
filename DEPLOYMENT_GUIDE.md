# 🚀 Vercel Deployment Guide - Taste Signature App

## ✅ Pre-Deployment Checklist

Your app is now ready for Vercel deployment! Here's what's been prepared:

- ✅ `vercel.json` - Vercel configuration with security headers
- ✅ `.gitignore` - Protects sensitive files from Git
- ✅ `.env.example` - Environment variable template
- ✅ `config.example.js` - Config file template
- ✅ `firebase-config.example.js` - Firebase config template

---

## 📋 Step-by-Step Deployment Instructions

### **Step 1: Prepare Your Repository**

#### 1.1 Initialize Git (if not already done)
```bash
cd "/Users/derekroberts/Sense Genie App"
git init
```

#### 1.2 Create .gitignore to protect sensitive files
✅ Already created! The `.gitignore` file prevents committing:
- `config.js` (contains API keys)
- `firebase-config.js` (contains Firebase keys)
- `.env` files
- `node_modules/`

#### 1.3 Add all files to Git
```bash
git add .
git commit -m "Initial commit - Taste Signature app ready for deployment"
```

#### 1.4 Push to GitHub
```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/taste-signature-app.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Deploy to Vercel**

#### Option A: Deploy via Vercel Website (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Login to your existing account

2. **Import Project**
   - Click **"Add New..."** → **"Project"**
   - Click **"Import Git Repository"**
   - Select your GitHub repository: `taste-signature-app`

3. **Configure Project**
   - **Framework Preset:** Select "Other" (static site)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** Leave empty (static HTML app)
   - **Output Directory:** `./` (leave as default)

4. **Add Environment Variables** (IMPORTANT!)
   Click **"Environment Variables"** and add these:

   ```
   VITE_ANTHROPIC_API_KEY = YOUR_ANTHROPIC_API_KEY_HERE

   VITE_FIREBASE_API_KEY = YOUR_FIREBASE_API_KEY_HERE
   VITE_FIREBASE_AUTH_DOMAIN = your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID = your-project-id
   VITE_FIREBASE_STORAGE_BUCKET = your-project-id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID = YOUR_SENDER_ID
   VITE_FIREBASE_APP_ID = YOUR_APP_ID

   VITE_CLAUDE_MODEL = claude-sonnet-4-20250514
   VITE_CLAUDE_MAX_TOKENS = 4096
   VITE_CLAUDE_TEMPERATURE = 1.0
   ```

5. **Deploy!**
   - Click **"Deploy"**
   - Wait 1-2 minutes for deployment
   - Get your live URL: `https://taste-signature-app.vercel.app`

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from your project directory)
cd "/Users/derekroberts/Sense Genie App"
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? [Your account]
# - Link to existing project? No
# - Project name? taste-signature-app
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

---

### **Step 3: Configure Environment Variables in Vercel**

After deployment, add environment variables:

#### Via Vercel Dashboard:
1. Go to your project: https://vercel.com/YOUR_USERNAME/taste-signature-app
2. Click **"Settings"** tab
3. Click **"Environment Variables"**
4. Add each variable (see list above)
5. Click **"Save"**
6. Redeploy: **Deployments** tab → click **"Redeploy"** on latest

#### Via Vercel CLI:
```bash
# Add environment variables
vercel env add VITE_ANTHROPIC_API_KEY production
# Paste your key when prompted

vercel env add VITE_FIREBASE_API_KEY production
# Paste Firebase API key

# Repeat for all variables...

# Redeploy with new env vars
vercel --prod
```

---

### **Step 4: Update Firebase Configuration**

#### 4.1 Add Vercel Domain to Firebase

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select project: **taste-signature-ai-app**
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Vercel domain: `taste-signature-app.vercel.app`
6. Click **"Add"**

#### 4.2 Update Firestore Security Rules

If not already deployed, deploy your security rules:

```bash
cd "/Users/derekroberts/Sense Genie App"
firebase deploy --only firestore:rules
```

---

### **Step 5: Verify Deployment**

#### Test Your Live App:

1. **Visit your Vercel URL**
   - Example: `https://taste-signature-app.vercel.app`

2. **Test Authentication**
   - Create new account
   - Verify email works
   - Login/logout

3. **Test Features**
   - Log a taste experience
   - Check data saves to Firestore
   - Test AI insights (Claude API)
   - Verify tutorial appears for new users

4. **Check Console**
   - Open browser DevTools (F12)
   - Check for errors in Console tab
   - Verify no API key warnings

---

## 🔒 Security Best Practices

### **Current Setup (Client-Side API Keys):**

✅ **Good:**
- Firebase Auth handles user authentication securely
- Firestore security rules protect data
- Environment variables hide keys from Git

⚠️ **Security Note:**
- Anthropic API key is client-side (visible in browser)
- This is acceptable for private use or trusted users
- For public apps, move API key to serverless function

### **Recommended for Public Apps:**

#### Move Anthropic API Key to Vercel Serverless Function

Create `/api/claude.js`:
```javascript
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userMessage, systemPrompt, model, maxTokens, temperature } = req.body;

  // Call Anthropic API from server-side
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY, // Server-side only
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

  const data = await response.json();
  res.status(200).json(data);
}
```

Then update `claude-api.js` to call `/api/claude` instead of direct API.

---

## 🎯 Custom Domain (Optional)

### Add Your Own Domain:

1. **In Vercel Dashboard:**
   - Go to project → **Settings** → **Domains**
   - Click **"Add"**
   - Enter your domain: `tastesignature.com`
   - Follow DNS configuration instructions

2. **Update Firebase:**
   - Add custom domain to Firebase Authorized Domains
   - Update CORS settings if needed

---

## 🔄 Continuous Deployment

### Automatic Deployments:

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push

# Vercel automatically deploys!
# Preview URL: https://taste-signature-app-git-main-yourname.vercel.app
# Production URL: https://taste-signature-app.vercel.app (after merge to main)
```

### Preview Deployments:

- Every Git branch gets a preview URL
- Test changes before merging to production
- Share preview links with team

---

## 📊 Monitoring & Analytics

### Vercel Analytics:

1. **Enable Analytics:**
   - Go to project → **Analytics** tab
   - Click **"Enable"**
   - Free tier: 2,500 events/month

2. **View Metrics:**
   - Page views
   - User sessions
   - Performance scores
   - Error tracking

### Firebase Usage:

1. **Monitor Usage:**
   - Firebase Console → **Usage and billing**
   - Watch Firestore reads/writes
   - Monitor Authentication users

2. **Set Budgets:**
   - **Usage and billing** → **Set budget alerts**
   - Get email when approaching limits

---

## 🐛 Troubleshooting

### **Issue: "API key not configured" error**

**Solution:**
- Check environment variables are set in Vercel
- Redeploy after adding variables
- Clear browser cache

### **Issue: Firebase Authentication doesn't work**

**Solution:**
- Add Vercel domain to Firebase Authorized Domains
- Check Firebase config environment variables
- Verify firebaseConfig is loading correctly

### **Issue: 404 errors on refresh**

**Solution:**
- Already handled by `vercel.json` routes
- If still issues, check `vercel.json` is in root directory

### **Issue: Charts not rendering**

**Solution:**
- Chart.js loads from CDN (no build needed)
- Check browser console for errors
- Verify `index.html` includes Chart.js script

### **Issue: Environment variables not working**

**Solution:**
- Prefix must be `VITE_` for client-side access
- Redeploy after adding variables
- Check variable names match exactly

---

## 📦 Production Optimizations

### **Already Implemented:**

✅ Security headers in `vercel.json`:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

✅ Cache headers for static assets:
- CSS/JS/images cached for 1 year
- HTML not cached (always fresh)

✅ Gzip compression (automatic by Vercel)

✅ Global CDN (automatic by Vercel)

### **Optional Enhancements:**

#### Add package.json for dependency management:
```json
{
  "name": "taste-signature-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "python3 -m http.server 8000",
    "preview": "vercel dev",
    "deploy": "vercel --prod"
  }
}
```

#### Enable Vercel Speed Insights:
```html
<!-- Add before </body> in index.html -->
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

---

## 💰 Cost Estimate

### **Vercel (Hobby Plan - FREE):**
- Bandwidth: 100 GB/month
- Builds: 100 hours/month
- Serverless Functions: 100 GB-hours
- **Cost:** $0/month

### **Firebase (Spark Plan - FREE):**
- Authentication: Unlimited users
- Firestore: 50K reads, 20K writes, 1GB storage/day
- **Cost:** $0/month (for moderate usage)

### **Anthropic Claude API:**
- Sonnet 4.5: $3 per million input tokens, $15 per million output tokens
- Estimated: ~$5-20/month for personal use
- **Cost:** Pay as you go

**Total Estimated Cost: $5-20/month** (mostly Anthropic API)

---

## 🎉 Post-Deployment Checklist

After successful deployment:

- [ ] Test login/signup flow
- [ ] Verify email verification works
- [ ] Log a test experience
- [ ] Check Firestore data saving
- [ ] Test AI insights (Claude)
- [ ] Verify tutorial appears for new users
- [ ] Test on mobile devices
- [ ] Share URL with team/clients
- [ ] Set up monitoring alerts
- [ ] Configure custom domain (optional)

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com/
- **Your App (after deployment):** https://taste-signature-app.vercel.app
- **Vercel Documentation:** https://vercel.com/docs
- **Firebase Docs:** https://firebase.google.com/docs

---

## 🆘 Need Help?

**Vercel Support:**
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

**Firebase Support:**
- Documentation: https://firebase.google.com/docs
- Community: https://stackoverflow.com/questions/tagged/firebase

**Your Deployment Status:**
- Check: `vercel ls` (via CLI)
- Or visit: https://vercel.com/dashboard

---

## 🚀 You're Ready to Deploy!

Follow the steps above and your Taste Signature app will be live in minutes!

**Quick Start:**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!
5. Add domain to Firebase

That's it! Your professional sensory analysis platform is now live. 🎉
