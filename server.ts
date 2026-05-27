import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
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
    totalTables: 8
  },
  {
    id: "rest-2",
    name: "Dakshin Delights",
    logoUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 10
  },
  {
    id: "rest-3",
    name: "Chaat Chowk & Co.",
    logoUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=200&auto=format&fit=crop&q=80",
    status: "active" as const,
    lockedBySuperAdmin: false,
    totalTables: 6
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
  { id: "menu-10", restaurantId: "rest-3", name: "Classic Vada Pav (Double)", description: "Two legendary potato dumplings fried perfectly and placed inside street-pushed buns with hot garlic masala.", price: 120, category: "Mains", isAvailable: true, isLimitedTimeOffer: true, offerDetails: "Save ₹20 On Street Special", promoValue: 20, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-11", restaurantId: "rest-3", name: "Dahi Puri Bomb Platter", description: "Crisp puffed puris stuffed with potato-chickpea crumble, topped with sweet yogurt and tangy tamarind-mint purees.", price: 140, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-12", restaurantId: "rest-3", name: "Sizzling Paneer Tikka Samosa", description: "Triangular crispy crust loaded with mashed spiced potatoes, green peas, paneer-tikka cubes.", price: 90, category: "Starters", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-13", restaurantId: "rest-3", name: "Cutting Masala Chai (Pitcher)", description: "A hot, comforting, highly frothed milky tea brewed with fresh crushed ginger and green cardamom.", price: 80, category: "Drinks", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400&auto=format&fit=crop&q=80" },
  { id: "menu-14", restaurantId: "rest-3", name: "Delhi Raj Kachori Supreme", description: "Royal crisp golden dome stuffed with pulses, yogurt, chutneys, sprouts, and colorful pomegranate seed cascades.", price: 160, category: "Mains", isAvailable: true, isLimitedTimeOffer: false, offerDetails: "", promoValue: 0, isVeg: true, imageUrl: "https://images.unsplash.com/photo-1546833959-52319ef16fb7?w=400&auto=format&fit=crop&q=80" }
];

const INITIAL_ORDERS = [
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
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    totalAmount: 840
  },
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
    createdAt: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    totalAmount: 675
  },
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
    createdAt: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    totalAmount: 420
  },
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
    createdAt: new Date(Date.now() - 720 * 60 * 1000).toISOString(),
    totalAmount: 646
  },
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
    createdAt: new Date(Date.now() - 900 * 60 * 1000).toISOString(),
    totalAmount: 530
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
    createdAt: new Date(Date.now() - 1080 * 60 * 1000).toISOString(),
    totalAmount: 500
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
    createdAt: new Date(Date.now() - 1260 * 60 * 1000).toISOString(),
    totalAmount: 650
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
    status: "accepted" as const,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    totalAmount: 520
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
  { phone: "+919999000111", name: "Aditya Roy", globalOrderHistory: ["ord-214"] }
];

// Seeding engine
async function seedDatabaseIfEmpty() {
  try {
    const qSnap = await getDocs(collection(db, "restaurants"));
    const oSnap = await getDocs(collection(db, "orders"));
    
    // Check if empty, or old 'ord-101' exists, or our mandatory new 'ord-214' order is missing
    let needsUpgrade = qSnap.empty;
    if (!needsUpgrade) {
      const ids = oSnap.docs.map(doc => doc.id);
      if (ids.includes("ord-101") || !ids.includes("ord-214")) {
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

// Lazy GoogleGenAI client initialisation
let googleAiClient: GoogleGenAI | null = null;
function getGoogleAi(): GoogleGenAI {
  if (!googleAiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI functions will run with mock outputs.");
    }
    googleAiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return googleAiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // === GEMINI AI SECURE BACKEND CONTROLLER ===

  app.post("/api/gemini/chat", async (req, res) => {
    const { userPrompt, systemInstruction } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: "userPrompt parameter is required." });
    }

    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        // Fallback mockup responses if API key is missing to keep preview functioning safely
        return res.json({
          text: `[Offline Maitre D' AI Assistant]: Namaste! I am running in local safe-mode. Based on our delicious menu, I highly recommend our Chef's legendary Murgh Makhani (Butter Chicken) (₹380.00) paired with sweet, chilled Alphonso Mango Lassi (₹120.00)! Or for vegetarian diners, the Ghee Roast Dosa with fresh coconut chutney is an absolute must. May I add any of these to your basket?`
        });
      }

      const client = getGoogleAi();
      const aiResponse = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction || "You are a professional hospitality digital dining guide."
        }
      });

      res.json({ text: aiResponse.text || "" });
    } catch (err: any) {
      console.error("Gemini AI API Error in server.ts:", err);
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
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.json({
          text: `### 🇮🇳 Strategic Restaurant Performance Report
- **UPI Digital Checkout Traction**: Push instant QR-code tab settlement to minimize billing queues during peak rush hours.
- **Combo Upgrades**: Combine Mains like *Paneer Lababdar* or *Butter Chicken* with premium drinks like *Alphonso Mango Lassi* to lift average order value by 18%.
- **Kitchen Hot-Station SLAs**: Optimize clay-tandoor and dosa-tava dispatch lines to complete dining tickets under 8 minutes, maintaining crispness and steam.`
        });
      }

      const client = getGoogleAi();
      const aiResponse = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction || "You are an elite Michelin-star restaurant consultant."
        }
      });

      res.json({ text: aiResponse.text || "" });
    } catch (err: any) {
      console.error("Gemini AI report error in server.ts:", err);
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
