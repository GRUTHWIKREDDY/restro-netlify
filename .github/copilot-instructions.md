# kCodeIT — Multi-Tenant Digital Menu System

## Project Overview

Full-stack SaaS for restaurant digital dining. Built with React + Vite + Tailwind v4 + Firebase Firestore + Express + Gemini AI. Hosted on Google AI Studio.

## Stack & Conventions

- **React 19** with TypeScript (JSX/TSX)
- **Vite 6** bundler with Tailwind v4 (`@tailwindcss/vite` plugin)
- **Tailwind v4** — uses `@theme` directive in `index.css` for custom fonts (Inter, Space Grotesk, JetBrains Mono), NOT `tailwind.config.js`. No PostCSS config. Use `@import "tailwindcss"` syntax.
- **Firebase v12** — Firestore as primary DB. Client SDK initialized in `src/firebase.ts`, admin SDK also used in `server.ts`. Firestore rules in `firestore.rules`.
- **Express** server at `server.ts` — runs Vite in middleware mode (dev) or serves `dist/` (production). Serves as API layer for Firestore CRUD + Gemini AI proxy.
- **Google Gemini AI** via `@google/genai` SDK — proxied through `/api/gemini/chat` and `/api/gemini/report` endpoints. Falls back to mock responses if `GEMINI_API_KEY` is missing.
- **CSS** — Tailwind utility classes only. Custom animations (`sla-breach-pulse`, `sparkle-shiver`) defined in `index.css` @keyframes. Scrollbar hiding via `scrollbar-none` class.

## Architecture

### Server (`server.ts`)
- Express on port 3000
- Seeds Firestore on boot with 3 restaurants, ~20 menu items, ~14 orders, ~12 users
- REST API endpoints: `/api/restaurants`, `/api/menus`, `/api/orders`, `/api/users`, `/api/buzzers`, `/api/reset`
- Gemini AI proxy at `/api/gemini/chat` (customer-facing dining assistant) and `/api/gemini/report` (admin analytics)
- Production: serves static files from `dist/`; SPA fallback for all routes

### Firestore Collections (`firebase-blueprint.json`)
| Collection | Schema | Key |
|---|---|---|
| `restaurants` | Restaurant | `id` |
| `menus` | MenuItem | `id` |
| `orders` | Order | `id` |
| `users` | DineInUser | `phone` |
| `buzzers` | Buzzer | `id` |

### Frontend Components (`src/components/`)

**DineInCustomerUI** (`src/components/DineInCustomerUI.tsx`, ~1837 lines)
- Customer-facing ordering UI with phone-based login
- Menu browsing by category/search, cart management, order placement
- GPS geofencing — checks user location against restaurant `geofenceRadiusMeters` before allowing order placement
- Handshake system — out-of-range orders generate a handshake code that must be verified by staff
- AI Maitre D' chatbot (floating chat button) — `/api/gemini/chat`
- Buzzer system — table-side waiter summons (waiter-call, water refill, bill)
- Order history display with rating/review per item
- Simulator controls for GPS mode (`inside` / `outside` / `actual`) and table number

**RestaurantAdminPanel** (`src/components/RestaurantAdminPanel.tsx`, ~1696 lines)
- 5 tabs: Orders, Menu, Tables, Floor Plan, Buzzers
- Order management — accept/reject orders, cancel individual dishes, view live queue
- Menu CRUD — add/edit/delete menu items with AI-assisted descriptions (`/api/gemini/chat`)
- Table management — adjust table count
- AI strategic report generation (`/api/gemini/report`)
- AI photo shoot studio — generates/edits food imagery
- Sales ledger modal with search

**KitchenDisplaySystem** (`src/components/KitchenDisplaySystem.tsx`, ~397 lines)
- Displays pending/accepted orders for the selected restaurant
- Order flow: pending -> accepted -> completed
- Per-dish cancellation support
- Kitchen buzzer alerts
- Multi-restaurant tab selector for chefs working across brands
- Live timer showing order wait times

**SuperAdminDashboard** (`src/components/SuperAdminDashboard.tsx`, ~879 lines)
- Multi-tenant SaaS platform control
- 5 overlay tabs: Tenants, Seating, Feed, Accounting, AI SaaS
- Add/remove tenants, lock/unlock restaurants
- Global seating chart, order feed, revenue accounting
- AI-generated SaaS business reports
- Pricing/commission configuration per tenant

**StaffPortalLogin** (`src/components/StaffPortalLogin.tsx`, ~319 lines)
- Role selection: Admin Portal (admin/password), Chef KDS Panel (chef/password), SaaS Super Control (superadmin/password)
- Animated "terminal handshake" loading sequence
- URL routing: `/portal`, `/admin`, `/backend`, `/staff`

## Key Conventions

### State Management
- All state lifted to `App.tsx` — no external state library
- `localStorage` persistence for session, selected restaurant, table number, auth status (prefixed with `kcode_`)
- Firestore `onSnapshot` listeners provide real-time sync across all components
- Periodic refresh via `refreshUnifiedDatabase()` pulling from Express API endpoints
- `ticker` state increments every 1s to trigger re-renders for time-sensitive UI (KDS timers)

### Data Flow
1. Customer places order -> `POST /api/orders` + `POST /api/users` (upsert profile)
2. Firestore `onSnapshot` -> all open tabs update in real-time
3. Admin/Chef updates order status -> `POST /api/orders`
4. Manual reset button -> `POST /api/reset` -> wipes and re-seeds all collections

### Geofencing & Handshake
- `DineInCustomerUI` checks geolocation before submitting order
- Distance calculated via Haversine against restaurant `latitude`/`longitude`/`geofenceRadiusMeters`
- `gpsSimulateMode` supports `inside` (mock on-premise), `outside` (mock far away), `actual` (real GPS)
- Out-of-range orders get `requiresHandshake: true` + `handshakeCode` (6-digit alphanumeric)
- Staff must verify the code before accepting out-of-range orders

### AI Integration
- Two Gemini endpoints: `/api/gemini/chat` (customer dining assistant + admin copywriter) and `/api/gemini/report` (admin strategy reports)
- Uses `gemini-3.5-flash` model
- Falls back to hardcoded mock responses if `GEMINI_API_KEY` not set (keeps demo functional)
- No streaming — all AI calls return full text in one response

### Build & Run
- `npm run dev` — starts Express on :3000 with Vite HMR
- `npm run build` — Vite build + esbuild server bundle -> `dist/`
- `npm start` — runs production server from `dist/server.cjs`
- `NODE_ENV=production` / `DISABLE_HMR=true` for production mode

### CSS / Tailwind v4
- Custom theme in `index.css` using `@theme` directive
- No PostCSS config file — Tailwind v4 handles it
- No `tailwind.config.js` — all customization via `@theme` in CSS
- Fonts: Inter (body), Space Grotesk (display), JetBrains Mono (mono)
- Custom animations defined with `@keyframes` in `index.css`

### Config Files
- `firebase-applet-config.json` — Firebase project config (injected by AI Studio)
- `firebase-blueprint.json` — Schema documentation (entities + Firestore collections)
- `.env.example` — expects `GEMINI_API_KEY` and `APP_URL`
- `metadata.json` — AI Studio applet metadata (capabilities, permissions)
- `firestore.rules` — Firestore security rules with per-collection validation
- `vite.config.ts` — Vite config with HMR toggle for AI Studio compatibility
- `tsconfig.json` — TypeScript config with `@/*` path alias
