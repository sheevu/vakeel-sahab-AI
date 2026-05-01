# Cloudflare Pages Deployment Guide

I have refactored your project to support **Cloudflare Pages (Full Stack)**.

### **What's New?**
- **/functions**: This new folder contains your API logic (Chat, OpenAI, TTS, STT). Cloudflare will automatically serve these as Edge Functions.
- **npm run deploy**: A new command to build and deploy your project to Cloudflare.
- **npm run pages:dev**: A new command to test the Cloudflare environment locally.

### **How to Deploy**

1. **Build and Deploy:**
   Run the following command in your terminal:
   ```bash
   npm run deploy
   ```
   - This will open a browser window for you to log into your Cloudflare account.
   - It will ask for a project name (e.g., `vakeel-sahab-ai`).
   - It will ask for the production branch (usually `main`).

2. **Set Environment Variables:**
   Once the first deployment finishes, go to your **Cloudflare Dashboard**:
   - Navigate to **Workers & Pages** > **[Your Project Name]** > **Settings** > **Environment Variables**.
   - Add the following variables for **both** "Production" and "Preview" environments:
     - `GEMINI_API_KEY`: Your primary Gemini key.
     - `OPENAI_API_KEY`: Your OpenAI key.
     - `GEMINI_API_KEY_1`: (Optional)
     - `Gemini_API_Key1`: (Optional)

3. **Domain Setup:**
   In the **Custom Domains** tab of your project in Cloudflare, add your domain. Since your domain is already on Cloudflare, it will automatically handle the DNS records for you.

4. **Compatibility Flag:**
   Ensure the `nodejs_compat` compatibility flag is enabled in the Cloudflare Dashboard under **Settings** > **Functions** > **Compatibility flags**.

### **Local Testing**
To test the Cloudflare environment locally:
1. Create a `.dev.vars` file in the root directory (same format as `.env`).
2. Run:
   ```bash
   npm run pages:dev
   ```
