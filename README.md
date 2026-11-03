# Email Automation dashboard

This repository is the UI. Deploy it on Vercel. Sending, webhooks, cron, and the database live in [emailautomation-backend](https://github.com/ahmeddabbasi/emailautomation-backend) on Render.

Deploy the backend first so you have its public URL.

## Deploy on Vercel

1. Import this repository. Framework preset is Next.js. Root directory is the repo root.
2. Set these environment variables, then deploy:

| Variable | Value |
| --- | --- |
| `BACKEND_URL` | Render URL, no trailing slash. Example: `https://emailautomation-backend.onrender.com` |
| `AUTH_SECRET` | The same `AUTH_SECRET` as the backend |
| `NEXT_PUBLIC_OPERATOR_TIMEZONE` | `Asia/Karachi`, or the same timezone set on the backend |

3. Open the Vercel URL and sign in with the backend's `AUTH_USERNAME` and `AUTH_PASSWORD`.

The dashboard calls `/api/...` on its own host. A server route forwards that request to Render and returns the session cookie to the browser, so login stays on the Vercel domain.

Changing `BACKEND_URL` requires a new Vercel deployment.

## Notes

- Settings can store an OpenAI key and switch new drafts to OpenAI when Gemini or Groq is limited. The key stays on the backend. Apply the backend migrations before saving a key.
- Play simulation, in the sidebar, walks Overview, Campaigns, a new campaign, Leads, Testing, and Send history. It blocks saves and sends and restores the page you started on.

- Mailgun webhooks and the dispatch cron must target the Render URL. They are configured in the backend repo.
- Vercel request bodies are limited to about 4.5 MB, so keep a CSV upload under that size.
- "Run dispatch now" waits for the backend tick through this proxy, which is capped at 60 seconds. The Render cron is what sends on schedule when a tick runs longer.

## Local UI against a running backend

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `BACKEND_URL` to `http://localhost:3001` if the API is running locally on that port, or to the Render URL.
