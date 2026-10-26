# How-To: Deploy Application to Cloudflare Pages

This guide explains how **Fertility Tracker** is deployed to Cloudflare Pages at [`fertility-tracker.gsuquet.com`](https://fertility-tracker.gsuquet.com) via direct GitHub integration (Cloudflare CI) or manually via Wrangler CLI.

---

## Automated Deployment (Cloudflare CI)

Deployment is managed automatically by Cloudflare Pages native GitHub Integration:

1. **Trigger:** Every push or merge to the `main` branch automatically triggers a build job in Cloudflare CI.
2. **Build Settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
   - **Node.js Version:** `26.12.1` (pinned in `package.json` engines and `.mise/config.toml`)
3. **Production URL:** [`https://fertility-tracker.gsuquet.com`](https://fertility-tracker.gsuquet.com)
4. **Preview Deployments:** Pull requests automatically generate unique staging preview URLs for isolated testing before merging to `main`.

---

## Manual / Local CLI Deployments (Wrangler)

If you need to deploy or test static builds locally without pushing to GitHub:

### Prerequisites

- Cloudflare Account
- `mise`, or Node.js `26.12.1` with npm `12.2.1` (the versions pinned in `.mise/config.toml`)

### Steps

1. **Login to Cloudflare:**

   ```bash
   npx wrangler login
   ```

2. **Build the Production Bundle:**

   ```bash
   npm run build  # or: mise run build
   ```

3. **Deploy to Cloudflare Pages:**

   ```bash
   npm run deploy  # or: mise run deploy
   ```

4. **Local Preview Serving:**

   To simulate Cloudflare Pages static serving locally:

   ```bash
   npm run pages:dev  # or: mise run pages:dev
   ```
