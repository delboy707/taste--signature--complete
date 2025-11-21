# Deployment Instructions

## Setting up Environment Variables on Vercel

The application now uses a serverless function proxy to avoid CORS issues when calling the Anthropic API. You need to configure the API key as an environment variable in Vercel.

### Steps:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add a new environment variable:
   - **Name**: `VITE_ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key (starts with `sk-ant-`)
   - **Environment**: Select all environments (Production, Preview, Development)
4. Click **Save**
5. Redeploy your application for the changes to take effect

### How it Works

- **Before**: The browser tried to call the Anthropic API directly, causing CORS errors
- **Now**: The browser calls `/api/claude` (serverless function), which proxies the request to Anthropic
- **Security**: The API key is stored securely on the server and never exposed to the browser

### Local Development

For local development, the API key is stored in `.env` (which is gitignored):

```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

### Testing

After deployment:
1. Open the AI Insights page
2. Try asking a question or clicking "Analyze Selected Product"
3. You should no longer see "Failed to fetch" errors
