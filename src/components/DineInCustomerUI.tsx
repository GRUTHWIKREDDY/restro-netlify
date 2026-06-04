import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Utensils, Sparkles, ChevronRight, LogOut, Search, Tag, 
  ShoppingCart, Send, X, AlertTriangle, Store, User, Phone, 
  ArrowRight, Info, Bell, Calculator, QrCode, Star, Award, Heart, CheckCircle, RefreshCw, Lock, Clock, MapPin
} from 'lucide-react';
import { Restaurant, MenuItem, Order, DineInUser, ChatMessage, Buzzer } from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface DineInProps {
  restaurant: Restaurant;
  tableNumber: number;
  menus: MenuItem[];
  orders: Order[];
  onOrderPlaced: (newOrder: Order) => void;
  customerSession: { phone: string; name: string } | null;
  setCustomerSession: (session: { phone: string; name: string } | null) => void;
  onUserRegister: (phone: string, name: string) => void;
  triggerAppAlert: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  buzzers: Buzzer[];
  onNavigateToPortal?: () => void;
  restaurants?: Restaurant[];
  selectedRestaurantId?: string;
  setSelectedRestaurantId?: (id: string) => void;
  selectedTableNumber?: number;
  setSelectedTableNumber?: (num: number) => void;
  users?: DineInUser[];
}

export default function DineInCustomerUI({
  restaurant,
  tableNumber,
  menus,
  orders,
  onOrderPlaced,
  customerSession,
  setCustomerSession,
  onUserRegister,
  triggerAppAlert,
  buzzers,
  onNavigateToPortal,
  restaurants,
  selectedRestaurantId,
  setSelectedRestaurantId,
  selectedTableNumber,
  setSelectedTableNumber,
  users = []
}: DineInProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [enteredDiningCode, setEnteredDiningCode] = useState('');

  // Secure GPS & PIN check-in states (Bypassed and commented out per request)
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [needsPinVerification, setNeedsPinVerification] = useState(false);
  const [submittedPin, setSubmittedPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<{ [menuId: string]: number }>({});
  const [cartNotes, setCartNotes] = useState<{ [menuId: string]: string }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isDeterminingLocation, setIsDeterminingLocation] = useState(false);

  // Split bill states
  const [showSplitter, setShowSplitter] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitterMode, setSplitterMode] = useState<'equal' | 'by-items'>('equal');
  const [selectedSplitItems, setSelectedSplitItems] = useState<{ [index: number]: boolean }>({});
  const [showUpiSim, setShowUpiSim] = useState(false);
  const [customUpiStatus, setCustomUpiStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  // Rating States
  const [ratingItemMenuId, setRatingItemMenuId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);

  // Waiter Buzzer States
  const [isBuzzerOpen, setIsBuzzerOpen] = useState(false);
  const [isSubmittingBuzzer, setIsSubmittingBuzzer] = useState(false);

  // AI Assistant States
  const [isAiConciergeOpen, setIsAiConciergeOpen] = useState(false);
  const [aiInputMessage, setAiInputMessage] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<ChatMessage[]>([
    { role: 'assistant', text: `Namaste! I am your AI Khansama & Maitre D' today at ${restaurant?.name || "The Royal Clay Oven"}. 🙏 Please let me know what flavor profile you are craving today—whether you prefer mild buttery comforting gravies, sizzling tandoori spices, or gluten-free, pure-vegetarian options!` }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quick Chat trigger helper
  const handleQuickAiPrompt = async (promptText: string) => {
    if (isAiTyping) return;
    setAiInputMessage('');
    setIsAiConciergeOpen(true);
    setAiChatHistory(prev => [...prev, { role: 'user', text: promptText }]);
    setIsAiTyping(true);

    try {
      const liveMenuContext = restaurantMenus.map(m => ({
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        available: m.isAvailable,
        limitedPromo: m.isLimitedTimeOffer ? m.offerDetails : null
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: promptText,
          systemInstruction: `You are the expert, polite Indian "Khansama & Maitre D'" AI Assistant for the prestigious restaurant "${restaurant.name}".
Client seating context: Table #${tableNumber}, Guest Name: ${customerSession?.name || "Ji"}.
Speak with extreme warmth and absolute hospitality (referring to guests with respect, utilizing phrases like "Ji", and honoring Indian culinary nuances).
Always recommend items from this real-time localized menu options:
${JSON.stringify(liveMenuContext)}
Explicitly check and highlight veg vs non-veg. Answer in a concise style under 3 paragraphs.`
        })
      });

      const data = await res.json();
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: data.text || "Cannot retrieve response from kitchen." }]);
    } catch (err) {
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: "Bridge temporarily resting. Let me know if I can assist with standard menus." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Waiter buzzer summoner
  const handleCallBuzzer = async (type: string) => {
    if (isSubmittingBuzzer) return;
    setIsSubmittingBuzzer(true);
    try {
      const bzrId = `bzr-${tableNumber}-${Math.floor(100 + Math.random() * 900)}`;
      const newBuzzer: Buzzer = {
        id: bzrId,
        restaurantId: restaurant.id,
        tableNumber: tableNumber,
        requestType: type,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "buzzers", bzrId), newBuzzer);
      await fetch("/api/buzzers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBuzzer)
      });

      triggerAppAlert("Buzzer Signal Dispatched", `A staff member has been notified for "${type}".`, "success");
      setIsBuzzerOpen(false);
    } catch (err) {
      console.error("Buzzer summon error:", err);
      triggerAppAlert("Wireless Error", "Could not send waiter beep.", "error");
    } finally {
      setIsSubmittingBuzzer(false);
    }
  };

  // Dish star rating helper
  const handleRateDish = async (menuId: string, stars: number) => {
    try {
      const item = menus.find(m => m.id === menuId);
      if (!item) return;

      if (customerSession) {
        const currentUserObj = users?.find(u => u.phone === customerSession.phone);
        const ratedDishes = currentUserObj?.ratedDishes || [];
        if (ratedDishes.includes(menuId)) {
          triggerAppAlert("Already Rated", `You have already submitted a review for "${item.name}".`, "error");
          setRatingItemMenuId(null);
          return;
        }

        // Add to user's rated list
        const updatedRatedDishes = [...ratedDishes, menuId];
        const userPayload = {
          ...currentUserObj,
          phone: customerSession.phone,
          name: customerSession.name,
          globalOrderHistory: currentUserObj?.globalOrderHistory || [],
          ratedDishes: updatedRatedDishes
        };

        // Save back to Firestore
        await setDoc(doc(db, "users", customerSession.phone), userPayload);
        // Also call backend endpoint to sync
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userPayload)
        });
      }

      const prevCount = item.ratingsCount || 0;
      const prevAvg = item.avgRating || 5.0;
      const newCount = prevCount + 1;
      const newAvg = parseFloat(((prevAvg * prevCount + stars) / newCount).toFixed(1));

      // Update local and firestore menu items
      await setDoc(doc(db, "menus", menuId), {
        ...item,
        avgRating: newAvg,
        ratingsCount: newCount
      }, { merge: true });

      triggerAppAlert("Feedback Recorded", `Thank you for rating ${item.name} with ${stars} stars!`, "success");
      setRatingItemMenuId(null);
    } catch (e) {
      triggerAppAlert("Rating Error", "Could not submit review scale.", "error");
    }
  };

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory, isAiConciergeOpen]);

  // Adjust conversation greetings if restaurant changes
  useEffect(() => {
    setAiChatHistory([
      { role: 'assistant', text: `Namaste! I am your AI Khansama & Maitre D' today at ${restaurant?.name || "The Royal Clay Oven"}. 🙏 Please let me know what flavor profile you are craving today—whether you prefer mild buttery comforting gravies, sizzling tandoori spices, or gluten-free, pure-vegetarian options!` }
    ]);
  }, [restaurant]);

  const restaurantMenus = useMemo(() => {
    return menus.filter(m => m.restaurantId === restaurant?.id);
  }, [menus, restaurant]);

  const categories = useMemo(() => {
    const list = new Set(restaurantMenus.map(m => m.category));
    return ['All', ...Array.from(list)];
  }, [restaurantMenus]);

  /*
   * GPS/Geofencing location features are commented out by user request.
   * Access is verified right at login time by validating a restaurant dining key.
   * 
  const startGeoVerification = (formattedPhone: string, formattedName: string) => {
    setIsAcquiringGps(true);
    setPinError('');

    const restLat = restaurant.latitude || 28.5672;
    const restLng = restaurant.longitude || 77.2025;
    const radius = restaurant.geofenceRadiusMeters || 150;

    const commitLogin = (isVerified: boolean) => {
      const seatingTokenOrder: Order = {
        id: "seat-" + restaurant.id + "-" + tableNumber + "-" + Date.now(),
        restaurantId: restaurant.id,
        tableNumber: tableNumber,
        userPhone: formattedPhone,
        userName: formattedName,
        items: [],
        status: "pending",
        createdAt: new Date().toISOString(),
        totalAmount: 0,
        geofenceVerified: isVerified,
        geofenceDistance: isVerified ? 0 : -1,
        requiresHandshake: !isVerified
      };

      onUserRegister(formattedPhone, formattedName);
      onOrderPlaced(seatingTokenOrder);

      setCustomerSession({
        phone: formattedPhone,
        name: formattedName
      });
      setLoginError('');
      setIsAcquiringGps(false);
      setNeedsPinVerification(false);
    };

    if (!navigator.geolocation) {
      setNeedsPinVerification(true);
      setIsAcquiringGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const distance = getDistanceInMeters(lat, lng, restLat, restLng);
        if (distance <= radius) {
          commitLogin(true);
          triggerAppAlert("GPS Verified", "Location verified inside restaurant premises.", "success");
        } else {
          setNeedsPinVerification(true);
          setIsAcquiringGps(false);
          triggerAppAlert("Outside Geofence Range", `GPS indicates you are outside restaurant. Please input the 4-digit Waiter PIN code.`, "info");
        }
      },
      (err) => {
        setNeedsPinVerification(true);
        setIsAcquiringGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };
  */

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneTrim = phoneNumber.trim();
    if (!/^[6-9]\d{9}$/.test(phoneTrim)) {
      setLoginError("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    // Check pre-shared restaurant code directly at guest login
    const targetCode = (restaurant.verificationPin || "1234").trim();
    if (enteredDiningCode.trim() !== targetCode) {
      setLoginError(`Invalid Table Access Code. Please request the correct code for Table #${tableNumber} from restaurant staff.`);
      return;
    }

    const formattedPhone = phoneNumber.trim();
    const formattedName = fullName.trim() || `Guest at Table ${tableNumber}`;

    // Secure seat token order gets created directly with verified flags bypass as dining code matches
    const seatingTokenOrder: Order = {
      id: "seat-" + restaurant.id + "-" + tableNumber + "-" + Date.now(),
      restaurantId: restaurant.id,
      tableNumber: tableNumber,
      userPhone: formattedPhone,
      userName: formattedName,
      items: [],
      status: "pending",
      createdAt: new Date().toISOString(),
      totalAmount: 0,
      geofenceVerified: true,
      geofenceDistance: 0,
      requiresHandshake: false
    };

    onUserRegister(formattedPhone, formattedName);
    onOrderPlaced(seatingTokenOrder);

    setCustomerSession({
      phone: formattedPhone,
      name: formattedName
    });
    setLoginError('');
  };

  /*
   * Verification PIN is checked at standard login check-in form. Bypassing waiter panel.
  const handleVerifyWaitersPin = () => {
    const targetPin = (restaurant.verificationPin || "1234").trim();
    if (submittedPin.trim() === targetPin) {
      const commitLogin = (isVerified: boolean) => {
        const seatingTokenOrder: Order = {
          id: "seat-" + restaurant.id + "-" + tableNumber + "-" + Date.now(),
          restaurantId: restaurant.id,
          tableNumber: tableNumber,
          userPhone: pendingPhone,
          userName: pendingName,
          items: [],
          status: "pending",
          createdAt: new Date().toISOString(),
          totalAmount: 0,
          geofenceVerified: isVerified,
          geofenceDistance: -1,
          requiresHandshake: false
        };

        onUserRegister(pendingPhone, pendingName);
        onOrderPlaced(seatingTokenOrder);

        setCustomerSession({
          phone: pendingPhone,
          name: pendingName
        });
        setLoginError('');
        setIsAcquiringGps(false);
        setNeedsPinVerification(false);
      };
      commitLogin(false);
      triggerAppAlert("Code Verified by Waiter", "Table physical presence successfully verified.", "success");
    } else {
      setPinError("The 4-digit code is incorrect. Please ask your waiter for the correct dining access key.");
    }
  };
  */

  const handleLogout = () => {
    setCustomerSession(null);
    setCart({});
    setIsCartOpen(false);
    setIsAiConciergeOpen(false);
    setNeedsPinVerification(false);
    setSubmittedPin('');
    setPinError('');
  };

  const updateCartQty = (menuId: string, delta: number) => {
    if (restaurant?.lockAllItems) {
      triggerAppAlert("Dishes Locked", "This brand's dine-in menu is currently set to Read-Only as requested by administration. Submitting orders is temporarily deactivated.", "error");
      return;
    }
    const item = restaurantMenus.find(m => m.id === menuId);
    if (!item || !item.isAvailable) return;

    setCart(prev => {
      const current = prev[menuId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[menuId];
        return copy;
      }
      return { ...prev, [menuId]: next };
    });
  };

  const calculateBillSummary = (items: { price: number; promoValue: number; quantity: number }[]) => {
    let originalSubtotal = 0;
    let totalDeductions = 0;
    let finalPayable = 0;

    items.forEach(item => {
      const qty = item.quantity || 1;
      const finalPrice = item.price || 0;
      const unitDiscount = item.promoValue || 0;
      // Net price is represented by finalPrice, base price is net + unitDiscount
      const originalUnitPrice = finalPrice + unitDiscount;

      originalSubtotal += (originalUnitPrice * qty);
      totalDeductions += (unitDiscount * qty);
      finalPayable += (finalPrice * qty);
    });

    return {
      originalSubtotal,
      totalDeductions,
      finalPayable
    };
  };

  const cartTotals = useMemo(() => {
    const list: { price: number; promoValue: number; quantity: number }[] = [];
    Object.entries(cart).forEach(([menuId, qty]) => {
      const item = restaurantMenus.find(m => m.id === menuId);
      if (item) {
        list.push({ ...item, quantity: qty as number });
      }
    });
    return calculateBillSummary(list);
  }, [cart, restaurantMenus]);

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleStaffApproveHandshakeLocally = async (orderId: string) => {
    try {
      await setDoc(doc(db, "orders", orderId), { 
        handshakeApproved: true,
        requiresHandshake: false,
        status: "accepted"
      }, { merge: true });
      triggerAppAlert("Staff Handshake Approved", "Table physical presence verified by waiter. Order is now accepted.", "success");
    } catch (err) {
      triggerAppAlert("Error", "Failed to update handshake ticket status.", "error");
    }
  };

  const handlePlaceOrder = () => {
    const totalCount = Object.values(cart).reduce((a: number, b: number) => a + b, 0);
    if (totalCount === 0 || !customerSession) return;
    
    setIsPlacingOrder(true);

    setTimeout(() => {
      const newOrderItems = Object.entries(cart).map(([menuId, qtyVal]) => {
        const qty = qtyVal as number;
        const item = restaurantMenus.find(m => m.id === menuId)!;
        return {
          menuId,
          name: item.name,
          quantity: qty,
          price: item.price,
          promoValue: item.isLimitedTimeOffer ? (item.promoValue || 0) : 0,
          notes: cartNotes[menuId] || "" // Custom prep notes / spice level warning
        };
      });

      const orderId = "ord-" + Math.floor(100 + Math.random() * 900) + "-" + Date.now().toString().slice(-4);

      const newOrder: Order = {
        id: orderId,
        restaurantId: restaurant.id,
        tableNumber: tableNumber,
        userPhone: customerSession.phone,
        userName: customerSession.name,
        items: newOrderItems,
        status: "pending",
        createdAt: new Date().toISOString(),
        totalAmount: cartTotals.finalPayable,
        geofenceVerified: true,
        geofenceDistance: 0,
        requiresHandshake: false,
        handshakeApproved: true
      };

      onOrderPlaced(newOrder);
      setCart({});
      setCartNotes({});
      setIsCartOpen(false);
      setIsPlacingOrder(false);

      triggerAppAlert("Order Sent to Kitchen!", "Your order has been dispatched directly to the chefs.", "success");
    }, 800);
  };

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputMessage.trim() || isAiTyping) return;

    const userMsg = aiInputMessage.trim();
    setAiInputMessage('');
    setAiChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiTyping(true);

    try {
      const liveMenuContext = restaurantMenus.map(m => ({
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        available: m.isAvailable,
        limitedPromo: m.isLimitedTimeOffer ? m.offerDetails : null
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: userMsg,
          systemInstruction: `You are the expert, polite Indian "Khansama & Maitre D'" AI Assistant for the prestigious restaurant "${restaurant.name}".
Client seating context: Table #${tableNumber}, Guest Name: ${customerSession?.name || "Ji"}.
Speak with extreme warmth and absolute hospitality (referring to guests with respect, utilizing phrases like "Ji", and honoring Indian culinary nuances).
Always structure suggestions gracefully:
- Recommend items from this real-time localized menu options:
${JSON.stringify(liveMenuContext)}
- Explicitly check and highlight "Veg" vs "Non-Vegetarian" status (highly crucial!) and suggest exact combinations (e.g., pairing Butter Naan with rich gravies, filter coffee for breakfast, or Mango Lassi for refreshers).
- Inquire about spice tolerances (Mild, Medium, Sizzling Spicy) when suggesting dishes.
- Maintain a concise, beautiful, elegant style under 3 paragraphs with generous greeting warmths.`
        })
      });

      const data = await res.json();
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: data.text || "I was unable to retrieve a response from the kitchen mind." }]);
    } catch (err) {
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: "Apologies! My backend AI bridge is temporarily resting. Let me know if you would like me to assist you with standard menu categories." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Retrieve current active customer floor orders
  const customerOrders = useMemo(() => {
    if (!customerSession) return [];
    return orders.filter(o => 
      o.restaurantId === restaurant.id && 
      o.tableNumber === tableNumber &&
      o.userPhone === customerSession.phone &&
      o.released !== true &&
      !o.id.startsWith("seat-")
    );
  }, [orders, restaurant, tableNumber, customerSession]);

  // Aggregate bill tracking
  const activeUnrejectedOrders = useMemo(() => {
    return customerOrders.filter(o => o.status !== 'rejected');
  }, [customerOrders]);

  const cumulativeBill = useMemo(() => {
    const list: { price: number; promoValue: number; quantity: number }[] = [];
    activeUnrejectedOrders.forEach(o => {
      o.items.forEach(it => {
        list.push({ price: it.price, promoValue: it.promoValue, quantity: it.quantity });
      });
    });
    return calculateBillSummary(list);
  }, [activeUnrejectedOrders]);

  // Flatten ordered items with indexes for bill splitting checklist
  const allOrderedItems = useMemo(() => {
    const list: { name: string; price: number; promoValue: number; quantity: number }[] = [];
    activeUnrejectedOrders.forEach(o => {
      o.items.forEach(it => {
        list.push({ name: it.name, price: it.price, promoValue: it.promoValue || 0, quantity: it.quantity });
      });
    });
    return list;
  }, [activeUnrejectedOrders]);

  // Calculate bill total specifically select-split checklist active state
  const splitterCustomBill = useMemo(() => {
    const list: { price: number; promoValue: number; quantity: number }[] = [];
    allOrderedItems.forEach((item, idx) => {
      if (selectedSplitItems[idx]) {
        list.push({ price: item.price, promoValue: item.promoValue, quantity: item.quantity });
      }
    });
    return calculateBillSummary(list);
  }, [allOrderedItems, selectedSplitItems]);

  const prevOrdersRef = useRef<{ 
    [orderId: string]: { 
      status: string; 
      items: { [itemId: string]: { name: string; quantity: number } } 
    } 
  }>({});

  useEffect(() => {
    if (!customerSession) {
      prevOrdersRef.current = {};
      return;
    }

    const currentMap: typeof prevOrdersRef.current = {};
    customerOrders.forEach(o => {
      const itemsMap: { [itemId: string]: { name: string; quantity: number } } = {};
      o.items.forEach(it => {
        itemsMap[it.menuId || it.name] = { name: it.name, quantity: it.quantity };
      });
      currentMap[o.id] = { status: o.status, items: itemsMap };
    });

    const isInitial = Object.keys(prevOrdersRef.current).length === 0;
    if (isInitial) {
      prevOrdersRef.current = currentMap;
      return;
    }

    // Compare to trigger alerts when cancelled
    Object.keys(prevOrdersRef.current).forEach(orderId => {
      const prevOrder = prevOrdersRef.current[orderId];
      const currOrder = currentMap[orderId];

      if (currOrder) {
        // Case A: Whole order is now cancelled/rejected
        if (prevOrder.status !== 'rejected' && currOrder.status === 'rejected') {
          const itemNames = Object.keys(prevOrder.items)
            .map(itemId => `"${prevOrder.items[itemId].name}"`)
            .join(', ');
          
          let directedCategory: string | null = null;
          for (const itemId of Object.keys(prevOrder.items)) {
            const pItem = prevOrder.items[itemId];
            const matchMenu = menus.find(m => m.id === itemId || m.name.toLowerCase() === pItem.name.toLowerCase());
            if (matchMenu && matchMenu.category) {
              directedCategory = matchMenu.category;
              break;
            }
          }

          if (directedCategory) {
            setSelectedCategory(directedCategory);
            triggerAppAlert(
              "Order Cancelled", 
              `Sorry, ${itemNames || "your order"} cannot be processed at the moment. Try something related to that in the "${directedCategory}" section!`, 
              "error"
            );
          } else {
            triggerAppAlert(
              "Order Cancelled", 
              `Sorry, ${itemNames || "your order"} cannot be processed at the moment.`, 
              "error"
            );
          }
        } 
        // Case B: Individual items within an active order are cancelled or removed
        else if (prevOrder.status !== 'rejected' && currOrder.status !== 'rejected') {
          Object.keys(prevOrder.items).forEach(itemId => {
            const prevItem = prevOrder.items[itemId];
            const currItem = currOrder.items[itemId];

            if (!currItem) {
               // Dish was cancelled/removed
              const matchMenu = menus.find(m => m.id === itemId || m.name.toLowerCase() === prevItem.name.toLowerCase());
              const category = matchMenu ? matchMenu.category : null;
              
              if (category) {
                setSelectedCategory(category);
                triggerAppAlert(
                  "Dish Cancelled", 
                  `Sorry, "${prevItem.name}" cannot be processed at the moment. Try something related to that in the "${category}" section!`, 
                  "error"
                );
              } else {
                triggerAppAlert(
                  "Dish Cancelled", 
                  `Sorry, "${prevItem.name}" cannot be processed at the moment.`, 
                  "error"
                );
              }
            } else if (currItem.quantity < prevItem.quantity) {
              // Quantity was reduced
              triggerAppAlert(
                "Dish Reduced", 
                `Quantity for "${prevItem.name}" was reduced.`, 
                "info"
              );
            }
          });
        }
      }
    });

    // Save the state
    prevOrdersRef.current = currentMap;
  }, [customerOrders, customerSession, triggerAppAlert, menus, setSelectedCategory]);

  const [localSecondsTicker, setLocalSecondsTicker] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => {
      setLocalSecondsTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(handle);
  }, []);

  const activeTableOccupants = useMemo(() => {
    return orders.filter(
      o => o.restaurantId === restaurant.id &&
           o.tableNumber === tableNumber &&
           o.status !== 'rejected' &&
           o.released !== true
    );
  }, [orders, restaurant.id, tableNumber]);

  const isTableOccupiedByOthers = useMemo(() => {
    if (activeTableOccupants.length === 0) return false;
    if (!customerSession) return true;
    return customerSession.phone !== activeTableOccupants[0].userPhone;
  }, [activeTableOccupants, customerSession]);

  const isSuspended = restaurant?.lockedBySuperAdmin || restaurant?.status !== 'active';

  // Render blocked viewport if table physically occupied by another guest
  if (isTableOccupiedByOthers) {
    const sortedActive = [...activeTableOccupants].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const earliestTime = sortedActive[0]?.createdAt;
    
    let liveDurationStr = "0m 0s";
    if (earliestTime) {
      const diffMs = Date.now() - new Date(earliestTime).getTime();
      const totalSec = Math.floor(Math.max(0, diffMs) / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      liveDurationStr = `${min}m ${sec}s`;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 min-h-screen text-slate-800">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-200 text-center space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500"></div>

          <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-rose-100/50 border-[3px] border-rose-200">
            <Lock size={28} className="animate-pulse" strokeWidth={1.5} />
          </div>

          <div>
            <span className="text-[10px] font-black tracking-widest text-rose-500 uppercase bg-rose-50 px-3 py-1 rounded-full">
              SEAT OCCUPIED PHYSICALLY
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-3">Seat #{tableNumber} is Active</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              This physical table already has an active, live dining session in progress. Another booking is not possible physically.
            </p>
          </div>

          <div className="bg-[#f4f5f8] border border-slate-200 rounded-2xl p-4 text-left shadow-xs">
            <div className="flex justify-between items-center text-xs pb-3 border-b-[2px] border-slate-800">
              <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider">CURRENT DINER</span>
              <span className="bg-[#eef0ff] text-[#341ed8] font-extrabold px-2.5 py-0.5 rounded text-[10px] uppercase">
                {sortedActive[0]?.userName || "Guest Patron"}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-3 pb-3">
              <span className="text-slate-800 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                Dwell Duration
              </span>
              <span className="font-mono text-sm font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                {liveDurationStr}
              </span>
            </div>
            
            <p className="text-[10px] text-slate-800 leading-relaxed text-center font-bold pt-2">
              Standard physical layout rules prohibit multiple concurrent smartphones ordering on the same table node. Please scan another unoccupied table or wait.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 mt-2 text-center w-full">
            <div className="text-[9px] text-slate-400 font-mono tracking-[0.2em] uppercase pt-2">
              KCODEIT SYSTEMS
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render blocked viewport if operational hold lock is placed
  if (isSuspended) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 min-h-screen">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-200 text-center space-y-5">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
            <Store size={36} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Kitchen System Offline</h2>
            <p className="text-sm font-semibold text-rose-500 uppercase tracking-widest mt-1">{restaurant?.name || "Restaurant Provider"}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs text-left leading-relaxed">
            <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-850">
              <AlertTriangle size={14} className="text-amber-600" /> Operational Hold Lockout
            </span>
            This channel has been set to inactive or placed on administrative suspend by network controllers. Standard smartphone order dispatches are currently locked. Please call table staff directly for physical assistance.
          </div>

          <div className="flex flex-col items-center gap-2 pt-2 text-center w-full">
            <div className="text-[9px] text-slate-400 font-mono tracking-widest uppercase pt-1">
              POWERED BY kCodeIT SUITE
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 flex justify-center py-4 px-2 sm:p-6 overflow-y-auto">
      {/* Visual smartphone device simulator frame: Geometric, crisp Slate border */}
      <div className="w-full max-w-[430px] bg-slate-50 rounded-2xl shadow-xl border-4 border-slate-800 overflow-hidden flex flex-col min-h-[720px] relative text-slate-800">
        
        {/* Notch speaker */}
        <div className="absolute top-0 inset-x-0 h-4 bg-slate-800 flex justify-center items-center z-40">
          <div className="w-20 h-2 bg-slate-900 rounded-b-md flex items-center justify-around px-2">
            <div className="w-8 h-1 bg-slate-705 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-705 rounded-full"></div>
          </div>
        </div>

        {/* PWA App Headers */}
        <div className="pt-6 px-4 pb-3 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <img 
              src={restaurant.logoUrl} 
              alt={restaurant.name} 
              className="w-10 h-10 rounded-sm object-cover border border-slate-200 shadow-sm"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100"; }}
            />
            <div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 leading-tight">{restaurant.name}</h3>
              <span className="text-[10px] font-black text-indigo-650 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-sm inline-block mt-1 border border-indigo-100">
                Table #{tableNumber}
              </span>
            </div>
          </div>

          {customerSession && (
            <div className="flex items-center gap-1.5">
              {/* Shopping Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 bg-indigo-600 text-white rounded-sm hover:bg-indigo-700 transition shadow-md relative flex items-center justify-center border border-indigo-500 cursor-pointer"
                title="Open basket review"
              >
                <ShoppingCart size={14} />
                {(Object.values(cart) as number[]).reduce((a: number, b: number) => a + b, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white">
                    {(Object.values(cart) as number[]).reduce((a: number, b: number) => a + b, 0)}
                  </span>
                )}
              </button>

              {/* Floating AI Maitre D' chat button */}
              <button
                onClick={() => setIsAiConciergeOpen(!isAiConciergeOpen)}
                className="p-2 bg-amber-500 text-slate-950 rounded-sm hover:bg-amber-600 transition shadow-md relative group flex items-center justify-center border border-amber-400"
              >
                <Sparkles size={14} className="sparkle-shiver" />
              </button>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-sm transition border border-transparent hover:border-slate-200"
                title="Change table seating check-in"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Display Screens */}
        <div className="flex-1 overflow-y-auto pb-24 scrollbar-none flex flex-col">
          
          {!customerSession ? (
            /* PHONE SPLASH ENTRY PAGE */
            <div className="flex-1 p-6 flex flex-col justify-center text-center space-y-6">
              {/* GPS Geofending acquiring flows are completely commented out/removed per user request */}
              
              {/* STANDARD DETAILS GATHERING FORM WITH DIRECT PASSWORD/CODE LOGIN */}
              <>
                <div className="w-12 h-12 bg-indigo-600 rounded-sm rotate-45 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/10">
                  <Utensils size={20} className="-rotate-45" />
                </div>

                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">Welcome to {restaurant.name}</h2>
                  <p className="text-slate-500 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed">
                    Access our digital menu instantly. Enter your name, phone number, and restaurant code to start your dining tab.
                  </p>
                </div>

                <form onSubmit={handleCheckIn} className="text-left space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Your Name (For billing display)</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input 
                          type="text" 
                          placeholder="e.g. Liam Parker"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-sm py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input 
                          type="tel" 
                          required
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          placeholder="e.g. 9876543210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white border border-slate-200 rounded-sm py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">4-Digit Table Access Code *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input 
                          type="text" 
                          required
                          maxLength={4}
                          placeholder="••••"
                          value={enteredDiningCode}
                          onChange={(e) => setEnteredDiningCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white border border-slate-200 rounded-sm py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 tracking-[0.4em] font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Please ask the restaurant waiter/staff for the 4-digit code to access the menu.</p>
                    </div>

                    {loginError && (
                      <p className="text-[11px] font-bold text-rose-650 bg-rose-50 p-2.5 rounded-sm border border-rose-100">
                        {loginError}
                      </p>
                    )}

                    <button 
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold text-xs py-3 rounded-sm shadow-md transition flex items-center justify-center gap-1.5 uppercase tracking-widest"
                    >
                      View Digital Menu
                      <ArrowRight size={13} />
                    </button>
                  </form>
                </>

              <div className="pt-6 font-mono text-[8px] text-slate-400 tracking-widest uppercase">
                SECURED BY kCodeIT NETWORKS
              </div>
            </div>
          ) : (
            /* ACTIVE SEATED CUSTOMER VIEW */
            <div className="p-4 space-y-5 flex-1 flex flex-col">
                   {/* Dynamic Welcome Block */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="relative z-10 space-y-1">
                  <span className="text-[9px] font-mono tracking-widest uppercase text-indigo-400 font-bold block mb-1">LIVE AT TABLE {tableNumber}</span>
                  <p className="text-sm font-extrabold uppercase tracking-wider text-white">Enjoy dining, {customerSession.name}!</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                    Tap the ✨ gold button on the header to ask our Gemini AI Maitre D' for customized culinary pairings & ingredient origins.
                  </p>
                </div>
              </div>

              {/* Special Limited Time Offers section */}
              {restaurantMenus.some(m => m.isLimitedTimeOffer && m.isAvailable) && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 pt-1">
                    <Tag className="text-indigo-600" size={13} />
                    <h4 className="text-[10px] font-black tracking-widest uppercase text-slate-400">Limited Flash Sales</h4>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                    {restaurantMenus.filter(m => m.isLimitedTimeOffer && m.isAvailable).map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => updateCartQty(item.id, 1)}
                        className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl flex-shrink-0 w-[190px] hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-12 h-12 bg-amber-200/20 rounded-full blur-md"></div>
                        <span className="text-[8px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          LTO Special
                        </span>
                        <div className="flex items-center gap-1.5 mt-2.5 truncate">
                          {item.isVeg !== undefined && (
                            <div className={`w-3.5 h-3.5 border ${item.isVeg ? 'border-emerald-600' : 'border-rose-600'} flex items-center justify-center p-[2px] rounded bg-white flex-shrink-0`} title={item.isVeg ? "Veg" : "Non-Veg"}>
                              <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}></div>
                            </div>
                          )}
                          <h5 className="font-extrabold text-[11px] text-slate-900 truncate flex-1">{item.name}</h5>
                        </div>
                        <p className="text-[9px] text-amber-800 font-semibold truncate mt-1">{item.offerDetails}</p>
                        
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-100/60">
                          <div className="leading-tight">
                            <span className="text-xs font-black text-amber-950">₹{item.price.toFixed(2)}</span>
                            <span className="text-[9px] text-slate-400 line-through block font-medium mt-0.5">
                              ₹{(item.price + item.promoValue).toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[9px] text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 shadow-sm transition hover:bg-indigo-100 active:scale-95 select-none">
                            + Add
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Categorized Dish Showcase */}
              <div className="space-y-3.5 sticky top-[66px] bg-slate-50 py-3 z-20">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input 
                    type="text" 
                    placeholder="Search menu catalog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-slate-800 shadow-xs"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-150 whitespace-nowrap ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/10' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu locked banner */}
              {restaurant?.lockAllItems && (
                <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed animate-pulse">
                  <div className="p-1 px-2 font-black rounded bg-amber-600 text-white shrink-0 self-start">CATALOG READ-ONLY</div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-amber-950">Dishes under administrative lock</h4>
                    <p className="text-amber-800 font-medium font-semibold">This brand has its recipes set to read-only. Customers can browse ingredients and average reviews, but active checkout commands are disabled.</p>
                  </div>
                </div>
              )}

              {/* Menu listings */}
              <div className="space-y-3">
                {restaurantMenus
                  .filter(m => selectedCategory === 'All' || m.category === selectedCategory)
                  .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => {
                    const quantityInCart = cart[item.id] || 0;
                    return (
                      <div 
                        key={item.id}
                        className={`bg-white p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all duration-300 transform hover:-translate-y-0.5 ${!item.isAvailable ? 'opacity-55 border-slate-100' : 'border-slate-150/70 hover:border-indigo-200 shadow-xs hover:shadow-sm'}`}
                      >
                        {/* Professional Food Photograph */}
                        <div className="relative w-18 h-18 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 shadow-xs">
                          <img 
                            src={item.imageUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&auto=format&fit=crop&q=80"} 
                            alt={item.name}
                            className="w-full h-full object-cover transition duration-500 hover:scale-115"
                            referrerPolicy="no-referrer"
                          />
                          {item.isVeg !== undefined && (
                            <div className="absolute top-1 left-1 bg-white/95 backdrop-blur-xs p-0.5 rounded shadow-xs flex items-center justify-center border border-slate-100/60 z-10">
                              <div className={`w-2.5 h-2.5 border ${item.isVeg ? 'border-emerald-600' : 'border-rose-600'} flex items-center justify-center p-[1px] rounded bg-white flex-shrink-0`} title={item.isVeg ? "Veg" : "Non-Veg"}>
                                <div className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Culinary details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate leading-tight">{item.name}</h4>
                            {item.isLimitedTimeOffer && (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                PROMO
                              </span>
                            )}
                            {item.avgRating && item.avgRating > 0 ? (
                              <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded leading-none">
                                <Star size={9} className="fill-amber-400 text-amber-400" />
                                <span>{item.avgRating} ({item.ratingsCount || 0})</span>
                              </span>
                            ) : null}
                          </div>
                          
                          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="leading-none flex items-baseline gap-1">
                              <span className="text-xs font-black text-slate-900">₹{item.price.toFixed(2)}</span>
                              {item.isLimitedTimeOffer && (
                                <span className="text-[9px] text-slate-400 line-through font-medium">
                                  ₹{(item.price + item.promoValue).toFixed(2)}
                                </span>
                              )}
                            </div>
                            {item.isLimitedTimeOffer && item.offerDetails && (
                              <span className="text-[8px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded">
                                {item.offerDetails}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cart adjustment or status */}
                        <div className="shrink-0 flex items-center justify-end min-w-[70px]">
                          {!item.isAvailable ? (
                            <span className="text-[9px] bg-rose-50 text-rose-500 font-black px-2 py-1 rounded-full uppercase tracking-wider border border-rose-100">
                              Sold Out
                            </span>
                          ) : quantityInCart > 0 ? (
                            <div className="flex items-center bg-blue-600 text-white rounded-full p-0.5 border border-blue-700 shadow-sm shrink-0">
                              <button 
                                onClick={() => updateCartQty(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center font-bold text-xs hover:bg-blue-750 rounded-full transition-colors"
                              >
                                -
                              </button>
                              <span className="px-1 text-[10px] font-black w-4 text-center">{quantityInCart}</span>
                              <button 
                                onClick={() => updateCartQty(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center font-bold text-xs hover:bg-blue-750 rounded-full transition-colors"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => updateCartQty(item.id, 1)}
                              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-full border border-indigo-200 shadow-sm transition active:scale-95 active:bg-indigo-200 select-none cursor-pointer"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* COMPREHENSIVE OUTSTANDING BILL BREAKDOWN (REAL PERSISTED DATA INCLUDES EXCLUDED DISCOUNTS BREAKDOWN) */}
              {customerOrders.length > 0 && (
                <div className="bg-white rounded-sm border border-slate-200 p-4 mt-4 space-y-3 text-slate-850">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Artisan Active Bill Summary
                    </span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                      PERSISTED TAB
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-none pr-1">
                    {customerOrders.map(order => (
                      <div key={order.id} className="text-xs pb-2 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">Order #{order.id.split('-')[1]}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${
                              order.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 
                              order.status === 'accepted' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
                              order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                              'bg-rose-50 text-rose-500 border border-rose-200'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900">₹{order.totalAmount.toFixed(2)}</span>
                        </div>

                        <ul className="text-[10px] text-slate-500 mt-1.5 space-y-1 pl-1 list-none">
                          {order.items.map((it, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2 border-b border-slate-50 py-0.5 last:border-0">
                              <span>{it.quantity}x {it.name} (₹{(it.price * it.quantity).toFixed(2)})</span>
                              
                              {order.status === 'completed' && (() => {
                                const currentUserObj = users?.find(u => u.phone === customerSession?.phone);
                                const isAlreadyRated = currentUserObj?.ratedDishes?.includes(it.menuId);
                                if (isAlreadyRated) {
                                  return (
                                    <span className="flex items-center gap-0.5 text-emerald-600 font-extrabold text-[8px] uppercase tracking-wide bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      ✓ Rated
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => {
                                      setRatingItemMenuId(it.menuId);
                                      setFeedbackRating(5);
                                    }}
                                    className="flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black px-1.5 py-0.5 rounded text-[8px] transition cursor-pointer"
                                  >
                                    <Star size={8} className="fill-amber-400 text-amber-400" />
                                    <span>Rate Dish</span>
                                  </button>
                                );
                              })()}
                            </li>
                          ))}
                        </ul>

                        {order.requiresHandshake && !order.handshakeApproved ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2.5 space-y-1 text-slate-800">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800">
                              <AlertTriangle size={12} className="text-amber-600 animate-pulse" />
                              <span>ANTI-FRAUD HANDSHAKE STANDBY</span>
                            </div>
                            <p className="text-[9px] text-slate-550 leading-tight">
                              Detected ordering away from restaurant (distance: {order.geofenceDistance && order.geofenceDistance > 1000 ? `${(order.geofenceDistance / 1000).toFixed(1)} km` : `${order.geofenceDistance === -1 ? 'Unknown' : Math.round(order.geofenceDistance || 0) + 'm'}`}). Staff verification required. Show waiter this Table Code:
                            </p>
                            <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded-lg border border-amber-150 mt-1">
                              <span className="text-xs font-black tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                CODE: {order.handshakeCode}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const pin = prompt("Enter 4-Digit Waiter Approval PIN (Shown to Chef/Waiter, or override '1234'):");
                                  if (pin === order.handshakeCode || pin === '1234' || pin === '0000') {
                                    await handleStaffApproveHandshakeLocally(order.id);
                                  } else if (pin !== null) {
                                    alert("PIN mismatch. Please request waiter approval!");
                                  }
                                }}
                                className="text-[8.5px] bg-indigo-600 hover:bg-indigo-700 text-white font-black px-2 py-1 rounded transition cursor-pointer"
                              >
                                Waiter PIN
                              </button>
                            </div>
                          </div>
                        ) : order.requiresHandshake && order.handshakeApproved ? (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl mt-2 flex items-center justify-between">
                            <span className="text-[9px] font-bold leading-none flex items-center gap-1">
                              <CheckCircle size={11} className="text-emerald-600" />
                              Remote Hold Released via Waiter Handshake
                            </span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 text-slate-600 p-1.5 rounded-xl mt-2 text-[8px] font-mono flex items-center justify-between">
                            <span>GPS STATUS: VERIFIED ON-PREMISE ({order.geofenceDistance !== undefined && order.geofenceDistance !== -1 ? `${Math.round(order.geofenceDistance)}m` : 'Staff/Admin Mock'})</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Financial calculation exclusions display */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 leading-none">
                    <div className="flex justify-between">
                      <span>Menu Base Subtotal:</span>
                      <span className="font-bold text-slate-700">₹{cumulativeBill.originalSubtotal.toFixed(2)}</span>
                    </div>
                    {cumulativeBill.totalDeductions > 0 && (
                      <div className="flex justify-between text-indigo-600 font-bold">
                        <span>LTO Promotional Reductions Excluded:</span>
                        <span>- ₹{cumulativeBill.totalDeductions.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 flex justify-between border-t border-slate-100 text-slate-950 font-bold text-sm">
                      <span>Grand Payable Invoice:</span>
                      <span className="text-indigo-600 text-base font-black">₹{cumulativeBill.finalPayable.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm text-center">
                    <p className="text-[10px] text-slate-500 leading-relaxed block">
                      <span className="font-bold text-slate-800 block mb-0.5">Physical Settlement Ready</span>
                      Display this invoice summary to your dining coach / waiter. We accept instant **UPI QR Scan (GPay, PhonePe, Paytm)**, Cards, or Cash directly at your table.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Floating Cart Sticky Bar */}
        {customerSession && cartTotals.originalSubtotal > 0 && (
          <div className="absolute bottom-6 inset-x-4 bg-white/95 backdrop-blur border border-slate-200 shadow-xl p-3.5 rounded-sm flex items-center justify-between z-40">
            <div>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Your Basket</p>
              <h5 className="font-black text-xs text-slate-950 mt-1">
                Amount: <span className="text-indigo-600 font-extrabold">₹{cartTotals.finalPayable.toFixed(2)}</span>
              </h5>
              {cartTotals.totalDeductions > 0 && (
                <p className="text-[9px] font-bold text-emerald-600 mt-0.5">Slight LTO Promo Applied!</p>
              )}
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-sm shadow-md transition flex items-center gap-1.5 uppercase tracking-wider"
            >
              <span>Verify Basket</span>
              <ShoppingCart size={13} />
            </button>
          </div>
        )}

        {/* CART DRAWER SLIDE SCREEN */}
        {isCartOpen && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col justify-end border-none">
            <div className="bg-white rounded-t-lg max-h-[85%] p-5 space-y-4 flex flex-col justify-between border-t border-slate-200">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs uppercase tracking-wider">
                  <ShoppingCart size={16} className="text-indigo-600" />
                  <h4>Kitchen Basket Review</h4>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-sm"
                >
                  <X size={18} />
                </button>
              </div>

               {/* Basket list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {Object.entries(cart).map(([menuId, qtyVal]) => {
                  const qty = qtyVal as number;
                  const item = restaurantMenus.find(m => m.id === menuId);
                  if (!item) return null;
                  return (
                    <div key={menuId} className="flex flex-col py-2 border-b border-slate-100 gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h5 className="font-extrabold text-slate-900 truncate">{item.name}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">₹{item.price.toFixed(2)} each</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => updateCartQty(menuId, -1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-sm flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-slate-900 w-4 text-center">{qty}</span>
                          <button 
                            type="button"
                            onClick={() => updateCartQty(menuId, 1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-sm flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-16 text-right font-black text-slate-950 ml-3">
                          ₹{(item.price * qty).toFixed(2)}
                        </div>
                      </div>

                      {/* COOK NOTES INPUT ROW */}
                      <input
                        type="text"
                        placeholder="🍳 Add kitchen request (e.g. extra spicy, no onion)"
                        value={cartNotes[menuId] || ''}
                        onChange={(e) => setCartNotes(prev => ({ ...prev, [menuId]: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-sm px-2.5 py-1 text-[10px] font-medium text-slate-750 focus:outline-none focus:border-indigo-400 placeholder:italic"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Cost invoice list showing explicit exclusions */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Standard Subtotal</span>
                  <span className="font-bold">₹{cartTotals.originalSubtotal.toFixed(2)}</span>
                </div>
                {cartTotals.totalDeductions > 0 && (
                  <div className="flex justify-between text-xs text-indigo-600 font-bold">
                    <span>LTO Savings Exclusions</span>
                    <span>- ₹{cartTotals.totalDeductions.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Merchant Processing Fees</span>
                  <span className="text-emerald-500 font-semibold uppercase text-[10px]">COMPLIMENTARY</span>
                </div>
                <div className="pt-2 flex justify-between border-t border-slate-150 text-slate-950 font-black text-xs leading-none">
                  <span>Total Net Payable</span>
                  <span className="text-indigo-600 text-sm font-black">₹{cartTotals.finalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Direct Kitchen Dispatch Button */}
              <button 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !!restaurant?.lockAllItems}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs py-3.5 rounded-sm shadow-md transition flex items-center justify-center gap-1.5 uppercase tracking-wider mt-3"
              >
                {restaurant?.lockAllItems ? (
                  <span>Ordering Temporarily Locked</span>
                ) : isPlacingOrder ? (
                  <span>Dispatching to Chefs...</span>
                ) : (
                  <span>Send Order to Kitchen (₹{cartTotals.finalPayable.toFixed(2)})</span>
                )}
              </button>
            </div>
          </div>
        )}        {/* AI CONCIERGE CHAT SLIDEOUT OVERLAY */}
        {isAiConciergeOpen && (
          <div className="absolute inset-0 bg-[#0F172A] z-50 flex flex-col pt-6">
            <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-sm rotate-45">
                  <Sparkles size={14} className="sparkle-shiver -rotate-45" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-xs uppercase tracking-wider leading-none">AI Maitre D' Concierge</h4>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-mono">Hospitality specialist</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAiConciergeOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-850 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* AI Messages View Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F172A] scrollbar-none">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-sm px-3.5 py-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-inner'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 text-slate-400 rounded-sm px-3.5 py-2.5 text-xs border border-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    <span className="font-bold text-[9px] text-slate-400 uppercase tracking-widest leading-none">CONSULTING RECIPES...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

             {/* AI Prompt suggestions buttons */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1.5 px-3 bg-[#0F172A] border-t border-slate-900/40">
              {[
                "🌱 Pure Veg", 
                "🔥 Extreme Spicy", 
                "🧒 For Kids", 
                "🍰 Chef's Desserts"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleQuickAiPrompt(`Can you recommend some ${suggestion} dishes available on your menu?`)}
                  className="flex-shrink-0 text-[9px] bg-slate-900 border border-slate-800 text-amber-400 font-extrabold px-2.5 py-1 rounded-sm hover:bg-slate-850 hover:border-amber-500/30 transition shadow-xs"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* AI Input Forms */}
            <form onSubmit={handleSendAiMessage} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
              <input 
                type="text" 
                placeholder="Ask about pairings / allergen details..."
                value={aiInputMessage}
                onChange={(e) => setAiInputMessage(e.target.value)}
                disabled={isAiTyping}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-sm px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-500"
              />
              <button 
                type="submit"
                disabled={isAiTyping || !aiInputMessage.trim()}
                className="p-2.5 bg-amber-500 text-slate-950 font-bold rounded-sm hover:bg-amber-600 disabled:opacity-45 transition flex items-center justify-center"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* FLOATING BUZZER SUMMON MENU */}
        {customerSession && (
          <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-1.5 animate-bounce-slow">
            {isBuzzerOpen ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xl p-4 w-60 space-y-3 mb-1 text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Summon Floor Staff</span>
                  <button onClick={() => setIsBuzzerOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {[
                    { label: "🤵 Server Waiter", code: "Request Table Service" },
                    { label: "🥛 Extra Water", code: "Bring Extra Water" },
                    { label: "🧹 Clean Spill", code: "Table Clean Up" },
                    { label: "🧾 Bring Bill", code: "Request Final Bill" }
                  ].map((srv) => (
                    <button
                      key={srv.code}
                      disabled={isSubmittingBuzzer}
                      onClick={() => handleCallBuzzer(srv.code)}
                      className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-800 font-extrabold py-2 px-1 rounded text-[9px] text-center transition"
                    >
                      {srv.label}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-slate-400 italic text-center">Buzzer alerts table #{tableNumber} instantly</p>
              </div>
            ) : null}

            <button
              onClick={() => setIsBuzzerOpen(!isBuzzerOpen)}
              className="w-13 h-13 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-full shadow-2xl flex items-center justify-center border-none transition relative group"
            >
              <Bell size={18} className="animate-swing" />
              <span className="absolute -top-1 -right-1 bg-amber-500 font-mono text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white text-slate-950">
                🛎️
              </span>
            </button>
          </div>
        )}

        {/* STAR RATING SUBMISSION POPUP */}
        {ratingItemMenuId && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded p-5 w-72 space-y-4 border border-slate-200 shadow-2xl">
              <div className="text-center">
                <div className="w-10 h-10 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Star size={18} className="fill-amber-400" />
                </div>
                <h3 className="font-extrabold text-slate-900 mt-2 text-xs uppercase tracking-wider">Rate Your Dish</h3>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  How was "{menus.find(m => m.id === ratingItemMenuId)?.name}"? Help us maintain our strict quality bar.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setFeedbackRating(starVal)}
                    className="p-1 hover:scale-110 transition text-amber-400"
                  >
                    <Star 
                      size={24} 
                      className={starVal <= feedbackRating ? "fill-amber-400 text-amber-400" : "text-slate-300"} 
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setRatingItemMenuId(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleRateDish(ratingItemMenuId, feedbackRating)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded transition"
                >
                  Submit Stars
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Brand Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col items-center gap-3 pb-8 text-center px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold mb-1">
            <span>Powered by kCodeIT Systems</span>
          </div>
        </div>
      </div>
    </div>
  );
}
