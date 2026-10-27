# Reel Reports — Web

Next.js 15 + Tailwind 4 frontend for Reel Reports, a document-to-video platform. The backend lives in [videoplatform-aibackend](https://github.com/Aniket-jha/videoplatform-aibackend).

## What's here

- **Landing page** (`/`) with how-it-works, video types, brand kits and pricing.
- **Auth** (`/login`, `/signup`), cookie session handled by the API.
- **Three ways to make a video**, each its own page in the sidebar:
  - **Direct Video** (`/app/direct`): upload a document, get a finished MP4 on the page.
  - **DIY Video** (`/app/diy`): upload a document; it pauses for script and storyboard review before anything renders.
  - **Chat** (`/app/chat`, `/app/chat/[id]`): talk it through with the assistant, then generate from the conversation. Conversations are listed under Chats history.
  - Video type tabs: Educational, Corporate, Informational, Social Media (each applies sensible defaults; Social switches to vertical).
  - Settings card: visual format (motion graphics, + images, visual video, cinematic AI, avatar), style preset (Clean, Bold, Editorial, Playful, Tech, Minimal), size, length, brand kit, voice with audio previews, captions. Direct and DIY also accept up to 8 of your own images.
- **Project review** (`/app/projects/[id]`): pipeline progress, script editor, storyboard editor with scene previews, final player.
- **Video editor** (`/app/projects/[id]/edit`, "Edit video" on any finished video): live preview with the Remotion Player using the same composition the server renders; timeline with scene, text and music tracks (drag to reorder, drag edges to trim/extend, zoom, click to seek); inspector for scene content, narration re-recording, image/clip replacement (upload or stock search), per-scene layout and transition, text overlays (position, size, colour, background, animation, timing), background music (volume, ducking), size, style, captions, default transition and narration volume; undo/redo, autosave, keyboard shortcuts (Space, ←/→, ⌘Z/⇧⌘Z, Delete) and Export.
- **My Media** (`/app/media`), **Brand Kits** (`/app/brand`), **Plan & Credits** (`/app/billing`), **Integrations** (`/app/settings`).

## Video composition (shared with the backend)

`src/remotion/` is a copy of the backend's `remotion/` folder so the editor's preview matches the export exactly. After changing the composition in the backend, re-sync it:

```bash
npm run sync:remotion
```

It expects the backend checked out at `../server`; otherwise set `REMOTION_SRC=/path/to/backend/remotion`.

## Deploy

See [DEPLOYMENT.md in the backend repo](https://github.com/Aniket-jha/videoplatform-aibackend/blob/main/DEPLOYMENT.md). In short: import this repo into Vercel. Production builds use the live API at `https://api.yourwault.com`; set `API_URL` in Vercel only to point at a different backend (it's read at build time).

## Run locally

Start the backend first (port 4000), then:

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. Requests to `/api/*` and `/storage/*` are proxied to the backend (see `next.config.ts`), so auth cookies stay first-party. Point it at another backend with `API_URL`:

```bash
API_URL=https://api.yourwault.com npm run dev
```
