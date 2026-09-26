# Video Upscaler — Frontend

Next.js frontend for a CPU-only video upscaling service. The browser only handles the UI and HTTP API calls; it never runs Python or FFmpeg.

## Stack

- Next.js 16.3.6
- React 19.2
- TypeScript
- App Router
- Plain CSS (no UI framework dependency)

The project targets Next.js 16.3.6, which is an active LTS line as of September 2026. Keep the Next.js dependency patched when new security releases are published.

## Local development (Windows / macOS / Linux)

1. Install Node.js 22 LTS or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_API_BASE_URL` to your backend URL.
4. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm install
npm run build
npm start
```

## Vercel deployment

Import this folder as a Vercel project. No custom server is required.

Set this Vercel environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR-RAILWAY-BACKEND.example.com
```

Redeploy after changing the environment variable.

## Backend connection

The frontend expects the backend to expose:

- `GET /health`
- `POST /api/v1/jobs`
- `GET /api/v1/jobs/:jobId`
- `GET /api/v1/jobs/:jobId/progress`
- `GET /api/v1/jobs/:jobId/download`

Upload field name is `video`. Form fields are `scale` and `quality`.

Supported scale values:

```text
2x | 4x | 1080p | 1440p | 4K
```

Supported quality values:

```text
fast | balanced | quality | max
```

## Validation

The current UI validates the selected extension and a 500 MB client-side limit. The backend must remain the authoritative validator and can use a different limit configured with `MAX_UPLOAD_SIZE_MB`.

## Architecture

```text
Browser
  ↓ HTTPS / REST
Next.js UI (Vercel)
  ↓ NEXT_PUBLIC_API_BASE_URL
Node.js + Express API (Railway)
  ↓ job/worker abstraction
Python engine (added later)
  ↓
FFmpeg / OpenCV (owned by the engine)
```

The frontend has no direct Python or FFmpeg dependency, and no AI/ML dependency.
