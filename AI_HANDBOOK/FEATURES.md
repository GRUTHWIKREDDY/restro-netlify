# Features Deep Dive

## 1. AI Engine (DeepSeek)

**Endpoint paths:** `/api/deepseek/chat` and `/api/deepseek/report`
**Model:** `deepseek-chat` (via OpenAI-compatible API at `https://api.deepseek.com/v1`)
**Auth:** `DEEPSEEK_API_KEY` in `.env`

**Three AI features:**
1. **Aarudy D' Concierge** (customer-facing) — menu recommendations, dish info. System prompt sets them as an "expert, polite Indian Khansama & Aarudy D' AI Assistant"
2. **Menu Copywriter** (admin) — generates gourmet dish descriptions from a dish name
3. **Business Report Generator** (admin/superadmin) — generates strategic restaurant/SaaS performance reports

**Fallback:** If `DEEPSEEK_API_KEY` is not set, the server returns hardcoded mock responses so the demo still works.

**History:** Migrated from Google Gemini (`gemini-3.5-flash`) to DeepSeek. Old endpoint paths `/api/gemini/*` are deprecated but may still appear in comments.

## 2. Geofencing & Handshake

**Purpose:** Verify customers are physically at the restaurant before allowing orders.

**How it works:**
1. Customer's browser requests geolocation via `navigator.geolocation.getCurrentPosition()`
2. Distance calculated using Haversine formula between customer's coords and restaurant's `latitude`/`longitude`
3. If distance > `geofenceRadiusMeters` (default 150m), order requires handshake verification
4. Handshake generates a 6-character alphanumeric code shown to the customer
5. Staff enters the code in the admin panel to approve the order

**Simulation modes** (in DineInCustomerUI):
- `inside` — mocks coordinates at restaurant location (verified)
- `outside` — mocks coordinates far from restaurant (triggers handshake)
- `actual` — uses real browser GPS

**Note:** The GPS flow is currently simplified — geofencing may be partially commented out.

## 3. Buzzer (Waiter Call) System

Customers can summon waiters from their table:
- Request types: "Waiter Call", "Water Refill", "Request Bill", "Custom"
- Buzzer created via direct Firestore `setDoc()` (bypasses Express API)
- Admin and KDS panels subscribe to buzzers via `onSnapshot()`
- Buzzer dismissed via `deleteDoc()` from admin panel

## 4. QR Code Generation & Printing

**URL format:** `{baseUrl}/r/{restaurantId}/t/{tableNumber}`
**Base URL:** defaults to `window.location.origin`, customizable in admin panel
**QR API:** `https://api.qrserver.com/v1/create-qr-code/`

**Current limitations (before fixes):**
- Download only saves raw QR PNG, not the branded flyer
- Print uses `window.print()` which prints the whole admin page
- No bulk printing for multiple tables

**Flyer themes:** noir (dark), gold (amber), emerald (green), cobalt (indigo)

## 5. Orders Lifecycle

```
Customer places order (pending)
       ↓
Kitchen accepts (accepted) ← Admin can also accept
       ↓
Kitchen completes (completed)
       ↓
Order released (released: true) ← Bill settled, order hidden from active views
       │
Or: Customer cancels all items → order rejected
```

## 6. Staff Portal Access

Three roles, each with hardcoded credentials:

| Role | Username | Password | Mode |
|---|---|---|---|
| Restaurant Admin | `admin` | `password` | restadmin |
| Chef KDS | `chef` | `password` | kitchen |
| SaaS Super Admin | `superadmin` | `password` | superadmin |

Per-tenant credentials can also be set during tenant creation (`adminUsername`/`adminPassword`/`chefUsername`/`chefPassword`).

## 7. Tenant Creation (SuperAdmin)

When a new restaurant is onboarded:
1. Generates sequential ID (`rest-{max+1}`)
2. Writes restaurant doc to Firestore
3. Seeds 3 starter menu items (Butter Chicken, Naan, Mango Lassi)
4. Syncs via Express API
5. Shows success alert with credentials (before fix: URL not shown)
