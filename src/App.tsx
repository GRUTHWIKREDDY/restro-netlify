import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Utensils, ChefHat, Store, ShoppingBag, RefreshCw, 
  Sliders, CheckCircle, AlertOctagon, Info
} from 'lucide-react';
import { Restaurant, MenuItem, Order, DineInUser, Buzzer } from './types';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Import modular layouts
import DineInCustomerUI from './components/DineInCustomerUI';
import RestaurantAdminPanel from './components/RestaurantAdminPanel';
import KitchenDisplaySystem from './components/KitchenDisplaySystem';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import StaffPortalLogin from './components/StaffPortalLogin';

export default function App() {
  // Path routing detection using window location
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [activeMode, setActiveMode] = useState<string>(() => {
    const saved = localStorage.getItem('kcode_active_mode');
    return saved || 'dinein';
  });

  // Simulated Authorization state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('kcode_is_authenticated') === 'true';
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<DineInUser[]>([]);
  const [buzzers, setBuzzers] = useState<Buzzer[]>([]);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(() => {
    return localStorage.getItem('kcode_selected_restaurant_id') || 'rest-1';
  });

  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(() => {
    const saved = localStorage.getItem('kcode_selected_table_number');
    return saved ? parseInt(saved) : 3;
  });

  const [customerSession, setCustomerSession] = useState<{ phone: string; name: string } | null>(() => {
    const saved = localStorage.getItem('kcode_customer_session_state');
    return saved ? JSON.parse(saved) : null;
  });

  const [appAlert, setAppAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  const [ticker, setTicker] = useState(0);

  // Router listener to handle back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isPortalRoute = currentPath.startsWith('/portal') || currentPath.startsWith('/admin') || currentPath.startsWith('/backend') || currentPath.startsWith('/staff');

  // Enforce correct modes depending on the current URL path
  useEffect(() => {
    if (isPortalRoute) {
      if (isAuthenticated && activeMode === 'dinein') {
        setActiveMode('restadmin');
      }
    } else {
      // Force Diner Mobile on customer facing URL
      setActiveMode('dinein');
    }
  }, [isPortalRoute, isAuthenticated, activeMode]);

  const navigateTo = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    setCurrentPath(newPath);
  };

  const handleLoginSuccess = (mode: 'restadmin' | 'kitchen' | 'superadmin') => {
    setIsAuthenticated(true);
    setActiveMode(mode);
    localStorage.setItem('kcode_is_authenticated', 'true');
    triggerAppAlert("Authorized Gateway Initialized", `Welcome back! Loaded ${mode === 'restadmin' ? 'Merchant Admin' : mode === 'kitchen' ? 'Chef Panel' : 'SaaS Super Dashboard'}.`, "success");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('kcode_is_authenticated');
    triggerAppAlert("Session Closed", "You have successfully signed out.", "info");
    navigateTo('/portal');
  };

  // Synchronize state values to localStorage for persistence across mode transitions
  useEffect(() => {
    localStorage.setItem('kcode_active_mode', activeMode);
  }, [activeMode]);

  useEffect(() => {
    localStorage.setItem('kcode_selected_restaurant_id', selectedRestaurantId);
  }, [selectedRestaurantId]);

  useEffect(() => {
    localStorage.setItem('kcode_selected_table_number', selectedTableNumber.toString());
  }, [selectedTableNumber]);

  useEffect(() => {
    if (customerSession) {
      localStorage.setItem('kcode_customer_session_state', JSON.stringify(customerSession));
    } else {
      localStorage.removeItem('kcode_customer_session_state');
    }
  }, [customerSession]);

  // Periodic ticker trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch consolidated database state from the server side API
  const refreshUnifiedDatabase = async () => {
    try {
      const [resRest, resMenu, resOrder, resUser] = await Promise.all([
        fetch("/api/restaurants"),
        fetch("/api/menus"),
        fetch("/api/orders"),
        fetch("/api/users")
      ]);

      const [dataRest, dataMenu, dataOrder, dataUser] = await Promise.all([
        resRest.json(),
        resMenu.json(),
        resOrder.json(),
        resUser.json()
      ]);

      setRestaurants(dataRest);
      setMenus(dataMenu);
      setOrders(dataOrder);
      setUsers(dataUser);
    } catch (err) {
      console.error("Trouble syncing with multi-tenant node backend on loop:", err);
    }
  };

  // Set up Firestore client-side real-time onSnapshot listeners
  useEffect(() => {
    const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Restaurant);
      setRestaurants(list);
    }, (error) => {
      console.error("Firestore onSnapshot restaurants error:", error);
    });

    const unsubMenus = onSnapshot(collection(db, "menus"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as MenuItem);
      setMenus(list);
    }, (error) => {
      console.error("Firestore onSnapshot menus error:", error);
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Order);
      // Sort orders descending by createdAt timestamp
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    }, (error) => {
      console.error("Firestore onSnapshot orders error:", error);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as DineInUser);
      setUsers(list);
    }, (error) => {
      console.error("Firestore onSnapshot users error:", error);
    });

    const unsubBuzzers = onSnapshot(collection(db, "buzzers"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Buzzer);
      // Sort buzzers descending by createdAt
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBuzzers(list);
    }, (error) => {
      console.error("Firestore onSnapshot buzzers error:", error);
    });

    return () => {
      unsubRestaurants();
      unsubMenus();
      unsubOrders();
      unsubUsers();
      unsubBuzzers();
    };
  }, []);

  const activeRestaurantObj = useMemo(() => {
    return restaurants.find(r => r.id === selectedRestaurantId) || restaurants[0] || {
      id: "rest-1",
      name: "La Trattoria",
      logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150",
      status: "active" as const,
      lockedBySuperAdmin: false,
      totalTables: 8
    };
  }, [restaurants, selectedRestaurantId]);

  const triggerAppAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAppAlert({ isOpen: true, title, message, type });
  };

  const handleResetData = async () => {
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      await refreshUnifiedDatabase();
      setCustomerSession(null);
      triggerAppAlert("Demo Reset Completed", data.message || "Database tables re-instantiated successfully.", "success");
    } catch (e) {
      triggerAppAlert("Reset Error", "Failed to clear in-memory databases.", "error");
    }
  };

  // State update propagation helpers
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: any) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        const updatedOrder = { ...targetOrder, status: nextStatus };
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedOrder)
        });
        await res.json();
        await refreshUnifiedDatabase();
        triggerAppAlert("Order State Modified", `Order moved safely to ${nextStatus.toUpperCase()}.`, "success");
      }
    } catch (e) {
      triggerAppAlert("Error", "Could not submit status override to network.", "error");
    }
  };

  const handleCancelSpecificDish = async (orderId: string, itemIdx: number) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        const remainingItems = targetOrder.items.filter((_, idx) => idx !== itemIdx);
        
        let nextStatus = targetOrder.status;
        let newTotal = 0;

        if (remainingItems.length === 0) {
          nextStatus = 'rejected' as const;
          newTotal = 0;
          triggerAppAlert("Order Cancelled", "All items in ticket were removed. Order status updated to Rejected.", "info");
        } else {
          // Re-calculate total amount excluding discounts accordingly
          newTotal = remainingItems.reduce((acc, chunk) => {
            return acc + (chunk.price * chunk.quantity);
          }, 0);
          triggerAppAlert("Dish item removed", `re-calculated net cost is $${newTotal.toFixed(2)}.`, "success");
        }

        const updatedOrder = {
          ...targetOrder,
          items: remainingItems,
          status: nextStatus,
          totalAmount: newTotal
        };

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedOrder)
        });
        await res.json();
        await refreshUnifiedDatabase();
      }
    } catch (e) {
      triggerAppAlert("Override Failure", "Could not remove specific item on the server.", "error");
    }
  };

  const handleModifyRestaurantTablesGlobal = async (tenantId: string, delta: number) => {
    try {
      const tenant = restaurants.find(r => r.id === tenantId);
      if (tenant) {
        const nextTables = Math.max(1, Math.min(50, tenant.totalTables + delta));
        const updatedTenant = { ...tenant, totalTables: nextTables };
        
        const res = await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTenant)
        });
        await res.json();
        await refreshUnifiedDatabase();
      }
    } catch (e) {
      triggerAppAlert("Database Error", "Failed to scale virtual table counts.", "error");
    }
  };

  const handleMenuItemSave = async (menuItem: MenuItem, isEdit: boolean) => {
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(menuItem)
      });
      await res.json();
      await refreshUnifiedDatabase();
      triggerAppAlert("Success", `${menuItem.name} catalog record updated successfully.`, "success");
    } catch (e) {
      triggerAppAlert("Error", "Could not log catalog edits with merchant node.", "error");
    }
  };

  const handleMenuItemDelete = async (id: string) => {
    try {
      const remainingMenus = menus.filter(m => m.id !== id);
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remainingMenus)
      });
      await res.json();
      await refreshUnifiedDatabase();
      triggerAppAlert("Success", "Catalog option removed permanently.", "success");
    } catch (e) {
      triggerAppAlert("Error", "Failed to drop recipe item on server.", "error");
    }
  };

  const handleOrderPlaced = async (newOrder: Order) => {
    try {
      // 1. Post Order
      const resOrder = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder)
      });
      await resOrder.json();

      // 2. Fetch/Update match user profile
      const targetUser = users.find(u => u.phone === newOrder.userPhone);
      const userPayload = targetUser ? {
        ...targetUser,
        globalOrderHistory: [...(targetUser.globalOrderHistory || []), newOrder.id]
      } : {
        phone: newOrder.userPhone,
        name: newOrder.userName,
        globalOrderHistory: [newOrder.id]
      };

      const resUser = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload)
      });
      await resUser.json();

      await refreshUnifiedDatabase();
    } catch (e) {
      triggerAppAlert("Friction on dispatch", "Please try resending your basket shortly.", "error");
    }
  };

  const handleUserRegister = async (phone: string, name: string) => {
    try {
      const existingUser = users.find(u => u.phone === phone);
      if (!existingUser) {
        const payload = { phone, name, globalOrderHistory: [] };
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        await res.json();
        await refreshUnifiedDatabase();
      }
    } catch (e) {
      console.error("Failed to register customer profile:", e);
    }
  };

  const handleSetRestaurantStatus = async (status: 'active' | 'inactive') => {
    try {
      const payload = { ...activeRestaurantObj, status };
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await res.json();
      await refreshUnifiedDatabase();
    } catch (e) {
      triggerAppAlert("Database error", "Failed to update restaurant operational state.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      
      {/* SaaS Global Header - ONLY visible on portal routes when authorized */}
      {isPortalRoute && isAuthenticated && (
        <div className="bg-[#0b0f19] text-slate-100 border-b border-slate-900 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
              
              <div className="flex items-center justify-between">
                <div onClick={() => navigateTo('/')} className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-500/10 transition group-hover:scale-105">
                    <span className="text-[12px] font-black font-display text-white">kC</span>
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-widest leading-none text-white uppercase font-display group-hover:text-indigo-400 transition">kCodeIT</h1>
                    <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase block mt-1">Staff Secure Dashboard</span>
                  </div>
                </div>
              </div>

              {/* High-end Dashboard Menu Switches */}
              <div className="flex flex-wrap gap-1 bg-[#090b11] p-1.5 rounded-full border border-slate-850">
                <button 
                  onClick={() => setActiveMode('restadmin')} 
                  className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-black uppercase rounded-full transition-all duration-200 ${activeMode === 'restadmin' ? 'bg-indigo-650 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                >
                  <Store size={13} />
                  Admin Portal
                </button>
                <button 
                  onClick={() => setActiveMode('kitchen')} 
                  className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-black uppercase rounded-full transition-all duration-200 ${activeMode === 'kitchen' ? 'bg-amber-500 text-slate-950 shadow font-extrabold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                >
                  <ChefHat size={13} />
                  Chefs (KDS)
                </button>
                <button 
                  onClick={() => setActiveMode('superadmin')} 
                  className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-black uppercase rounded-full transition-all duration-200 ${activeMode === 'superadmin' ? 'bg-indigo-605 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                >
                  <Building2 size={13} />
                  SaaS Control
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button 
                  onClick={handleResetData}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-slate-350 hover:text-white hover:bg-slate-800 text-xs font-black rounded-full border border-slate-850 transition shadow-sm"
                  title="Reset simulation parameters back to start"
                >
                  <RefreshCw size={12} />
                  <span>Reset Demo Tables</span>
                </button>

                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-900/40 text-rose-200 hover:text-white text-xs font-black rounded-full transition shadow-sm cursor-pointer"
                >
                  Log Out
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Simulator helper controllers panel */}
      {isPortalRoute && isAuthenticated && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-500 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap font-medium">
            <span className="font-extrabold text-slate-700 flex items-center gap-1 uppercase tracking-widest text-[9px]">
              <Sliders size={13} className="text-slate-450" />
              Portal Sandbox Settings:
            </span>
            <span className="hidden sm:inline text-slate-200">|</span>
            
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Viewing Tenant:</span>
              <select 
                value={selectedRestaurantId} 
                onChange={(e) => {
                  setSelectedRestaurantId(e.target.value);
                  setCustomerSession(null);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] text-slate-800"
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.lockedBySuperAdmin ? 'SUSPEND HOLD' : r.status === 'active' ? 'Active' : 'Closed'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-sm border border-indigo-100 tracking-wider font-mono">
            GATEWAY PATH: {currentPath}
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {isPortalRoute ? (
          !isAuthenticated ? (
            <StaffPortalLogin 
              onLoginSuccess={handleLoginSuccess}
              onGoBackToDiner={() => navigateTo('/')}
            />
          ) : (
            <>
              {activeMode === 'restadmin' && (
                <RestaurantAdminPanel 
                  restaurant={activeRestaurantObj}
                  restaurants={restaurants}
                  onChangeRestaurantStatus={handleSetRestaurantStatus}
                  menus={menus}
                  onMenuItemSave={handleMenuItemSave}
                  onMenuItemDelete={handleMenuItemDelete}
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onTableUpdate={(count) => handleModifyRestaurantTablesGlobal(activeRestaurantObj.id, count - activeRestaurantObj.totalTables)}
                  triggerAppAlert={triggerAppAlert}
                  buzzers={buzzers}
                />
              )}

              {activeMode === 'kitchen' && (
                <KitchenDisplaySystem 
                  restaurant={activeRestaurantObj}
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onCancelSpecificDish={handleCancelSpecificDish}
                  ticker={ticker}
                  buzzers={buzzers}
                  restaurants={restaurants}
                  onSelectRestaurant={setSelectedRestaurantId}
                />
              )}

              {activeMode === 'superadmin' && (
                <SuperAdminDashboard 
                  restaurants={restaurants}
                  setRestaurants={setRestaurants}
                  menus={menus}
                  orders={orders}
                  onUpdateOrderStatusGlobal={handleUpdateOrderStatus}
                  onModifyRestaurantTablesGlobal={handleModifyRestaurantTablesGlobal}
                  setSelectedRestaurantId={setSelectedRestaurantId}
                  setActiveMode={setActiveMode}
                  triggerAppAlert={triggerAppAlert}
                  ticker={ticker}
                />
              )}
            </>
          )
        ) : (
          <DineInCustomerUI 
            restaurant={activeRestaurantObj}
            tableNumber={selectedTableNumber}
            menus={menus}
            orders={orders}
            onOrderPlaced={handleOrderPlaced}
            customerSession={customerSession}
            setCustomerSession={setCustomerSession}
            onUserRegister={handleUserRegister}
            triggerAppAlert={triggerAppAlert}
            buzzers={buzzers}
            onNavigateToPortal={() => navigateTo('/portal')}
            restaurants={restaurants}
            selectedRestaurantId={selectedRestaurantId}
            setSelectedRestaurantId={setSelectedRestaurantId}
            selectedTableNumber={selectedTableNumber}
            setSelectedTableNumber={setSelectedTableNumber}
          />
        )}
      </main>

      {/* MODAL SYSTEM ALERTS */}
      {appAlert.isOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-6 border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center">
              {appAlert.type === 'error' && (
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-full border border-rose-200 shadow-inner">
                  <AlertOctagon size={24} />
                </div>
              )}
              {appAlert.type === 'success' && (
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-full border border-emerald-200 shadow-inner">
                  <CheckCircle size={24} />
                </div>
              )}
              {appAlert.type === 'info' && (
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-full border border-indigo-200 shadow-inner">
                  <Info size={24} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-950 tracking-tight">{appAlert.title}</h4>
              <p className="text-xs text-slate-550 leading-relaxed font-semibold">{appAlert.message}</p>
            </div>

            <button
              onClick={() => setAppAlert({ ...appAlert, isOpen: false })}
              className="w-full bg-slate-950 hover:bg-slate-805 text-white font-black text-xs py-3 rounded-2xl transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Universal Footer */}
      <footer className="bg-slate-950 text-slate-400 py-3 text-center text-[10px] border-t border-slate-900 font-mono">
        <p>© 2026 kCodeIT Multitenant Systems. Optimized with severe cryptographic and AI boundaries.</p>
      </footer>
    </div>
  );
}
