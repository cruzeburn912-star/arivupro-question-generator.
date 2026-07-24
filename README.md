# ArivuPro Question Paper Generator — Vercel Deploy Guide

This is a ready-to-deploy version of the question generator. It has two parts:
- `src/App.jsx` — the interface (runs in the visitor's browser)
- `api/generate.js` — a serverless function (runs on Vercel's servers) that holds
  your Anthropic API key and forwards requests to Claude. The browser never sees
  the key.

## Step 1 — Get an Anthropic API key
1. Go to https://console.anthropic.com
2. Sign up / log in, then create an API key under "API Keys".
3. Copy the key (starts with `sk-ant-...`). Keep it secret — treat it like a password.

## Step 2 — Get this code onto GitHub
Vercel deploys directly from a GitHub repo, so:
1. Create a free GitHub account at https://github.com if you don't have one.
2. Create a new empty repository (e.g. "arivupro-question-generator").
3. Upload all the files in this folder to that repository. Easiest way if you're
   not familiar with git commands: on the repo page, click "Add file" ->
   "Upload files", then drag in everything from this folder (keep the folder
   structure — `api/` and `src/` need to stay as folders).

## Step 3 — Deploy on Vercel
1. Go to https://vercel.com and sign up (you can sign up directly with your
   GitHub account — this also makes Step 4 automatic).
2. Click "Add New..." -> "Project".
3. Select the GitHub repository you just created and click "Import".
4. Vercel will auto-detect this as a Vite project. Leave the build settings as
   default.
5. Before clicking Deploy, open "Environment Variables" and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: (paste your real key from Step 1)
6. Click "Deploy". Wait about a minute.
7. You'll get a live link like `https://arivupro-question-generator.vercel.app`
   — that's your shareable link, working on any device, any browser.

## Step 4 — Test it
Open the link, pick a chapter preset, click "Issue Question Paper", and confirm
you get a generated question set back. If you get an error, check:
- The environment variable name is exactly `ANTHROPIC_API_KEY`
- Your Anthropic account has available credit/billing set up
- You redeployed after adding the environment variable (Vercel -> Deployments ->
  "Redeploy" if you added the variable after the first deploy)

## Updating the app later
Any time you push new changes to the GitHub repo, Vercel automatically
redeploys — no manual steps needed.

## Local testing (optional, before deploying)
If you want to test on your own computer first:
```
npm install
npm run dev
```
Note: the `/api/generate` function needs Vercel's own dev server to run
correctly (`vercel dev`), not plain `vite dev`, if you want to test the API
proxy locally. Installing the Vercel CLI (`npm i -g vercel`, then `vercel dev`)
handles this automatically.
