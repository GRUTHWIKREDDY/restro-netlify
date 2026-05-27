import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Utensils, Sparkles, ChevronRight, LogOut, Search, Tag, 
  ShoppingCart, Send, X, AlertTriangle, Store, User, Phone, 
  ArrowRight, Info, Bell, Calculator, QrCode, Star, Award, Heart, CheckCircle
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
  setSelectedTableNumber
}: DineInProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [loginError, setLoginError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<{ [menuId: string]: number }>({});
  const [cartNotes, setCartNotes] = useState<{ [menuId: string]: string }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.trim().length < 7) {
      setLoginError("Please enter a valid phone number to identify your bill tab.");
      return;
    }

    const formattedPhone = phoneNumber.trim();
    const formattedName = fullName.trim() || `Guest at Table ${tableNumber}`;

    onUserRegister(formattedPhone, formattedName);
    setCustomerSession({
      phone: formattedPhone,
      name: formattedName
    });
    setLoginError('');
  };

  const handleLogout = () => {
    setCustomerSession(null);
    setCart({});
    setIsCartOpen(false);
    setIsAiConciergeOpen(false);
  };

  const updateCartQty = (menuId: string, delta: number) => {
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

      const newOrder: Order = {
        id: "ord-" + Math.floor(100 + Math.random() * 900) + "-" + Date.now().toString().slice(-4),
        restaurantId: restaurant.id,
        tableNumber: tableNumber,
        userPhone: customerSession.phone,
        userName: customerSession.name,
        items: newOrderItems,
        status: "pending",
        createdAt: new Date().toISOString(),
        totalAmount: cartTotals.finalPayable
      };

      onOrderPlaced(newOrder);
      setCart({});
      setCartNotes({});
      setIsCartOpen(false);
      setIsPlacingOrder(false);
      triggerAppAlert("Order Dispatched successfully!", "Your request has been routed to the kitchen queue.", "success");
    }, 1000);
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
      o.userPhone === customerSession.phone
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

  const isSuspended = restaurant?.lockedBySuperAdmin || restaurant?.status !== 'active';

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

          {/* Quick simulator switcher so users/testers are never locked out of other establishments */}
          {restaurants && setSelectedRestaurantId && setSelectedTableNumber && (
            <div className="pt-4 border-t border-slate-150 space-y-3 text-left">
              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1">
                <QrCode size={11} className="text-slate-500" />
                Table Simulator Override
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Switch Establishment</label>
                  <select 
                    value={restaurant?.id || ""} 
                    onChange={(e) => {
                      setSelectedRestaurantId?.(e.target.value);
                      setCustomerSession(null); // Reset session to simulate new user seating
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} {r.lockedBySuperAdmin || r.status !== 'active' ? '(Suspended)' : '(Active)'}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Seat Number</label>
                  <select 
                    value={tableNumber} 
                    onChange={(e) => {
                      setSelectedTableNumber?.(parseInt(e.target.value));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                  >
                    {Array.from({ length: restaurant?.totalTables || 8 }, (_, idx) => idx + 1).map(num => (
                      <option key={num} value={num}>Seat #{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 pt-2 text-center w-full">
            {onNavigateToPortal && (
              <button 
                onClick={onNavigateToPortal}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl cursor-pointer transition shadow-sm w-full"
              >
                Go to Staff Portal Gateway
              </button>
            )}
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
              <div className="w-12 h-12 bg-indigo-600 rounded-sm rotate-45 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/10">
                <Utensils size={20} className="-rotate-45" />
              </div>

              <div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">Welcome to {restaurant.name}</h2>
                <p className="text-slate-500 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed">
                  Access our digital menu instantly. Enter your name and phone number to start your tab session and place orders instantly.
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
                      placeholder="e.g. +1 555-0192"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-sm py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800"
                    />
                  </div>
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

              {/* TEMPORARY GOLD LOYALTY CARD ACCENTS */}
              <div className="bg-gradient-to-r from-amber-50/90 via-amber-100/90 to-amber-50/90 rounded-2xl border border-amber-200 p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-xs hover:shadow-sm hover:border-amber-300 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <Award size={16} className="text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[10px] tracking-wide uppercase leading-none text-slate-900">Gold Diner Rewards Club</p>
                    <p className="text-[9px] text-amber-850 mt-1 font-semibold">Accumulating <span className="font-extrabold">{Math.round(cumulativeBill.finalPayable / 10)} pts</span> • Seating Streak: 3 Days 🔥</p>
                  </div>
                </div>
                <span className="text-[8px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  ACTIVE
                </span>
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
                          <span className="text-[9px] text-indigo-600 font-extrabold bg-white px-2.5 py-1 rounded-full border border-amber-200 shadow-xs hover:bg-slate-50 transition">
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
                            <div className="flex items-center bg-indigo-650 text-white rounded-full p-0.5 border border-indigo-750 shadow-sm shrink-0">
                              <button 
                                onClick={() => updateCartQty(item.id, -1)}
                                className="w-5.5 h-5.5 flex items-center justify-center font-bold text-xs hover:bg-indigo-700 rounded-full transition-colors"
                              >
                                -
                              </button>
                              <span className="px-1 text-[10px] font-black w-4 text-center">{quantityInCart}</span>
                              <button 
                                onClick={() => updateCartQty(item.id, 1)}
                                className="w-5.5 h-5.5 flex items-center justify-center font-bold text-xs hover:bg-indigo-750 rounded-full transition-colors"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => updateCartQty(item.id, 1)}
                              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-705 text-[10px] font-bold rounded-full transition shadow-xs hover:shadow-sm"
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
                              
                              {order.status === 'completed' && (
                                <button
                                  onClick={() => {
                                    setRatingItemMenuId(it.menuId);
                                    setFeedbackRating(5);
                                  }}
                                  className="flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black px-1.5 py-0.5 rounded text-[8px] transition"
                                >
                                  <Star size={8} className="fill-amber-400 text-amber-400" />
                                  <span>Rate Dish</span>
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* LOYALTY BILL SPLITTER COHESIVE BUTTON ACCORDION */}
                  <div className="space-y-2 pt-1">
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowSplitter(!showSplitter);
                          // Select all split items initially
                          const initialItems: { [index: number]: boolean } = {};
                          allOrderedItems.forEach((_, idx) => {
                            initialItems[idx] = true;
                          });
                          setSelectedSplitItems(initialItems);
                        }}
                        className="w-full flex items-center justify-between text-left text-[11px] font-black uppercase text-indigo-700 tracking-wider focus:outline-none"
                      >
                        <span className="flex items-center gap-1.5">
                          <Calculator size={13} />
                          <span>Interactive Bill Splitter & Pay</span>
                        </span>
                        <span className="text-[9px] bg-indigo-100 hover:bg-indigo-200 font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                          {showSplitter ? "Hide" : "Open Splitter"}
                        </span>
                      </button>

                      {showSplitter && (
                        <div className="mt-2.5 space-y-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-700">
                          <div className="flex gap-1.5 rounded bg-slate-105 p-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setSplitterMode('equal')}
                              className={`flex-1 py-1 rounded font-bold uppercase tracking-wider transition ${splitterMode === 'equal' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >
                              Split Equally
                            </button>
                            <button
                              type="button"
                              onClick={() => setSplitterMode('by-items')}
                              className={`flex-1 py-1 rounded font-bold uppercase tracking-wider transition ${splitterMode === 'by-items' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >
                              Select My Food
                            </button>
                          </div>

                          {splitterMode === 'equal' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between font-bold">
                                <span>Splitting amongst:</span>
                                <span className="text-indigo-600">{splitCount} Diners</span>
                              </div>
                              <input
                                type="range"
                                min="2"
                                max="10"
                                value={splitCount}
                                onChange={(e) => setSplitCount(parseInt(e.target.value))}
                                className="w-full h-1 accent-indigo-600 bg-slate-200 rounded-lg cursor-pointer"
                              />
                              <div className="bg-indigo-50 border border-dashed border-indigo-200 p-2 rounded text-center">
                                <p className="text-[9px] text-slate-500 uppercase tracking-wide font-bold">Your Share</p>
                                <p className="text-sm font-black text-indigo-600 mt-0.5">₹{(cumulativeBill.finalPayable / splitCount).toFixed(2)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none mb-1 border-b border-slate-105 pb-1">Uncheck what you did not eat:</p>
                              <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-0.5">
                                {allOrderedItems.map((item, idx) => (
                                  <label key={idx} className="flex items-center justify-between p-1.5 bg-white border border-slate-100 rounded text-[10px] hover:bg-slate-50 cursor-pointer transition">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={selectedSplitItems[idx] || false}
                                        onChange={(e) => setSelectedSplitItems(prev => ({ ...prev, [idx]: e.target.checked }))}
                                        className="rounded border-slate-300 accent-indigo-600 focus:ring-0"
                                      />
                                      <span className="font-semibold text-slate-800 truncate">{item.quantity}x {item.name}</span>
                                    </div>
                                    <span className="font-extrabold text-slate-900 shrink-0 ml-1">₹{(item.price * item.quantity).toFixed(2)}</span>
                                  </label>
                                ))}
                              </div>

                              <div className="bg-indigo-50 border border-dashed border-indigo-200 p-2 rounded text-center">
                                <p className="text-[9px] text-slate-500 uppercase tracking-wide font-bold">Selected Item Total</p>
                                <p className="text-sm font-black text-indigo-600 mt-0.5">₹{splitterCustomBill.finalPayable.toFixed(2)}</p>
                              </div>
                            </div>
                          )}

                          {/* GENERATE UPI INSTANT QR */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowUpiSim(true);
                              setCustomUpiStatus('idle');
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-[9px] py-2 rounded uppercase tracking-wider flex items-center justify-center gap-1 transition"
                          >
                            <QrCode size={11} />
                            <span>Scan Split Receipt QR</span>
                          </button>
                        </div>
                      )}
                    </div>
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

              <button 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs py-3.5 rounded-sm shadow-md transition flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                {isPlacingOrder ? (
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

        {/* INSTANT UPI QR SIMULATED PAYMENT DIALOG */}
        {showUpiSim && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-850">
            <div className="bg-white rounded p-5 w-76 space-y-4 border border-slate-200 shadow-2xl relative">
              <button 
                type="button"
                onClick={() => {
                  setShowUpiSim(false);
                  setCustomUpiStatus('idle');
                }}
                className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>

              <div className="text-center space-y-1">
                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest inline-block mx-auto mb-1">BHIM UPI Settle Gateway</span>
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-widest">Interactive Table Payment</h3>
                <p className="text-[10px] text-slate-400">
                  Scan receipt or simulate instant settle at Table #{tableNumber}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded flex flex-col items-center justify-center">
                {customUpiStatus === 'success' ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center text-emerald-600">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle size={28} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-xs uppercase tracking-wider">PAYMENT COMPLETED</p>
                      <p className="text-[9px] text-slate-500">Merchant Soundbox Settle Received!</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative p-2.5 bg-white border border-slate-100 rounded shadow-xs flex flex-col items-center">
                    <svg width="120" height="120" viewBox="0 0 100 100" className="opacity-90">
                      <path d="M0,0 h30 v10 h-20 v20 h-10 z" fill="#000" />
                      <path d="M70,0 h30 v30 h-10 v-20 h-20 z" fill="#000" />
                      <path d="M0,70 v30 h30 v-10 h-20 v-20 z" fill="#000" />
                      <path d="M70,100 h30 v-30 h-10 v-20 h-20 z" fill="#000" />
                      <rect x="15" y="15" width="15" height="15" fill="#312e81" />
                      <rect x="70" y="15" width="15" height="15" fill="#312e81" />
                      <rect x="15" y="70" width="15" height="15" fill="#312e81" />
                      <path d="M40,15 h10 v10 h-10 z" fill="#312e81" />
                      <path d="M40,35 h20 v10 h-20 z" fill="#312e81" />
                      <path d="M15,45 h10 v20 h-10 z" fill="#312e81" />
                      <path d="M45,70 h30 v10 h-30 z" fill="#312e81" />
                      <path d="M75,45 h15 v15 h-15 z" fill="#312e81" />
                    </svg>
                    <div className="absolute inset-x-0 bottom-2 bg-white/95 text-center py-0.5">
                      <p className="font-black text-[13px] text-slate-900 leading-none">
                        ₹{(splitterMode === 'equal' ? (cumulativeBill.finalPayable / splitCount) : splitterCustomBill.finalPayable).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 font-mono text-[8px] text-slate-400 text-center leading-none">
                <p>Merchant QR ID: {restaurant.id}-T{tableNumber}</p>
                <p>Ref Hash: BZR-{tableNumber}-{Math.floor(1000 + Math.random() * 9000)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpiSim(false);
                    setCustomUpiStatus('idle');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded text-xs text-center transition"
                >
                  Cancel
                </button>
                {customUpiStatus !== 'success' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setCustomUpiStatus('scanning');
                      setTimeout(async () => {
                        try {
                          // Settle local customer orders
                          for (const cd of customerOrders) {
                            if (cd.status !== 'completed') {
                              await setDoc(doc(db, "orders", cd.id), {
                                ...cd,
                                status: "completed"
                              }, { merge: true });
                            }
                          }
                          setCustomUpiStatus('success');
                          triggerAppAlert("Settled successfully!", "Payment simulated successfully. Merchant queue updated.", "success");
                          setTimeout(() => {
                            setShowUpiSim(false);
                            setShowSplitter(false);
                          }, 1200);
                        } catch (e) {
                          triggerAppAlert("Payment Settle error", "Could not complete state persist.", "error");
                        }
                      }, 1800);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded text-xs text-center shadow-md transition"
                  >
                    Simulate Paid ✔
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtle Multi-Tenant Scanner Simulator & Portal Switcher */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col items-center gap-3 pb-8 text-center px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold mb-1">
            <span>Powered by kCodeIT Systems</span>
            <span>•</span>
            <button 
              onClick={onNavigateToPortal}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer transition"
            >
              Staff Portal Gateway
            </button>
          </div>
          
          {/* Collapsible Mobile Scanner Simulator */}
          {restaurants && setSelectedRestaurantId && setSelectedTableNumber && (
            <div className="w-full max-w-xs bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2.5 shadow-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1">
                  <QrCode size={11} className="text-slate-500" />
                  QR Table Scanner Sim
                </span>
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[8px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  T-{tableNumber}
                </span>
              </div>
              
              <p className="text-[10px] text-slate-400 leading-normal">
                Simulate scanning customer QR table codes across other fine Indian establishments in this multi-tenant tenant:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Cafe Establishment</label>
                  <select 
                    value={selectedRestaurantId} 
                    onChange={(e) => {
                      setSelectedRestaurantId?.(e.target.value);
                      setCustomerSession(null); // Reset session to simulate new user seating
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Mock Seat Number</label>
                  <select 
                    value={tableNumber} 
                    onChange={(e) => {
                      setSelectedTableNumber?.(parseInt(e.target.value));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                  >
                    {Array.from({ length: restaurant?.totalTables || 8 }, (_, idx) => idx + 1).map(num => (
                      <option key={num} value={num}>Seat/Table #{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
