import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
dotenv.config();
// DeepSeek replaces GoogleGenAI — uses OpenAI-compatible API via native fetch
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Client SDK
const fApp = initializeApp(firebaseConfig);
const db = getFirestore(fApp, firebaseConfig.firestoreDatabaseId);

// Standard Starting Data for seeding
const INITIAL_RESTAURANTS = [
  {
    id: "rest-1",
    name: "The Royal Clay Oven",
    logoUrl: "https://images.unsplash.com/photo-1634141422683-0941a313d52c?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 8,
    latitude: 28.5672,
    longitude: 77.2025,
    geofenceRadiusMeters: 150,
    verificationPin: "1234"
  },
  {
    id: "rest-2",
    name: "Dakshin Delights",
    logoUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 10,
    latitude: 12.9716,
    longitude: 77.5946,
    geofenceRadiusMeters: 150,
    verificationPin: "5678"
  },
  {
    id: "rest-3",
    name: "Chaat Chowk & Co.",
    logoUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 6,
    latitude: 19.0760,
    longitude: 72.8777,
    geofenceRadiusMeters: 150,
    verificationPin: "9999"
  },
  {
    id: "rest-4",
    name: "The Dim Sum House",
    logoUrl: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 12,
    latitude: 22.5726,
    longitude: 88.3639,
    geofenceRadiusMeters: 150,
    verificationPin: "4444"
  },
  {
    id: "rest-5",
    name: "Pizzeria Gusto & Pasta",
    logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 8,
    latitude: 12.9716,
    longitude: 77.5946,
    geofenceRadiusMeters: 150,
    verificationPin: "5555"
  },
  {
    id: "rest-6",
    name: "The Sweet Boutique",
    logoUrl: "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 6,
    latitude: 19.0760,
    longitude: 72.8777,
    geofenceRadiusMeters: 150,
    verificationPin: "6666"
  },
  {
    id: "rest-7",
    name: "The Green Bowl Co.",
    logoUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 10,
    latitude: 28.6139,
    longitude: 77.2090,
    geofenceRadiusMeters: 150,
    verificationPin: "7777"
  }
];

const INITIAL_MENUS = [
  // rest-1: The Royal Clay Oven (Mains, Starters, Desserts, Drinks)
  { id: "menu-1", restaurantId: "rest-1", name: "Murgh Makhani (Butter Chicken)", description: "Tender tandoori chicken cooked in creamy, velvet butter-tomato gravy, served with hot naan bread.", price: 380, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "15% Chef Special", promoValue: 57, isVeg: false, imageUrl: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-2", restaurantId: "rest-1", name: "Paneer Lababdar & Butter Kulcha", description: "Fresh cottage cheese blocks folded into spiced tomato-cashew curry, served with buttered kulcha bread.", price: 290, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-3", restaurantId: "rest-1", name: "Tandoori Soya Chaap Tikka", description: "Juicy soy-bean chops dry roasted in red clay tandoori spices and yoghurt marinade.", price: 220, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-4", restaurantId: "rest-1", name: "Gulab Jamun with Rabri", description: "Golden fried milk buns soaked in cardamom sugar syrup, topped with chilled premium Rabri glaze.", price: 140, category: "Desserts", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-5", restaurantId: "rest-1", name: "Alphonso Mango Lassi", description: "Creamy curd smoothie blended with sweet Mango pulp, garnished with slivered pistachios.", price: 120, category: "Drinks", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Save ₹20! Cool Refresher", promoValue: 20, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-1a", restaurantId: "rest-1", name: "Awadhi Dum Biryani (Chicken)", description: "Fragrant basmati rice layered with spiced marinated chicken, fresh mint, and slow-cooked in sealed clay pot.", price: 360, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: false, imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-1b", restaurantId: "rest-1", name: "Dal Makhani & Garlic Naan Set", description: "Rich, creamy charcoal-simmered black lentils served with bubbling butter-crushed garlic naan.", price: 270, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80" },

  // rest-2: Dakshin Delights
  { id: "menu-6", restaurantId: "rest-2", name: "Ghee Masala Roast Dosa", description: "Fermented rice batter crispy golden crepe smeared with hot secret powder and loaded potatoes.", price: 165, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-7", restaurantId: "rest-2", name: "Steamed Idli & Vada Combo", description: "Pair of fluffy steamed idlis and one crispy medu vada served with piping hot sambar and fresh coconut dip.", price: 115, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Save ₹15! South Combo", promoValue: 15, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-8", restaurantId: "rest-2", name: "Crispy Curry Leaf Chicken fry", description: "Spiced street style boneless chicken cubes stir-fried with fresh curry leaves and black pepper.", price: 245, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: false, imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-9", restaurantId: "rest-2", name: "Filter Degree Coffee", description: "Chicory-rich strong South hot coffee frothed elegantly in a brass tumbler set.", price: 60, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-2a", restaurantId: "rest-2", name: "Madras Fish Curry", description: "Traditional tangy and spicy coconut-based fish curry infused with sour tamarind and mustard seeds.", price: 310, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: false, imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-2b", restaurantId: "rest-2", name: "Rava Kesari (Pineapple Halwa)", description: "Roasted semolina pudding cooked with real ghee, pineapple chunks, saffron, and cashew crunch.", price: 110, category: "Desserts", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80" },

  // rest-3: Chaat Chowk & Co.
  { id: "menu-10", restaurantId: "rest-3", name: "Classic Vada Pav (Double)", description: "Double potato dumplings fried perfectly and placed inside street-pushed buns with hot garlic masala.", price: 120, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Save ₹20 On Street Special", promoValue: 20, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-11", restaurantId: "rest-3", name: "Dahi Puri Bomb Platter", description: "Crisp puffed puris stuffed with potato-chickpea crumble, topped with sweet yogurt and tangy tamarind-mint purees.", price: 140, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-12", restaurantId: "rest-3", name: "Sizzling Paneer Tikka Samosa", description: "Triangular crispy crust loaded with mashed spiced potatoes, green peas, paneer-tikka cubes.", price: 90, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-13", restaurantId: "rest-3", name: "Cutting Masala Chai (Pitcher)", description: "A hot, comforting, highly frothed milky tea brewed with fresh crushed ginger and green cardamom.", price: 80, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-14", restaurantId: "rest-3", name: "Delhi Raj Kachori Supreme", description: "Royal crisp golden dome stuffed with pulses, yogurt, chutneys, sprouts, and colorful pomegranate seed cascades.", price: 160, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1546833959-52319ef16fb7?w=400&auto=format&fit=crop&q=80" },

  // rest-4: The Dim Sum House
  { id: "menu-15", restaurantId: "rest-4", name: "Steamed Chicken Momos", description: "Traditional thin-wrapped dumplings packed with seasoned minced chicken & herbs, served with fire-spiced tomato dip.", price: 180, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: false, imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-16", restaurantId: "rest-4", name: "Challi Garlic Hakka Noodles", description: "Wok-tossed noodles with crushed garlic, green chillies, spring onions, crisp exotic vegetables, and light soy seasoning.", price: 240, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "10% Off Indo-Chinese Classic", promoValue: 24, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-17", restaurantId: "rest-4", name: "Crispy Veg Spring Rolls", description: "Golden deep-fried snacks stuffed with shredded carrots, cabbage, and glass noodles, served with sweet plum dip.", price: 160, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-18", restaurantId: "rest-4", name: "Fried Chocolate Baos", description: "Fluffy steamed buns fried to a warm crisp, stuffed with rich Belgian dark chocolate, served with vanilla fudge gelato.", price: 210, category: "Desserts", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1534080391025-a77d018f3ee0?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-19", restaurantId: "rest-4", name: "Jasmine Honey Iced Tea", description: "Fragrant green jasmine tea leaves cold brewed with local honey and organic lemon slices, extremely refreshing.", price: 130, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&auto=format&fit=crop&q=80" },

  // rest-5: Pizzeria Gusto & Pasta
  { id: "menu-20", restaurantId: "rest-5", name: "Spicy Pepperoni & Basil Pizza", description: "Wood-fired sourdough pizza topped with plum tomato sauce, fresh mozzarella, spicy pork pepperoni, and garden-picked sweet sweet basil.", price: 520, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Special ₹50 discount!", promoValue: 50, isVeg: false, imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-21", restaurantId: "rest-5", name: "Creamy Fettuccine Alfredo", description: "Housemade egg fettuccine tossed in a rich, buttery white sauce of freshly grated Parmigiano-Reggiano cream and cracked black pepper.", price: 380, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-22", restaurantId: "rest-5", name: "Cheesy Garlic Sourdough Pull-apart", description: "Freshly baked sourdough crown infused with double garlic butter, parsley, and stuffed with gooey melted standard mozzarella.", price: 220, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-23", restaurantId: "rest-5", name: "Classic Italian Tiramisu", description: "Espresso-soaked ladyfinger cookies layered with rich whipped cream of mascarpone cheese, sweet marsala, and dark cocoa dust.", price: 280, category: "Desserts", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Pizzeria Signature Pick", promoValue: 30, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-24", restaurantId: "rest-5", name: "Fresh Peach Mojito", description: "Muddled sweet yellow peaches, garden mint leaves, and lime juice, shaken with club soda over crushed mountain ice.", price: 150, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80" },

  // rest-6: The Sweet Boutique
  { id: "menu-25", restaurantId: "rest-6", name: "Sizzling Chocolate Fudge Brownie", description: "A rich, ultra-dense chocolate walnut brownie served on a piping sizzling cast-iron skillet, topped with premium vanilla gelato and hot fudge cascade.", price: 250, category: "Desserts", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-26", restaurantId: "rest-6", name: "Fresh Strawberry Belgian Waffle", description: "Thick, golden crispy liege waffle topped with chopped fresh Mahabaleshwar strawberries, strawberry maple syrup, and whipped milk-fat cream.", price: 220, category: "Desserts", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Seasonal Delight - Save ₹25", promoValue: 25, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1562376502-6f769499c886?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-27", restaurantId: "rest-6", name: "Melted Nutella Crepe", description: "Paper-thin French crepe loaded with rich melted hazelnut cocoa Nutella paste and fresh banana disks, folded to a hot golden finish.", price: 190, category: "Desserts", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-28", restaurantId: "rest-6", name: "Lotus Biscoff Milkshake", description: "Creamy vanilla ice cream churned with speculoos Biscoff biscuit spread and crushed cookies, with caramel ribbons.", price: 180, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&auto=format&fit=crop&q=80" },

  // rest-7: The Green Bowl Co.
  { id: "menu-29", restaurantId: "rest-7", name: "Avocado Quinoa Power Salad", description: "Crispy baby kale leaves, high-protein organic white quinoa, Hass avocado chunks, cherry tomatoes, cucumbers, sunflower seeds, and citrus vinaigrette drizzle.", price: 320, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-30", restaurantId: "rest-7", name: "Hummus & Garlic Baked Falafel Bowl", description: "Creamy olive-oil doused chickpeas hummus, roasted warm baked fava-bean falafels, served with pita triangles and sour cabbage pickles.", price: 280, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Healthy Option - Save ₹20", promoValue: 20, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-31", restaurantId: "rest-7", name: "Herby Sweet Potato Baked Fries", description: "Crisp oven-roasted local sweet potato batons, tossed in fine Himalayan pink salt and garden rosemary thyme leaves.", price: 160, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-32", restaurantId: "rest-7", name: "Detox Green Apple & Mint Cooler", description: "Cold-pressed clean green apple juice, organic celery stalks, ginger root cubes, lime squeezes, and fresh crushed spearmint leaves.", price: 150, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587caaec?w=400&auto=format&fit=crop&q=80" }
];

const INITIAL_ORDERS = [
  // Today's orders
  {
    id: "ord-201",
    restaurantId: "rest-1",
    tableNumber: 3,
    userPhone: "+919876543210",
    userName: "Alex Sharma",
    items: [
      { menuId: "menu-1", name: "Murgh Makhani (Butter Chicken)", quantity: 1, price: 380, promoValue: 57 },
      { menuId: "menu-5", name: "Alphonso Mango Lassi", quantity: 2, price: 120, promoValue: 20 }
    ],
    status: "pending" as const,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    totalAmount: 523
  },
  {
    id: "ord-202",
    restaurantId: "rest-1",
    tableNumber: 5,
    userPhone: "+919988776655",
    userName: "Sarah Patel",
    items: [
      { menuId: "menu-2", name: "Paneer Lababdar & Butter Kulcha", quantity: 1, price: 290, promoValue: 0 },
      { menuId: "menu-4", name: "Gulab Jamun with Rabri", quantity: 1, price: 140, promoValue: 0 }
    ],
    status: "accepted" as const,
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    totalAmount: 430
  },
  {
    id: "ord-203",
    restaurantId: "rest-2",
    tableNumber: 2,
    userPhone: "+919000112233",
    userName: "Karthik Iyer",
    items: [
      { menuId: "menu-6", name: "Ghee Masala Roast Dosa", quantity: 2, price: 165, promoValue: 0 },
      { menuId: "menu-9", name: "Filter Degree Coffee", quantity: 1, price: 60, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    totalAmount: 390
  },
  {
    id: "ord-204",
    restaurantId: "rest-1",
    tableNumber: 1,
    userPhone: "+919111222333",
    userName: "Vikram Singh",
    items: [
      { menuId: "menu-1a", name: "Awadhi Dum Biryani (Chicken)", quantity: 1, price: 360, promoValue: 0 },
      { menuId: "menu-5", name: "Alphonso Mango Lassi", quantity: 2, price: 120, promoValue: 20 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    totalAmount: 560
  },
  {
    id: "ord-205",
    restaurantId: "rest-2",
    tableNumber: 4,
    userPhone: "+919222333444",
    userName: "Ananya Nair",
    items: [
      { menuId: "menu-7", name: "Steamed Idli & Vada Combo", quantity: 1, price: 115, promoValue: 15 },
      { menuId: "menu-2b", name: "Rava Kesari (Pineapple Halwa)", quantity: 1, price: 110, promoValue: 0 },
      { menuId: "menu-9", name: "Filter Degree Coffee", quantity: 1, price: 60, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    totalAmount: 270
  },
  {
    id: "ord-206",
    restaurantId: "rest-3",
    tableNumber: 1,
    userPhone: "+919333444555",
    userName: "Rajesh Kumar",
    items: [
      { menuId: "menu-10", name: "Classic Vada Pav (Double)", quantity: 2, price: 120, promoValue: 20 },
      { menuId: "menu-11", name: "Dahi Puri Bomb Platter", quantity: 1, price: 140, promoValue: 0 },
      { menuId: "menu-13", name: "Cutting Masala Chai (Pitcher)", quantity: 1, price: 80, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    totalAmount: 420
  },
  {
    id: "ord-308",
    restaurantId: "rest-4",
    tableNumber: 1,
    userPhone: "+919830012345",
    userName: "Rohan Roy",
    items: [
      { menuId: "menu-15", name: "Steamed Chicken Momos", quantity: 1, price: 180, promoValue: 0 },
      { menuId: "menu-19", name: "Jasmine Honey Iced Tea", quantity: 2, price: 130, promoValue: 0 }
    ],
    status: "pending" as const,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    totalAmount: 440
  },
  {
    id: "ord-309",
    restaurantId: "rest-5",
    tableNumber: 2,
    userPhone: "+919810055555",
    userName: "Alia Bhatt",
    items: [
      { menuId: "menu-20", name: "Spicy Pepperoni & Basil Pizza", quantity: 1, price: 520, promoValue: 50 },
      { menuId: "menu-24", name: "Fresh Peach Mojito", quantity: 2, price: 150, promoValue: 0 }
    ],
    status: "accepted" as const,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    totalAmount: 770
  },
  {
    id: "ord-310",
    restaurantId: "rest-6",
    tableNumber: 3,
    userPhone: "+919820066666",
    userName: "Ranbir Kapoor",
    items: [
      { menuId: "menu-26", name: "Fresh Strawberry Belgian Waffle", quantity: 1, price: 220, promoValue: 25 },
      { menuId: "menu-28", name: "Lotus Biscoff Milkshake", quantity: 2, price: 180, promoValue: 0 }
    ],
    status: "accepted" as const,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    totalAmount: 555
  },

  // 1 Day Ago (Yesterday)
  {
    id: "ord-207",
    restaurantId: "rest-1",
    tableNumber: 6,
    userPhone: "+919444555666",
    userName: "Meera Sen",
    items: [
      { menuId: "menu-2", name: "Paneer Lababdar & Butter Kulcha", quantity: 1, price: 290, promoValue: 0 },
      { menuId: "menu-1b", name: "Dal Makhani & Garlic Naan Set", quantity: 1, price: 270, promoValue: 0 },
      { menuId: "menu-4", name: "Gulab Jamun with Rabri", quantity: 2, price: 140, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString(),
    totalAmount: 840,
    released: true
  },
  {
    id: "ord-301",
    restaurantId: "rest-4",
    tableNumber: 4,
    userPhone: "+919830012345",
    userName: "Rohan Roy",
    items: [
      { menuId: "menu-15", name: "Steamed Chicken Momos", quantity: 2, price: 180, promoValue: 0 },
      { menuId: "menu-16", name: "Challi Garlic Hakka Noodles", quantity: 1, price: 240, promoValue: 24 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString(),
    totalAmount: 576,
    released: true
  },
  {
    id: "ord-303",
    restaurantId: "rest-5",
    tableNumber: 3,
    userPhone: "+919810022334",
    userName: "Kabir Kapoor",
    items: [
      { menuId: "menu-20", name: "Spicy Pepperoni & Basil Pizza", quantity: 1, price: 520, promoValue: 50 },
      { menuId: "menu-21", name: "Creamy Fettuccine Alfredo", quantity: 1, price: 380, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000).toISOString(),
    totalAmount: 850,
    released: true
  },
  {
    id: "ord-306",
    restaurantId: "rest-7",
    tableNumber: 6,
    userPhone: "+919810011122",
    userName: "Dia Mirza",
    items: [
      { menuId: "menu-29", name: "Avocado Quinoa Power Salad", quantity: 2, price: 320, promoValue: 0 },
      { menuId: "menu-32", name: "Detox Green Apple & Mint Cooler", quantity: 2, price: 150, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString(),
    totalAmount: 940,
    released: true
  },

  // 2 Days Ago
  {
    id: "ord-208",
    restaurantId: "rest-2",
    tableNumber: 3,
    userPhone: "+919000112233",
    userName: "Karthik Iyer",
    items: [
      { menuId: "menu-2a", name: "Madras Fish Curry", quantity: 1, price: 310, promoValue: 0 },
      { menuId: "menu-8", name: "Crispy Curry Leaf Chicken fry", quantity: 1, price: 245, promoValue: 0 },
      { menuId: "menu-9", name: "Filter Degree Coffee", quantity: 2, price: 60, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString(),
    totalAmount: 675,
    released: true
  },
  {
    id: "ord-302",
    restaurantId: "rest-4",
    tableNumber: 2,
    userPhone: "+919830055667",
    userName: "Kriti Sen",
    items: [
      { menuId: "menu-16", name: "Challi Garlic Hakka Noodles", quantity: 2, price: 240, promoValue: 24 },
      { menuId: "menu-19", name: "Jasmine Honey Iced Tea", quantity: 2, price: 130, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString(),
    totalAmount: 692,
    released: true
  },
  {
    id: "ord-305",
    restaurantId: "rest-6",
    tableNumber: 1,
    userPhone: "+919930044556",
    userName: "Sanjay Leela",
    items: [
      { menuId: "menu-25", name: "Sizzling Chocolate Fudge Brownie", quantity: 2, price: 250, promoValue: 0 },
      { menuId: "menu-28", name: "Lotus Biscoff Milkshake", quantity: 2, price: 180, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 7 * 60 * 60 * 1000).toISOString(),
    totalAmount: 860,
    released: true
  },

  // 3 Days Ago
  {
    id: "ord-209",
    restaurantId: "rest-3",
    tableNumber: 3,
    userPhone: "+919555666777",
    userName: "Nisha Gupta",
    items: [
      { menuId: "menu-14", name: "Delhi Raj Kachori Supreme", quantity: 1, price: 160, promoValue: 0 },
      { menuId: "menu-12", name: "Sizzling Paneer Tikka Samosa", quantity: 2, price: 90, promoValue: 0 },
      { menuId: "menu-13", name: "Cutting Masala Chai (Pitcher)", quantity: 1, price: 80, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000).toISOString(),
    totalAmount: 420,
    released: true
  },
  {
    id: "ord-304",
    restaurantId: "rest-5",
    tableNumber: 5,
    userPhone: "+919820033445",
    userName: "Zoya Akhtar",
    items: [
      { menuId: "menu-22", name: "Cheesy Garlic Sourdough Pull-apart", quantity: 2, price: 220, promoValue: 0 },
      { menuId: "menu-23", name: "Classic Italian Tiramisu", quantity: 2, price: 280, promoValue: 30 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString(),
    totalAmount: 940,
    released: true
  },

  // 4 Days Ago
  {
    id: "ord-210",
    restaurantId: "rest-1",
    tableNumber: 2,
    userPhone: "+919876543210",
    userName: "Alex Sharma",
    items: [
      { menuId: "menu-1", name: "Murgh Makhani (Butter Chicken)", quantity: 2, price: 380, promoValue: 57 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString(),
    totalAmount: 646,
    released: true
  },
  {
    id: "ord-307",
    restaurantId: "rest-7",
    tableNumber: 2,
    userPhone: "+919810033344",
    userName: "Milind Soman",
    items: [
      { menuId: "menu-30", name: "Hummus & Garlic Baked Falafel Bowl", quantity: 1, price: 280, promoValue: 20 },
      { menuId: "menu-31", name: "Herby Sweet Potato Baked Fries", quantity: 1, price: 160, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000).toISOString(),
    totalAmount: 420,
    released: true
  },

  // 5 Days Ago
  {
    id: "ord-211",
    restaurantId: "rest-2",
    tableNumber: 5,
    userPhone: "+919666777888",
    userName: "Srinivas Rao",
    items: [
      { menuId: "menu-6", name: "Ghee Masala Roast Dosa", quantity: 2, price: 165, promoValue: 0 },
      { menuId: "menu-7", name: "Steamed Idli & Vada Combo", quantity: 2, price: 115, promoValue: 15 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString(),
    totalAmount: 530,
    released: true
  },
  {
    id: "ord-212",
    restaurantId: "rest-3",
    tableNumber: 5,
    userPhone: "+919777888999",
    userName: "Priya Malhotra",
    items: [
      { menuId: "menu-10", name: "Classic Vada Pav (Double)", quantity: 1, price: 120, promoValue: 20 },
      { menuId: "menu-11", name: "Dahi Puri Bomb Platter", quantity: 2, price: 140, promoValue: 0 },
      { menuId: "menu-13", name: "Cutting Masala Chai (Pitcher)", quantity: 2, price: 80, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 7 * 60 * 60 * 1000).toISOString(),
    totalAmount: 500,
    released: true
  },
  {
    id: "ord-213",
    restaurantId: "rest-1",
    tableNumber: 4,
    userPhone: "+919888999000",
    userName: "Karan Johar",
    items: [
      { menuId: "menu-1a", name: "Awadhi Dum Biryani (Chicken)", quantity: 1, price: 360, promoValue: 0 },
      { menuId: "menu-2", name: "Paneer Lababdar & Butter Kulcha", quantity: 1, price: 290, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString(),
    totalAmount: 650,
    released: true
  },
  {
    id: "ord-214",
    restaurantId: "rest-3",
    tableNumber: 2,
    userPhone: "+919999000111",
    userName: "Aditya Roy",
    items: [
      { menuId: "menu-12", name: "Sizzling Paneer Tikka Samosa", quantity: 4, price: 90, promoValue: 0 },
      { menuId: "menu-13", name: "Cutting Masala Chai (Pitcher)", quantity: 2, price: 80, promoValue: 0 }
    ],
    status: "completed" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 10 * 60 * 60 * 1000).toISOString(),
    totalAmount: 520,
    released: true
  }
];

const INITIAL_USERS = [
  { phone: "+919876543210", name: "Alex Sharma", globalOrderHistory: ["ord-201", "ord-210"] },
  { phone: "+919988776655", name: "Sarah Patel", globalOrderHistory: ["ord-202"] },
  { phone: "+919000112233", name: "Karthik Iyer", globalOrderHistory: ["ord-203", "ord-208"] },
  { phone: "+919111222333", name: "Vikram Singh", globalOrderHistory: ["ord-204"] },
  { phone: "+919222333444", name: "Ananya Nair", globalOrderHistory: ["ord-205"] },
  { phone: "+919333444555", name: "Rajesh Kumar", globalOrderHistory: ["ord-206"] },
  { phone: "+919444555666", name: "Meera Sen", globalOrderHistory: ["ord-207"] },
  { phone: "+919555666777", name: "Nisha Gupta", globalOrderHistory: ["ord-209"] },
  { phone: "+919666777888", name: "Srinivas Rao", globalOrderHistory: ["ord-211"] },
  { phone: "+919777888999", name: "Priya Malhotra", globalOrderHistory: ["ord-212"] },
  { phone: "+919888999000", name: "Karan Johar", globalOrderHistory: ["ord-213"] },
  { phone: "+919999000111", name: "Aditya Roy", globalOrderHistory: ["ord-214"] },
  { phone: "+919830012345", name: "Rohan Roy", globalOrderHistory: ["ord-301", "ord-308"] },
  { phone: "+919830055667", name: "Kriti Sen", globalOrderHistory: ["ord-302"] },
  { phone: "+919810022334", name: "Kabir Kapoor", globalOrderHistory: ["ord-303"] },
  { phone: "+919820033445", name: "Zoya Akhtar", globalOrderHistory: ["ord-304"] },
  { phone: "+919930044556", name: "Sanjay Leela", globalOrderHistory: ["ord-305"] },
  { phone: "+919810011122", name: "Dia Mirza", globalOrderHistory: ["ord-306"] },
  { phone: "+919810033344", name: "Milind Soman", globalOrderHistory: ["ord-307"] },
  { phone: "+919810055555", name: "Alia Bhatt", globalOrderHistory: ["ord-309"] },
  { phone: "+919820066666", name: "Ranbir Kapoor", globalOrderHistory: ["ord-310"] }
];

// Seeding engine
async function seedDatabaseIfEmpty() {
  try {
    const qSnap = await getDocs(collection(db, "restaurants"));
    const oSnap = await getDocs(collection(db, "orders"));
    
    // Check if empty, or old 'ord-101' exists, or our mandatory new 'ord-214' order is missing, or one of the new restaurants is missing
    let needsUpgrade = qSnap.empty;
    if (!needsUpgrade) {
      const rIds = qSnap.docs.map(doc => doc.id);
      const ids = oSnap.docs.map(doc => doc.id);
      if (ids.includes("ord-101") || !ids.includes("ord-214") || !rIds.includes("rest-4")) {
        needsUpgrade = true;
      }
    }

    if (needsUpgrade) {
      console.log("Firestore database is empty or has stale data. Seeding rich multi-outlet Indian analytics...");
      
      // Force wipe existing to prevent collisions and mix-ups
      const colls = ["restaurants", "menus", "orders", "users", "buzzers"];
      for (const collName of colls) {
        const snap = await getDocs(collection(db, collName));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }

      for (const r of INITIAL_RESTAURANTS) {
        await setDoc(doc(db, "restaurants", r.id), r);
      }
      for (const m of INITIAL_MENUS) {
        await setDoc(doc(db, "menus", m.id), m);
      }
      for (const o of INITIAL_ORDERS) {
        await setDoc(doc(db, "orders", o.id), o);
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, "users", u.phone), u);
      }
      console.log("Firestore database seeding successfully completed.");
    } else {
      console.log("Firestore database already populated with full Indian establishment profiles.");
    }
  } catch (err) {
    console.error("Friction checking or seeding Firestore on boot:", err);
  }
}

// DeepSeek AI client — OpenAI-compatible, uses native fetch
const DEEPSEEK_API_BASE = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

async function callDeepSeek(prompt: string, systemInstruction: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not defined. AI functions will run with mock outputs.");
    return "";
  }

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: false
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json());

  // Proactively run Seeding Check
  await seedDatabaseIfEmpty();

  // === DATABASE API ENDPOINTS ===

  app.get("/api/restaurants", async (req, res) => {
    try {
      const qSnap = await getDocs(collection(db, "restaurants"));
      const list = qSnap.docs.map(d => d.data());
      res.json(list);
    } catch (err: any) {
      console.error("GET /api/restaurants error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const updated = req.body;
      if (Array.isArray(updated)) {
        for (const r of updated) {
          if (r && r.id) {
            await setDoc(doc(db, "restaurants", r.id), r);
          }
        }
      } else if (updated && updated.id) {
        await setDoc(doc(db, "restaurants", updated.id), updated);
      }
      const qSnap = await getDocs(collection(db, "restaurants"));
      const list = qSnap.docs.map(d => d.data());
      res.json({ success: true, restaurants: list });
    } catch (err: any) {
      console.error("POST /api/restaurants error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/menus", async (req, res) => {
    try {
      const qSnap = await getDocs(collection(db, "menus"));
      const list = qSnap.docs.map(d => d.data());
      res.json(list);
    } catch (err: any) {
      console.error("GET /api/menus error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/menus", async (req, res) => {
    try {
      const updated = req.body;
      if (Array.isArray(updated)) {
        // Drop existing and overwrite completely
        const qSnap = await getDocs(collection(db, "menus"));
        for (const d of qSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (const m of updated) {
          if (m && m.id) {
            await setDoc(doc(db, "menus", m.id), m);
          }
        }
      } else if (updated && updated.id) {
        await setDoc(doc(db, "menus", updated.id), updated);
      }
      const qSnapNew = await getDocs(collection(db, "menus"));
      const list = qSnapNew.docs.map(d => d.data());
      res.json({ success: true, menus: list });
    } catch (err: any) {
      console.error("POST /api/menus error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const qSnap = await getDocs(collection(db, "orders"));
      const list = qSnap.docs.map(d => d.data());
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(list);
    } catch (err: any) {
      console.error("GET /api/orders error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const updated = req.body;
      if (Array.isArray(updated)) {
        const qSnap = await getDocs(collection(db, "orders"));
        for (const d of qSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (const o of updated) {
          if (o && o.id) {
            await setDoc(doc(db, "orders", o.id), o);
          }
        }
      } else if (updated && updated.id) {
        await setDoc(doc(db, "orders", updated.id), updated);
      }
      const qSnapNew = await getDocs(collection(db, "orders"));
      const list = qSnapNew.docs.map(d => d.data());
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ success: true, orders: list });
    } catch (err: any) {
      console.error("POST /api/orders error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const qSnap = await getDocs(collection(db, "users"));
      const list = qSnap.docs.map(d => d.data());
      res.json(list);
    } catch (err: any) {
      console.error("GET /api/users error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const updated = req.body;
      if (Array.isArray(updated)) {
        const qSnap = await getDocs(collection(db, "users"));
        for (const d of qSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (const u of updated) {
          if (u && u.phone) {
            await setDoc(doc(db, "users", u.phone), u);
          }
        }
      } else if (updated && updated.phone) {
        await setDoc(doc(db, "users", updated.phone), updated);
      }
      const qSnapNew = await getDocs(collection(db, "users"));
      const list = qSnapNew.docs.map(d => d.data());
      res.json({ success: true, users: list });
    } catch (err: any) {
      console.error("POST /api/users error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all active buzzer requests
  app.get("/api/buzzers", async (req, res) => {
    try {
      const qSnap = await getDocs(collection(db, "buzzers"));
      const list = qSnap.docs.map(d => d.data());
      res.json(list);
    } catch (err: any) {
      console.error("GET /api/buzzers error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Add/Update a buzzer request
  app.post("/api/buzzers", async (req, res) => {
    try {
      const bzr = req.body;
      if (bzr && bzr.id) {
        await setDoc(doc(db, "buzzers", bzr.id), bzr);
      }
      const qSnap = await getDocs(collection(db, "buzzers"));
      const list = qSnap.docs.map(d => d.data());
      res.json({ success: true, buzzers: list });
    } catch (err: any) {
      console.error("POST /api/buzzers error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Resolve or delete a buzzer request
  app.delete("/api/buzzers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        await deleteDoc(doc(db, "buzzers", id));
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("DELETE /api/buzzers error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/reset", async (req, res) => {
    try {
      const colls = ["restaurants", "menus", "orders", "users", "buzzers"];
      for (const collName of colls) {
        const qSnap = await getDocs(collection(db, collName));
        for (const d of qSnap.docs) {
          await deleteDoc(d.ref);
        }
      }
      for (const r of INITIAL_RESTAURANTS) {
        await setDoc(doc(db, "restaurants", r.id), r);
      }
      for (const m of INITIAL_MENUS) {
        await setDoc(doc(db, "menus", m.id), m);
      }
      for (const o of INITIAL_ORDERS) {
        await setDoc(doc(db, "orders", o.id), o);
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, "users", u.phone), u);
      }
      res.json({ success: true, message: "Firestore database tables reverted successfully to default states." });
    } catch (err: any) {
      console.error("POST /api/reset error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // === ANALYTICS API ENDPOINTS ===

  // --- Daily Summaries Aggregation ---
  // Called after order lifecycle changes to update daily rollups
  app.post("/api/analytics/aggregate-daily-summaries", async (req, res) => {
    try {
      const { restaurantId } = req.body;
      const today = new Date().toISOString().split('T')[0];
      let targetRestaurants: string[] = [];

      if (restaurantId) {
        targetRestaurants = [restaurantId];
      } else {
        const rSnap = await getDocs(collection(db, "restaurants"));
        targetRestaurants = rSnap.docs.map(d => d.id);
      }

      for (const rid of targetRestaurants) {
        const ordSnap = await getDocs(collection(db, "orders"));
        const orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }))
          .filter((o: any) => o.restaurantId === rid);

        const completedOrders = orders.filter((o: any) => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
        const totalDiscount = completedOrders.reduce((s: number, o: any) =>
          s + (o.items || []).reduce((si: number, it: any) => si + (it.promoValue || 0) * (it.quantity || 0), 0), 0);

        const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
        for (const o of orders) {
          for (const item of (o.items || [])) {
            if (!itemMap[item.menuId]) itemMap[item.menuId] = { name: item.name, quantity: 0, revenue: 0 };
            itemMap[item.menuId].quantity += item.quantity || 0;
            itemMap[item.menuId].revenue += (item.price || 0) * (item.quantity || 0);
          }
        }
        const topItems = Object.entries(itemMap)
          .map(([menuId, data]) => ({ menuId, ...data }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);

        const ordersByHour: Record<number, number> = {};
        for (const o of orders) {
          const h = new Date(o.createdAt).getHours();
          ordersByHour[h] = (ordersByHour[h] || 0) + 1;
        }

        const summary = {
          restaurantId: rid,
          date: today,
          totalRevenue,
          totalOrders: completedOrders.length,
          avgTicketSize: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
          totalDiscount,
          discountPercent: totalRevenue > 0 ? (totalDiscount / totalRevenue) * 100 : 0,
          topItems,
          laborCost: 0,
          ordersByHour,
          ordersByStatus: {
            pending: orders.filter((o: any) => o.status === 'pending').length,
            accepted: orders.filter((o: any) => o.status === 'accepted').length,
            completed: orders.filter((o: any) => o.status === 'completed').length,
            rejected: orders.filter((o: any) => o.status === 'rejected').length,
          },
          paymentBreakdown: { upi: 0, card: 0, cash: 0, wallet: 0 },
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "dailySummaries", `${rid}_${today}`), summary);
      }

      res.json({ success: true, message: `Aggregated ${targetRestaurants.length} restaurant(s) for ${today}` });
    } catch (err: any) {
      console.error("POST /api/analytics/aggregate-daily-summaries error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Daily Summaries Read (history range) ---
  app.get("/api/analytics/daily-summaries", async (req, res) => {
    try {
      const { restaurantId, startDate, endDate } = req.query;
      const qSnap = await getDocs(collection(db, "dailySummaries"));
      let summaries = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (restaurantId) summaries = summaries.filter((s: any) => s.restaurantId === restaurantId);
      if (startDate) summaries = summaries.filter((s: any) => s.date >= startDate);
      if (endDate) summaries = summaries.filter((s: any) => s.date <= endDate);

      summaries.sort((a: any, b: any) => a.date.localeCompare(b.date));
      res.json(summaries);
    } catch (err: any) {
      console.error("GET /api/analytics/daily-summaries error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 1: Sales Analytics ---
  app.get("/api/:restaurantId/analytics/sales", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const range = (req.query.range as string) || '7d';
      const ordSnap = await getDocs(collection(db, "orders"));
      let orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') orders = orders.filter((o: any) => o.restaurantId === restaurantId);

      // Date filtering
      const now = new Date();
      let rangeStart = new Date(now);
      if (range === '7d') rangeStart.setDate(now.getDate() - 7);
      else if (range === '30d') rangeStart.setDate(now.getDate() - 30);
      else if (range === '90d') rangeStart.setDate(now.getDate() - 90);
      else if (range === 'custom' && req.query.startDate) rangeStart = new Date(req.query.startDate as string);

      orders = orders.filter((o: any) => new Date(o.createdAt) >= rangeStart);

      const completed = orders.filter((o: any) => o.status !== 'rejected');
      const totalRevenue = completed.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const totalDiscount = completed.reduce((s: number, o: any) =>
        s + (o.items || []).reduce((si: number, it: any) => si + (it.promoValue || 0) * (it.quantity || 0), 0), 0);

      // Daily breakdown
      const dailyMap: Record<string, { revenue: number; orders: number; discount: number }> = {};
      for (const o of completed) {
        const d = new Date(o.createdAt).toISOString().split('T')[0];
        if (!dailyMap[d]) dailyMap[d] = { revenue: 0, orders: 0, discount: 0 };
        dailyMap[d].revenue += o.totalAmount || 0;
        dailyMap[d].orders += 1;
        dailyMap[d].discount += (o.items || []).reduce((s: number, it: any) => s + (it.promoValue || 0) * (it.quantity || 0), 0);
      }

      // Hour × Weekday heatmap
      const heatmap: Record<string, number> = {};
      for (const o of completed) {
        const dt = new Date(o.createdAt);
        const key = `${dt.getDay()}_${dt.getHours()}`;
        heatmap[key] = (heatmap[key] || 0) + o.totalAmount;
      }

      // Day of week
      const dow: Record<string, { revenue: number; orders: number }> = {};
      for (const o of completed) {
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(o.createdAt).getDay()];
        if (!dow[day]) dow[day] = { revenue: 0, orders: 0 };
        dow[day].revenue += o.totalAmount || 0;
        dow[day].orders += 1;
      }

      // Top items
      const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
      for (const o of orders) {
        for (const item of (o.items || [])) {
          if (!itemMap[item.menuId]) itemMap[item.menuId] = { name: item.name, quantity: 0, revenue: 0 };
          itemMap[item.menuId].quantity += item.quantity || 0;
          itemMap[item.menuId].revenue += (item.price || 0) * (item.quantity || 0);
        }
      }
      const topItems = Object.entries(itemMap).map(([menuId, d]) => ({ menuId, ...d }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      res.json({
        totalRevenue,
        totalOrders: completed.length,
        avgOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        totalDiscount,
        discountPercent: totalRevenue > 0 ? (totalDiscount / totalRevenue) * 100 : 0,
        dailySales: Object.entries(dailyMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
        heatmap: Object.entries(heatmap).map(([key, value]) => ({ key, value })),
        dayOfWeek: Object.entries(dow).map(([day, data]) => ({ day, ...data })),
        topItems,
        hourlyOrders: (() => {
          const h: Record<number, number> = {};
          for (const o of completed) {
            const hour = new Date(o.createdAt).getHours();
            h[hour] = (h[hour] || 0) + 1;
          }
          return Object.entries(h).map(([hour, count]) => ({ hour: parseInt(hour), count })).sort((a, b) => a.hour - b.hour);
        })(),
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/sales error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 2: Menu Analytics ---
  app.get("/api/:restaurantId/analytics/menu", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const [ordSnap, menuSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "menus")),
      ]);
      let orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') orders = orders.filter((o: any) => o.restaurantId === restaurantId);
      const menus = menuSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => restaurantId === 'all' || m.restaurantId === restaurantId);

      // Per-item aggregation
      const itemData: Record<string, { name: string; category: string; quantity: number; revenue: number; discount: number; orders: number; price: number; isVeg?: boolean; isLimitedTimeOffer: boolean; ratingsCount?: number; avgRating?: number }> = {};
      for (const m of menus) {
        const mi = m as any;
        itemData[mi.id] = { name: mi.name, category: mi.category, quantity: 0, revenue: 0, discount: 0, orders: 0, price: mi.price || 0, isVeg: mi.isVeg, isLimitedTimeOffer: mi.isLimitedTimeOffer || false, ratingsCount: mi.ratingsCount, avgRating: mi.avgRating };
      }
      for (const o of orders) {
        for (const item of (o.items || [])) {
          if (!itemData[item.menuId]) continue;
          itemData[item.menuId].quantity += item.quantity || 0;
          itemData[item.menuId].revenue += (item.price || 0) * (item.quantity || 0);
          itemData[item.menuId].discount += (item.promoValue || 0) * (item.quantity || 0);
          itemData[item.menuId].orders += 1;
        }
      }

      const items = Object.entries(itemData).map(([menuId, d]) => ({ menuId, ...d }));
      const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
      const avgPrice = items.length > 0 ? items.reduce((s, i) => s + i.price, 0) / items.length : 0;

      // Menu engineering matrix
      const categorize = (item: typeof items[0]) => {
        const margin = item.price - (item.price * 0.35); // foodCost estimated at 35%
        const highMargin = margin > avgPrice * 0.4;
        const highOrders = item.orders > items.reduce((s, i) => s + i.orders, 0) / Math.max(items.length, 1);
        if (highMargin && highOrders) return 'star';
        if (!highMargin && highOrders) return 'plowhorse';
        if (highMargin && !highOrders) return 'puzzle';
        return 'dog';
      };

      const matrix = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 };
      for (const item of items) {
        matrix[categorize(item) as keyof typeof matrix]++;
      }

      res.json({
        items: items.sort((a, b) => b.revenue - a.revenue),
        totalItems: items.length,
        totalRevenue,
        matrix,
        matrixPercent: {
          star: items.length > 0 ? (matrix.star / items.length) * 100 : 0,
          dog: items.length > 0 ? (matrix.dog / items.length) * 100 : 0,
        },
        seasonalRevenue: items.filter(i => i.isLimitedTimeOffer).reduce((s, i) => s + i.revenue, 0),
        permanentRevenue: items.filter(i => !i.isLimitedTimeOffer).reduce((s, i) => s + i.revenue, 0),
        avgRating: items.reduce((s, i) => s + (i.avgRating || 0), 0) / Math.max(items.filter(i => i.avgRating).length, 1),
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/menu error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 3: Labor Analytics ---
  app.get("/api/:restaurantId/analytics/labor", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const range = (req.query.range as string) || '7d';

      // Read shifts + orders
      const [shiftSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, "staffShifts")),
        getDocs(collection(db, "orders")),
      ]);
      let shifts = shiftSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      let orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') {
        shifts = shifts.filter((s: any) => s.restaurantId === restaurantId);
        orders = orders.filter((o: any) => o.restaurantId === restaurantId);
      }

      const now = new Date();
      let rangeStart = new Date(now);
      if (range === '7d') rangeStart.setDate(now.getDate() - 7);
      else if (range === '30d') rangeStart.setDate(now.getDate() - 30);
      else if (range === '90d') rangeStart.setDate(now.getDate() - 90);
      shifts = shifts.filter((s: any) => new Date(s.shiftStart) >= rangeStart);
      orders = orders.filter((o: any) => new Date(o.createdAt) >= rangeStart);

      const completedOrders = orders.filter((o: any) => o.status !== 'rejected');
      const totalRevenue = completedOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const totalHours = shifts.reduce((s: number, sh: any) => s + (sh.totalHours || 0), 0);
      const totalWages = shifts.reduce((s: number, sh: any) => s + ((sh.totalHours || 0) * (sh.hourlyRate || 0)), 0);
      const salesPerLaborHour = totalHours > 0 ? totalRevenue / totalHours : 0;
      const laborCostPercent = totalRevenue > 0 ? (totalWages / totalRevenue) * 100 : 0;

      // Shift slot performance
      const slotMap: Record<string, { revenue: number; orders: number; hours: number }> = {};
      const getSlot = (h: number) => h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      for (const o of completedOrders) {
        const slot = getSlot(new Date(o.createdAt).getHours());
        if (!slotMap[slot]) slotMap[slot] = { revenue: 0, orders: 0, hours: 0 };
        slotMap[slot].revenue += o.totalAmount || 0;
        slotMap[slot].orders += 1;
      }
      for (const sh of shifts) {
        const slot = getSlot(new Date(sh.shiftStart).getHours());
        if (!slotMap[slot]) slotMap[slot] = { revenue: 0, orders: 0, hours: 0 };
        slotMap[slot].hours += sh.totalHours || 0;
      }

      res.json({
        totalHours,
        totalWages,
        totalRevenue,
        salesPerLaborHour,
        laborCostPercent,
        ordersHandled: completedOrders.length,
        ordersPerStaffHour: totalHours > 0 ? completedOrders.length / totalHours : 0,
        shiftCount: shifts.length,
        shifts,
        slotPerformance: Object.entries(slotMap).map(([slot, data]) => ({ slot, ...data })),
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/labor error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 4: Inventory Analytics ---
  app.get("/api/:restaurantId/analytics/inventory", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const [invSnap, wasteSnap, recipeSnap] = await Promise.all([
        getDocs(collection(db, "inventory")),
        getDocs(collection(db, "wasteLogs")),
        getDocs(collection(db, "recipes")),
      ]);
      let inventory = invSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      let wasteLogs = wasteSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      let recipes = recipeSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') {
        inventory = inventory.filter((i: any) => i.restaurantId === restaurantId);
        wasteLogs = wasteLogs.filter((w: any) => w.restaurantId === restaurantId);
        recipes = recipes.filter((r: any) => r.restaurantId === restaurantId);
      }

      const totalWasteCost = wasteLogs.reduce((s: number, w: any) => s + (w.cost || 0), 0);
      const totalInventoryValue = inventory.reduce((s: number, i: any) => s + ((i.currentStock || 0) * (i.costPerUnit || 0)), 0);
      const lowStockItems = inventory.filter((i: any) => (i.currentStock || 0) <= (i.parLevel || 0));

      res.json({
        inventory: inventory.sort((a: any, b: any) => ((a.currentStock || 0) / Math.max(a.parLevel || 1, 1)) - ((b.currentStock || 0) / Math.max(b.parLevel || 1, 1))),
        totalItems: inventory.length,
        totalInventoryValue,
        lowStockItems: lowStockItems.length,
        lowStockList: lowStockItems,
        totalWasteCost,
        wasteLogs: wasteLogs.sort((a: any, b: any) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).slice(0, 50),
        recipes,
        spoilagePercent: totalInventoryValue > 0 ? (totalWasteCost / totalInventoryValue) * 100 : 0,
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/inventory error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 5: Customer Analytics ---
  app.get("/api/:restaurantId/analytics/customers", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const range = (req.query.range as string) || '30d';
      const [custSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, "customers")),
        getDocs(collection(db, "orders")),
      ]);
      let customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      let orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') {
        customers = customers.filter((c: any) => c.restaurantId === restaurantId);
        orders = orders.filter((o: any) => o.restaurantId === restaurantId);
      }

      const now = new Date();
      let rangeStart = new Date(now);
      if (range === '7d') rangeStart.setDate(now.getDate() - 7);
      else if (range === '30d') rangeStart.setDate(now.getDate() - 30);
      else if (range === '90d') rangeStart.setDate(now.getDate() - 90);

      const recentCustomers = customers.filter((c: any) => new Date(c.lastVisit) >= rangeStart);

      // Visit frequency
      const freqDist = { '1x': 0, '2-3x': 0, '4-6x': 0, '7x+': 0 };
      for (const c of recentCustomers) {
        if (c.visitCount === 1) freqDist['1x']++;
        else if (c.visitCount <= 3) freqDist['2-3x']++;
        else if (c.visitCount <= 6) freqDist['4-6x']++;
        else freqDist['7x+']++;
      }

      const newCustomers = recentCustomers.filter((c: any) => c.visitCount === 1).length;
      const returningCustomers = recentCustomers.length - newCustomers;
      const aov = orders.filter((o: any) => o.status !== 'rejected').reduce((s: number, o: any) => s + (o.totalAmount || 0), 0) /
        Math.max(orders.filter((o: any) => o.status !== 'rejected').length, 1);

      res.json({
        totalCustomers: customers.length,
        recentCustomers: recentCustomers.length,
        newCustomers,
        returningCustomers,
        repeatRate: recentCustomers.length > 0 ? (returningCustomers / recentCustomers.length) * 100 : 0,
        avgOrderValue: aov,
        visitFrequency: freqDist,
        churnCandidates: recentCustomers.filter((c: any) => {
          const daysSinceLastVisit = (now.getTime() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
          return c.visitCount >= 2 && daysSinceLastVisit >= 45;
        }).length,
        estimatedCLV: aov * 3.5 * 6, // AOV × avg freq × retention months (rough estimate)
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/customers error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 6: Feedback Analytics ---
  app.get("/api/:restaurantId/analytics/feedback", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const range = (req.query.range as string) || '30d';
      const fbSnap = await getDocs(collection(db, "feedbackResponses"));
      let feedback = fbSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') feedback = feedback.filter((f: any) => f.restaurantId === restaurantId);

      const now = new Date();
      let rangeStart = new Date(now);
      if (range === '7d') rangeStart.setDate(now.getDate() - 7);
      else if (range === '30d') rangeStart.setDate(now.getDate() - 30);
      else if (range === '90d') rangeStart.setDate(now.getDate() - 90);
      feedback = feedback.filter((f: any) => new Date(f.createdAt) >= rangeStart);

      const avgRating = feedback.length > 0
        ? feedback.reduce((s: number, f: any) => s + (f.rating || 0), 0) / feedback.length
        : 0;
      const sentimentBreakdown = {
        positive: feedback.filter((f: any) => f.sentimentLabel === 'positive').length,
        neutral: feedback.filter((f: any) => f.sentimentLabel === 'neutral').length,
        negative: feedback.filter((f: any) => f.sentimentLabel === 'negative').length,
      };

      // Theme breakdown
      const themeMap: Record<string, number> = {};
      for (const f of feedback) {
        for (const tag of (f.themeTags || [])) {
          themeMap[tag] = (themeMap[tag] || 0) + 1;
        }
      }

      res.json({
        total: feedback.length,
        avgRating,
        sentimentBreakdown,
        themeBreakdown: Object.entries(themeMap).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count),
        actionableCount: feedback.filter((f: any) => f.actionable).length,
        recentFeedback: feedback.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20),
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/feedback error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- MODULE 7: Operational Analytics ---
  app.get("/api/:restaurantId/analytics/operations", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const [ordSnap, kdsSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "kdsEvents")),
      ]);
      let orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      let kdsEvents = kdsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      if (restaurantId !== 'all') {
        orders = orders.filter((o: any) => o.restaurantId === restaurantId);
        kdsEvents = kdsEvents.filter((e: any) => e.restaurantId === restaurantId);
      }

      const completed = orders.filter((o: any) => o.status === 'completed');
      const avgTicketTimeMinutes = completed.length > 0
        ? completed.reduce((s: number, o: any) => {
            const created = new Date(o.createdAt).getTime();
            const now = Date.now();
            return s + (now - created) / (1000 * 60);
          }, 0) / completed.length
        : 0;

      // Ticket time estimate from KDS events
      let avgKdsTicketTime = 0;
      let kdsCount = 0;
      for (const o of orders) {
        const orderEvents = kdsEvents.filter((e: any) => e.orderId === o.id);
        const received = orderEvents.find((e: any) => e.eventType === 'received');
        const sent = orderEvents.find((e: any) => e.eventType === 'sent');
        if (received && sent) {
          avgKdsTicketTime += (new Date(sent.timestamp).getTime() - new Date(received.timestamp).getTime()) / (1000 * 60);
          kdsCount++;
        }
      }
      if (kdsCount > 0) avgKdsTicketTime /= kdsCount;

      // Peak vs off-peak
      const peakOrders = orders.filter((o: any) => {
        const h = new Date(o.createdAt).getHours();
        return h >= 12 && h <= 14 || h >= 19 && h <= 21;
      });
      const offPeakOrders = orders.filter((o: any) => {
        const h = new Date(o.createdAt).getHours();
        return !(h >= 12 && h <= 14 || h >= 19 && h <= 21);
      });

      res.json({
        totalOrders: orders.length,
        completedOrders: completed.length,
        avgTicketTimeMinutes,
        avgKdsTicketTimeMinutes: avgKdsTicketTime,
        peakOrdersPerHour: peakOrders.length > 0 ? peakOrders.length / 6 : 0, // ~6 peak hours/day
        offPeakOrdersPerHour: offPeakOrders.length > 0 ? offPeakOrders.length / 12 : 0,
        discountRate: orders.filter((o: any) => (o.items || []).some((i: any) => (i.promoValue || 0) > 0)).length / Math.max(orders.length, 1),
        multiOutlet: false, // placeholder - true when multiple restaurants selected
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/operations error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Unit Economics Scorecard ---
  app.get("/api/:restaurantId/analytics/scorecard", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const [salesRes, menuRes, laborRes, opsRes] = await Promise.all([
        fetch(`${req.protocol}://${req.get('host')}/api/${restaurantId}/analytics/sales?range=30d`).then(r => r.json()),
        fetch(`${req.protocol}://${req.get('host')}/api/${restaurantId}/analytics/menu`).then(r => r.json()),
        fetch(`${req.protocol}://${req.get('host')}/api/${restaurantId}/analytics/labor?range=30d`).then(r => r.json()),
        fetch(`${req.protocol}://${req.get('host')}/api/${restaurantId}/analytics/operations`).then(r => r.json()),
      ]);

      const scorecard = {
        revenuePerLaborHour: { value: laborRes.salesPerLaborHour || 0, target: 1000, unit: '₹', green: (laborRes.salesPerLaborHour || 0) >= 800 },
        laborCostPercent: { value: laborRes.laborCostPercent || 0, target: 22, unit: '%', green: (laborRes.laborCostPercent || 0) <= 25 },
        avgTicketTime: { value: opsRes.avgTicketTimeMinutes || 0, target: 20, unit: 'min', green: (opsRes.avgTicketTimeMinutes || 0) <= 25 },
        avgOrderValue: { value: salesRes.avgOrderValue || 0, target: 500, unit: '₹', green: (salesRes.avgOrderValue || 0) >= 400 },
        discountRate: { value: (salesRes.discountPercent || 0), target: 10, unit: '%', green: (salesRes.discountPercent || 0) <= 10 },
        menuStarsPercent: { value: menuRes.matrixPercent?.star || 0, target: 40, unit: '%', green: (menuRes.matrixPercent?.star || 0) >= 40 },
        menuDogsPercent: { value: menuRes.matrixPercent?.dog || 0, target: 15, unit: '%', green: (menuRes.matrixPercent?.dog || 0) <= 15 },
        customerSatisfaction: { value: menuRes.avgRating || 0, target: 4.0, unit: '★', green: (menuRes.avgRating || 0) >= 3.5 },
      };

      const greenCount = Object.values(scorecard).filter((s: any) => s.green).length;
      const totalMetrics = Object.keys(scorecard).length;

      res.json({
        scorecard,
        greenCount,
        totalMetrics,
        passThreshold: greenCount >= 6,
        allGreen: greenCount === totalMetrics,
        scorePercent: (greenCount / totalMetrics) * 100,
        recommendation: greenCount >= 6
          ? 'Ready for expansion — consistent green across 6+ metrics for 8 weeks'
          : `${8 - greenCount} metric(s) below target — address before next outlet`,
      });
    } catch (err: any) {
      console.error(`GET /api/${req.params.restaurantId}/analytics/scorecard error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- SuperAdmin: Cross-tenant Platform Analytics ---
  app.get("/api/superadmin/analytics/platform", async (req, res) => {
    try {
      const [rSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, "restaurants")),
        getDocs(collection(db, "orders")),
      ]);
      const restaurants = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allOrders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      const revenue = allOrders.filter((o: any) => o.status !== 'rejected').reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const avgOrderValue = allOrders.filter((o: any) => o.status !== 'rejected').length > 0
        ? revenue / allOrders.filter((o: any) => o.status !== 'rejected').length : 0;

      const perRestaurant = restaurants.map((r: any) => {
        const rOrders = allOrders.filter((o: any) => o.restaurantId === r.id);
        const completed = rOrders.filter((o: any) => o.status === 'completed');
        return {
          id: r.id,
          name: r.name,
          totalOrders: rOrders.length,
          completedOrders: completed.length,
          revenue: completed.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
          avgOrderValue: completed.length > 0
            ? completed.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0) / completed.length : 0,
          status: r.status,
        };
      });

      res.json({
        totalRestaurants: restaurants.length,
        activeRestaurants: restaurants.filter((r: any) => r.status === 'active').length,
        totalOrders: allOrders.length,
        totalRevenue: revenue,
        avgOrderValue,
        perRestaurant: perRestaurant.sort((a: any, b: any) => b.revenue - a.revenue),
      });
    } catch (err: any) {
      console.error("GET /api/superadmin/analytics/platform error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Write: Post Feedback ---
  app.post("/api/:restaurantId/feedback", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const { orderId, rating, comment } = req.body;
      if (!orderId || !rating) {
        return res.status(400).json({ error: "orderId and rating are required" });
      }
      const id = `fb_${restaurantId}_${orderId}_${Date.now()}`;
      const feedback = {
        id,
        orderId,
        restaurantId,
        rating,
        comment: comment || '',
        sentimentLabel: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
        themeTags: [] as string[],
        actionable: rating <= 2,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "feedbackResponses", id), feedback);
      res.json({ success: true, id });
    } catch (err: any) {
      console.error(`POST /api/${req.params.restaurantId}/feedback error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Write: Post Waste Log ---
  app.post("/api/:restaurantId/waste-log", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const log = {
        id: `waste_${restaurantId}_${Date.now()}`,
        restaurantId,
        ...req.body,
        loggedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "wasteLogs", log.id), log);
      res.json({ success: true, id: log.id });
    } catch (err: any) {
      console.error(`POST /api/${req.params.restaurantId}/waste-log error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // === DEEPSEEK AI SECURE BACKEND CONTROLLER ===

  app.post("/api/gemini/chat", async (req, res) => {
    const { userPrompt, systemInstruction } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: "userPrompt parameter is required." });
    }

    try {
      const key = process.env.DEEPSEEK_API_KEY;
      if (!key) {
        return res.json({
          text: `[Offline Maitre D' AI Assistant]: Namaste! I am running in local safe-mode. Based on our delicious menu, I highly recommend our Chef's legendary Murgh Makhani (Butter Chicken) (₹380.00) paired with sweet, chilled Alphonso Mango Lassi (₹120.00)! Or for vegetarian diners, the Ghee Roast Dosa with fresh coconut chutney is an absolute must. May I add any of these to your basket?`
        });
      }

      const result = await callDeepSeek(userPrompt, systemInstruction || "You are a professional hospitality digital dining guide.");
      res.json({ text: result });
    } catch (err: any) {
      console.error("DeepSeek AI API Error in server.ts:", err);
      res.json({
        text: `[Dining AI Assistant Error]: Sorry! I couldn't reach the celestial servers. The current menu consists of standard artisan entrees. How can I assist you manually?`
      });
    }
  });

  app.post("/api/gemini/report", async (req, res) => {
    const { userPrompt, systemInstruction } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: "userPrompt is required." });
    }

    try {
      const key = process.env.DEEPSEEK_API_KEY;
      if (!key) {
        return res.json({
          text: `### 🇮🇳 Strategic Restaurant Performance Report
- **UPI Digital Checkout Traction**: Push instant QR-code tab settlement to minimize billing queues during peak rush hours.
- **Combo Upgrades**: Combine Mains like *Paneer Lababdar* or *Butter Chicken* with premium drinks like *Alphonso Mango Lassi* to lift average order value by 18%.
- **Kitchen Hot-Station SLAs**: Optimize clay-tandoor and dosa-tava dispatch lines to complete dining tickets under 8 minutes, maintaining crispness and steam.`
        });
      }

      const result = await callDeepSeek(userPrompt, systemInstruction || "You are an elite Michelin-star restaurant consultant generating detailed business performance reports in markdown.");
      res.json({ text: result });
    } catch (err: any) {
      console.error("DeepSeek AI report error in server.ts:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // === VITE OR PRODUCTION MIDDLEWARE ASSET SERVING ===

  if (process.env.DISABLE_HMR === 'true') {
    process.env.DISABLE_HMR = 'true'; // Keep tracking HMR config status
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Server actively running in container on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Fatal failure on Node start server:", err);
});
