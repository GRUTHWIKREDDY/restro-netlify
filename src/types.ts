export interface Restaurant {
  id: string;
  name: string;
  logoUrl: string;
  status: "active" | "inactive";
  lockedBySuperAdmin: boolean;
  totalTables: number;
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
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
