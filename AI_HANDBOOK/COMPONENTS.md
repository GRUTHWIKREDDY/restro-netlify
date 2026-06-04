# Components

## App.tsx (Root)

The single root component. Acts as:
- **State hub** — all shared state lives here (restaurants, menus, orders, users, buzzers)
- **Routing** — reads `window.location.pathname` to decide portal vs dine-in mode
- **Firestore listeners** — 5 `onSnapshot()` subscriptions for real-time sync
- **Handler factory** — defines all mutation handlers passed down as props

### Routing Logic

| URL Pattern | Mode |
|---|---|
| `/` (any non-portal path) | Dine-In Customer UI |
| `/portal`, `/admin`, `/backend`, `/staff` | Staff Portal → Login screen |
| `/portal` + authenticated | Restaurant Admin / Kitchen / Super Admin |

No React Router — uses `window.history.pushState()` + `popstate` event.

### Authentication

Simple localStorage-based (`kcode_is_authenticated`). Hardcoded credentials:
- Admin Portal: `admin` / `password`
- Chef KDS: `chef` / `password`
- SaaS Super Control: `superadmin` / `password`

## Component Tree

```
App.tsx
├── StaffPortalLogin.tsx        ← (shown at /portal when not authenticated)
│   └── Role selection: admin | chef | superadmin
│
├── DineInCustomerUI.tsx        ← (shown at / when no portal route)
│   ├── Login form (phone + table code)
│   ├── Menu browsing (by category / search)
│   ├── Cart management
│   ├── Order tracking
│   ├── Rating system
│   ├── Buzzer (waiter call) system
│   └── AI Aarudy D' concierge chat (floating button)
│
├── RestaurantAdminPanel.tsx    ← (portal, restadmin mode)
│   ├── Orders tab (live order queue)
│   ├── Menu tab (CRUD + AI copywriting + AI photo studio)
│   ├── Tables tab (QR code generation + print)
│   ├── Floor tab (floor plan management)
│   └── Buzzers tab (waiter call management)
│
├── KitchenDisplaySystem.tsx    ← (portal, kitchen mode)
│   ├── Multi-restaurant selector
│   ├── Live order tickets with timers
│   ├── Per-dish cancellation
│   └── Buzzer alerts
│
└── SuperAdminDashboard.tsx     ← (portal, superadmin mode)
    ├── Tenants overlay (add/delete/lock restaurants)
    ├── Seating overlay (global table management)
    ├── Feed overlay (live order feed across all tenants)
    ├── Accounting overlay (revenue + pricing)
    └── AI SaaS overlay (AI-generated business reports)
```

## Props Flow

All handlers are defined in `App.tsx` and passed as props to child components:

```
App.tsx handlers → child components (via props)
  ├── handleOrderPlaced(newOrder)        → DineInCustomerUI
  ├── handleUpdateOrderStatus(id, status) → RestaurantAdminPanel, KitchenDisplaySystem
  ├── handleMenuItemSave(item, isEdit)   → RestaurantAdminPanel
  ├── handleMenuItemDelete(id)           → RestaurantAdminPanel
  ├── handleModifyRestaurantTablesGlobal → SuperAdminDashboard
  ├── handleResetData()                  → triggered from App header
  └── triggerAppAlert(title, msg, type)  → all components
```

## Key Component Details

### DineInCustomerUI.tsx (~1664 lines)
- Largest customer-facing component
- Phone-based login with 10-digit Indian phone validation (`[6-9]\d{9}$`)
- 4-digit table access code verified against `restaurant.verificationPin`
- GPS geofencing (simulated or real)
- Handshake system for out-of-range orders
- AI concierge chat (DeepSeek-powered)

### RestaurantAdminPanel.tsx (~2741 lines)
- Largest component overall
- QR code generation per table with configurable base URL
- 4 flyer themes: noir, gold, emerald, cobalt
- Floor plan definitions (name + seat count per floor)
- AI copywriter for menu descriptions
- AI photo studio for food imagery
- Sales ledger modal

### SuperAdminDashboard.tsx (~2374 lines)
- Multi-tenant SaaS management
- Tenant creation with auto-ID generation (`rest-{max+1}`)
- Starter menu auto-seeding on creation (3 items)
- AI SaaS report generation
- Revenue analytics across all tenants

### KitchenDisplaySystem.tsx
- Dark theme UI for kitchen environments
- Real-time order ticket display with timers
- Kitchen buzzer alerts for waiter calls
- Multi-restaurant station selector

### StaffPortalLogin.tsx
- 3-role login with animated "terminal handshake" sequence
- Simple credential check (hardcoded defaults)
