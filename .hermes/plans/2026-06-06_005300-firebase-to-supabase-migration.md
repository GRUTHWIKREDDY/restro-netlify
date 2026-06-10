# Firebase → Supabase Migration Plan

**Goal:** Replace Firebase Firestore with Supabase (PostgreSQL + Realtime) while preserving all functionality — real-time sync, CRUD, analytics, seeding, and test mocks.

---

## 1. Current Firebase Footprint (Inventory)

### 1.1 Files touching Firebase

| File | Usage | Firebase APIs Used |
|------|-------|-------------------|
| `src/firebase.ts` | Init singleton | `initializeApp`, `getFirestore` |
| `src/App.tsx` | 5 `onSnapshot` listeners + direct `updateDoc` | `onSnapshot`, `collection`, `doc`, `updateDoc` |
| `src/components/SuperAdminDashboard.tsx` | Tenant CRUD, onboarding, delete, release | `setDoc`, `deleteDoc`, `updateDoc`, `doc` |
| `src/components/RestaurantAdminPanel.tsx` | Dismiss buzzer | `deleteDoc`, `doc` |
| `src/components/DineInCustomerUI.tsx` | Buzzers, ratings, handshake | `setDoc`, `doc` |
| `src/components/KitchenDisplaySystem.tsx` | (No direct Firebase — reads via props) | — |
| `src/components/StaffPortalLogin.tsx` | (References "Firestore" only in UI strings) | — |
| `server.ts` | Express API routes — all CRUD/seed/reset | `getDocs`, `getDoc`, `deleteDoc`, `addDoc`, `setDoc`, `collection`, `doc`, `initializeApp`, `getFirestore` |
| `seed-analytics.ts` | Standalone seed script | `initializeApp`, `getFirestore`, `getDocs`, `deleteDoc`, `collection` |
| `firebase-applet-config.json` | Firebase project config | JSON config consumed by init |
| `firebase-blueprint.json` | Schema documentation only | (read-only, can be replaced) |
| `firestore.rules` | Firestore security rules | (will become RLS policies) |

### 1.2 All Firestore Collections

1. `restaurants` — Tenant brands
2. `menus` — Menu items
3. `orders` — Food orders
4. `users` — Dine-in user profiles
5. `buzzers` — Waiter summon requests
6. `dailySummaries` — Analytics daily rollups
7. `staffShifts` — Staff scheduling
8. `inventory` — Ingredient stock
9. `wasteLogs` — Waste tracking
10. `recipes` — Recipe definitions
11. `customers` — Customer profiles
12. `sessions` — Dining sessions
13. `feedbackResponses` — Customer feedback
14. `externalReviews` — External platform reviews
15. `kdsEvents` — Kitchen display events
16. `purchaseOrders` — Supplier orders

### 1.3 Firebase-Specific Patterns to Replace

- **Real-time listeners**: `onSnapshot(collection(db, "name"), cb)` → Supabase's `postgres_changes` subscriptions via `supabase.channel()`
- **Writes**: `setDoc(doc(db, "coll", id), data)` → `supabase.from("coll").upsert({...data})`
- **Deletes**: `deleteDoc(doc(db, "coll", id))` → `supabase.from("coll").delete().eq("id", id)`
- **Reads (server)**: `getDocs(collection(db, "coll"))` → `supabase.from("coll").select("*")`
- **Security**: Firestore security rules (`.rules`) → PostgreSQL RLS policies
- **Config**: `firebase-applet-config.json` → `supabase-config.json` (anon key + URL)

---

## 2. Supabase Project Setup (Phase 0)

### 2.1 Project Creation
1. Create a Supabase project at `https://supabase.com`
2. Enable **Realtime** for all 16 tables via:
   - Go to Database → Replication → enable for each table
   - Or run SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE <name>;`
3. Enable the **Realtime** add-on for web socket connections

### 2.2 Install Dependency
```
npm uninstall firebase
npm install @supabase/supabase-js
```

### 2.3 Environment & Config
- Create `supabase-config.json` with `supabaseUrl` + `anonKey`
- OR use env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Database Schema Design (Phase 1)

### 3.1 SQL Migration (single file: `supabase-schema.sql`)

Every collection becomes a PostgreSQL table with:
- `id` TEXT PRIMARY KEY (preserving existing Firestore document IDs)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()
- JSON columns where Firestore had maps/arrays
- Proper foreign key constraints where possible

**Core tables:**

```sql
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  locked_by_super_admin BOOLEAN DEFAULT false,
  total_tables INTEGER DEFAULT 1,
  floors JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius_meters INTEGER,
  verification_pin TEXT,
  admin_username TEXT,
  admin_password TEXT,
  chef_username TEXT,
  chef_password TEXT,
  lock_all_items BOOLEAN DEFAULT false,
  disable_qr_generation BOOLEAN DEFAULT false,
  hide_history_older_than_one_day BOOLEAN DEFAULT false,
  disable_admin_portal BOOLEAN DEFAULT false,
  disable_kds_portal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_limited_time_offer BOOLEAN DEFAULT false,
  offer_details TEXT DEFAULT '',
  promo_value DOUBLE PRECISION DEFAULT 0,
  is_veg BOOLEAN,
  avg_rating DOUBLE PRECISION DEFAULT 0,
  ratings_count INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  table_number INTEGER NOT NULL,
  user_phone TEXT NOT NULL,
  user_name TEXT NOT NULL,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  released BOOLEAN DEFAULT false,
  geofence_verified BOOLEAN,
  geofence_distance DOUBLE PRECISION,
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  requires_handshake BOOLEAN,
  handshake_code TEXT,
  handshake_approved BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- phone number used as id
  name TEXT NOT NULL,
  global_order_history JSONB DEFAULT '[]',
  rated_dishes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
CREATE TABLE buzzers (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  table_number INTEGER NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Analytics tables:** daily_summaries, staff_shifts, inventory, waste_logs, recipes, customers, sessions, feedback_responses, external_reviews, kds_events, purchase_orders — all with `restaurant_id` FK and `id TEXT PK`.

### 3.2 Row-Level Security (RLS)

Since the current Firestore rules allow `read/write: if true` (wide open), start with permissive RLS to match:

```sql
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON restaurants FOR ALL USING (true) WITH CHECK (true);
```

Apply same pattern to all tables. Tighten later when auth is added.

---

## 4. Code Migration (Phase 2) — By File

### 4.1 `src/lib/supabase.ts` (NEW — replaces `src/firebase.ts`)

```ts
import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../supabase-config.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || supabaseConfig.supabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseConfig.anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4.2 `src/App.tsx` — Real-time Listeners (Critical)

**BEFORE (Firestore onSnapshot):**
```ts
const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
  const list = snapshot.docs.map(doc => doc.data() as Restaurant);
  setRestaurants(list);
});
```

**AFTER (Supabase postgres_changes):**
```ts
const channel = supabase.channel('schema-db-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'restaurants' },
    (payload) => {
      // On initial load, payload.eventType is null and payload.new is the full table
      // We use a separate initial fetch
      refreshRestaurants();
    }
  )
  .subscribe();

// Initial fetch
const { data } = await supabase.from('restaurants').select('*');
if (data) setRestaurants(data as Restaurant[]);

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

**Key consideration:** Supabase real-time does NOT send the full table snapshot on subscribe — it only sends incremental changes. So you need:
1. An initial `select('*')` to get full data
2. The subscription to process incremental inserts/updates/deletes
3. For each table, handle the three event types separately

**Recommended pattern for all 5 collections:**

```ts
useEffect(() => {
  // Initial load
  const loadData = async () => {
    const { data } = await supabase.from('restaurants').select('*');
    if (data) setRestaurants(data as Restaurant[]);
  };
  loadData();

  // Real-time subscription
  const channel = supabase.channel('restaurants-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'restaurants' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setRestaurants(prev => [...prev, payload.new as Restaurant]);
        } else if (payload.eventType === 'UPDATE') {
          setRestaurants(prev => prev.map(r => r.id === payload.new.id ? payload.new as Restaurant : r));
        } else if (payload.eventType === 'DELETE') {
          setRestaurants(prev => prev.filter(r => r.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### 4.3 `src/components/SuperAdminDashboard.tsx`

**Replace `setDoc(doc(db, "restaurants", id), data)` with:**
```ts
await supabase.from('restaurants').upsert({ ...data, id });
```

**Replace `deleteDoc(doc(db, "restaurants", id))` with:**
```ts
await supabase.from('restaurants').delete().eq('id', id);
```

Similar for menu deletions and order updates.

### 4.4 `src/components/RestaurantAdminPanel.tsx`

**Replace `deleteDoc(doc(db, "buzzers", buzzerId))` with:**
```ts
await supabase.from('buzzers').delete().eq('id', buzzerId);
```

### 4.5 `src/components/DineInCustomerUI.tsx`

**Replace `setDoc(doc(db, "buzzers", id), data)` with:**
```ts
await supabase.from('buzzers').upsert({ ...data, id });
```

**Replace `setDoc(doc(db, "users", phone), data)` with:**
```ts
await supabase.from('users').upsert({ ...data, id: phone });
```

**Replace `setDoc(doc(db, "menus", menuId), data)` with:**
```ts
await supabase.from('menu_items').upsert({ ...data, id: menuId });
```

**Replace `setDoc(doc(db, "orders", orderId), data)` with:**
```ts
await supabase.from('orders').upsert({ ...data, id: orderId });
```

### 4.6 `server.ts` — Express Backend

All `getDocs(collection(db, "coll"))` → `supabase.from("coll").select("*")`
All `deleteDoc(doc(db, "coll", id))` → `supabase.from("coll").delete().eq("id", id)`

**Server-side Supabase client** uses `createClient(url, serviceRoleKey)` for full access bypassing RLS.

**Key pattern change — batch operations:**
```ts
// BEFORE: delete all docs in collection
const snap = await getDocs(collection(db, collName));
for (const d of snap.docs) await deleteDoc(d.ref);

// AFTER: delete all (match by condition or truncate)
await supabase.from(collName).delete().neq('id', '');  // all rows
```

### 4.7 `seed-analytics.ts`

Replace `getDocs`/`deleteDoc` with Supabase `.select()`/`.delete()`. Use `supabase.from().upsert()` for seeding.

### 4.8 Test Files

Replace all `vi.mock('firebase/firestore', ...)` with `vi.mock('@supabase/supabase-js', ...)`

The mock structure changes because Supabase uses a chained API:
```ts
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockResolvedValue({ data: [], error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));
```

---

## 5. Data Migration (Phase 3)

### 5.1 Export from Firestore

Use `firebase firestore:export` CLI or write a one-shot script `tools/export-firestore.ts`:

```ts
// For each collection, read all docs and write to JSON files
const collections = ['restaurants', 'menus', 'orders', 'users', 'buzzers', ...];
for (const coll of collections) {
  const snap = await getDocs(collection(db, coll));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  fs.writeFileSync(`./data/${coll}.json`, JSON.stringify(data, null, 2));
}
```

### 5.2 Import to Supabase

Create `tools/import-supabase.ts`:

```ts
// For each JSON file, upsert into the corresponding table
for (const coll of collections) {
  const data = JSON.parse(fs.readFileSync(`./data/${coll}.json`, 'utf-8'));
  // Batch upsert in chunks of 500
  for (let i = 0; i < data.length; i += 500) {
    await supabase.from(coll).upsert(data.slice(i, i + 500));
  }
}
```

### 5.3 Run Schema SQL

Apply `supabase-schema.sql` via Supabase SQL Editor or `psql`.

---

## 6. File Cleanup (Phase 4)

| Action | File |
|--------|------|
| DELETE | `src/firebase.ts` |
| DELETE | `firebase-applet-config.json` |
| DELETE | `firebase-blueprint.json` |
| DELETE | `firestore.rules` |
| KEEP (update) | `AI_HANDBOOK/ARCHITECTURE.md` — update stack table |
| KEEP (update) | `AI_HANDBOOK/CONVENTIONS.md` — update DB references |
| KEEP (update) | `.github/copilot-instructions.md` — update DB mention |
| REMOVE dep | `firebase` from `package.json` |
| ADD dep | `@supabase/supabase-js` to `package.json` |

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Real-time behavior change** | `onSnapshot` sends immediate full snapshot on subscribe; Supabase sends only incremental changes | Add explicit initial `select('*')` before subscribing; front-end may flash empty briefly |
| **Case conventions** | Firestore uses `camelCase`; Supabase/PostgreSQL convention is `snake_case` | Either (a) rename all DB columns to snake_case and transform in client, or (b) use quoted camelCase in PostgreSQL. **Recommendation: use snake_case in DB, camelCase transform in TS. The schema above uses snake_case.** |
| **JSONB vs nested maps** | Firestore has native nested maps/arrays; PostgreSQL uses JSONB | Querying inside JSONB is possible with `@>` operator but less ergonomic. Define `items JSONB`, `floors JSONB`, etc. and handle transforms in the service layer. |
| **Server timing** | Supabase real-time uses PostgreSQL replication (slightly lagged, ~50-200ms) vs Firestore's immediate write-triggered push | Acceptable for this app's use case (restaurant orders). Add optimistic UI updates for perceived instant response. |
| **Auth migration** | Project currently has no Firebase Auth (open access) | Supabase RLS can stay permissive initially. Add Supabase Auth later as a separate project. |
| **Batch operations** | Firestore supports doc-level operations; Supabase supports batch/upsert with constraints | Bulk seed/wipe operations in `server.ts` may need transactional wrapping. Supabase supports `.rpc()` for SQL functions if needed. |
| **Composite queries** | Current code uses `getDocs(collection(db, "coll"))` — no filters | If filters are needed later, Supabase's `.select('*').eq('restaurant_id', id)` is cleaner than Firestore's query API. |
| **Offline support** | Firestore has built-in offline persistence | Supabase does not. If offline mode is needed, consider adding a local cache layer (TanStack Query or custom IndexedDB). Out of scope for this migration. |

---

## 8. Implementation Order

```
Phase 0: Supabase project + creds + install @supabase/supabase-js
Phase 1: Write & apply supabase-schema.sql in Supabase SQL Editor
Phase 2a: Create src/lib/supabase.ts
Phase 2b: Rewrite src/App.tsx onSnapshot → Supabase channels
Phase 2c: Rewrite all direct setDoc/deleteDoc calls in components
Phase 2d: Rewrite server.ts Express API routes
Phase 2e: Rewrite seed-analytics.ts
Phase 2f: Update test mocks
Phase 3: Export Firestore → import Supabase
Phase 4: Clean up firebase files & dependencies, update docs
```

**Recommended approach:** Do one table/collection at a time to minimize breakage. Start with `buzzers` (simplest, least dependencies), then `users`, then `menu_items`, then `orders`, then `restaurants`, then analytics tables.

---

## 9. Files That Change (Complete List)

| File | Change Type |
|------|------------|
| `package.json` | Remove `firebase`, add `@supabase/supabase-js` |
| `src/lib/supabase.ts` | **NEW** — Supabase client |
| `src/firebase.ts` | DELETE |
| `src/App.tsx` | Rewrite all `onSnapshot` → Supabase channels, `updateDoc` → `.update()` |
| `src/components/SuperAdminDashboard.tsx` | `setDoc` → `.upsert()`, `deleteDoc` → `.delete().eq()` |
| `src/components/RestaurantAdminPanel.tsx` | `deleteDoc` → `.delete().eq()` |
| `src/components/DineInCustomerUI.tsx` | `setDoc` → `.upsert()` |
| `server.ts` | All `getDocs`/`deleteDoc` → Supabase client calls |
| `seed-analytics.ts` | Replace Firebase with Supabase |
| `firebase-applet-config.json` | DELETE |
| `supabase-config.json` | **NEW** |
| `firebase-blueprint.json` | DELETE (replace with markdown docs) |
| `firestore.rules` | DELETE (replaced by RLS in SQL) |
| `supabase-schema.sql` | **NEW** |
| `tools/export-firestore.ts` | **NEW** (one-shot) |
| `tools/import-supabase.ts` | **NEW** (one-shot) |
| `AI_HANDBOOK/ARCHITECTURE.md` | Update stack table |
| `AI_HANDBOOK/CONVENTIONS.md` | Update database references |
| `.github/copilot-instructions.md` | Update DB mention |
| `src/components/*.test.tsx` (4 files) | Rewrite `vi.mock('firebase/firestore')` → `vi.mock('@supabase/supabase-js')` |
