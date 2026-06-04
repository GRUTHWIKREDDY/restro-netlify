export interface FloorDef {
  name: string;
  seats: number;
}

export interface Restaurant {
  id: string;
  name: string;
  logoUrl: string;
  status: "active" | "inactive";
  lockedBySuperAdmin: boolean;
  totalTables: number; // For backward compatibility, can equal sum of floors
  floors?: FloorDef[];
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  verificationPin?: string;
  
  // Credentials
  adminUsername?: string;
  adminPassword?: string;
  chefUsername?: string;
  chefPassword?: string;

  // Custom SLA Admin Capability Rules
  lockAllItems?: boolean;
  disableQrGeneration?: boolean;
  hideHistoryOlderThanOneDay?: boolean;
  disableAdminPortal?: boolean;
  disableKdsPortal?: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  isLimitedTimeOffer: boolean;
  offerDetails: string;
  promoValue: number; // Discount amount subtracted from the standard price
  isVeg?: boolean; // Vegetarian or non-vegetarian
  avgRating?: number; // Average star feedback score
  ratingsCount?: number; // Total count of rated feedback
  imageUrl?: string; // High-quality food photopragh URL
}

export interface OrderItem {
  menuId: string;
  name: string;
  quantity: number;
  price: number; // Standard price of the dish
  promoValue: number; // Discount applied per unit
  notes?: string; // Spice level / Allergy warning / Prep customizations
  rated?: number; // Rated rating for completed order items
}

export type OrderStatus = "pending" | "accepted" | "rejected" | "completed";

export interface Order {
  id: string;
  restaurantId: string;
  tableNumber: number;
  userPhone: string;
  userName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  totalAmount: number; // Final payable nets
  released?: boolean; // Settle-released state flag
  
  // Geofencing & Handshake fields
  geofenceVerified?: boolean;
  geofenceDistance?: number;
  userLatitude?: number;
  userLongitude?: number;
  requiresHandshake?: boolean;
  handshakeCode?: string;
  handshakeApproved?: boolean;
}

export interface Buzzer {
  id: string;
  restaurantId: string;
  tableNumber: number;
  requestType: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface DineInUser {
  phone: string;
  name: string;
  globalOrderHistory: string[];
  ratedDishes?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
