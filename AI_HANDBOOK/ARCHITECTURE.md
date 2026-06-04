# Architecture

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript | JSX/TSX, Vite 6 bundler |
| Styling | Tailwind CSS v4 | No PostCSS, no `tailwind.config.js`. All customization via `@theme` in `src/index.css` |
| Backend | Express (Node.js) | Runs on port 3001. Serves API + Vite middleware (dev) or static `dist/` (prod) |
| Database | Firebase Firestore v12 | Client SDK + Admin SDK both used. Real-time via `onSnapshot()` |
| AI | DeepSeek Chat API | OpenAI-compatible. Proxied through Express at `/api/deepseek/chat` and `/api/deepseek/report` |
| Icons | lucide-react | Consistent vector icon library |
| Animations | motion (framer-motion v12) | React animation library |
| Build | Vite (frontend) + esbuild (server bundle) | `npm run build` produces `dist/` with both |
| Fonts | Inter (body), Space Grotesk (display), JetBrains Mono (code) | Loaded via Google Fonts in `index.css` |

## Folder Layout

```
/
├── server.ts                    ← Express server (API + Vite middleware + AI proxy)
├── vite.config.ts               ← Vite config (base: /Restro/, HMR toggle, Tailwind v4)
├── tsconfig.json                ← TypeScript config
├── firebase-applet-config.json  ← Firebase project credentials (AI Studio managed)
├── firebase-blueprint.json      ← Schema documentation for Firestore
├── firestore.rules              ← Firestore security rules
├── metadata.json                ← AI Studio applet metadata
├── package.json                 ← Dependencies and scripts
├── index.html                   ← Vite entry HTML
├── .env                         ← Environment variables (DEEPSEEK_API_KEY)
├── .env.example                 ← Example env vars
├── .github/
│   └── copilot-instructions.md  ← GitHub Copilot project context
├── AI_HANDBOOK/                 ← ← YOU ARE HERE
├── src/
│   ├── main.tsx                 ← React entry point
│   ├── App.tsx                  ← Root component (state hub, routing, Firestore listeners)
│   ├── index.css                ← Tailwind v4 theme + custom animations
│   ├── firebase.ts              ← Firebase client SDK init
│   ├── types.ts                 ← All TypeScript interfaces
│   └── components/
│       ├── DineInCustomerUI.tsx      ← Customer-facing ordering UI (~1664 lines)
│       ├── RestaurantAdminPanel.tsx  ← Restaurant admin panel (~2741 lines)
│       ├── KitchenDisplaySystem.tsx  ← Kitchen display system
│       ├── SuperAdminDashboard.tsx   ← SaaS super admin dashboard (~2374 lines)
│       └── StaffPortalLogin.tsx      ← Staff login gateway
└── dist/                        ← Build output (gitignored)
```

## Data Flow

There are **two parallel data paths**:

### Path A: Express API (Server-Mediated)
```
User Action → Component handler → fetch("/api/...") → Express route → Firestore setDoc() → Response
```

Used for: order placement, menu CRUD, restaurant updates, user registration, database reset.

### Path B: Direct Firestore Client SDK
```
User Action → Component → Firestore setDoc()/deleteDoc() directly
```

Used for: buzzer creation/dismissal, menu ratings, handshake approval, auto-complete orders on logout.

### Real-Time Sync
`App.tsx` sets up 5 `onSnapshot()` listeners at mount (restaurants, menus, orders, users, buzzers).
Any write from any tab instantly updates all open clients. Additionally, `refreshUnifiedDatabase()`
pulls data via REST API after every write as a consistency fallback.

## State Management

- **No external state library.** All state lives in `App.tsx` and is passed down as props.
- **localStorage** persists session, selected restaurant/table, auth status (all prefixed with `kcode_`).
- **ticker** state increments every 1s to trigger re-renders for time-sensitive UI (KDS timers).
