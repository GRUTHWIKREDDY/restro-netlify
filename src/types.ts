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

  // Custom SLA Admin Capability Rules
  lockAllItems?: boolean;
  disableQrGeneration?: boolean;
  hideHistoryOlderThanOneDay?: boolean;
  disableAdminPortal?: boolean;
  disableKdsPortal?: boolean;
  enableSlaWarning?: boolean;
  adminUsername?: string;
  adminPassword?: string;
  chefUsername?: string;
  chefPassword?: string;
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
  availableFromHour?: number;
  availableUntilHour?: number;
}

export interface OrderItem {
  menuId: string;
  name: string;
  quantity: number;
  price: number; // Standard price of the dish
  promoValue: number; // Discount applied per unit
  notes?: string; // Spice level / Allergy warning / Prep customizations
  rated?: number; // Rated rating for completed order items
  cancelledReason?: string; // Why item was removed (e.g. 'sold_out')
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

// ======================
// ANALYTICS DATA TYPES
// ======================

export interface DailySummary {
  id: string; // YYYY-MM-DD
  restaurantId: string;
  date: string;
  totalRevenue: number;
  totalOrders: number;
  avgTicketSize: number;
  totalDiscount: number;
  discountPercent: number;
  topItems: { menuId: string; name: string; quantity: number; revenue: number }[];
  laborCost: number;
  ordersByHour: Record<number, number>; // { 0: count, 1: count, ... }
  ordersByStatus: { pending: number; accepted: number; completed: number; rejected: number };
  paymentBreakdown: { upi: number; card: number; cash: number; wallet: number };
  createdAt: string;
}

export interface StaffShift {
  id: string;
  restaurantId: string;
  staffId: string;
  staffName: string;
  role: string;
  shiftStart: string; // ISO timestamp
  shiftEnd: string;
  actualEnd?: string;
  hourlyRate: number;
  totalHours: number;
  ordersHandled: number;
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  unit: string; // kg, L, pieces, etc.
  currentStock: number;
  parLevel: number;
  costPerUnit: number;
  supplierId?: string;
  lastUpdated: string;
}

export interface RecipeIngredient {
  itemId: string;
  itemName: string;
  quantityUsed: number;
  unit: string;
}

export interface Recipe {
  id: string;
  restaurantId: string;
  menuItemId: string;
  menuItemName: string;
  ingredients: RecipeIngredient[];
  yieldQty: number;
}

export interface WasteLog {
  id: string;
  restaurantId: string;
  ingredientId: string;
  ingredientName: string;
  quantityWasted: number;
  unit: string;
  reason: string;
  cost: number;
  loggedBy: string;
  loggedAt: string;
}

export interface PurchaseOrder {
  id: string;
  restaurantId: string;
  supplierId: string;
  supplierName: string;
  items: { itemId: string; name: string; qty: number; cost: number }[];
  totalCost: number;
  orderedAt: string;
  receivedAt?: string;
  status: 'pending' | 'received' | 'cancelled';
}

export interface CustomerProfile {
  id: string;
  restaurantId: string;
  phone?: string;
  deviceFingerprint: string;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
  totalSpend: number;
}

export interface Session {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  qrScanAt: string;
  orderPlacedAt?: string;
  paidAt?: string;
  deviceFingerprint: string;
  totalSpend: number;
}

export interface FeedbackResponse {
  id: string;
  orderId: string;
  restaurantId: string;
  rating: number;
  comment?: string;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  themeTags: string[];
  actionable: boolean;
  createdAt: string;
}

export interface ExternalReview {
  id: string;
  restaurantId: string;
  platform: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
}

export interface KdsEvent {
  id: string;
  orderId: string;
  restaurantId: string;
  eventType: 'received' | 'started' | 'completed' | 'sent';
  timestamp: string;
  staffId?: string;
}

export interface AnalyticsFilters {
  range: 'today' | '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
  restaurantId?: string;
}
