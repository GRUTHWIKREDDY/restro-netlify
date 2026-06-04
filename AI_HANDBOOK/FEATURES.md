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

## 8. Analytics Dashboard

**Added as modules in both RestaurantAdmin and SuperAdmin.**

### RestaurantAdmin Analytics Tab
- Tab labeled "📊 Analytics" in the admin panel tab bar
- Uses `<AnalyticsDashboard>` component with `restaurantId` bound to current restaurant
- Full tabbed interface with all 7 modules + scorecard

### SuperAdmin Analytics Overlay
- Bento card labeled "📊 Analytics Suite" in the dashboard grid
- Full-screen overlay using `<AnalyticsDashboard restaurantId="all">` for cross-tenant data

### Analytics Module Components

All modules live in `src/components/analytics/AnalyticsDashboard.tsx` — a single self-contained component with internal tab navigation:

| Module | Tab Key | Data Source (API) | Key Metrics |
|---|---|---|---|
| Sales | sales | `GET /api/:id/analytics/sales?range=` | Revenue, AOV, daily trend, day-of-week heatmap, top items |
| Menu | menu | `GET /api/:id/analytics/menu` | Menu engineering matrix (star/plowhorse/puzzle/dog), item ratings |
| Operations | operations | `GET /api/:id/analytics/operations` | Ticket time, peak/off-peak throughput, discount rate |
| Labor | labor | `GET /api/:id/analytics/labor?range=` | Sales/labor hour, labor cost %, shift slot performance |
| Customers | customers | `GET /api/:id/analytics/customers?range=` | Repeat rate, CLV estimate, churn candidates, visit frequency |
| Feedback | feedback | `GET /api/:id/analytics/feedback?range=` | Avg rating, sentiment breakdown, complaint themes |
| Inventory | inventory | `GET /api/:id/analytics/inventory` | Stock levels, low stock alerts, spoilage %, waste logs |
| Scorecard | scorecard | `GET /api/:id/analytics/scorecard` | 8-metric health check with green/red indicators |

### API Endpoints (`/api/*/analytics/*`)

The `:restaurantId` param accepts either a specific restaurant ID or `all` for cross-tenant data.

| Endpoint | Description |
|---|---|
| `POST /api/analytics/aggregate-daily-summaries` | Generate/refresh dailySummary documents |
| `GET /api/analytics/daily-summaries` | Read daily summaries (history range) |
| `GET /api/:restaurantId/analytics/sales?range=` | Module 1: Sales analytics |
| `GET /api/:restaurantId/analytics/menu` | Module 2: Menu analytics |
| `GET /api/:restaurantId/analytics/labor?range=` | Module 3: Labor analytics |
| `GET /api/:restaurantId/analytics/inventory` | Module 4: Inventory analytics |
| `GET /api/:restaurantId/analytics/customers?range=` | Module 5: Customer analytics |
| `GET /api/:restaurantId/analytics/feedback?range=` | Module 6: Feedback analytics |
| `GET /api/:restaurantId/analytics/operations` | Module 7: Operational analytics |
| `GET /api/:restaurantId/analytics/scorecard` | Unit Economics Scorecard |
| `GET /api/superadmin/analytics/platform` | Cross-tenant platform overview |
| `POST /api/:restaurantId/feedback` | Write feedback response |
| `POST /api/:restaurantId/waste-log` | Write waste log entry |
| `POST /api/:restaurantId/shifts` | Write staff shift (future) |

### Seed Script
- `seed-analytics.ts` — generates 90 days of realistic data for 3 outlets
- Run with: `npx tsx seed-analytics.ts`
- Creates orders with lunch/dinner rush patterns, dailySummaries, customer profiles, staff shifts, and feedback
- Weekend traffic boosted 30% Friday-Saturday, reduced 20% Sunday

### Date Range Selection
- 7 Days, 30 Days, 90 Days toggle in the analytics header
- Range param passed to all relevant API endpoints
- Export CSV button for all modules

### New TypeScript Types
All defined in `src/types.ts`:

`DailySummary`, `StaffShift`, `InventoryItem`, `Recipe`, `WasteLog`, `PurchaseOrder`, `CustomerProfile`, `Session`, `FeedbackResponse`, `ExternalReview`, `KdsEvent`, `AnalyticsFilters`

When a new restaurant is onboarded:
1. Generates sequential ID (`rest-{max+1}`)
2. Writes restaurant doc to Firestore
3. Seeds 3 starter menu items (Butter Chicken, Naan, Mango Lassi)
4. Syncs via Express API
5. Shows success alert with credentials (before fix: URL not shown)
