# Data Model

## Firestore Collections

| Collection | Document Key | Schema | Purpose |
|---|---|---|---|
| `restaurants` | `rest-1`, `rest-2`, ... | Restaurant | Tenant restaurant brands |
| `menus` | `menu-1`, `menu-init-rest-N-1`, ... | MenuItem | Menu catalog items |
| `orders` | `ord-201`, `seat-rest-1-3-...`, ... | Order | Customer food orders |
| `users` | phone number (e.g. `+919****3210`) | DineInUser | Customer profiles |
| `buzzers` | UUID-based | Buzzer | Waiter service requests |

## TypeScript Interfaces (`src/types.ts`)

### Restaurant
```typescript
interface Restaurant {
  id: string;                    // "rest-1", "rest-2", etc.
  name: string;                  // "The Royal Clay Oven"
  logoUrl: string;               // Unsplash image URL
  status: "active" | "inactive";
  lockedBySuperAdmin: boolean;
  totalTables: number;           // 1-50
  floors?: FloorDef[];           // [{ name: "Main Floor", seats: 8 }]
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number; // Default 150
  verificationPin?: string;      // 4-digit table code, default "1234"
  adminUsername?: string;        // Default "admin"
  adminPassword?: string;        // Default "password"
  chefUsername?: string;         // Default "chef"
  chefPassword?: string;         // Default "password"
  hideHistoryOlderThanOneDay?: boolean;
}
```

### FloorDef
```typescript
interface FloorDef {
  name: string;   // "Main Floor", "Terrace", etc.
  seats: number;  // Number of tables on this floor
}
```

### MenuItem
```typescript
interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;          // "Mains", "Starters", "Desserts", "Drinks"
  isAvailable: boolean;
  isLimitedTimeOffer: boolean;
  offerDetails: string;
  promoValue: number;        // Discount amount
  isVeg?: boolean;
  avgRating?: number;
  ratingsCount?: number;
  imageUrl?: string;         // Food photo URL
}
```

### OrderItem
```typescript
interface OrderItem {
  menuId: string;
  name: string;
  quantity: number;
  price: number;
  promoValue: number;
  notes?: string;            // Customizations
  rated?: number;            // Star rating after completion
}
```

### Order
```typescript
type OrderStatus = "pending" | "accepted" | "rejected" | "completed";

interface Order {
  id: string;                // "ord-201" or "seat-rest-1-3-{timestamp}"
  restaurantId: string;
  tableNumber: number;
  userPhone: string;
  userName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;         // ISO timestamp
  totalAmount: number;
  geofenceVerified?: boolean;
  geofenceDistance?: number;
  userLatitude?: number;
  userLongitude?: number;
  requiresHandshake?: boolean;
  handshakeCode?: string;
  handshakeApproved?: boolean;
  released?: boolean;        // For "released" state after completion
}
```

### Buzzer
```typescript
interface Buzzer {
  id: string;
  restaurantId: string;
  tableNumber: number;
  requestType: string;     // "Waiter Call", "Water", "Bill", etc.
  status: "pending" | "resolved";
  createdAt: string;       // ISO timestamp
}
```

### DineInUser
```typescript
interface DineInUser {
  phone: string;              // Document key
  name: string;
  globalOrderHistory: string[];  // Array of order IDs
}
```

## ID Conventions

- **restaurants**: `rest-{N}` (sequential, e.g. rest-1, rest-2)
- **menus**: `menu-{N}` for seeded data, `menu-init-{restaurantId}-{N}` for auto-generated starter menus
- **orders**: `ord-{N}` for seeded historical orders, `seat-{restaurantId}-{tableNumber}-{timestamp}` for seating tokens
- **users**: phone number (e.g. `+919****3210`)
- **buzzers**: UUID generated client-side with `crypto.randomUUID()`
