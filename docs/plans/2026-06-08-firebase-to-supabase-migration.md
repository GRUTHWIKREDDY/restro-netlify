# Firebase → Supabase Migration Plan

> **For implementer:** This is a comprehensive migration plan. Follow tasks sequentially. Each task is 2-5 minutes of focused work. Complete all tasks before declaring done.

**Goal:** Replace all Firebase Firestore usage with Supabase (PostgreSQL + Realtime) while preserving every feature — real-time sync, multi-tenancy, geofencing, analytics, AI chat, and seeding.

**Architecture:** Keep the existing unified Express/Vite architecture. Replace `firebase/firestore` client SDK on both server and browser with `@supabase/supabase-js`. Replace Firestore `onSnapshot` real-time listeners with Supabase Realtime `postgres_changes` subscriptions. Data model maps Firestore documents to PostgreSQL rows with JSONB for array/object fields.

**Tech Stack:** Supabase JS SDK v2, PostgreSQL 15+, Supabase Realtime (WebSocket via logical replication), `pg` for migrations.

---

## Phase 0: Pre-Flight — Understanding the Current Architecture

Before touching code, every implementer MUST understand these facts about the codebase:

### Firestore Collections (13 total)

| # | Collection | Type | Docs | Key Fields | Real-time? |
|---|-----------|------|------|------------|-----------|
| 1 | `restaurants` | Core | 7 | id, name, status, lat/lng, floors (JSONB-like) | yes |
| 2 | `menus` | Core | ~32 | id, restaurantId, name, price, category, imageUrl | yes |
| 3 | `orders` | Core | ~20+ | id, restaurantId, tableNumber, items (array), status, totalAmount, geofence fields | yes |
| 4 | `users` | Core | ~20 | phone (as doc ID), name, globalOrderHistory (array) | yes |
| 5 | `buzzers` | Core | 0+ | id, restaurantId, tableNumber, requestType, status | yes |
| 6 | `dailySummaries` | Analytics | varied | restaurantId_date as doc ID, totalRevenue, topItems, ... | no |
| 7 | `staffShifts` | Analytics | ~60 | restaurantId, staffName, role, shiftStart/End, hourlyRate | no |
| 8 | `inventory` | Analytics | 0+ | restaurantId, name, currentStock, parLevel, costPerUnit | no |
| 9 | `wasteLogs` | Analytics | 0+ | restaurantId, ingredientName, quantityWasted, cost | no |
| 10 | `recipes` | Analytics | 0+ | restaurantId, menuItemId, ingredients (array) | no |
| 11 | `customers` | Analytics | varied | restaurantId, phone, deviceFingerprint, visitCount, totalSpend | no |
| 12 | `feedbackResponses` | Analytics | ~50 | restaurantId, orderId, rating, comment, sentimentLabel | no |
| 13 | `kdsEvents` | Analytics | 0+ | restaurantId, orderId, eventType, timestamp | no |

### Three Write Paths

1. **Server API** (`server.ts`): POST/PUT/DELETE endpoints for all 5 core collections + analytics writes
2. **Client direct** (App.tsx, DineInCustomerUI.tsx, SuperAdminDashboard.tsx): `setDoc`, `updateDoc`, `deleteDoc` straight to Firestore — bypasses the Express API
3. **Boot seeding** (`server.ts:seedDatabaseIfEmpty`): On each server start, checks if empty/stale, wipes all 5 core collections, reseeds

### Read Paths

1. **Client Firestore `onSnapshot`** (App.tsx lines 183-228): 5 real-time listeners on restaurants, menus, orders, users, buzzers
2. **Server REST GET** (server.ts): 9+ GET endpoints for restaurants, menus, orders, users, buzzers + 9 analytics endpoints
3. **Client REST fallback** (App.tsx `refreshUnifiedDatabase`): Periodic fetch to `/api/restaurants`, `/api/menus`, `/api/orders`, `/api/users`

### Files That Touch Firebase

| File | Usage | Lines |
|------|-------|-------|
| `server.ts` | Server-side `getDoc`, `setDoc`, `getDocs`, `deleteDoc`, `collection`, `doc` | Lines 6-16 imports, 558-603 seeding, 655-866 CRUD, 870-1519 analytics |
| `src/firebase.ts` | Client-side Firebase init, exports `db` | 18 lines |
| `src/App.tsx` | Client-side `onSnapshot` (5 listeners), `updateDoc` | Lines 7-8 imports, 182-229 listeners, 457 updateDoc |
| `src/components/DineInCustomerUI.tsx` | Client-side `setDoc` for buzzers, users, menus, orders | Lines 8-9 imports, 153, 196, 211, 467 |
| `src/components/SuperAdminDashboard.tsx` | Client-side `setDoc`, `deleteDoc`, `updateDoc` for restaurants, menus, orders | Lines 8-9 imports, 375, 432, 532, 583, 639, 644, 666, 685, 718 |
| `src/components/RestaurantAdminPanel.tsx` | Client-side `deleteDoc` for buzzers | Lines 9-10 imports, 86 |
| `seed-analytics.ts` | Standalone script, `setDoc`, `getDocs`, `deleteDoc`, `collection`, `doc` | Full file |
| `firebase-applet-config.json` | Firebase project config | 9 lines |

### Critical Dependencies on Firestore Features

- **`onSnapshot` real-time listeners** — This is the HARDEST part to replace. Used for push-based updates to 5 collections. Must be replaced with Supabase Realtime `postgres_changes`.
- **`setDoc` with explicit IDs** — All write operations use known string IDs. Maps cleanly to `INSERT ... ON CONFLICT DO UPDATE`.
- **`deleteDoc`** — Maps to `DELETE FROM table WHERE id = ?`.
- **`getDocs(collection(db, name))`** — Maps to `supabase.from(name).select('*')`.
- **Arrays as document fields** (orders.items, users.globalOrderHistory) — Maps to PostgreSQL JSONB columns.
- **No authentication** — No Firebase Auth used. Auth is simulated via localStorage. This means no RLS needed (yet). All operations use the anon/service key.

---

## Phase 1: Supabase Project Setup

### Task 1.1: Create Supabase Project

1. Go to https://supabase.com and create a new project (e.g., "kcodeit-restro")
2. Note down the project URL and anon/public key from Settings → API
3. Enable Realtime for all tables in Database → Replication (we'll do this per-table later)

### Task 1.2: Add Supabase Dependencies

**Files:**
- Modify: `package.json`

Replace firebase dependency with supabase:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
  }
}
```

Remove from dependencies:
```json
"firebase": "^12.13.0",
```

Run: `npm install @supabase/supabase-js`
Then: `npm uninstall firebase`

### Task 1.3: Update Environment Configuration

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Delete: `firebase-applet-config.json`

Replace Firebase env vars with Supabase:

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Update `.env.example` similarly.

---

## Phase 2: Database Schema — Migration SQL

### Task 2.1: Create Core Tables Migration

**Files:**
- Create: `supabase/migrations/001_core_tables.sql`

```sql
-- Core Tables for kCodeIT Restaurant SaaS

-- 1. Restaurants (tenants)
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  locked_by_super_admin BOOLEAN DEFAULT false,
  total_tables INTEGER NOT NULL DEFAULT 8,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius_meters DOUBLE PRECISION DEFAULT 150,
  verification_pin TEXT DEFAULT '',
  admin_username TEXT,
  admin_password TEXT,
  chef_username TEXT,
  chef_password TEXT,
  lock_all_items BOOLEAN DEFAULT false,
  disable_qr_generation BOOLEAN DEFAULT false,
  hide_history_older_than_one_day BOOLEAN DEFAULT false,
  disable_admin_portal BOOLEAN DEFAULT false,
  disable_kds_portal BOOLEAN DEFAULT false,
  floors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the realtime publication for this table
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;

-- 2. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_limited_time_offer BOOLEAN DEFAULT false,
  offer_details TEXT DEFAULT '',
  promo_value NUMERIC(10, 2) DEFAULT 0,
  is_veg BOOLEAN DEFAULT true,
  avg_rating NUMERIC(3, 2),
  ratings_count INTEGER DEFAULT 0,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  user_phone TEXT DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  released BOOLEAN DEFAULT false,
  geofence_verified BOOLEAN DEFAULT false,
  geofence_distance NUMERIC(10, 2),
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  requires_handshake BOOLEAN DEFAULT false,
  handshake_code TEXT,
  handshake_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 4. Dine-in Users (renamed from 'users' to avoid reserved word)
CREATE TABLE IF NOT EXISTS dine_in_users (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  global_order_history JSONB DEFAULT '[]'::jsonb,
  rated_dishes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE dine_in_users;

-- 5. Buzzers (waiter service requests)
CREATE TABLE IF NOT EXISTS buzzers (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buzzers_restaurant ON buzzers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_buzzers_status ON buzzers(status);
ALTER PUBLICATION supabase_realtime ADD TABLE buzzers;
```

### Task 2.2: Create Analytics Tables Migration

**Files:**
- Create: `supabase/migrations/002_analytics_tables.sql`

```sql
-- Analytics Tables

-- 6. Daily Summaries
CREATE TABLE IF NOT EXISTS daily_summaries (
  id TEXT PRIMARY KEY,  -- restaurantId_YYYY-MM-DD
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_ticket_size NUMERIC(10, 2) DEFAULT 0,
  total_discount NUMERIC(10, 2) DEFAULT 0,
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  top_items JSONB DEFAULT '[]'::jsonb,
  labor_cost NUMERIC(10, 2) DEFAULT 0,
  orders_by_hour JSONB DEFAULT '{}'::jsonb,
  orders_by_status JSONB DEFAULT '{"pending":0,"accepted":0,"completed":0,"rejected":0}'::jsonb,
  payment_breakdown JSONB DEFAULT '{"upi":0,"card":0,"cash":0,"wallet":0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_restaurant ON daily_summaries(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);

-- 7. Staff Shifts
CREATE TABLE IF NOT EXISTS staff_shifts (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id TEXT DEFAULT '',
  staff_name TEXT NOT NULL,
  role TEXT DEFAULT '',
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  actual_end TIMESTAMPTZ,
  hourly_rate NUMERIC(10, 2) DEFAULT 0,
  total_hours NUMERIC(5, 2) DEFAULT 0,
  orders_handled INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_restaurant ON staff_shifts(restaurant_id);

-- 8. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'pieces',
  current_stock NUMERIC(10, 2) DEFAULT 0,
  par_level NUMERIC(10, 2) DEFAULT 0,
  cost_per_unit NUMERIC(10, 2) DEFAULT 0,
  supplier_id TEXT DEFAULT '',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON inventory(restaurant_id);

-- 9. Waste Logs
CREATE TABLE IF NOT EXISTS waste_logs (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ingredient_id TEXT DEFAULT '',
  ingredient_name TEXT NOT NULL,
  quantity_wasted NUMERIC(10, 2) DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  reason TEXT DEFAULT '',
  cost NUMERIC(10, 2) DEFAULT 0,
  logged_by TEXT DEFAULT '',
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_restaurant ON waste_logs(restaurant_id);

-- 10. Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL,
  menu_item_name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb,
  yield_qty NUMERIC(5, 2) DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON recipes(restaurant_id);

-- 11. Customers (profile)
CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone TEXT DEFAULT '',
  device_fingerprint TEXT DEFAULT '',
  first_visit TIMESTAMPTZ,
  last_visit TIMESTAMPTZ,
  visit_count INTEGER DEFAULT 0,
  total_spend NUMERIC(12, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_restaurant ON customer_profiles(restaurant_id);

-- 12. Feedback Responses
CREATE TABLE IF NOT EXISTS feedback_responses (
  id TEXT PRIMARY KEY,
  order_id TEXT DEFAULT '',
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  sentiment_label TEXT DEFAULT 'neutral' CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  theme_tags JSONB DEFAULT '[]'::jsonb,
  actionable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON feedback_responses(restaurant_id);

-- 13. KDS Events
CREATE TABLE IF NOT EXISTS kds_events (
  id TEXT PRIMARY KEY,
  order_id TEXT DEFAULT '',
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('received', 'started', 'completed', 'sent')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  staff_id TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_kds_events_restaurant ON kds_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kds_events_order ON kds_events(order_id);
```

### Task 2.3: Enable Realtime for Core Tables

Run these in Supabase SQL Editor or include in migration:

```sql
-- Ensure supabase_realtime publication includes core tables
-- (Run after tables are created)
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE dine_in_users;
ALTER PUBLICATION supabase_realtime ADD TABLE buzzers;
```

---

## Phase 3: Supabase Client Configuration

### Task 3.1: Create Supabase Client Factory

**Files:**
- Modify: `src/firebase.ts` → rename to `src/supabase.ts`
- Delete: `firebase-applet-config.json`

Create `src/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Remove `firebase.ts` and `firebase-applet-config.json`.

### Task 3.2: Create Server-side Supabase Client

**Files:**
- Create: `src/supabase-server.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase service credentials not configured.');
}

// Service role key bypasses RLS — for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

### Task 3.3: Add Supabase to Vite Env

**Files:**
- Modify: `vite.config.ts`

No changes needed to vite config itself. But ensure env vars are prefixed with `VITE_`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (non-VITE_ for server-side) to `.env`.

---

## Phase 4: Server Migration (server.ts)

This is the largest single file change. The server has 3 responsibilities:
1. Seeding on boot
2. REST API CRUD for 5 core collections
3. Analytics endpoints

### Naming Convention for Supabase Changes

Firestore → Supabase mapping:
- `collection(db, "restaurants")` → `supabaseAdmin.from('restaurants').select('*')`
- `doc(db, "orders", id)` → `.eq('id', id).single()`
- `setDoc(doc(db, "orders", id), data)` → `.upsert({ id, ...data }).eq('id', id)`
- `deleteDoc(doc(db, "orders", id))` → `.delete().eq('id', id)`
- `getDocs(collection(db, "orders"))` → `.select('*')` (returns array)

### Field Name Mapping

Firestore → PostgreSQL:
- `restaurantId` → `restaurant_id`
- `tableNumber` → `table_number`
- `userPhone` → `user_phone`
- `userName` → `user_name`
- `totalAmount` → `total_amount`
- `isAvailable` → `is_available`
- `isLimitedTimeOffer` → `is_limited_time_offer`
- `offerDetails` → `offer_details`
- `promoValue` → `promo_value`
- `isVeg` → `is_veg`
- `avgRating` → `avg_rating`
- `ratingsCount` → `ratings_count`
- `imageUrl` → `image_url`
- `createdAt` → `created_at`
- `lockedBySuperAdmin` → `locked_by_super_admin`
- `totalTables` → `total_tables`
- `logoUrl` → `logo_url`
- `verificationPin` → `verification_pin`
- `geofenceRadiusMeters` → `geofence_radius_meters`
- `geofenceVerified` → `geofence_verified`
- `geofenceDistance` → `geofence_distance`
- `userLatitude` → `user_latitude`
- `userLongitude` → `user_longitude`
- `requiresHandshake` → `requires_handshake`
- `handshakeCode` → `handshake_code`
- `handshakeApproved` → `handshake_approved`
- `globalOrderHistory` → `global_order_history`
- `ratedDishes` → `rated_dishes`
- `requestType` → `request_type`
- `lockAllItems` → `lock_all_items`
- `disableQrGeneration` → `disable_qr_generation`
- `hideHistoryOlderThanOneDay` → `hide_history_older_than_one_day`
- `disableAdminPortal` → `disable_admin_portal`
- `disableKdsPortal` → `disable_kds_portal`
- `avgTicketSize` → `avg_ticket_size`
- `totalDiscount` → `total_discount`
- `discountPercent` → `discount_percent`
- `laborCost` → `labor_cost`
- `ordersByHour` → `orders_by_hour`
- `ordersByStatus` → `orders_by_status`
- `paymentBreakdown` → `payment_breakdown`
- `hourlyRate` → `hourly_rate`
- `totalHours` → `total_hours`
- `ordersHandled` → `orders_handled`
- `currentStock` → `current_stock`
- `parLevel` → `par_level`
- `costPerUnit` → `cost_per_unit`
- `lastUpdated` → `last_updated`
- `quantityWasted` → `quantity_wasted`
- `ingredientName` → `ingredient_name`
- `loggedBy` → `logged_by`
- `loggedAt` → `logged_at`
- `menuItemId` → `menu_item_id`
- `menuItemName` → `menu_item_name`
- `yieldQty` → `yield_qty`
- `deviceFingerprint` → `device_fingerprint`
- `firstVisit` → `first_visit`
- `lastVisit` → `last_visit`
- `visitCount` → `visit_count`
- `totalSpend` → `total_spend`
- `orderId` → `order_id`
- `sentimentLabel` → `sentiment_label`
- `themeTags` → `theme_tags`
- `eventType` → `event_type`
- `staffId` → `staff_id`
- `shiftStart` → `shift_start`
- `shiftEnd` → `shift_end`
- `actualEnd` → `actual_end`
- `supplierId` → `supplier_id`

### Helper Functions

Add these helper functions to `server.ts` for mapping between camelCase (TypeScript) and snake_case (PostgreSQL):

```typescript
// Utility: convert camelCase object keys to snake_case for DB
function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

// Utility: convert snake_case DB row keys to camelCase for API responses
function toCamel(row: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
```

### Task 4.1: Replace Server Imports and Init

**Current (server.ts lines 1-21):**
```typescript
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const fApp = initializeApp(firebaseConfig);
const db = getFirestore(fApp, firebaseConfig.firestoreDatabaseId);
```

**Replace with:**
```typescript
import { supabaseAdmin } from "./src/supabase-server";

const db = supabaseAdmin; // alias for readability; use db.from('table')...
```

### Task 4.2: Replace Seeding Logic

Replace each `setDoc(doc(db, "restaurants", r.id), r)` pattern with:

```typescript
const { error } = await supabaseAdmin.from('restaurants').upsert(toSnake(r), { onConflict: 'id' });
if (error) console.error('Seed error:', error);
```

Replace `getDocs(collection(db, "restaurants"))` pattern with:

```typescript
const { data, error } = await supabaseAdmin.from('restaurants').select('*');
if (error) throw error;
```

Replace `deleteDoc(d.ref)` in loops with:

```typescript
const { error } = await supabaseAdmin.from('restaurants').delete().neq('id', 'none'); // delete all
```

### Task 4.3: Replace All API Endpoints

Each endpoint follows the same pattern. Example for GET /api/restaurants:

```typescript
app.get("/api/restaurants", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('restaurants').select('*');
    if (error) throw error;
    const list = data.map(toCamel);
    res.json(list);
  } catch (err: any) {
    console.error("GET /api/restaurants error:", err);
    res.status(500).json({ error: err.message });
  }
});
```

Example for POST /api/restaurants (upsert):

```typescript
app.post("/api/restaurants", async (req, res) => {
  try {
    const updated = req.body;
    if (Array.isArray(updated)) {
      for (const r of updated) {
        if (r && r.id) {
          const { error } = await supabaseAdmin.from('restaurants').upsert(toSnake(r), { onConflict: 'id' });
          if (error) throw error;
        }
      }
    } else if (updated && updated.id) {
      const { error } = await supabaseAdmin.from('restaurants').upsert(toSnake(updated), { onConflict: 'id' });
      if (error) throw error;
    }
    const { data } = await supabaseAdmin.from('restaurants').select('*');
    res.json({ success: true, restaurants: (data || []).map(toCamel) });
  } catch (err: any) {
    console.error("POST /api/restaurants error:", err);
    res.status(500).json({ error: err.message });
  }
});
```

Example for DELETE /api/buzzers/:id:

```typescript
app.delete("/api/buzzers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      const { error } = await supabaseAdmin.from('buzzers').delete().eq('id', id);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/buzzers error:", err);
    res.status(500).json({ error: err.message });
  }
});
```

For POST /api/reset (wipe and reseed all collections):

```typescript
app.post("/api/reset", async (req, res) => {
  try {
    // Delete all from each table
    const tables = ['restaurants', 'menu_items', 'orders', 'dine_in_users', 'buzzers'];
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', '__nonexistent__');
      if (error) console.error(`Error clearing ${table}:`, error);
    }
    // Reseed with INITIAL data (convert to snake_case)
    for (const r of INITIAL_RESTAURANTS) {
      const { error } = await supabaseAdmin.from('restaurants').upsert(toSnake(r), { onConflict: 'id' });
      if (error) throw error;
    }
    // ... same for menus, orders, users
    res.json({ success: true, message: "Database reset successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

### Task 4.4: Analytics Endpoints — Same Pattern

All analytics endpoints read from `orders`, `dailySummaries`, `staffShifts`, `inventory`, `wasteLogs`, `recipes`, `customers`, `feedbackResponses`, `kdsEvents`. Replace every `getDocs(collection(db, "X"))` with `supabaseAdmin.from('X').select('*')` and map results with `toCamel`.

---

## Phase 5: Frontend Migration

### Task 5.1: Replace App.tsx Imports

**Current (line 7-8):**
```typescript
import { db } from './firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
```

**Replace with:**
```typescript
import { supabase } from './supabase';
```

### Task 5.2: Replace onSnapshot Listeners

Replace the 5 Firestore onSnapshot listeners (lines 182-228) with Supabase Realtime subscriptions.

**Before (restaurants listener):**
```typescript
const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
  const list = snapshot.docs.map(doc => doc.data() as Restaurant);
  setRestaurants(list);
}, (error) => {
  console.error("Firestore onSnapshot restaurants error:", error);
});
```

**After:**
```typescript
// Initial fetch
supabase.from('restaurants').select('*').then(({ data, error }) => {
  if (!error && data) setRestaurants(data.map(toCamel));
});

// Realtime subscription
const channelRestaurants = supabase
  .channel('restaurants-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'restaurants' },
    (payload) => {
      // Refresh the full list on any change
      supabase.from('restaurants').select('*').then(({ data }) => {
        if (data) setRestaurants(data.map(toCamel));
      });
    }
  )
  .subscribe();
```

**Important optimization:** Rather than re-fetching all rows on every change, you can update the local state incrementally:
- `INSERT` → append to existing array
- `UPDATE` → replace matching item by ID
- `DELETE` → filter out by ID

But for this migration, full re-fetch on change is simpler and correct. Optimize later if performance becomes an issue.

**Cleanup in useEffect return:**
```typescript
return () => {
  supabase.removeChannel(channelRestaurants);
  supabase.removeChannel(channelMenus);
  supabase.removeChannel(channelOrders);
  supabase.removeChannel(channelUsers);
  supabase.removeChannel(channelBuzzers);
};
```

### Task 5.3: Replace Direct Client Writes

**In App.tsx (line 457):**
```typescript
// Before:
await updateDoc(doc(db, "orders", order.id), { released: true });

// After:
await supabase.from('orders')
  .update({ released: true })
  .eq('id', order.id);
```

**In DineInCustomerUI.tsx:**
```typescript
// Before:
await setDoc(doc(db, "buzzers", bzrId), newBuzzer);

// After:
await supabase.from('buzzers').upsert(toSnake(newBuzzer), { onConflict: 'id' });
```

**In SuperAdminDashboard.tsx:**
```typescript
// Before:
await setDoc(doc(db, "restaurants", updatedTenant.id), updatedTenant);

// After:
await supabase.from('restaurants').upsert(toSnake(updatedTenant), { onConflict: 'id' });
```

**In RestaurantAdminPanel.tsx:**
```typescript
// Before:
await deleteDoc(doc(db, "buzzers", buzzerId));

// After:
await supabase.from('buzzers').delete().eq('id', buzzerId);
```

### Task 5.4: Create Frontend Helper Functions

**Files:**
- Modify: `src/App.tsx` and all component files

Add these helpers to a shared utility file or inline in affected files:

```typescript
// Convert camelCase to snake_case for Supabase writes
function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

// Convert snake_case to camelCase for Supabase reads
function toCamel(row: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
```

---

## Phase 6: Test File Updates

### Task 6.1: Update All Test Files

The test files mock `firebase/firestore` functions. Replace with Supabase mocks.

**Files to update:** All `.test.tsx` files:
- `DineInCustomerUI.test.tsx`
- `KitchenDisplaySystem.test.tsx`
- `RestaurantAdminPanel.test.tsx`
- `StaffPortalLogin.test.tsx`
- `SuperAdminDashboard.test.tsx`

**Current mock pattern:**
```typescript
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
}));
```

**Replace with:**
```typescript
vi.mock('@supabase/supabase-js', () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn(),
  }));
  
  return {
    createClient: vi.fn(() => ({
      from: mockFrom,
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    })),
  };
});
```

---

## Phase 7: Seed Script Migration

### Task 7.1: Update seed-analytics.ts

Same pattern as server.ts — replace firebase imports with supabase imports, all CRUD with supabaseAdmin calls, add toSnake helper.

**Before:**
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const fApp = initializeApp(firebaseConfig);
const db = getFirestore(fApp, (firebaseConfig as any).firestoreDatabaseId);
```

**After:**
```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

Replace all `setDoc(doc(db, 'orders', o.id), o)` with:
```typescript
await supabaseAdmin.from('orders').upsert(toSnake(o), { onConflict: 'id' });
```

Replace `deleteDoc(d.ref)` loops with:
```typescript
await supabaseAdmin.from(table).delete().neq('id', '__nonexistent__');
```

---

## Phase 8: Cleanup

### Task 8.1: Remove Firebase Files

**Files to delete:**
- `firebase-applet-config.json`
- `firebase-blueprint.json` (no longer needed)
- `metadata.json` (Firebase-specific metadata)
- `src/firebase.ts`
- Any Firebase config references in code

### Task 8.2: Update README

Update README.md to reflect Supabase instead of Firebase:
- Remove "Firebase" from tech stack
- Add "Supabase (PostgreSQL + Realtime)" to tech stack
- Update environment variable instructions
- Remove Firebase setup steps

### Task 8.3: Update Configuration Files

- Update `CLAUDE.md` to reflect new stack
- Update `.env.example` with Supabase vars

---

## Migration Verification Checklist

After each task, verify:

- [ ] Supabase project is created and accessible
- [ ] `npm install` succeeds with new deps
- [ ] All 13 tables are created in Supabase SQL Editor
- [ ] Realtime is enabled for all 5 core tables
- [ ] `npm run dev` starts without Firebase import errors
- [ ] Server starts and seeds data to Supabase
- [ ] `GET /api/restaurants` returns seed data
- [ ] `GET /api/menus` returns seed data
- [ ] `GET /api/orders` returns seed data
- [ ] `GET /api/users` returns seed data
- [ ] `GET /api/buzzers` returns empty array (no seed data)
- [ ] `POST /api/restaurants` upserts correctly
- [ ] `POST /api/menus` upserts correctly
- [ ] `POST /api/orders` upserts correctly
- [ ] `POST /api/users` upserts correctly
- [ ] `POST /api/buzzers` creates new buzzer
- [ ] `DELETE /api/buzzers/:id` deletes buzzer
- [ ] `POST /api/reset` wipes and reseeds
- [ ] Frontend loads without Firebase errors
- [ ] Restaurant list renders from Supabase data
- [ ] Menu items render from Supabase data
- [ ] Orders render from Supabase data
- [ ] Users render from Supabase data
- [ ] Buzzers render from Supabase data
- [ ] **Real-time test:** Open two browser tabs. Add order in one → appears in other
- [ ] **Real-time test:** Update order status in one → reflects in other
- [ ] **Real-time test:** Create buzzer in one → appears in other
- [ ] DineInCustomerUI: place order → order appears in KDS
- [ ] SuperAdminDashboard: create/update restaurant works
- [ ] Analytics endpoints return data
- [ ] `seed-analytics.ts` runs successfully
- [ ] `npm run build` succeeds
- [ ] Tests pass: `npm test`
- [ ] AI chat (/api/gemini/chat) still works
- [ ] AI report (/api/gemini/report) still works

---

## Pitfalls & Gotchas

1. **`onSnapshot` is NOT `supabase.channel().on('postgres_changes')`** - Firestore snapshots give you the entire collection on every change. Supabase Realtime gives you the individual changed row. The simplest migration strategy is: on any Realtime event, do a fresh `select('*')` to get the full list. This loses no functionality and is simpler to implement correctly.

2. **`items` field in orders** — This is a JSONB array. Firestore natively supports arrays. In Supabase, you'll store `items` as JSONB and convert back to JS array on read. The `toSnake`/`toCamel` helpers handle this transparently.

3. **`floors` in restaurants** — Same as above, JSONB field.

4. **`globalOrderHistory` in users** — JSONB array of order IDs.

5. **`ratedDishes`** — JSONB array (not used in seed data but defined in types).

6. **No offline support** — Firestore had built-in offline persistence. Supabase does not. If offline matters, consider adding `@tanstack/query` with local cache, or a future enhancement.

7. **Document IDs are user-defined strings** — PostgreSQL TEXT primary keys work perfectly. No need for auto-increment IDs.

8. **The `users` table name is reserved** — Renamed to `dine_in_users` in PostgreSQL. All query references must use the new table name.

9. **Order of delete operations** — In PostgreSQL, foreign key constraints prevent deleting a restaurant that has orders. Always delete child rows first (orders, menus, buzzers) before deleting parent (restaurants). The current code does per-collection deletion independently, which is fine.

10. **Supabase realtime changes the payload shape** — `onSnapshot` gives `snapshot.docChanges()` with `type: 'added'|'modified'|'removed'`. Supabase gives `payload.new` (the new row) and `payload.old` (the old row for DELETE/UPDATE). The full-refresh approach avoids having to handle this difference.

11. **VITE_ prefix** — Client-side Supabase env vars need `VITE_` prefix. Server-side vars do not.

12. **batch writes** — The current `POST /api/menus` does "delete all + reinsert all" in a loop. This is not atomic. Consider wrapping in a Supabase transaction later, but for migration keep the loop pattern.

13. **The `supabase_realtime` publication** — Only core tables that need real-time should be added. Analytics tables don't need it. Adding too many tables to the publication adds replication overhead.

---

## Appendix: Complete File Change Summary

| File | Action | Complexity |
|------|--------|-----------|
| `package.json` | Modify deps | Low |
| `.env` | Update vars | Low |
| `.env.example` | Update vars | Low |
| `firebase-applet-config.json` | Delete | Low |
| `firebase-blueprint.json` | Delete | Low |
| `metadata.json` | Delete | Low |
| `src/firebase.ts` | Delete → create `src/supabase.ts` | Low |
| `src/supabase-server.ts` | Create new | Medium |
| `server.ts` | Major rewrite (firestore→supabase) | **High** |
| `src/App.tsx` | Rewrite (onSnapshot→channels, updateDoc→supabase) | **High** |
| `src/components/DineInCustomerUI.tsx` | Replace setDoc calls | Medium |
| `src/components/SuperAdminDashboard.tsx` | Replace setDoc/deleteDoc/updateDoc | Medium |
| `src/components/RestaurantAdminPanel.tsx` | Replace deleteDoc | Low |
| `seed-analytics.ts` | Rewrite (firebase→supabase) | **High** |
| `supabase/migrations/001_core_tables.sql` | Create | High (critical) |
| `supabase/migrations/002_analytics_tables.sql` | Create | High (critical) |
| All `.test.tsx` files | Update vi.mock for supabase | Medium |
| `README.md` | Update stack description | Low |
| `CLAUDE.md` | Update stack description | Low |

### Estimated Effort

- **Phase 1 (Project Setup):** 15 min
- **Phase 2 (Schema):** 30 min
- **Phase 3 (Client Config):** 15 min
- **Phase 4 (Server Migration):** 2-3 hours
- **Phase 5 (Frontend):** 2-3 hours
- **Phase 6 (Tests):** 30 min
- **Phase 7 (Seed Script):** 30 min
- **Phase 8 (Cleanup):** 15 min
- **Verification & Debugging:** 1-2 hours

**Total: ~8-12 hours of focused work**
