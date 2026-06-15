import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Utensils, ChefHat, Store, ShoppingBag, RefreshCw, 
  Sliders, CheckCircle, AlertOctagon, Info, X
} from 'lucide-react';
import { Restaurant, MenuItem, Order, DineInUser, Buzzer, FloorDef } from './types';
import { supabase, toCamel } from './supabase';

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

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [toasts, setToasts] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }[]>([]);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<DineInUser[]>([]);
  const [buzzers, setBuzzers] = useState<Buzzer[]>([]);

  const [customerSession, setCustomerSession] = useState<{ phone: string; name: string } | null>(() => {
    const saved = localStorage.getItem('kcode_customer_session_state');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(() => {
    return localStorage.getItem('kcode_selected_restaurant_id') || 'rest-1';
  });

  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(() => {
    const saved = localStorage.getItem('kcode_selected_table_number');
    return saved ? parseInt(saved) : 3;
  });

  const authRole = useMemo(() => {
    const token = localStorage.getItem('kcode_auth_token');
    if (!token) return null;
    try {
      return JSON.parse(token).role;
    } catch {
      return null;
    }
  }, [isAuthenticated]);

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

  // Router listener to handle back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Dynamic deep-link parser for table QR codes: /r/:restaurantId/t/:tableNumber
  const [isDinerRoute, setIsDinerRoute] = useState(false);

  useEffect(() => {
    const match = currentPath.match(/^\/r\/([^/]+)\/t\/(\d+)/);
    if (match) {
      const parsedRestId = match[1];
      const parsedTableNum = parseInt(match[2], 10);
      if (parsedRestId && !isNaN(parsedTableNum)) {
        setSelectedRestaurantId(parsedRestId);
        setSelectedTableNumber(parsedTableNum);
        setActiveMode('dinein');
        setIsDinerRoute(true);
      }
    } else {
      setIsDinerRoute(false);
    }
  }, [currentPath]);

  const isPortalRoute = !isDinerRoute;

  // Enforce correct modes depending on the current URL path
  useEffect(() => {
    if (isPortalRoute) {
      if (currentPath === '/kcodeit' && isAuthenticated && activeMode === 'dinein') {
        setActiveMode('superadmin');
      } else if (isAuthenticated && activeMode === 'dinein') {
        setActiveMode('restadmin');
      }
    } else {
      // Force Diner Mobile on customer facing URL
      setActiveMode('dinein');
    }
  }, [isPortalRoute, isAuthenticated, activeMode, currentPath]);

  const navigateTo = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    setCurrentPath(newPath);
  };

  const handleLoginSuccess = (mode: 'restadmin' | 'kitchen' | 'superadmin') => {
    setIsAuthenticated(true);
    setActiveMode(mode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    triggerAppAlert("Session Closed", "You have successfully signed out.", "info");
    navigateTo('/portal');
  };

  // Listen for Supabase auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // We could fetch user_roles here again to set mode, but handleLoginSuccess already sets it
        // during the login flow. If this is a page refresh, we should fetch it.
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (roleData) {
          if (roleData.restaurant_id) setSelectedRestaurantId(roleData.restaurant_id);
          setActiveMode(roleData.role);
        }
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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



  // Set up Supabase Realtime subscriptions for live data
  useEffect(() => {
    // Initial fetches wrapping with Promise.all to handle loading skeletons
    Promise.all([
      supabase.from('restaurants').select('*'),
      supabase.from('menu_items').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('dine_in_users').select('*'),
      supabase.from('buzzers').select('*')
    ]).then(([resRest, resMenu, resOrder, resUser, resBuzzer]) => {
      if (resRest.data) setRestaurants(resRest.data.map(toCamel));
      if (resMenu.data) setMenus(resMenu.data.map(toCamel));
      if (resOrder.data) {
        const list = resOrder.data.map(toCamel) as Order[];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
      }
      if (resUser.data) setUsers(resUser.data.map(toCamel));
      if (resBuzzer.data) {
        const list = resBuzzer.data.map(toCamel) as Buzzer[];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBuzzers(list);
      }
      setIsLoading(false);
    }).catch(err => {
      console.error("Trouble fetching initial database data:", err);
      setIsLoading(false);
    });

    // Realtime subscriptions — re-fetch full list on any change
    const refreshRestaurants = supabase
      .channel('restaurants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
        supabase.from('restaurants').select('*').then(({ data }) => {
          if (data) setRestaurants(data.map(toCamel));
        });
      })
      .subscribe();

    const refreshMenus = supabase
      .channel('menus-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        supabase.from('menu_items').select('*').then(({ data }) => {
          if (data) setMenus(data.map(toCamel));
        });
      })
      .subscribe();

    const refreshOrders = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        supabase.from('orders').select('*').then(({ data }) => {
          if (data) {
            const list = data.map(toCamel) as Order[];
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setOrders(list);
          }
        });
      })
      .subscribe();

    const refreshUsers = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dine_in_users' }, () => {
        supabase.from('dine_in_users').select('*').then(({ data }) => {
          if (data) setUsers(data.map(toCamel));
        });
      })
      .subscribe();

    const refreshBuzzers = supabase
      .channel('buzzers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzers' }, () => {
        supabase.from('buzzers').select('*').then(({ data }) => {
          if (data) {
            const list = data.map(toCamel) as Buzzer[];
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBuzzers(list);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(refreshRestaurants);
      supabase.removeChannel(refreshMenus);
      supabase.removeChannel(refreshOrders);
      supabase.removeChannel(refreshUsers);
      supabase.removeChannel(refreshBuzzers);
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
    if (type === 'success' || type === 'info') {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    } else {
      setAppAlert({ isOpen: true, title, message, type });
    }
  };

  const handleResetData = async () => {
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      setCustomerSession(null);
      triggerAppAlert("Demo Reset Completed", data.message || "Database tables re-instantiated successfully.", "success");
    } catch (e) {
      triggerAppAlert("Reset Error", "Failed to clear in-memory databases.", "error");
    }
  };

  // State update propagation helpers
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: any, released?: boolean) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        const forceReleaseFalse = nextStatus === 'pending' || nextStatus === 'accepted';
        const updatedOrder = { 
          ...targetOrder, 
          status: nextStatus,
          handshakeApproved: (nextStatus === 'accepted' || nextStatus === 'completed') ? true : targetOrder.handshakeApproved,
          released: released !== undefined ? released : (forceReleaseFalse ? false : targetOrder.released)
        };
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedOrder)
        });
        await res.json();
        // Silent update: successfully changed status, state reflections handle feedback in real-time
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
        } else {
          // Re-calculate total amount excluding discounts accordingly
          newTotal = remainingItems.reduce((acc, chunk) => {
            return acc + (chunk.price * chunk.quantity);
          }, 0);
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
        // Silent update on dish cancellation
      }
    } catch (e) {
      triggerAppAlert("Override Failure", "Could not remove specific item on the server.", "error");
    }
  };

  const handleModifyRestaurantTablesGlobal = async (tenantId: string, nextTables: number, floors?: FloorDef[]) => {
    try {
      const tenant = restaurants.find(r => r.id === tenantId);
      if (tenant) {
        const nextClamped = Math.max(1, Math.min(200, nextTables));
        const updatedTenant = { ...tenant, totalTables: nextClamped };
        if (floors) {
          updatedTenant.floors = floors;
        }
        
        const res = await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTenant)
        });
        await res.json();
      }
    } catch (e) {
      triggerAppAlert("Database Error", "Failed to scale virtual table counts.", "error");
    }
  };

  const handleUpdateRestaurantPin = async (tenantId: string, newPin: string) => {
    try {
      const tenant = restaurants.find(r => r.id === tenantId);
      if (tenant) {
        const updatedTenant = { ...tenant, verificationPin: newPin };
        const res = await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTenant)
        });
        await res.json();
      }
    } catch (e) {
      triggerAppAlert("Database Error", "Failed to update restaurant verification pin.", "error");
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
      }
    } catch (e) {
      console.error("Failed to register customer profile:", e);
    }
  };

  const handleSetRestaurantStatus = async (status: 'active' | 'inactive') => {
    if (activeMode === 'restadmin' && activeRestaurantObj.lockedBySuperAdmin && status === 'active') {
      triggerAppAlert("Action Blocked", "Your kitchen status is locked on hold by the Super Admin.", "error");
      return;
    }
    try {
      const payload = { ...activeRestaurantObj, status };
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await res.json();

      // Clear full-fill tickets (completed & rejected orders) for this restaurant
      const completedOrders = orders.filter(
        o => o.restaurantId === activeRestaurantObj.id && (o.status === 'completed' || o.status === 'rejected')
      );
      
      let clearedCount = 0;
      for (const order of completedOrders) {
        try {
          await supabase.from('orders').update({ released: true }).eq('id', order.id);
          clearedCount++;
        } catch (err) {
          console.error("Failed to update order to released state during status transition:", err);
        }
      }

      if (clearedCount > 0) {
        triggerAppAlert(
          "Tickets Cleared", 
          `Updated operational state to ${status.toUpperCase()} and cleared out ${clearedCount} concluded/full-fill tickets.`,
          "success"
        );
      } else {
        triggerAppAlert("Status Updated", `Restaurant operational state updated to ${status.toUpperCase()} successfully.`, "success");
      }
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

              {/* Status Display */}
              <div className="flex flex-wrap gap-1 bg-[#090b11] p-1.5 rounded-full border border-slate-850 px-4">
                <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-black uppercase text-indigo-400">
                  {activeMode === 'restadmin' && <><Store size={13} /> Admin Portal</>}
                  {activeMode === 'kitchen' && <><ChefHat size={13} /> Kitchen Display</>}
                  {activeMode === 'superadmin' && <><Building2 size={13} /> SaaS Control</>}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {authRole === 'superadmin' && activeMode !== 'superadmin' && (
                  <button 
                    onClick={() => setActiveMode('superadmin')}
                    className="px-4 py-2 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-900/40 text-indigo-250 hover:text-white text-xs font-black rounded-full transition shadow-sm cursor-pointer"
                  >
                    ← Back to SaaS Control
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-955/70 hover:bg-rose-900 border border-rose-900/40 text-rose-200 hover:text-white text-xs font-black rounded-full transition shadow-sm cursor-pointer"
                >
                  Log Out
                </button>
              </div>

            </div>
          </div>
        </div>
      )}



      {/* Main View Router */}
      <main className="flex-1 flex flex-col animate-fade-in">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC] dark:bg-[#070913] space-y-6">
            <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-[32px] shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl skeleton-bg shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded skeleton-bg"></div>
                  <div className="h-3 w-1/2 rounded skeleton-bg"></div>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-full rounded skeleton-bg"></div>
                <div className="h-3.5 w-5/6 rounded skeleton-bg"></div>
                <div className="h-3.5 w-4/5 rounded skeleton-bg"></div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="h-10 rounded-xl skeleton-bg"></div>
                <div className="h-10 rounded-xl skeleton-bg"></div>
              </div>
            </div>
          </div>
        ) : isPortalRoute ? (
          !isAuthenticated ? (
            <StaffPortalLogin 
              restaurants={restaurants}
              selectedRestaurantId={selectedRestaurantId}
              onSelectRestaurant={setSelectedRestaurantId}
              onLoginSuccess={handleLoginSuccess}
              onGoBackToDiner={() => navigateTo('/')}
              forceRole={currentPath === '/kcodeit' ? 'superadmin' : undefined}
            />
          ) : (
            <>
              {activeMode === 'restadmin' && (
                <RestaurantAdminPanel 
                  restaurant={activeRestaurantObj}
                  restaurants={restaurants}
                  onChangeRestaurantStatus={handleSetRestaurantStatus}
                  onUpdateRestaurantPin={handleUpdateRestaurantPin}
                  menus={menus}
                  onMenuItemSave={handleMenuItemSave}
                  onMenuItemDelete={handleMenuItemDelete}
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onCancelSpecificDish={handleCancelSpecificDish}
                  onTableUpdate={(count, floors) => handleModifyRestaurantTablesGlobal(activeRestaurantObj.id, count, floors)}
                  triggerAppAlert={triggerAppAlert}
                  buzzers={buzzers}
                  onSwitchToKitchenMode={() => setActiveMode('kitchen')}
                />
              )}

              {activeMode === 'kitchen' && (
                <KitchenDisplaySystem 
                  restaurant={activeRestaurantObj}
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onCancelSpecificDish={handleCancelSpecificDish}
                  ticker={0}
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
                  ticker={0}
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
            users={users}
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

      {/* Toast Notifications System */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 animate-toast-enter transition-all duration-300`}
          >
            <div className="mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle size={18} className="text-emerald-500" />
              ) : toast.type === 'info' ? (
                <Info size={18} className="text-indigo-500" />
              ) : (
                <AlertOctagon size={18} className="text-rose-500" />
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              <h5 className="text-xs font-black text-slate-950 dark:text-white leading-tight">{toast.title}</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Universal Footer */}
      <footer className="bg-slate-950 text-slate-400 py-3 text-center text-[10px] border-t border-slate-900 font-mono">
        <p>© 2026 Restro / kCodeIT Multitenant Systems. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
}
