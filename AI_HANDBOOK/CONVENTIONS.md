# Conventions & Gotchas

## Tailwind v4 — CRITICAL

This project uses **Tailwind CSS v4**. This is NOT the same as Tailwind v3.

**Do NOT:**
- Look for `tailwind.config.js` — it doesn't exist
- Look for PostCSS config — there isn't one
- Use `@apply` — it works differently in v4
- Use `@layer` — not supported in v4

**Do:**
- Customize theme via `@theme` directive in `src/index.css`
- Import Tailwind with `@import "tailwindcss"`
- Style components using only utility classes

**Example from `index.css`:**
```css
@import "tailwindcss";
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}
```

## Port Configuration

- **The app runs on port 3001.** Not 3000.
- Port 3000 is occupied by a WhatsApp bridge managed by the Hermes agent.
- Change is in `server.ts`: `const PORT = 3001;`
- **Do not change it back to 3000** without checking if the WhatsApp bridge is still running.

## AI Configuration

- Uses **DeepSeek** (OpenAI-compatible API), not Google Gemini.
- API key from `.env`: `DEEPSEEK_API_KEY`
- Fallback: mock responses when key is missing.
- **Do NOT re-add Gemini** unless explicitly asked.
- The endpoint paths are still `/api/gemini/chat` and `/api/gemini/report` in some documentation for backward compatibility, but the actual implementation uses DeepSeek.

## File Conventions

- **No `@/` path alias in imports from components.** The tsconfig defines `@/*` as a path alias, but the codebase does not use it consistently.
- **All CSS in `index.css`.** No CSS modules, no styled-components, no inline styles for complex layouts.
- **Lucide icons** — import by name from `lucide-react`.
- **motion (framer-motion)** — import from `motion/react`.

## Firestore Rules

- Security rules in `firestore.rules`
- Restaurants/orders/users: read-all, create/update with validation, delete restricted
- Menus/buzzers: read-all, create/update/delete with validation
- Default-deny catch-all at the top

## Build Commands

```bash
npm run dev      # Dev server (tsx + Vite middleware) on :3001
npm run build    # Production build (Vite + esbuild)
npm run start    # Serve production build from dist/
npm run predeploy  # Vite build only (for GitHub Pages)
npm run deploy   # Deploy to GitHub Pages (gh-pages branch)
```

## GitHub Pages

- Deployed at `https://gruthwikreddy.github.io/Restro/`
- Vite `base` is set to `/Restro/` in `vite.config.ts`
- Only the frontend is deployed — API features (AI, order placement) require the Express server

## Known Gotchas

1. **`dotenv` import:** Use `import * as dotenv from "dotenv"; dotenv.config();` — the `/config` subpath doesn't work with this tsconfig.
2. **TypeScript errors:** There are pre-existing TS errors from node_modules (vite, firebase types). These are harmless at runtime with tsx. Ignore them.
3. **Vite HMR on .env changes:** Vite auto-restarts when `.env` is modified. The server prints "injected env (1) from .env".
4. **The app has no `tailwind.config.js`.** It uses Tailwind v4's CSS-first config via `@theme`. If you add custom colors, add them to `@theme` in `index.css`.
5. **setDoc vs addDoc:** All Firestore writes use `setDoc()` with explicit document IDs, NOT `addDoc()` with auto-generated IDs.
6. **localStorage keys:** All prefixed with `kcode_` (e.g. `kcode_active_mode`, `kcode_customer_session_state`).

## Working Directory

```
/Users/udaykirang/kcodeit/Restro
```
