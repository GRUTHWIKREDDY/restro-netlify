/**
 * Analytics Seed Script
 * 
 * Generates 90 days of realistic Indian restaurant data for 3 outlets.
 * Run: npx tsx seed-analytics.ts
 * 
 * Creates orders with realistic lunch/dinner rush patterns, discounts,
 * and generates dailySummaries for historical analytics.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const fApp = initializeApp(firebaseConfig);
const db = getFirestore(fApp, (firebaseConfig as any).firestoreDatabaseId);

// Menu items by restaurant
const MENU_ITEMS: Record<string, { id: string; name: string; price: number; category: string; isVeg: boolean }[]> = {
  'rest-1': [
    { id: 'menu-1', name: 'Murgh Makhani (Butter Chicken)', price: 380, category: 'Mains', isVeg: false },
    { id: 'menu-2', name: 'Paneer Lababdar & Butter Kulcha', price: 290, category: 'Mains', isVeg: true },
    { id: 'menu-3', name: 'Tandoori Soya Chaap Tikka', price: 220, category: 'Starters', isVeg: true },
    { id: 'menu-4', name: 'Gulab Jamun with Rabri', price: 140, category: 'Desserts', isVeg: true },
    { id: 'menu-5', name: 'Alphonso Mango Lassi', price: 120, category: 'Drinks', isVeg: true },
    { id: 'menu-1a', name: 'Awadhi Dum Biryani (Chicken)', price: 360, category: 'Mains', isVeg: false },
    { id: 'menu-1b', name: 'Dal Makhani & Garlic Naan Set', price: 270, category: 'Mains', isVeg: true },
  ],
  'rest-2': [
    { id: 'menu-6', name: 'Ghee Masala Roast Dosa', price: 165, category: 'Mains', isVeg: true },
    { id: 'menu-7', name: 'Steamed Idli & Vada Combo', price: 115, category: 'Mains', isVeg: true },
    { id: 'menu-8', name: 'Crispy Curry Leaf Chicken fry', price: 245, category: 'Starters', isVeg: false },
    { id: 'menu-9', name: 'Filter Degree Coffee', price: 60, category: 'Drinks', isVeg: true },
    { id: 'menu-2a', name: 'Madras Fish Curry', price: 310, category: 'Mains', isVeg: false },
    { id: 'menu-2b', name: 'Rava Kesari (Pineapple Halwa)', price: 110, category: 'Desserts', isVeg: true },
  ],
  'rest-3': [
    { id: 'menu-10', name: 'Classic Vada Pav (Double)', price: 120, category: 'Mains', isVeg: true },
    { id: 'menu-11', name: 'Dahi Puri Bomb Platter', price: 140, category: 'Starters', isVeg: true },
    { id: 'menu-12', name: 'Sizzling Paneer Tikka Samosa', price: 90, category: 'Starters', isVeg: true },
    { id: 'menu-13', name: 'Cutting Masala Chai (Pitcher)', price: 80, category: 'Drinks', isVeg: true },
    { id: 'menu-14', name: 'Delhi Raj Kachori Supreme', price: 160, category: 'Mains', isVeg: true },
  ],
};

const USER_NAMES = [
  'Aarav Sharma', 'Vivaan Singh', 'Aditya Patel', 'Vihaan Kumar',
  'Arjun Reddy', 'Sai Gupta', 'Dhruv Nair', 'Ananya Iyer',
  'Diya Malhotra', 'Isha Joshi', 'Kavya Rao', 'Myra Kapoor',
  'Neha Verma', 'Priya Chauhan', 'Riya Saxena', 'Sara Mehra',
  'Anaya Bhat', 'Aanya Gill', 'Ishita Lal', 'Tanvi Desai',
];
const PHONES = [
  '+919876543210', '+919987654321', '+919812345678', '+919976543210',
  '+919887654321', '+919765432109', '+919654321098', '+919543210987',
  '+919432109876', '+919321098765', '+919210987654', '+919109876543',
  '+919998877665', '+919887766554', '+919776655443', '+919665544332',
  '+919554433221', '+919443322110', '+919332211009', '+919221100998',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getLunchHour(): number {
  // 11:30 AM to 2:30 PM — peak at 12:30-1:30
  const dist = Math.random();
  if (dist < 0.15) return randomInt(11, 12);   // early
  if (dist < 0.70) return randomInt(12, 14);   // peak
  return randomInt(14, 15);                     // late
}

function getDinnerHour(): number {
  // 6:30 PM to 10:00 PM — peak at 7:30-8:30
  const dist = Math.random();
  if (dist < 0.15) return randomInt(18, 19);
  if (dist < 0.70) return randomInt(19, 21);
  return randomInt(21, 22);
}

function getRandomMinute(): number {
  return randomInt(0, 59);
}

async function clearCollections() {
  for (const coll of ['orders', 'dailySummaries', 'feedbackResponses', 'customers', 'staffShifts']) {
    const snap = await getDocs(collection(db, coll));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    console.log(`Cleared ${coll}`);
  }
}

async function seed() {
  console.log('Starting analytics seed...');
  await clearCollections();

  const now = new Date();
  let totalOrders = 0;
  let customerMap: Record<string, { phone: string; name: string; visits: number; spend: number; firstVisit: Date; lastVisit: Date }> = {};

  for (let dayOffset = 90; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay();

    // Weekend boost (Fri-Sat: 1.3x, Sun: 0.8x)
    let dayMultiplier = 1.0;
    if (dayOfWeek === 5 || dayOfWeek === 6) dayMultiplier = 1.3;
    if (dayOfWeek === 0) dayMultiplier = 0.8;

    for (const [restaurantId, menuItems] of Object.entries(MENU_ITEMS)) {
      // Lunch + dinner rushes
      const lunchOrders = randomInt(Math.floor(5 * dayMultiplier), Math.floor(15 * dayMultiplier));
      const dinnerOrders = randomInt(Math.floor(8 * dayMultiplier), Math.floor(20 * dayMultiplier));
      const ordersToday = lunchOrders + dinnerOrders;

      const dayOrders: any[] = [];

      // Generate lunch orders
      for (let i = 0; i < lunchOrders; i++) {
        const hour = getLunchHour();
        const minute = getRandomMinute();
        const orderDate = new Date(date);
        orderDate.setHours(hour, minute, randomInt(0, 59));
        const createdAt = orderDate.toISOString();

        const numItems = randomInt(1, 4);
        const selectedItems = menuItems.sort(() => Math.random() - 0.5).slice(0, numItems);
        
        const items = selectedItems.map(m => {
          const qty = randomInt(1, 3);
          const hasPromo = Math.random() < 0.2; // 20% promo rate
          return {
            menuId: m.id,
            name: m.name,
            quantity: qty,
            price: m.price,
            promoValue: hasPromo ? Math.round(m.price * randomFloat(0.05, 0.15)) : 0,
          };
        });

        const totalAmount = items.reduce((s, it) => s + (it.price * it.quantity) - (it.promoValue * it.quantity), 0);
        const userName = pickRandom(USER_NAMES);
        const phone = pickRandom(PHONES);

        // Track customers
        if (!customerMap[phone]) {
          customerMap[phone] = { phone, name: userName, visits: 0, spend: 0, firstVisit: date, lastVisit: date };
        }
        customerMap[phone].visits++;
        customerMap[phone].spend += totalAmount;
        if (date > customerMap[phone].lastVisit) customerMap[phone].lastVisit = date;

        const status = Math.random() < 0.85 ? 'completed' : Math.random() < 0.5 ? 'pending' : 'rejected';

        dayOrders.push({
          id: `ord_seed_${restaurantId}_${dateStr}_${i}`,
          restaurantId,
          tableNumber: randomInt(1, 10),
          userPhone: phone,
          userName,
          items,
          status,
          createdAt,
          totalAmount,
          released: status === 'completed',
        });
      }

      // Generate dinner orders
      for (let i = 0; i < dinnerOrders; i++) {
        const hour = getDinnerHour();
        const minute = getRandomMinute();
        const orderDate = new Date(date);
        orderDate.setHours(hour, minute, randomInt(0, 59));
        const createdAt = orderDate.toISOString();

        const numItems = randomInt(1, 5);
        const selectedItems = menuItems.sort(() => Math.random() - 0.5).slice(0, numItems);

        const items = selectedItems.map(m => {
          const qty = randomInt(1, 3);
          const hasPromo = Math.random() < 0.25;
          return {
            menuId: m.id,
            name: m.name,
            quantity: qty,
            price: m.price,
            promoValue: hasPromo ? Math.round(m.price * randomFloat(0.05, 0.15)) : 0,
          };
        });

        const totalAmount = items.reduce((s, it) => s + (it.price * it.quantity) - (it.promoValue * it.quantity), 0);
        const userName = pickRandom(USER_NAMES);
        const phone = pickRandom(PHONES);

        if (!customerMap[phone]) {
          customerMap[phone] = { phone, name: userName, visits: 0, spend: 0, firstVisit: date, lastVisit: date };
        }
        customerMap[phone].visits++;
        customerMap[phone].spend += totalAmount;
        if (date > customerMap[phone].lastVisit) customerMap[phone].lastVisit = date;

        const status = Math.random() < 0.9 ? 'completed' : Math.random() < 0.5 ? 'pending' : 'rejected';

        dayOrders.push({
          id: `ord_seed_${restaurantId}_${dateStr}_${lunchOrders + i}`,
          restaurantId,
          tableNumber: randomInt(1, 10),
          userPhone: phone,
          userName,
          items,
          status,
          createdAt,
          totalAmount,
          released: status === 'completed',
        });
      }

      // Write orders
      for (const o of dayOrders) {
        await setDoc(doc(db, 'orders', o.id), o);
      }

      // Compute daily summary
      const completedOrders = dayOrders.filter((o: any) => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((s: number, o: any) => s + o.totalAmount, 0);
      const totalDiscount = dayOrders.reduce((s: number, o: any) =>
        s + (o.items || []).reduce((si: number, it: any) => si + ((it.promoValue || 0) * (it.quantity || 0)), 0), 0);
      
      const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
      for (const o of dayOrders) {
        for (const item of (o.items || [])) {
          if (!itemMap[item.menuId]) itemMap[item.menuId] = { name: item.name, quantity: 0, revenue: 0 };
          itemMap[item.menuId].quantity += item.quantity || 0;
          itemMap[item.menuId].revenue += (item.price || 0) * (item.quantity || 0);
        }
      }
      const topItems = Object.entries(itemMap)
        .map(([menuId, data]) => ({ menuId, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const ordersByHour: Record<number, number> = {};
      for (const o of dayOrders) {
        const h = new Date(o.createdAt).getHours();
        ordersByHour[h] = (ordersByHour[h] || 0) + 1;
      }

      const summary = {
        restaurantId,
        date: dateStr,
        totalRevenue,
        totalOrders: completedOrders.length,
        avgTicketSize: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        totalDiscount,
        discountPercent: totalRevenue > 0 ? (totalDiscount / totalRevenue) * 100 : 0,
        topItems,
        laborCost: randomFloat(2000, 8000),
        ordersByHour,
        ordersByStatus: {
          pending: dayOrders.filter((o: any) => o.status === 'pending').length,
          accepted: dayOrders.filter((o: any) => o.status === 'accepted').length,
          completed: completedOrders.length,
          rejected: dayOrders.filter((o: any) => o.status === 'rejected').length,
        },
        paymentBreakdown: { upi: totalRevenue * 0.45, card: totalRevenue * 0.30, cash: totalRevenue * 0.20, wallet: totalRevenue * 0.05 },
        createdAt: date.toISOString(),
      };

      await setDoc(doc(db, 'dailySummaries', `${restaurantId}_${dateStr}`), summary);
      totalOrders += dayOrders.length;
    }

    if (dayOffset % 15 === 0) {
      console.log(`  Day ${90 - dayOffset}/90 done (${dateStr})`);
    }
  }

  // Write customer profiles
  console.log('Writing customer profiles...');
  for (const [phone, c] of Object.entries(customerMap)) {
    await setDoc(doc(db, 'customers', `cust_${c.phone.replace(/\D/g, '')}`), {
      id: `cust_${c.phone.replace(/\D/g, '')}`,
      restaurantId: pickRandom(Object.keys(MENU_ITEMS)),
      phone: c.phone,
      deviceFingerprint: `dev_${Math.random().toString(36).substring(2, 10)}`,
      firstVisit: c.firstVisit.toISOString(),
      lastVisit: c.lastVisit.toISOString(),
      visitCount: c.visits,
      totalSpend: c.spend,
    });
  }

  // Write some staff shifts
  console.log('Writing staff shifts...');
  for (const restaurantId of Object.keys(MENU_ITEMS)) {
    for (let dayOffset = 90; dayOffset >= 0; dayOffset -= 3) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = formatDate(date);

      // Morning shift
      const morningStart = new Date(date);
      morningStart.setHours(9, 0);
      await setDoc(doc(db, 'staffShifts', `shift_${restaurantId}_${dateStr}_morning`), {
        id: `shift_${restaurantId}_${dateStr}_morning`,
        restaurantId,
        staffId: `staff_${restaurantId}_1`,
        staffName: 'Rajesh Kumar',
        role: 'Manager',
        shiftStart: morningStart.toISOString(),
        shiftEnd: new Date(morningStart.getTime() + 9 * 60 * 60 * 1000).toISOString(),
        hourlyRate: 250,
        totalHours: 9,
        ordersHandled: randomInt(15, 35),
      });

      // Evening shift
      const eveningStart = new Date(date);
      eveningStart.setHours(14, 0);
      await setDoc(doc(db, 'staffShifts', `shift_${restaurantId}_${dateStr}_evening`), {
        id: `shift_${restaurantId}_${dateStr}_evening`,
        restaurantId,
        staffId: `staff_${restaurantId}_2`,
        staffName: 'Priya Sharma',
        role: 'Server',
        shiftStart: eveningStart.toISOString(),
        shiftEnd: new Date(eveningStart.getTime() + 10 * 60 * 60 * 1000).toISOString(),
        hourlyRate: 180,
        totalHours: 10,
        ordersHandled: randomInt(20, 50),
      });
    }
  }

  // Write feedback (sample)
  console.log('Writing sample feedback...');
  for (let i = 0; i < 50; i++) {
    const restaurantId = pickRandom(Object.keys(MENU_ITEMS));
    const date = new Date(now);
    date.setDate(date.getDate() - randomInt(0, 60));
    const rating = randomInt(1, 5);
    await setDoc(doc(db, 'feedbackResponses', `fb_seed_${i}`), {
      id: `fb_seed_${i}`,
      orderId: `ord_seed_${restaurantId}_${formatDate(date)}_${i}`,
      restaurantId,
      rating,
      comment: rating <= 2 ? 'Service was quite slow.' : rating === 3 ? 'Okay experience.' : 'Great food and service!',
      sentimentLabel: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
      themeTags: rating <= 2 ? ['wait_time'] : rating === 3 ? ['staff'] : [],
      actionable: rating <= 2,
      createdAt: date.toISOString(),
    });
  }

  console.log(`\n✅ Seed complete! Generated ${totalOrders} orders across 90 days for ${Object.keys(MENU_ITEMS).length} outlets.`);
  console.log(`   ${Object.keys(customerMap).length} customer profiles created.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
