import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Building2, Utensils, ChefHat, Store, ShoppingBag, RefreshCw,
  Sliders, CheckCircle, AlertOctagon, Info, X, Undo2,
  ClipboardList, LayoutGrid, QrCode, History, BarChart3
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

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

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

  // ── 15-second Undo Cancellation System ──
  interface PendingCancellation {
    id: string;
    type: 'order' | 'dish';
    orderId: string;
    itemIdx?: number; // only for dish cancellations
    originalOrder: Order; // snapshot before cancel
    expiresAt: number; // Date.now() + 15000
    timerId: ReturnType<typeof setTimeout>;
    committed: boolean;
    label: string; // human-readable description
  }

  const [pendingCancellations, setPendingCancellations] = useState<PendingCancellation[]>([]);
  const pendingCancellationsRef = useRef<PendingCancellation[]>([]);
  useEffect(() => { pendingCancellationsRef.current = pendingCancellations; }, [pendingCancellations]);

  // Countdown ticker for undo toasts (re-renders once/sec)
  const [undoTicker, setUndoTicker] = useState(0);
  useEffect(() => {
    if (pendingCancellations.length === 0) return;
    const iv = setInterval(() => setUndoTicker(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [pendingCancellations.length]);

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

  const [adminActiveTab, setAdminActiveTab] = useState<'orders' | 'floor' | 'menu' | 'tables' | 'history' | 'analytics'>('orders');

  const authRole = useMemo(() => {
    const token = localStorage.getItem('kcode_auth_token');
    if (!token) return null;
    try {
      return JSON.parse(token).role;
    } catch {
      return null;
    }
  }, [isAuthenticated]);

  const activeBuzzersCount = useMemo(() => {
    return buzzers.filter(b => b.restaurantId === selectedRestaurantId).length;
  }, [buzzers, selectedRestaurantId]);

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

  const handleLogoClick = () => {
    if (activeMode === 'restadmin') {
      setAdminActiveTab('orders');
    } else {
      navigateTo('/portal');
    }
  };

  const handleLoginSuccess = (mode: 'restadmin' | 'kitchen' | 'superadmin') => {
    setIsAuthenticated(true);
    setActiveMode(mode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('kcode_auth_token');
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
          localStorage.setItem('kcode_auth_token', JSON.stringify({
            role: roleData.role,
            restaurantId: roleData.restaurant_id || ''
          }));
        }
      } else {
        const localToken = localStorage.getItem('kcode_auth_token');
        if (localToken) {
          try {
            const parsed = JSON.parse(localToken);
            if (parsed.role === 'restadmin' || parsed.role === 'kitchen') {
              setIsAuthenticated(true);
              setActiveMode(parsed.role);
              if (parsed.restaurantId) setSelectedRestaurantId(parsed.restaurantId);
              return;
            }
          } catch (e) { }
        }
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

  // Poll database every 5 seconds for orders and buzzers as a fallback to Supabase Realtime channel
  useEffect(() => {
    const interval = setInterval(() => {
      supabase.from('orders').select('*').then(({ data }) => {
        if (data) {
          const list = data.map(toCamel) as Order[];
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(list)) {
              return list;
            }
            return prev;
          });
        }
      });

      supabase.from('buzzers').select('*').then(({ data }) => {
        if (data) {
          const list = data.map(toCamel) as Buzzer[];
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setBuzzers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(list)) {
              return list;
            }
            return prev;
          });
        }
      });
    }, 5000);

    return () => clearInterval(interval);
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
        const data = await res.json();
        if (data && data.orders) {
          setOrders(data.orders);
        }
      }
    } catch (e) {
      triggerAppAlert("Error", "Could not submit status override to network.", "error");
    }
  };

  // Direct (no undo) cancel dish — used internally after grace period
  const commitCancelSpecificDish = async (orderId: string, itemIdx: number, snapshotOrder: Order) => {
    try {
      const remainingItems = snapshotOrder.items.filter((_, idx) => idx !== itemIdx);
      let nextStatus = snapshotOrder.status as any;
      let newTotal = 0;
      if (remainingItems.length === 0) {
        nextStatus = 'rejected';
        newTotal = 0;
      } else {
        newTotal = remainingItems.reduce((acc, chunk) => acc + (chunk.price * chunk.quantity), 0);
      }
      const updatedOrder = { ...snapshotOrder, items: remainingItems, status: nextStatus, totalAmount: newTotal };
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedOrder) });
      const data = await res.json();
      if (data && data.orders) setOrders(data.orders);
    } catch (e) {
      triggerAppAlert("Override Failure", "Could not remove specific item on the server.", "error");
    }
  };

  // Direct (no undo) cancel entire order — used internally after grace period
  const commitCancelOrder = async (orderId: string, released?: boolean) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        const updatedOrder = {
          ...targetOrder,
          status: 'rejected',
          released: released ?? targetOrder.released
        };
        const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedOrder) });
        const data = await res.json();
        if (data && data.orders) setOrders(data.orders);
      }
    } catch (e) {
      triggerAppAlert("Error", "Could not submit cancellation to network.", "error");
    }
  };

  // ── Undo-aware cancel handler for ENTIRE order ──
  const handleCancelOrderWithUndo = useCallback((orderId: string, released?: boolean) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // If someone is trying to set status to 'rejected', route through undo
    const cancelId = 'cancel-' + orderId + '-' + Date.now();
    const snapshot = { ...targetOrder, items: [...targetOrder.items] };
    const dishLabel = targetOrder.items.map(i => i.name).join(', ');

    const timerId = setTimeout(() => {
      // Grace period expired — commit the cancellation
      commitCancelOrder(orderId, released);
      setPendingCancellations(prev => prev.map(pc => pc.id === cancelId ? { ...pc, committed: true } : pc));
      // Auto-remove undo toast after committed
      setTimeout(() => {
        setPendingCancellations(prev => prev.filter(pc => pc.id !== cancelId));
      }, 2000);
    }, 15000);

    const pc: PendingCancellation = {
      id: cancelId,
      type: 'order',
      orderId,
      originalOrder: snapshot,
      expiresAt: Date.now() + 15000,
      timerId,
      committed: false,
      label: `Order #${orderId.split('-')[1]} — Table #${targetOrder.tableNumber} (${dishLabel})`
    };

    setPendingCancellations(prev => [...prev, pc]);
  }, [orders]);

  // ── Undo-aware cancel handler for SPECIFIC DISH ──
  const handleCancelDishWithUndo = useCallback((orderId: string, itemIdx: number) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder || !targetOrder.items[itemIdx]) return;

    const cancelId = 'cancel-dish-' + orderId + '-' + itemIdx + '-' + Date.now();
    const snapshot = { ...targetOrder, items: [...targetOrder.items] };
    const dishName = targetOrder.items[itemIdx].name;

    const timerId = setTimeout(() => {
      // Grace period expired — commit the dish removal
      commitCancelSpecificDish(orderId, itemIdx, snapshot);
      setPendingCancellations(prev => prev.map(pc => pc.id === cancelId ? { ...pc, committed: true } : pc));
      setTimeout(() => {
        setPendingCancellations(prev => prev.filter(pc => pc.id !== cancelId));
      }, 2000);
    }, 15000);

    const pc: PendingCancellation = {
      id: cancelId,
      type: 'dish',
      orderId,
      itemIdx,
      originalOrder: snapshot,
      expiresAt: Date.now() + 15000,
      timerId,
      committed: false,
      label: `"${dishName}" from Order #${orderId.split('-')[1]}`
    };

    setPendingCancellations(prev => [...prev, pc]);
    triggerAppAlert("Cancellation Pending", `"${dishName}" will be cancelled in 15 seconds. You can undo from the notification below.`, "info");
  }, [orders]);

  // ── Undo handler ──
  const handleUndoCancellation = useCallback((cancelId: string) => {
    const pc = pendingCancellationsRef.current.find(p => p.id === cancelId);
    if (!pc || pc.committed) return;
    clearTimeout(pc.timerId);
    setPendingCancellations(prev => prev.filter(p => p.id !== cancelId));
    triggerAppAlert("Cancellation Reverted", `Undo successful — ${pc.label} has been restored.`, "success");
  }, []);

  // ── Wrapper that routes reject through undo, passes everything else through directly ──
  const handleUpdateOrderStatusWithUndo = useCallback((orderId: string, nextStatus: any, released?: boolean) => {
    if (nextStatus === 'rejected') {
      handleCancelOrderWithUndo(orderId, released);
    } else {
      handleUpdateOrderStatus(orderId, nextStatus, released);
    }
  }, [handleCancelOrderWithUndo, orders]);

  const handleCancelSpecificDish = async (orderId: string, itemIdx: number) => {
    handleCancelDishWithUndo(orderId, itemIdx);
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
      const data = await resOrder.json();
      if (data && data.orders) {
        setOrders(data.orders);
      }

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

  const handleToggleOperationalStatusHeader = () => {
    if (activeRestaurantObj.lockedBySuperAdmin) {
      triggerAppAlert(
        "Administrative Hold Lock",
        "Administrative Hold: Your kitchen operational privileges are currently locked by kCodeIT Super Admin. Please contact APP Admins to reactivate.",
        "error"
      );
      return;
    }
    const nextStatus = activeRestaurantObj.status === 'active' ? 'inactive' : 'active';
    handleSetRestaurantStatus(nextStatus);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Global Header — visible on portal routes when authenticated */}
      {isPortalRoute && isAuthenticated && (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm/5">
          <div className="max-w-full px-6 sm:px-10 lg:px-12">
            <div className="flex items-center justify-between py-6 sm:py-7">

              {/* Left: Brand / Restaurant Info & Status */}
              <div onClick={() => navigateTo('/')} className="flex items-center gap-3 cursor-pointer group shrink-0">
                {activeMode !== 'superadmin' && activeRestaurantObj?.logoUrl ? (
                  <img
                    src={activeRestaurantObj.logoUrl}
                    alt={activeRestaurantObj.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-inner transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center transition duration-300 group-hover:bg-indigo-700 shadow-md">
                    <span className="text-sm font-black text-white">R</span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                      {activeMode === 'superadmin' ? 'Restro Super Admin' : (activeRestaurantObj?.name || 'Restro')}
                    </h1>

                    {activeMode === 'restadmin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleOperationalStatusHeader();
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border transition flex items-center gap-1 cursor-pointer ${activeRestaurantObj.lockedBySuperAdmin ? 'bg-rose-100 border-rose-300 text-rose-800' :
                          activeRestaurantObj.status === 'active' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200' :
                            'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {activeRestaurantObj.lockedBySuperAdmin ? (
                          <span>LOCKED</span>
                        ) : activeRestaurantObj.status === 'active' ? (
                          <>
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            <span>ONLINE</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                            <span>OFFLINE</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase leading-none">
                    {activeMode === 'superadmin' ? 'Platform Console' : activeMode === 'kitchen' ? 'Kitchen Monitor' : 'Management Portal'}
                  </span>
                </div>
              </div>

              {/* Middle: Navigation tabs for Restaurant Admin */}
              {activeMode === 'restadmin' && (
                <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner/10">
                  {(['orders', 'floor', 'menu', 'tables', 'history', 'analytics'] as const).map(tab => {
                    const tabMeta = {
                      orders: { label: 'Live Orders', icon: ClipboardList },
                      floor: { label: 'Floor & Seating', icon: LayoutGrid },
                      menu: { label: 'Menu Management', icon: Utensils },
                      tables: { label: 'QR', icon: QrCode },
                      history: { label: 'Sales History', icon: History },
                      analytics: { label: 'Analytics', icon: BarChart3 }
                    }[tab];
                    const Icon = tabMeta.icon;
                    const isActive = adminActiveTab === tab;

                    return (
                      <button
                        key={tab}
                        onClick={() => setAdminActiveTab(tab)}
                        className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-205 flex items-center gap-2 cursor-pointer relative ${isActive
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-250/30 scale-[1.01]'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                          }`}
                      >
                        <div className="relative flex items-center justify-center">
                          <Icon size={13} className={`stroke-[2.5] ${isActive ? 'text-indigo-650' : 'text-slate-400'}`} />
                          {tab === 'orders' && activeBuzzersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                          )}
                        </div>
                        <span>{tabMeta.label}</span>
                        {tab === 'orders' && activeBuzzersCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md animate-bounce shadow-sm">
                            {activeBuzzersCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Right: Logout */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-slate-200 hover:border-rose-200 transition cursor-pointer"
              >
                Log Out
              </button>

            </div>

            {/* Mobile Tab Row */}
            {activeMode === 'restadmin' && (
              <div className="flex md:hidden overflow-x-auto gap-1.5 pb-3 pt-1 border-t border-slate-100 scrollbar-none">
                {(['orders', 'floor', 'menu', 'tables', 'history', 'analytics'] as const).map(tab => {
                  const tabMeta = {
                    orders: { label: 'Live Orders', icon: ClipboardList },
                    floor: { label: 'Floor & Seating', icon: LayoutGrid },
                    menu: { label: 'Menu Management', icon: Utensils },
                    tables: { label: 'QR', icon: QrCode },
                    history: { label: 'Sales History', icon: History },
                    analytics: { label: 'Analytics', icon: BarChart3 }
                  }[tab];
                  const Icon = tabMeta.icon;
                  const isActive = adminActiveTab === tab;

                  return (
                    <button
                      key={tab}
                      onClick={() => setAdminActiveTab(tab)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer relative ${isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                      <Icon size={12} />
                      <span>{tabMeta.label}</span>
                      {tab === 'orders' && activeBuzzersCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded animate-bounce shadow-xs">
                          {activeBuzzersCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

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
                  onUpdateOrderStatus={handleUpdateOrderStatusWithUndo}
                  onCancelSpecificDish={handleCancelSpecificDish}
                  onTableUpdate={(count, floors) => handleModifyRestaurantTablesGlobal(activeRestaurantObj.id, count, floors)}
                  triggerAppAlert={triggerAppAlert}
                  buzzers={buzzers}
                  activeTab={adminActiveTab}
                  setActiveTab={setAdminActiveTab}
                  pendingCancellations={pendingCancellations}
                />
              )}

              {activeMode === 'kitchen' && (
                <KitchenDisplaySystem
                  restaurant={activeRestaurantObj}
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatusWithUndo}
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
        {/* Undo Cancellation Toasts */}
        {pendingCancellations.map(pc => {
          const remaining = Math.max(0, Math.ceil((pc.expiresAt - Date.now()) / 1000));
          const progress = Math.min(100, ((15 - remaining) / 15) * 100);
          return (
            <div
              key={pc.id}
              className={`pointer-events-auto flex flex-col gap-2 p-4 rounded-2xl shadow-2xl border transition-all duration-300 ${
                pc.committed
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {pc.committed ? (
                    <AlertOctagon size={18} className="text-rose-500" />
                  ) : (
                    <Undo2 size={18} className="text-amber-600 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <h5 className="text-xs font-black text-slate-950 leading-tight">
                    {pc.committed ? 'Cancelled & Notified' : 'Cancellation Pending'}
                  </h5>
                  <p className="text-[10.5px] text-slate-600 font-semibold leading-relaxed truncate">
                    {pc.label}
                  </p>
                  {!pc.committed && (
                    <p className="text-[10px] font-mono font-black text-amber-700">
                      Auto-confirms in {remaining}s
                    </p>
                  )}
                </div>
                {!pc.committed && (
                  <button
                    onClick={() => handleUndoCancellation(pc.id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Undo2 size={11} />
                    Undo
                  </button>
                )}
              </div>
              {!pc.committed && (
                <div className="w-full bg-amber-200 rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

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
