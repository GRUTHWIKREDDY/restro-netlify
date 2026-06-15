import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Plus, Search, Sparkles, BrainCircuit, Bot, X, 
  TrendingUp, QrCode, ClipboardList, AlertOctagon, CheckCircle, 
  Trash2, RefreshCw, Sliders, Lock, Unlock, Settings2, FileText
} from 'lucide-react';
import { Restaurant, MenuItem, Order } from '../types';
import { supabase, toSnake } from '../supabase';
import AnalyticsDashboard from './analytics/AnalyticsDashboard';
import { calculateBillSummary } from '../utils/billing';

interface SuperAdminProps {
  restaurants: Restaurant[];
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>;
  menus: MenuItem[];
  orders: Order[];
  onUpdateOrderStatusGlobal: (orderId: string, targetStatus: any) => void;
  onModifyRestaurantTablesGlobal: (id: string, newTotal: number) => void;
  setSelectedRestaurantId: (id: string) => void;
  setActiveMode: (mode: string) => void;
  triggerAppAlert: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  ticker: number;
}

export default function SuperAdminDashboard({
  restaurants,
  setRestaurants,
  menus,
  orders,
  onUpdateOrderStatusGlobal,
  onModifyRestaurantTablesGlobal,
  setSelectedRestaurantId,
  setActiveMode,
  triggerAppAlert,
  ticker
}: SuperAdminProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [overlayTab, setOverlayTab] = useState<'tenants' | 'seating' | 'feed' | 'accounting' | 'aiSaaS' | 'history' | 'analytics' | null>(null);
  const [overlaySearch, setOverlaySearch] = useState('');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'rejected'>('all');
  const [historyReleaseFilter, setHistoryReleaseFilter] = useState<'all' | 'active' | 'cleared'>('all');
  const [historyMinAmount, setHistoryMinAmount] = useState<string>('');
  const [historyMaxAmount, setHistoryMaxAmount] = useState<string>('');
  const [showAllHistoryDates, setShowAllHistoryDates] = useState<boolean>(false);

  // Time filter states for transaction feed & accounting
  const [feedTimeFilter, setFeedTimeFilter] = useState<'today' | 'all'>('today');
  const [accountingTimeFilter, setAccountingTimeFilter] = useState<'today' | 'all'>('today');

  // AI states
  const [isGeneratingSaaSReport, setIsGeneratingSaaSReport] = useState(false);
  const [aiSaaSReport, setAiSaaSReport] = useState('');

  // Add Tenant states
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantLogo, setTenantLogo] = useState('');
  const [tenantTables, setTenantTables] = useState('8');
  const [tenantLatitude, setTenantLatitude] = useState('28.5672');
  const [tenantLongitude, setTenantLongitude] = useState('77.2025');
  const [tenantVerificationPin, setTenantVerificationPin] = useState('1234');
  const [tenantAdminEmail, setTenantAdminEmail] = useState('');
  const [tenantAdminPassword, setTenantAdminPassword] = useState('');
  const [tenantChefEmail, setTenantChefEmail] = useState('');
  const [tenantChefPassword, setTenantChefPassword] = useState('');

  // Tenant creation confirmation overlay
  const [tenantConfirmation, setTenantConfirmation] = useState<{
    id: string;
    name: string;
    url: string;
    adminUsername: string;
    adminPassword: string;
    chefUsername: string;
    chefPassword: string;
    verificationPin: string;
    totalTables: number;
  } | null>(null);

  // Edit Tenant states
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
  const [editTenantId, setEditTenantId] = useState('');
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantLogo, setEditTenantLogo] = useState('');
  const [editTenantTables, setEditTenantTables] = useState('8');
  const [editTenantLatitude, setEditTenantLatitude] = useState('28.5672');
  const [editTenantLongitude, setEditTenantLongitude] = useState('77.2025');
  const [editTenantVerificationPin, setEditTenantVerificationPin] = useState('1234');

  // Capability Management state parameters
  const [isManageTenantOpen, setIsManageTenantOpen] = useState(false);
  const [selectedManageTenant, setSelectedManageTenant] = useState<Restaurant | null>(null);
  const [manageStatus, setManageStatus] = useState<"active" | "inactive">("active");
  const [manageLockAllItems, setManageLockAllItems] = useState(false);
  const [manageDisableQr, setManageDisableQr] = useState(false);
  const [manageHideHistory, setManageHideHistory] = useState(false);
  const [manageDisableAdmin, setManageDisableAdmin] = useState(false);
  const [manageDisableKds, setManageDisableKds] = useState(false);
  const [manageAdminEmail, setManageAdminEmail] = useState('');
  const [manageAdminPassword, setManageAdminPassword] = useState('');
  const [manageChefEmail, setManageChefEmail] = useState('');
  const [manageChefPassword, setManageChefPassword] = useState('');
  const [manageEnableSlaWarning, setManageEnableSlaWarning] = useState(false);
  const [manageModalTab, setManageModalTab] = useState<'capabilities' | 'analytics'>('capabilities');

  // SAAS Ledger parameters
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedLedgerTenant, setSelectedLedgerTenant] = useState<Restaurant | null>(null);
  const [ledgerFromDate, setLedgerFromDate] = useState('');
  const [ledgerToDate, setLedgerToDate] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  const globalAnalytics = useMemo(() => {
    const activeBrands = restaurants.filter(r => r.status === 'active' && !r.lockedBySuperAdmin).length;
    const totalBrands = restaurants.length;
    const totalTables = restaurants.reduce((sum, r) => sum + r.totalTables, 0);
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status !== 'rejected')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return { activeBrands, totalBrands, totalTables, totalOrders, totalRevenue };
  }, [restaurants, orders]);

  const tenantOrders = useMemo(() => {
    if (!selectedManageTenant) return [];
    return orders.filter(o => o.restaurantId === selectedManageTenant.id && o.status !== 'rejected');
  }, [orders, selectedManageTenant]);

  const tenantGrossSales = useMemo(() => {
    return tenantOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [tenantOrders]);

  const tenantOrderCount = tenantOrders.length;
  const tenantAverageTicket = tenantOrderCount > 0 ? tenantGrossSales / tenantOrderCount : 0;

  const tenantAverageRating = useMemo(() => {
    if (!selectedManageTenant) return 4.5;
    const rMenus = menus.filter(m => m.restaurantId === selectedManageTenant.id);
    const ratedMenus = rMenus.filter(m => m.avgRating !== undefined && m.avgRating > 0);
    if (ratedMenus.length === 0) return 4.5;
    return ratedMenus.reduce((sum, m) => sum + (m.avgRating || 0), 0) / ratedMenus.length;
  }, [menus, selectedManageTenant]);



  const todayFinancials = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const validOrders = orders.filter(o => o.status !== 'rejected');
    const todayOrders = validOrders.filter(o => o.createdAt && o.createdAt.split('T')[0] === todayStr);

    let originalSubtotal = 0;
    let promoDeductions = 0;
    let finalGrossRevenue = 0;

    todayOrders.forEach(ord => {
      const summary = calculateBillSummary(ord.items);
      originalSubtotal += summary.originalSubtotal;
      promoDeductions += summary.totalDeductions;
      finalGrossRevenue += summary.finalPayable;
    });

    return {
      ordersCount: todayOrders.length,
      originalSubtotal,
      promoDeductions,
      finalGrossRevenue,
      validOrders: todayOrders
    };
  }, [orders]);

  const allTimeFinancials = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'rejected');

    let originalSubtotal = 0;
    let promoDeductions = 0;
    let finalGrossRevenue = 0;

    validOrders.forEach(ord => {
      const summary = calculateBillSummary(ord.items);
      originalSubtotal += summary.originalSubtotal;
      promoDeductions += summary.totalDeductions;
      finalGrossRevenue += summary.finalPayable;
    });

    return {
      ordersCount: validOrders.length,
      originalSubtotal,
      promoDeductions,
      finalGrossRevenue,
      validOrders
    };
  }, [orders]);

  const globalDailyHistorySummaries = useMemo(() => {
    const summaries: Record<string, { count: number; revenue: number; orders: Order[] }> = {};
    
    orders.forEach(o => {
      const rawDate = o.createdAt ? o.createdAt.split('T')[0] : 'Unknown Date';
      if (!summaries[rawDate]) {
        summaries[rawDate] = { count: 0, revenue: 0, orders: [] };
      }
      summaries[rawDate].count += 1;
      if (o.status !== 'rejected') {
        summaries[rawDate].revenue += o.totalAmount;
      }
      summaries[rawDate].orders.push(o);
    });

    return Object.keys(summaries)
      .sort((a, b) => b.localeCompare(a))
      .map(dateStr => ({
        dateStr,
        ...summaries[dateStr]
      }));
  }, [orders]);

  useEffect(() => {
    if (!selectedHistoryDate && globalDailyHistorySummaries.length > 0) {
      setSelectedHistoryDate(globalDailyHistorySummaries[0].dateStr);
    }
  }, [globalDailyHistorySummaries, selectedHistoryDate]);

  useEffect(() => {
    if (!restaurants || restaurants.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenantId');
    const action = params.get('action');
    if (tenantId && action) {
      const tenant = restaurants.find(r => r.id === tenantId);
      if (tenant) {
        if (action === 'ledger') {
          openLedgerLocal(tenant);
        } else if (action === 'manage') {
          openManageLocal(tenant);
        } else if (action === 'edit') {
          openEditLocal(tenant);
        }
        // Clear params from address bar
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [restaurants]);

  const filteredGlobalHistoryOrders = useMemo(() => {
    let sourceOrders: Order[] = [];
    if (showAllHistoryDates) {
      sourceOrders = orders;
    } else {
      const activeDateGroup = globalDailyHistorySummaries.find(g => g.dateStr === selectedHistoryDate);
      if (activeDateGroup) {
        sourceOrders = activeDateGroup.orders;
      }
    }

    return sourceOrders.filter(o => {
      // 1. Text Search Filter (Guarded against null/undefined)
      const text = overlaySearch.trim().toLowerCase();
      const tenant = restaurants.find(r => r.id === o.restaurantId);
      const tenantName = tenant ? (tenant.name || '').toLowerCase() : '';

      if (text) {
        const userName = (o.userName || '').toLowerCase();
        const userPhone = (o.userPhone || '');
        const orderId = (o.id || '').toLowerCase();
        const tableStr = (o.tableNumber !== undefined && o.tableNumber !== null) ? o.tableNumber.toString() : '';
        const itemsMatch = o.items ? o.items.some(i => (i.name || '').toLowerCase().includes(text)) : false;

        const matchesText = userName.includes(text) ||
          userPhone.includes(text) ||
          orderId.includes(text) ||
          tableStr.includes(text) ||
          tenantName.includes(text) ||
          itemsMatch;

        if (!matchesText) return false;
      }

      // 2. Status Filter
      if (historyStatusFilter !== 'all' && o.status !== historyStatusFilter) {
        return false;
      }

      // 3. Release/Cleared State Filter
      if (historyReleaseFilter !== 'all') {
        const isReleased = o.released === true;
        if (historyReleaseFilter === 'active' && isReleased) return false;
        if (historyReleaseFilter === 'cleared' && !isReleased) return false;
      }

      // 4. Price/Amount Filter
      if (historyMinAmount) {
        const minVal = parseFloat(historyMinAmount);
        if (!isNaN(minVal) && o.totalAmount < minVal) return false;
      }
      if (historyMaxAmount) {
        const maxVal = parseFloat(historyMaxAmount);
        if (!isNaN(maxVal) && o.totalAmount > maxVal) return false;
      }

      return true;
    });
  }, [orders, globalDailyHistorySummaries, selectedHistoryDate, showAllHistoryDates, overlaySearch, restaurants, historyStatusFilter, historyReleaseFilter, historyMinAmount, historyMaxAmount]);

  const formatHistoryDate = (dateStr: string) => {
    if (dateStr === 'Unknown Date') return 'Unknown Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const openEditLocal = (tenant: Restaurant) => {
    setEditTenantId(tenant.id);
    setEditTenantName(tenant.name);
    setEditTenantLogo(tenant.logoUrl);
    setEditTenantTables(tenant.totalTables.toString());
    setEditTenantLatitude((tenant.latitude || 28.5672).toString());
    setEditTenantLongitude((tenant.longitude || 77.2025).toString());
    setEditTenantVerificationPin(tenant.verificationPin || "1234");
    setIsEditTenantOpen(true);
  };

  const handleOpenEditTenant = (tenant: Restaurant) => {
    openEditLocal(tenant);
  };

  const selectedTenantLedgerBreakdown = useMemo(() => {
    if (!selectedLedgerTenant) return { validOrders: [], baseSubtotal: 0, deductions: 0, finalNet: 0 };
    const tOrders = orders.filter(o => o.restaurantId === selectedLedgerTenant.id && o.status !== 'rejected');
    const filteredOrders = tOrders.filter(o => {
      const dateStr = o.createdAt?.split('T')[0] || '';
      if (ledgerFromDate && dateStr < ledgerFromDate) return false;
      if (ledgerToDate && dateStr > ledgerToDate) return false;
      if (ledgerSearch) {
        return o.id.includes(ledgerSearch) || o.userName.toLowerCase().includes(ledgerSearch.toLowerCase()) || o.tableNumber.toString() === ledgerSearch;
      }
      return true;
    });

    let baseSubtotal = 0;
    let deductions = 0;
    let finalNet = 0;

    filteredOrders.forEach(o => {
      const sum = calculateBillSummary(o.items);
      baseSubtotal += sum.originalSubtotal;
      deductions += sum.totalDeductions;
      finalNet += o.totalAmount;
    });

    return { validOrders: filteredOrders, baseSubtotal, deductions, finalNet };
  }, [selectedLedgerTenant, orders, ledgerFromDate, ledgerToDate, ledgerSearch]);

  const openLedgerLocal = (tenant: Restaurant) => {
    setSelectedLedgerTenant(tenant);
    setLedgerFromDate('');
    setLedgerToDate('');
    setLedgerSearch('');
    setIsLedgerOpen(true);
  };

  const handleOpenLedger = (tenant: Restaurant) => {
    openLedgerLocal(tenant);
  };

  const openManageLocal = async (tenant: Restaurant) => {
    setSelectedManageTenant(tenant);
    setManageStatus(tenant.status || "active");
    setManageLockAllItems(!!tenant.lockAllItems);
    setManageDisableQr(!!tenant.disableQrGeneration);
    setManageHideHistory(!!tenant.hideHistoryOlderThanOneDay);
    setManageDisableAdmin(!!tenant.disableAdminPortal);
    setManageDisableKds(!!tenant.disableKdsPortal);
    setManageEnableSlaWarning(!!tenant.enableSlaWarning);
    
    // Set default credentials
    setManageAdminEmail(`${tenant.id}@admin.it`);
    setManageAdminPassword("••••••••");
    setManageChefEmail(`${tenant.id}@chef.it`);
    setManageChefPassword("••••••••");
    
    setManageModalTab('capabilities');
    setIsManageTenantOpen(true);

    try {
      const res = await fetch(`/api/admin/get-staff/${tenant.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.staff) {
          const adminStaff = data.staff.find((s: any) => s.role === 'restadmin');
          const chefStaff = data.staff.find((s: any) => s.role === 'kitchen');
          if (adminStaff) setManageAdminEmail(adminStaff.email);
          if (chefStaff) setManageChefEmail(chefStaff.email);
        }
      }
    } catch (err) {
      console.error("Failed to load staff details:", err);
    }
  };

  const handleOpenManageTenant = (tenant: Restaurant) => {
    openManageLocal(tenant);
  };

  const handleSaveCapabilities = async () => {
    if (!selectedManageTenant) return;
    const updatedTenant: Restaurant = {
      ...selectedManageTenant,
      status: manageStatus,
      lockAllItems: manageLockAllItems,
      disableQrGeneration: manageDisableQr,
      hideHistoryOlderThanOneDay: manageHideHistory,
      disableAdminPortal: manageDisableAdmin,
      disableKdsPortal: manageDisableKds,
      enableSlaWarning: manageEnableSlaWarning,
      adminUsername: manageAdminEmail.trim(),
      adminPassword: manageAdminPassword !== "••••••••" ? manageAdminPassword : selectedManageTenant.adminPassword,
      chefUsername: manageChefEmail.trim(),
      chefPassword: manageChefPassword !== "••••••••" ? manageChefPassword : selectedManageTenant.chefPassword,
    };

    try {
      // 1. Direct Firestore write
      await supabase.from('restaurants').upsert(toSnake(updatedTenant), { onConflict: 'id' });

      // 2. Post node update to sync in-memory databases
      const restRes = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTenant)
      });
      if (!restRes.ok) {
        const errData = await restRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update restaurant capabilities");
      }

      // 3. Update staff user credentials (Admin)
      if (manageAdminEmail.trim()) {
        const adminRes = await fetch("/api/admin/update-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: manageAdminEmail.trim(),
            password: manageAdminPassword !== "••••••••" ? manageAdminPassword : undefined,
            role: "restadmin",
            restaurantId: selectedManageTenant.id
          })
        });
        if (!adminRes.ok) {
          const errData = await adminRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update admin credentials");
        }
      }

      // 4. Update staff user credentials (Chef)
      if (manageChefEmail.trim()) {
        const chefRes = await fetch("/api/admin/update-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: manageChefEmail.trim(),
            password: manageChefPassword !== "••••••••" ? manageChefPassword : undefined,
            role: "kitchen",
            restaurantId: selectedManageTenant.id
          })
        });
        if (!chefRes.ok) {
          const errData = await chefRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update chef credentials");
        }
      }

      triggerAppAlert(
        "Tenant Managed Successfully", 
        `Administrative policies, capabilities, portal lockdowns, and credentials have been updated live for ${selectedManageTenant.name}.`, 
        "success"
      );
      setIsManageTenantOpen(false);
    } catch (err: any) {
      triggerAppAlert("Write Failure", err.message || "Failed to compile the merchant policy updates to the database.", "error");
    }
  };

  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTenantName.trim()) {
      triggerAppAlert("Validation Warning", "A descriptive Tenant Restaurant name is mandatory.", "error");
      return;
    }

    const tQty = parseInt(editTenantTables);
    if (isNaN(tQty) || tQty < 1 || tQty > 50) {
      triggerAppAlert("Configuration limits", "Set allocated table nodes count between 1 and 50 seats.", "error");
      return;
    }

    const pin = editTenantVerificationPin.trim() || "1234";
    if (pin.length !== 4 || isNaN(parseInt(pin))) {
      triggerAppAlert("Validation Warning", "Verification code must be exactly 4 digits.", "error");
      return;
    }

    const lat = parseFloat(editTenantLatitude) || 28.5672;
    const lng = parseFloat(editTenantLongitude) || 77.2025;

    const tenant = restaurants.find(r => r.id === editTenantId);
    if (!tenant) return;

    const updatedTenant: Restaurant = {
      ...tenant,
      name: editTenantName.trim(),
      logoUrl: editTenantLogo.trim() || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80",
      totalTables: tQty,
      latitude: lat,
      longitude: lng,
      verificationPin: pin
    };

    try {
      // Direct Firestore write for high robustness and instant sync
      await supabase.from('restaurants').upsert(toSnake(updatedTenant), { onConflict: 'id' });

      // REST backup
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTenant)
      });
      if (res.ok) {
        await res.json();
      }

      setIsEditTenantOpen(false);
      triggerAppAlert("Tenant Brand Updated", `Successfully saved changes for ${updatedTenant.name}.`, "success");
    } catch (err) {
      triggerAppAlert("Onboarding Error", "Failed to update restaurant details on the server or database.", "error");
    }
  };

  const handleGenerateAiSaaSInsights = async () => {
    setIsGeneratingSaaSReport(true);
    setAiSaaSReport('');

    try {
      const res = await fetch("/api/gemini/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: `Context:
Total Onboarded Brand Tenants: ${JSON.stringify(restaurants.map(r => ({ name: r.name, id: r.id, tables: r.totalTables, suspended: r.lockedBySuperAdmin, active: r.status === 'active' })))}
Global Sales Volume across SaaS net: ₹${globalAnalytics.totalRevenue.toFixed(2)} INR
Total orders compiled: ${globalAnalytics.totalOrders} transactions

Task:
You are the Platform SaaS growth advisor for kCodeIT Multi-Tenant Digital Menu Suite in India. Generate a concise strategic plan for platform expansion. Mention techniques to improve table scale count and retain merchants. Keep it restricted to 4 clear, elite professional bullet points.`
        })
      });

      const data = await res.json();
      setAiSaaSReport(data.text || "Could not retrieve strategic recommendations from GenAI.");
      setOverlayTab('aiSaaS');
    } catch (err) {
      triggerAppAlert("AI Diagnostic Error", "Failed to retrieve strategic analysis vectors. Please try again.", "error");
    } finally {
      setIsGeneratingSaaSReport(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOnboarding) return;

    if (!tenantName.trim()) {
      triggerAppAlert("Validation Warning", "A descriptive Tenant Restaurant name is mandatory.", "error");
      return;
    }

    const tQty = parseInt(tenantTables);
    if (isNaN(tQty) || tQty < 1 || tQty > 50) {
      triggerAppAlert("Configuration limits", "Set allocated table nodes count between 1 and 50 seats.", "error");
      return;
    }

    const pin = tenantVerificationPin.trim() || "1234";
    if (pin.length !== 4 || isNaN(parseInt(pin))) {
      triggerAppAlert("Validation Warning", "Verification code must be exactly 4 digits.", "error");
      return;
    }

    const lat = parseFloat(tenantLatitude) || 28.5672;
    const lng = parseFloat(tenantLongitude) || 77.2025;

    // Collision-free sequential ID generation
    const existingIds = restaurants.map(r => {
      const match = r.id.match(/^rest-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextId = "rest-" + (maxNum + 1);

    const newTenant: Restaurant = {
      id: nextId,
      name: tenantName.trim(),
      logoUrl: tenantLogo.trim() || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80",
      status: "active",
      lockedBySuperAdmin: false,
      totalTables: tQty,
      latitude: lat,
      longitude: lng,
      geofenceRadiusMeters: 150,
      verificationPin: pin,
      adminUsername: tenantAdminEmail.trim() || `${nextId}@admin.it`,
      adminPassword: tenantAdminPassword.trim() || "password",
      chefUsername: tenantChefEmail.trim() || `${nextId}@chef.it`,
      chefPassword: tenantChefPassword.trim() || "password",
    };

    setIsOnboarding(true);
    try {
      // 1. Create Supabase auth users for admin and chef via backend
      const createAdminRes = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tenantAdminEmail.trim() || `${nextId}@admin.it`,
          password: tenantAdminPassword.trim() || "password",
          role: 'restadmin',
          restaurantId: nextId
        })
      });

      if (!createAdminRes.ok) {
        throw new Error((await createAdminRes.json()).error || "Failed to create Admin user");
      }

      const createChefRes = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tenantChefEmail.trim() || `${nextId}@chef.it`,
          password: tenantChefPassword.trim() || "password",
          role: 'kitchen',
          restaurantId: nextId
        })
      });

      if (!createChefRes.ok) {
        throw new Error((await createChefRes.json()).error || "Failed to create Chef user");
      }
      // 1. Direct Firestore write for restaurant document
      await supabase.from('restaurants').upsert(toSnake(newTenant), { onConflict: 'id' });

      // 2. Direct Firestore write for 3 delightful starter menu items to ensure KDS, Admin, and Diner menus work out-of-the-box!
      const starterMenus = [
        {
          id: `menu-init-${newTenant.id}-1`,
          restaurantId: newTenant.id,
          name: "Signature Butter Chicken Special",
          description: "Overnight marinated clay oven slow chicken chunks finished in sweet velvety tomato gravy.",
          price: 360,
          category: "Mains",
          isAvailable: true,
          isLimitedTimeOffer: false,
          offerDetails: "",
          promoValue: 0,
          isVeg: false,
          imageUrl: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400",
          avgRating: 4.8,
          ratingsCount: 24
        },
        {
          id: `menu-init-${newTenant.id}-2`,
          restaurantId: newTenant.id,
          name: "Crispy Clay Tandoori Naan Set",
          description: "Freshly slapped whole-wheat bread baked inside our clay oven glazed with churned white butter.",
          price: 80,
          category: "Mains",
          isAvailable: true,
          isLimitedTimeOffer: false,
          offerDetails: "",
          promoValue: 0,
          isVeg: true,
          imageUrl: "https://images.unsplash.com/photo-1546833959-52319ef16fb7?w=400"
        },
        {
          id: `menu-init-${newTenant.id}-3`,
          restaurantId: newTenant.id,
          name: "Alphonso Spiced Sweet Mango Lassi",
          description: "Double-churned whole organic yogurt beverage sweetened with raw sugar and cardamom flakes.",
          price: 120,
          category: "Drinks",
          isAvailable: true,
          isLimitedTimeOffer: false,
          offerDetails: "",
          promoValue: 0,
          isVeg: true,
          imageUrl: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400"
        }
      ];

      for (const m of starterMenus) {
        await supabase.from('menu_items').upsert(toSnake(m), { onConflict: 'id' });
      }

      // REST backend proxy sync
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTenant)
      });
      if (res.ok) {
        await res.json();
      }

      setSelectedRestaurantId(newTenant.id); // Auto-focus viewing tenant
      setIsAddTenantOpen(false);

      // Show confirmation overlay with URL + credentials
      setTenantConfirmation({
        id: newTenant.id,
        name: newTenant.name,
        url: `${window.location.origin}/r/${newTenant.id}/t/1`,
        adminEmail: tenantAdminEmail.trim() || `${nextId}@admin.it`,
        adminPassword: tenantAdminPassword.trim() || 'password',
        chefEmail: tenantChefEmail.trim() || `${nextId}@chef.it`,
        chefPassword: tenantChefPassword.trim() || 'password',
        verificationPin: pin,
        totalTables: tQty,
      });

      setTenantName('');
      setTenantLogo('');
      setTenantTables('8');
      setTenantLatitude('28.5672');
      setTenantLongitude('77.2025');
      setTenantVerificationPin('1234');

      triggerAppAlert("Tenant Brand Onboarded", `Successfully registered ${newTenant.name}. Check credentials and public URL shown in the confirmation panel.`, "success");
    } catch (err) {
      triggerAppAlert("Onboarding Error", "Failed to register new restaurant in Firestore database.", "error");
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (id === 'rest-1' || id === 'rest-2' || id === 'rest-3') {
      triggerAppAlert("Protected Establishment", "Pioneer establishments are system essentials needed for live demonstrations and cannot be deleted.", "error");
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to completely de-provision "${name}"? This removes the brand node, menus, and orders from the distributed SaaS backend.`)) {
      return;
    }

    try {
      // 1. Delete restaurant document from Firestore
      await supabase.from('restaurants').delete().eq('id', id);

      // 2. Clean up its menu catalog to avoid indexing orphans
      const associatedMenus = menus.filter(m => m.restaurantId === id);
      for (const m of associatedMenus) {
        await supabase.from('menu_items').delete().eq('id', m.id);
      }

      triggerAppAlert("Tenant Brand Deleted", `Successfully removed ${name} from our live distributed SaaS database nodes.`, "success");
    } catch (err) {
      triggerAppAlert("Deletion Failure", "Failed to delete the tenant brand from active database instances.", "error");
    }
  };

  const handleToggleSuperAdminHold = async (id: string) => {
    const tenant = restaurants.find(r => r.id === id);
    if (!tenant) return;

    const nextLock = !tenant.lockedBySuperAdmin;
    const updatedTenant = {
      ...tenant,
      lockedBySuperAdmin: nextLock,
      status: nextLock ? 'inactive' as const : tenant.status
    };

    try {
      // Direct Firestore write
      await supabase.from('restaurants').upsert(toSnake(updatedTenant), { onConflict: 'id' });

      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTenant)
      });
      if (res.ok) {
        await res.json();
      }

      // Clear full-fill tickets (completed & rejected orders) for this restaurant
      const completedOrders = orders.filter(
        o => o.restaurantId === id && (o.status === 'completed' || o.status === 'rejected')
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
          "Hold Adjusted & Tickets Cleared", 
          `Restaurant lock status updated successfully and cleared ${clearedCount} concluded/full-fill tickets.`, 
          "success"
        );
      } else {
        triggerAppAlert("Hold Updated", `Restaurant lock status updated successfully.`, "success");
      }
    } catch (err) {
      triggerAppAlert("Override Failure", "Failed to update restaurant hold settings on the database.", "error");
    }
  };

  const handleRotateVerificationPin = async (id: string) => {
    const tenant = restaurants.find(r => r.id === id);
    if (!tenant) return;

    const nextPin = Math.floor(1000 + Math.random() * 9000).toString();
    const updatedTenant = {
      ...tenant,
      verificationPin: nextPin
    };

    try {
      // Direct Firestore write
      await supabase.from('restaurants').upsert(toSnake(updatedTenant), { onConflict: 'id' });

      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTenant)
      });
      if (res.ok) {
        await res.json();
      }

      triggerAppAlert("PIN Rotated", `Successfully rotated verification code to ${nextPin} for ${tenant.name}.`, "success");
    } catch (err) {
      triggerAppAlert("Rotation Failure", "Failed to rotate verification code in database.", "error");
    }
  };

  const handleOverrideTenant = (id: string, selectMode: string) => {
    setSelectedRestaurantId(id);
    setActiveMode(selectMode);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-800">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-205 shadow-sm">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-indigo-600 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full tracking-widest uppercase">
              kCodeIT Network Core
            </span>
            <span className="bg-amber-100 text-amber-900 font-extrabold text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Sparkles size={11} className="sparkle-shiver" /> Gemini Insights Enabled
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1">SaaS Super-Admin Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Provision subscriber brands, enforce administrator locks, scale dynamic seating nodes, or override active floor order states.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <button
            onClick={handleGenerateAiSaaSInsights}
            disabled={isGeneratingSaaSReport}
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            {isGeneratingSaaSReport ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Generating strategies...</span>
              </>
            ) : (
              <>
                <BrainCircuit size={14} className="text-indigo-600" />
                <span>AI Strategic Diagnostics</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsAddTenantOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1"
          >
            <Plus size={16} />
            Register SaaS Tenant
          </button>
        </div>
      </div>      {/* Global Interactive Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <button
          onClick={() => setOverlayTab('tenants')}
          className="bg-white p-4 rounded-3xl border border-slate-200 text-left hover:border-indigo-550 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-indigo-650">Operational Brands</span>
            <h3 className="text-xl font-black text-slate-905 mt-1">
              {globalAnalytics.activeBrands} / {globalAnalytics.totalBrands} Live
            </h3>
            <p className="text-[9px] text-emerald-580 font-bold mt-1">Provisions & Holds →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 size={18} />
          </div>
        </button>

        <button
          onClick={() => setOverlayTab('seating')}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-rose-500 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-rose-600">Total Seating Maps</span>
            <h3 className="text-xl font-black text-slate-905 mt-1">{globalAnalytics.totalTables} Nodes</h3>
            <p className="text-[9px] text-rose-500 font-bold mt-1">Scale globally →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <QrCode size={18} />
          </div>
        </button>

        <button
          onClick={() => { setOverlayTab('feed'); setFeedTimeFilter('today'); }}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-yellow-500 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-yellow-600">Transactions Ledger</span>
            <div className="mt-1">
              <span className="text-xs font-bold text-slate-500 block">Today: <span className="font-black text-slate-800">{todayFinancials.ordersCount}</span></span>
              <span className="text-sm font-black text-slate-905 block">All-Time: {allTimeFinancials.ordersCount}</span>
            </div>
            <p className="text-[9px] text-yellow-600 font-bold mt-1">View receipts audit →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
            <ClipboardList size={18} />
          </div>
        </button>

        <button
          onClick={() => { setOverlayTab('accounting'); setAccountingTimeFilter('today'); }}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-emerald-555 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-emerald-300">Global Gross Revenue</span>
            <div className="mt-1">
              <span className="text-[11px] font-bold text-emerald-600 block">Today: <span className="font-extrabold">₹{todayFinancials.finalGrossRevenue.toFixed(0)}</span></span>
              <span className="text-sm font-black text-emerald-700 block">All-Time: ₹{allTimeFinancials.finalGrossRevenue.toFixed(0)}</span>
            </div>
            <p className="text-[9px] text-emerald-600 font-bold mt-1">Consolidated ledger →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </button>

        <button
          onClick={() => { setOverlayTab('history'); }}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-indigo-600 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-indigo-600">Ecosystem Histories</span>
            <div className="mt-1">
              <span className="text-xs font-bold text-slate-500 block">Day-by-Day audit</span>
              <span className="text-sm font-black text-indigo-700 block">{globalDailyHistorySummaries.length} active dates</span>
            </div>
            <p className="text-[9px] text-indigo-650 font-bold mt-1">Check full histories →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ClipboardList size={18} />
          </div>
        </button>

        <button
          onClick={() => { setOverlayTab('analytics'); }}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-violet-500 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-violet-600">📊 Analytics Suite</span>
            <div className="mt-1">
              <span className="text-xs font-bold text-slate-500 block">Cross-tenant KPIs</span>
              <span className="text-sm font-black text-violet-700 block">{globalAnalytics.totalOrders} orders tracked</span>
            </div>
            <p className="text-[9px] text-violet-600 font-bold mt-1">View analytics dashboard →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </button>

      </div>

      {/* Primary Brand Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tenant Brand Registries</h3>
            <p className="text-xs text-slate-500">Global control overrides allow rapid access into single kitchen and admin dashboards.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405" size={14} />
            <input 
              type="text" 
              placeholder="Search subscriber list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2">Gourmet Tenant Name</th>
                <th className="py-3 px-2">Local Node ID</th>
                <th className="py-3 px-2">Table Nodes</th>
                <th className="py-3 px-2">Menu catalog</th>
                <th className="py-3 px-2">Net Collects</th>
                <th className="py-3 px-2">SaaS Holds</th>
                <th className="py-3 px-2 text-right">Dashboard Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {restaurants
                .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(tenant => {
                  const menuCount = menus.filter(m => m.restaurantId === tenant.id).length;
                  const tOrders = orders.filter(o => o.restaurantId === tenant.id);
                  const grossPayable = tOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + o.totalAmount, 0);

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-55 transition-all">
                      <td className="py-3 px-2 flex items-center gap-3">
                        <img 
                          src={tenant.logoUrl} 
                          alt={tenant.name} 
                          className="w-9 h-9 rounded-xl object-cover border border-slate-100 animate-pulse-slow-once" 
                        />
                        <div>
                          <p className="font-extrabold text-slate-900 leading-none">{tenant.name}</p>
                          <span className={`text-[9px] font-bold uppercase mt-1 inline-block ${tenant.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            KITCHEN STATUS: {tenant.status.toUpperCase()}
                          </span>
                          <div className="flex flex-wrap gap-1 md:gap-2 mt-1 items-center">
                            {tenant.latitude !== undefined && tenant.longitude !== undefined && (
                              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded leading-none">
                                GPS: {tenant.latitude.toFixed(4)}, {tenant.longitude.toFixed(4)}
                              </span>
                            )}
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded leading-none flex items-center gap-1.5">
                              <span>Waiter PIN: {tenant.verificationPin || "1234"}</span>
                              <button 
                                onClick={() => handleRotateVerificationPin(tenant.id)}
                                title="Rotate Waiter PIN"
                                className="text-indigo-400 hover:text-indigo-950 transition p-0.5"
                              >
                                <RefreshCw size={10} className="hover:rotate-180 transition duration-300" />
                              </button>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-500 font-semibold">{tenant.id}</td>
                      <td className="py-3 px-2 font-extrabold text-slate-700">{tenant.totalTables} scale nodes</td>
                      <td className="py-3 px-2 font-bold text-slate-700">{menuCount} dishes</td>
                      <td className="py-3 px-2">
                        <p className="font-black text-slate-900">₹{grossPayable.toFixed(2)}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{tOrders.length} receipts</p>
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleToggleSuperAdminHold(tenant.id)}
                          className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border transition ${
                            tenant.lockedBySuperAdmin ? 'bg-rose-100 border-rose-300 text-rose-800 hover:bg-rose-200' :
                            'bg-slate-50 border-slate-205 text-slate-550 hover:bg-slate-100'
                          }`}
                        >
                          {tenant.lockedBySuperAdmin ? "SUSPENDED (HOLD)" : "STATUS CLEAR"}
                        </button>
                      </td>
                      <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenLedger(tenant)}
                          className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-[10px] px-3.5 py-1.2 rounded-lg transition border border-sky-100 inline-flex items-center gap-1 align-middle"
                        >
                          <FileText size={11} />
                          Ledger
                        </button>
                        <button
                          onClick={() => handleOpenManageTenant(tenant)}
                          className="bg-purple-55 bg-purple-50 hover:bg-purple-100 text-purple-750 text-purple-705 font-extrabold text-[10px] px-3.5 py-1.2 rounded-lg transition border border-purple-100 inline-flex items-center gap-1 align-middle"
                        >
                          <Settings2 size={11} />
                          Manage
                        </button>
                        <button
                          onClick={() => handleOpenEditTenant(tenant)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] px-3.5 py-1.2 rounded-lg transition border border-emerald-100 align-middle inline-flex items-center justify-center"
                        >
                          Edit Brand
                        </button>
                        <button
                          onClick={() => handleOverrideTenant(tenant.id, 'restadmin')}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-3.5 py-1.2 rounded-lg transition border border-indigo-100"
                        >
                          Admin Portal
                        </button>
                        <button
                          onClick={() => handleOverrideTenant(tenant.id, 'kitchen')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] px-3.5 py-1.2 rounded-lg transition border border-slate-200"
                        >
                          Chef KDS
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* OVERLAY: TENANTS LIST WITH lockouts hold overrides */}
      {overlayTab === 'tenants' && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3 flex-shrink-0 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Platform Brand holds & Lockout Controllers</h4>
                  <p className="text-[11px] text-slate-550 leading-none mt-1">Override merchant capabilities instantly. Administrative Holds propagate warnings across KDS and PWA menus.</p>
                </div>
              </div>
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="my-3 relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search tenant registers by system ID or Brand name..."
                value={overlaySearch}
                onChange={(e) => setOverlaySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-105 rounded-2xl">
              <div className="divide-y divide-slate-100">
                {restaurants
                  .filter(r => r.name.toLowerCase().includes(overlaySearch.toLowerCase()) || r.id.toLowerCase().includes(overlaySearch.toLowerCase()))
                  .map(r => (
                    <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <img src={r.logoUrl} alt={r.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                        <div>
                          <p className="font-extrabold text-slate-900">{r.name}</p>
                          <div className="flex items-center gap-2 text-[10px] font-mono font-bold mt-1 text-slate-450 leading-none">
                            <span>PLATFORM NODE: {r.id}</span>
                            <span>•</span>
                            <span className={r.lockedBySuperAdmin ? "text-rose-500" : "text-emerald-500"}>
                              {r.lockedBySuperAdmin ? "SUSPENDED (ADMIN HOLD ACTIVE)" : "PLATFORM STATUS CLEAR"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => { handleOpenManageTenant(r); setOverlayTab(null); }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition border border-purple-100 inline-flex items-center gap-1"
                        >
                          <Settings2 size={11} />
                          Manage Capabilities
                        </button>
                        <button
                          onClick={() => handleOpenEditTenant(r)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition border border-emerald-105"
                        >
                          Edit Brand
                        </button>
                        <button
                          onClick={() => handleToggleSuperAdminHold(r.id)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition ${
                            r.lockedBySuperAdmin ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' :
                            'bg-slate-50 border-slate-205 text-slate-550 hover:bg-slate-100'
                          }`}
                        >
                          {r.lockedBySuperAdmin ? "Release administrative lock" : "Enforce administrative hold"}
                        </button>
                        <button
                          onClick={() => { handleOverrideTenant(r.id, 'restadmin'); setOverlayTab(null); }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition"
                        >
                          Portals Override
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-3 flex-shrink-0">
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-6 py-2.5 rounded-xl">
                Close Holdings Auditor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: SEATING DIRECT OVERRIDES */}
      {overlayTab === 'seating' && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3 border-slate-205 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <QrCode size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Dynamic table seating nodes</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-none">Scale designated virtual seating capacities directly on-channel. Live flyer QR structures auto-align.</p>
                </div>
              </div>
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="p-1.5 text-slate-400 hover:text-slate-650 rounded-full hover:bg-slate-105">
                <X size={18} />
              </button>
            </div>

            <div className="my-3 relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search table scales by Restaurant Name..."
                value={overlaySearch}
                onChange={(e) => setOverlaySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-105 rounded-2xl p-4 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {restaurants
                  .filter(r => r.name.toLowerCase().includes(overlaySearch.toLowerCase()))
                  .map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-250 flex flex-col justify-between space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img src={r.logoUrl} alt={r.name} className="w-8 h-8 rounded-lg object-cover border" />
                          <h5 className="font-extrabold text-xs text-slate-900 leading-tight">{r.name}</h5>
                        </div>
                        <span className="font-mono text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          {r.id}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Tables Quotas</p>
                          <p className="text-base font-black text-slate-950 mt-1">{r.totalTables} Virtual Paths</p>
                        </div>

                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-inner">
                          <button 
                            onClick={() => onModifyRestaurantTablesGlobal(r.id, r.totalTables - 1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-black"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black">{r.totalTables}</span>
                          <button 
                            onClick={() => onModifyRestaurantTablesGlobal(r.id, r.totalTables + 1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-black"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>PWA Route:</span>
                        <span className="text-indigo-600 font-bold select-all leading-none">/r/{r.id}/t/[1-{r.totalTables}]</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-3 flex-shrink-0">
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl">
                Close Scaling Mapper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: LIVE TIMELINE OVERRIDES */}
      {overlayTab === 'feed' && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3 border-slate-205 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Live Cross-Network Logs Feed</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-none">Chronological timeline of orders placed across standard ecosystem endpoints. Control state overrides are supported here.</p>
                </div>
              </div>
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="p-1.5 text-slate-400 hover:text-slate-655 rounded-full hover:bg-slate-105">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405" size={14} />
                <input 
                  type="text" 
                  placeholder="Search feeds by Brand name, Diner phone, Order ID, or location..."
                  value={overlaySearch}
                  onChange={(e) => setOverlaySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-202 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setFeedTimeFilter('today')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${feedTimeFilter === 'today' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-550 hover:text-slate-900'}`}
                >
                  Today's Logs ({orders.filter(o => o.createdAt && o.createdAt.split('T')[0] === new Date().toISOString().split('T')[0]).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFeedTimeFilter('all')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${feedTimeFilter === 'all' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-550 hover:text-slate-900'}`}
                >
                  All-Time Logs ({orders.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-105 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-120 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Brand Node</th>
                    <th className="py-2.5 px-3">Seating</th>
                    <th className="py-2.5 px-3">Diner profile</th>
                    <th className="py-2.5 px-3">Entrees</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Fulfillment Status</th>
                    <th className="py-2.5 px-3 text-right">Admin overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {orders
                    .filter(o => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isOursToday = o.createdAt && o.createdAt.split('T')[0] === todayStr;
                      if (feedTimeFilter === 'today' && !isOursToday) return false;

                      const tenant = restaurants.find(r => r.id === o.restaurantId);
                      return (
                        o.userName.toLowerCase().includes(overlaySearch.toLowerCase()) ||
                        o.userPhone.includes(overlaySearch) ||
                        o.id.includes(overlaySearch) ||
                        (tenant && tenant.name.toLowerCase().includes(overlaySearch.toLowerCase()))
                      );
                    })
                    .map(ord => {
                      const tenant = restaurants.find(r => r.id === ord.restaurantId);
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-900 block">{tenant ? tenant.name : ord.restaurantId}</span>
                            <span className="text-[9px] text-slate-400 font-mono">Node ID: {ord.restaurantId}</span>
                          </td>
                          <td className="py-3 px-3 font-extrabold">Table {ord.tableNumber}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 leading-none">{ord.userName}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">{ord.userPhone}</p>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate font-medium text-slate-500">
                            {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-950">₹{ord.totalAmount.toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ord.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                              ord.status === 'accepted' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                              ord.status === 'pending' ? 'bg-yellow-50 text-yellow-605 border border-yellow-250' :
                              'bg-rose-50 text-rose-500 border border-rose-250'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <select
                              value={ord.status}
                              onChange={(e) => onUpdateOrderStatusGlobal(ord.id, e.target.value)}
                              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800 focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="completed">Completed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-3 flex-shrink-0">
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl">
                Close live feed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: UNIFIED CONSOLIDATED NETWORK FINANCIAL LEDGER */}
      {overlayTab === 'accounting' && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3 border-slate-205 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Consolidated Ecosystem Net Revenue auditor</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-none">Highlights the base menu values, applied promo savings, and actual final collected funds across all system nodes.</p>
                </div>
              </div>
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="p-1.5 text-slate-400 hover:text-slate-650 rounded-full hover:bg-slate-105">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search financials by Order ID or restaurant..."
                  value={overlaySearch}
                  onChange={(e) => setOverlaySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setAccountingTimeFilter('today')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${accountingTimeFilter === 'today' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Today's Book
                </button>
                <button
                  type="button"
                  onClick={() => setAccountingTimeFilter('all')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${accountingTimeFilter === 'all' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  All-Time Book
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2 flex-shrink-0">
              <div className="bg-slate-50 p-4 border rounded-2xl border-slate-200 shadow-sm relative overflow-hidden">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                  {accountingTimeFilter === 'today' ? "Today Total Gross Subtotal" : "All-Time Total Gross Subtotal"}
                </span>
                <p className="text-base font-black text-slate-950 mt-1">
                  ₹{accountingTimeFilter === 'today' ? todayFinancials.originalSubtotal.toFixed(2) : allTimeFinancials.originalSubtotal.toFixed(2)}
                </p>
                <span className="text-[9px] text-slate-450 block mt-0.5">Base prices across nodes</span>
              </div>
              
              <div className="bg-rose-50 p-4 border rounded-2xl border-rose-100 shadow-sm relative overflow-hidden">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-500 block">
                  {accountingTimeFilter === 'today' ? "Today Promo Exclusions" : "All-Time Promo Exclusions"}
                </span>
                <p className="text-base font-black text-rose-600 mt-1">
                  - ₹{accountingTimeFilter === 'today' ? todayFinancials.promoDeductions.toFixed(2) : allTimeFinancials.promoDeductions.toFixed(2)}
                </p>
                <span className="text-[9px] text-rose-455 block mt-0.5">Deducted LTO values</span>
              </div>

              <div className="bg-emerald-50 p-4 border rounded-2xl border-emerald-110 shadow-sm relative overflow-hidden">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 block">
                  {accountingTimeFilter === 'today' ? "Today Net Collected Revenue" : "All-Time Net Collected Revenue"}
                </span>
                <p className="text-base font-black text-emerald-700 mt-1">
                  ₹{accountingTimeFilter === 'today' ? todayFinancials.finalGrossRevenue.toFixed(2) : allTimeFinancials.finalGrossRevenue.toFixed(2)}
                </p>
                <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Actual collected funds</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-105 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead className="bg-slate-50 sticky top-0 border-b font-bold uppercase tracking-wider text-[10px] text-slate-500 border-slate-120">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Brand Name</th>
                    <th className="py-2.5 px-3">Diner Name</th>
                    <th className="py-2.5 px-3">Menu Base Price</th>
                    <th className="py-2.5 px-3">LTO Exclusion deducted</th>
                    <th className="py-2.5 px-3 border-r border-slate-100">Net Funds Earned</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(accountingTimeFilter === 'today' ? todayFinancials.validOrders : allTimeFinancials.validOrders)
                    .filter(o => {
                      const tenant = restaurants.find(r => r.id === o.restaurantId);
                      return (
                        o.userName.toLowerCase().includes(overlaySearch.toLowerCase()) ||
                        o.id.includes(overlaySearch) ||
                        (tenant && tenant.name.toLowerCase().includes(overlaySearch.toLowerCase()))
                      );
                    })
                    .map(ord => {
                      const summary = calculateBillSummary(ord.items);
                      const tenant = restaurants.find(r => r.id === ord.restaurantId);
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2 px-3 font-mono font-bold text-slate-405">#{ord.id.split('-')[1]}</td>
                          <td className="py-2 px-3 font-extrabold text-slate-905">{tenant ? tenant.name : ord.restaurantId}</td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 block leading-none">{ord.userName}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 block">{ord.userPhone}</span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-600">₹{summary.originalSubtotal.toFixed(2)}</td>
                          <td className="py-2 px-3 text-rose-500 font-bold">
                            {summary.totalDeductions > 0 ? `-₹${summary.totalDeductions.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="py-2 px-3 font-black text-emerald-650 border-r border-slate-100">₹{ord.totalAmount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-700 uppercase">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-3 flex-shrink-0">
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl">
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: UNIFIED CENTRAL ACCOUNTING & ORDER HISTORIES BY OPERATIONAL DAY */}
      {overlayTab === 'history' && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh] font-sans animate-fade-in">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Ecosystem Order History logs</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-none font-sans">Day-by-day complete chronological receipts and operations auditor across the entire multi-tenant kCodeIT standard suite.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Reset Filters Quick shortcut */}
                {(overlaySearch || historyStatusFilter !== 'all' || historyReleaseFilter !== 'all' || historyMinAmount || historyMaxAmount || showAllHistoryDates) && (
                  <button
                    type="button"
                    onClick={() => {
                      setOverlaySearch('');
                      setHistoryStatusFilter('all');
                      setHistoryReleaseFilter('all');
                      setHistoryMinAmount('');
                      setHistoryMaxAmount('');
                      setShowAllHistoryDates(false);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-650 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
                <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="p-1.5 text-slate-400 hover:text-slate-650 rounded-full hover:bg-slate-105">
                  <X size={18} />
                </button>
              </div>
            </div>

            {globalDailyHistorySummaries.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 border rounded-3xl border-slate-200 my-4 flex-1">
                <ClipboardList size={40} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-black text-slate-800">No active operational log history</p>
                <p className="text-xs text-slate-400 mt-1">Gourmet tenants or diners must submit active tickets to seed records.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4 flex-1 min-h-0 overflow-hidden">
                {/* Left Side: Daily history summaries */}
                <div className="md:col-span-1 space-y-2.5 overflow-y-auto pr-1 flex-shrink-0 h-full">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1 font-mono">Ecosystem Business Days</span>
                  
                  {/* Show All Available Dates toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllHistoryDates(true);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex justify-between items-center cursor-pointer mb-2 ${
                      showAllHistoryDates
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100/50'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">
                        All Records Combined
                      </p>
                      <p className={`text-[10px] mt-0.5 font-semibold ${showAllHistoryDates ? 'text-slate-300' : 'text-indigo-650'}`}>
                        Search across all active timelines
                      </p>
                    </div>
                    <span className="text-xs">📅</span>
                  </button>

                  {globalDailyHistorySummaries.map((day) => (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedHistoryDate(day.dateStr);
                        setShowAllHistoryDates(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex justify-between items-center cursor-pointer ${
                        (!showAllHistoryDates && selectedHistoryDate === day.dateStr)
                          ? 'bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-805 hover:bg-slate-100 hover:border-slate-350'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">
                          {formatHistoryDate(day.dateStr)}
                        </p>
                        <p className={`text-[10px] mt-1 font-semibold ${(!showAllHistoryDates && selectedHistoryDate === day.dateStr) ? 'text-indigo-100' : 'text-slate-450'}`}>
                          {day.count} Total Receipts
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-extrabold ${(!showAllHistoryDates && selectedHistoryDate === day.dateStr) ? 'text-white' : 'text-emerald-600'}`}>
                          ₹{day.revenue.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right Side: Detailed orders list with rich filters */}
                <div className="md:col-span-2 flex flex-col h-full min-h-0 space-y-3">
                  
                  {/* Central Config Filter Panel */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-3xl space-y-3 flex-shrink-0">
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block font-mono">Unified Advanced Filter</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Search Bar matching Brand Name, Guest, Phone, Dish or Order ID */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          type="text"
                          placeholder="Search brand, diner, phone, items, table..."
                          value={overlaySearch}
                          onChange={(e) => setOverlaySearch(e.target.value)}
                          className="w-full bg-white border border-slate-202 rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-805"
                        />
                      </div>

                      {/* Jump Date Picker (Natively changes active day selection!) */}
                      <div className="flex items-center gap-2 bg-white px-3 py-1 border border-slate-202 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase font-mono whitespace-nowrap">Jump:</span>
                        <input
                          type="date"
                          value={selectedHistoryDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedHistoryDate(e.target.value);
                              setShowAllHistoryDates(false);
                            }
                          }}
                          className="w-full text-xs font-extrabold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Kitchen State Filter */}
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-slate-400 font-black uppercase font-mono">Kitchen State</label>
                        <select
                          value={historyStatusFilter}
                          onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                          className="bg-white border border-slate-202 rounded-xl p-2 text-xs font-semibold focus:outline-none text-slate-800"
                        >
                          <option value="all">All Kitchen States</option>
                          <option value="pending">Pending Only</option>
                          <option value="accepted">Accepted / Cooking</option>
                          <option value="completed">Completed Only</option>
                          <option value="rejected">Rejected Only</option>
                        </select>
                      </div>

                      {/* Cash Release State */}
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-slate-400 font-black uppercase font-mono">Billed State</label>
                        <select
                          value={historyReleaseFilter}
                          onChange={(e) => setHistoryReleaseFilter(e.target.value as any)}
                          className="bg-white border border-slate-202 rounded-xl p-2 text-xs font-semibold focus:outline-none text-slate-800"
                        >
                          <option value="all">All States (Active + Released)</option>
                          <option value="active">Active Dining Bills Only</option>
                          <option value="cleared">Cleared / Released Only</option>
                        </select>
                      </div>

                      {/* Bill Size Slider Range */}
                      <div className="flex flex-col space-y-1">
                        <label className="text-[9px] text-slate-400 font-black uppercase font-mono">Bill Range (INR)</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="Min ₹"
                            value={historyMinAmount}
                            onChange={(e) => setHistoryMinAmount(e.target.value)}
                            className="bg-white border border-slate-202 rounded-xl p-2 text-xs font-semibold focus:outline-none w-full text-slate-800"
                          />
                          <span className="text-slate-300 text-xs">-</span>
                          <input
                            type="number"
                            placeholder="Max ₹"
                            value={historyMaxAmount}
                            onChange={(e) => setHistoryMaxAmount(e.target.value)}
                            className="bg-white border border-slate-202 rounded-xl p-2 text-xs font-semibold focus:outline-none w-full text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Range Label Context */}
                  <div className="flex justify-between items-center bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100 flex-shrink-0 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-indigo-650 rounded-full"></span>
                      <span className="text-xs font-bold text-slate-700">
                        Ecosystem Target: <strong className="text-indigo-950 font-black">{showAllHistoryDates ? "All Available Dates Combined" : formatHistoryDate(selectedHistoryDate)}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase font-mono text-indigo-650 bg-indigo-100 px-2 py-0.5 rounded-lg">
                      {filteredGlobalHistoryOrders.length} records matched
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                    {filteredGlobalHistoryOrders.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 border rounded-2xl border-slate-200">
                        <p className="text-xs font-bold text-slate-505">No records match the active ecosystem search filter.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try to change filters, specify different amounts, or select "All Records Combined".</p>
                      </div>
                    ) : (
                      filteredGlobalHistoryOrders.map((ord) => {
                        const tenantBrand = restaurants.find(r => r.id === ord.restaurantId);
                        return (
                          <div
                            key={ord.id}
                            className="p-4 bg-slate-50/40 border border-slate-200 rounded-2xl hover:border-slate-350 hover:bg-slate-50/50 transition font-sans"
                          >
                            <div className="flex justify-between items-start gap-2 flex-wrap pb-2 border-b border-rose-50 mb-2">
                              <div>
                                <span className="text-[10px] text-indigo-750 font-black uppercase flex items-center gap-1">
                                  🏢 Brand: {tenantBrand ? tenantBrand.name : ord.restaurantId}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 block leading-none">
                                  #ID: {ord.id.split('-')[1] || ord.id} • Table {ord.tableNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  ord.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-110' :
                                  ord.status === 'accepted' ? 'bg-blue-50 text-blue-600 border border-blue-110' :
                                  ord.status === 'pending' ? 'bg-yellow-50 text-yellow-605 border border-yellow-115' :
                                  'bg-rose-50 text-rose-550 border border-rose-115'
                                }`}>
                                  {ord.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  ord.released === true 
                                    ? 'bg-slate-100 text-slate-505 border border-slate-205' 
                                    : 'bg-orange-50 text-orange-600 border border-orange-205'
                                }`}>
                                  {ord.released === true ? 'Cleared' : 'Active'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans mt-1">
                              <div>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">
                                  Diner Profile
                                </p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{ord.userName}</p>
                                <p className="text-slate-500 font-mono text-[10px]">{ord.userPhone}</p>
                                <span className="text-[9px] text-slate-400 font-bold block mt-1.5">
                                  Plat Timestamp: {new Date(ord.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">
                                  Culinary Items
                                </p>
                                <div className="mt-1 space-y-1">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between font-bold text-slate-700">
                                      <span>{it.quantity}x {it.name}</span>
                                      <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1.5 mt-1.5 border-t border-dashed border-slate-205 flex justify-between font-black text-slate-900">
                                  <span>Ecosystem Net:</span>
                                  <span>₹{ord.totalAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-3 flex-shrink-0">
              <button onClick={() => { setOverlayTab(null); setOverlaySearch(''); }} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl">
                Close Ecosystem Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: STRATEGIC INSIGHTS IN PLATFORM METRICS (GEMINI POWERED) */}
      {overlayTab === 'aiSaaS' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3 border-slate-205 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600 font-black animate-pulse" />
                <div>
                  <h4 className="text-base font-black text-slate-900">AI Platform SaaS strategies</h4>
                  <p className="text-[11px] text-slate-500 font-mono uppercase mt-1">Compiled by Gemini 3.5 Flash</p>
                </div>
              </div>
              <button onClick={() => setOverlayTab(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-50 border rounded-2xl border-slate-200">
              <div className="space-y-3">
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {aiSaaSReport}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-55 flex justify-end flex-shrink-0">
              <button onClick={() => setOverlayTab(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl">
                Dismiss strategies
              </button>
            </div>
          </div>
        </div>
      )}  {/* end aiSaaS */}

      {/* ANALYTICS DASHBOARD OVERLAY */}
      {overlayTab === 'analytics' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-slate-200 rounded-t-3xl">
              <div>
                <h3 className="text-sm font-black text-slate-900">📊 SaaS Analytics Suite</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Cross-tenant KPIs and performance metrics</p>
              </div>
              <button onClick={() => setOverlayTab(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl text-xs transition">
                Close
              </button>
            </div>
            <div className="p-4">
              <AnalyticsDashboard restaurantId="all" restaurantName="All Tenants" />
            </div>
          </div>
        </div>
      )}

      {/* PROVISION NEW TENANT MODAL */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-150">
              <h4 className="text-sm font-black text-slate-900">Register new SaaS subscriber</h4>
              <button onClick={() => setIsAddTenantOpen(false)} className="p-1 text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Brand Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bella Italia Bistro"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Logo URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="e.g. https://images.unsplash.com/..."
                  value={tenantLogo}
                  onChange={(e) => setTenantLogo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Allocated Tables Node Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  required
                  value={tenantTables}
                  onChange={(e) => setTenantTables(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Latitude *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 28.5672"
                    value={tenantLatitude}
                    onChange={(e) => setTenantLatitude(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Longitude *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 77.2025"
                    value={tenantLongitude}
                    onChange={(e) => setTenantLongitude(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Waiter 4-Digit Verification PIN *</label>
                <input 
                  type="text" 
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={tenantVerificationPin}
                  onChange={(e) => setTenantVerificationPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-bold text-center tracking-widest text-indigo-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">Waiters will share this specific 4-digit code with dining users if GPS verification is blocked or fails.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Admin Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="e.g. admin@bistro.com"
                    value={tenantAdminEmail}
                    onChange={(e) => setTenantAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Admin Portal Pass</label>
                  <input 
                    type="password"
                    required
                    placeholder="e.g. password"
                    value={tenantAdminPassword}
                    onChange={(e) => setTenantAdminPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Chef Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="e.g. chef@bistro.com"
                    value={tenantChefEmail}
                    onChange={(e) => setTenantChefEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Chef KMS Pass</label>
                  <input 
                    type="password"
                    required
                    placeholder="e.g. password"
                    value={tenantChefPassword}
                    onChange={(e) => setTenantChefPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddTenantOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold py-2 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isOnboarding}
                  className={`w-1/2 font-bold py-2 rounded-xl shadow transition ${isOnboarding ? 'bg-slate-350 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-slate-700 text-white'}`}
                >
                  {isOnboarding ? "Registering..." : "Register Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TENANT CREATION CONFIRMATION OVERLAY */}
      {tenantConfirmation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-emerald-100 overflow-hidden">
            <div className="bg-emerald-600 p-4 text-white text-center">
              <CheckCircle size={28} className="mx-auto mb-1" />
              <h3 className="text-sm font-black uppercase tracking-wider">Tenant Onboarded Successfully</h3>
              <p className="text-[10px] text-emerald-200 mt-0.5">{(tenantConfirmation as any).name} is now live</p>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="block font-black text-slate-500 uppercase tracking-wider mb-1.5 text-[9px]">Customer Public URL</label>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <code className="text-[10px] font-mono text-indigo-700 truncate select-all">{(tenantConfirmation as any).url}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText((tenantConfirmation as any).url); triggerAppAlert("Copied!", "Public URL copied to clipboard.", "success"); }}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Replace <code className="font-mono">t/1</code> with target table (1-{(tenantConfirmation as any).totalTables})</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Admin Portal</span>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1">{(tenantConfirmation as any).adminEmail}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Chef KDS</span>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1">{(tenantConfirmation as any).chefEmail}</span>
                </div>
              </div>
              <div className="flex gap-2 text-[9px]">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex-1">
                  <span className="font-black text-amber-600 uppercase tracking-wider">Table PIN</span>
                  <p className="font-bold text-amber-800 mt-0.5">{(tenantConfirmation as any).verificationPin}</p>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 flex-1">
                  <span className="font-black text-slate-500 uppercase tracking-wider">Tables</span>
                  <p className="font-bold text-slate-800 mt-0.5">{(tenantConfirmation as any).totalTables}</p>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 flex-1">
                  <span className="font-black text-slate-500 uppercase tracking-wider">ID</span>
                  <p className="font-bold text-slate-800 mt-0.5 font-mono">{(tenantConfirmation as any).id}</p>
                </div>
              </div>
              <button
                onClick={() => setTenantConfirmation(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
              >
                Done — Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TENANT BRAND REGISTRY MODAL */}
      {isEditTenantOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-150">
              <div>
                <h4 className="text-sm font-black text-slate-900">Edit Tenant Brand Registry</h4>
                <p className="text-[10px] text-slate-400 font-mono">Modifying Node: {editTenantId}</p>
              </div>
              <button onClick={() => setIsEditTenantOpen(false)} className="p-1 text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditTenant} className="space-y-3 text-xs text-slate-800">
              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Brand Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bella Italia Bistro"
                  value={editTenantName}
                  onChange={(e) => setEditTenantName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Logo URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="e.g. https://images.unsplash.com/..."
                  value={editTenantLogo}
                  onChange={(e) => setEditTenantLogo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Allocated Tables Node Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  required
                  value={editTenantTables}
                  onChange={(e) => setEditTenantTables(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Latitude *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 28.5672"
                    value={editTenantLatitude}
                    onChange={(e) => setEditTenantLatitude(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Longitude *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 77.2025"
                    value={editTenantLongitude}
                    onChange={(e) => setEditTenantLongitude(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1 uppercase tracking-wide">Waiter 4-Digit Verification PIN *</label>
                <input 
                  type="text" 
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={editTenantVerificationPin}
                  onChange={(e) => setEditTenantVerificationPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-501 font-bold text-center tracking-widest text-indigo-700 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Verification code to let diners check in at standard login.</p>
              </div>

              <div className="pt-4 border-t border-slate-150 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditTenantOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold py-2 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE TENANT POLICY & CAPABILITIES MODAL */}
      {isManageTenantOpen && selectedManageTenant && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
            
            {/* Header section */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-150">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Sliders size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">Administrative SLA & Access Control</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Configuring: <span className="font-extrabold text-slate-705">{selectedManageTenant.name}</span> • ID: {selectedManageTenant.id}</p>
                </div>
              </div>
              <button onClick={() => setIsManageTenantOpen(false)} className="p-1 px-2 text-slate-400 hover:text-slate-655 font-bold hover:bg-slate-50 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setManageModalTab('capabilities')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition ${
                  manageModalTab === 'capabilities' 
                    ? 'border-indigo-600 text-indigo-650' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                ⚙️ Capabilities
              </button>
              <button
                type="button"
                onClick={() => setManageModalTab('analytics')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition ${
                  manageModalTab === 'analytics' 
                    ? 'border-indigo-600 text-indigo-650' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                📊 Tenant Analytics
              </button>
            </div>

            {/* Content body based on tab */}
            {manageModalTab === 'capabilities' ? (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {/* BRAND ACCOUNT STATUS */}
                <div className="space-y-2">
                  <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Account Subscription Status</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManageStatus("active")}
                      className={`py-3 px-4 rounded-2xl border text-center font-extrabold uppercase text-[10px] tracking-wider transition ${
                        manageStatus === 'active' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-705 font-black shadow-xs ring-2 ring-emerald-500/10' 
                          : 'bg-white border-slate-205 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      ● Onboarded & Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setManageStatus("inactive")}
                      className={`py-3 px-4 rounded-2xl border text-center font-extrabold uppercase text-[10px] tracking-wider transition ${
                        manageStatus === 'inactive' 
                          ? 'bg-rose-50 border-rose-300 text-rose-705 font-black shadow-xs ring-2 ring-rose-500/10' 
                          : 'bg-white border-slate-205 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      ■ Suspended / Hold
                    </button>
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-medium">Setting status to Suspended immediately suspends all guest dine-in displays, halting the live menu and preventing customer order submissions.</p>
                </div>

                {/* ROLE 1: ADMIN PORTAL */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <h5 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">🛡️ Admin Portal Capabilities</h5>
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="pr-4 space-y-0.5 text-left">
                      <span className="text-xs font-bold text-slate-800">Disable Admin Portal Access</span>
                      <span className="text-[10px] text-slate-450 leading-tight block">Restricts access to the merchant administration console.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setManageDisableAdmin(!manageDisableAdmin)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${manageDisableAdmin ? 'bg-indigo-650 justify-end font-normal' : 'bg-slate-300 justify-start font-normal'}`}
                    >
                      <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-bold text-slate-450 mb-0.5 uppercase tracking-wide text-[9px]">Admin Email</label>
                      <input 
                        type="email"
                        required
                        value={manageAdminEmail}
                        onChange={(e) => setManageAdminEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-semibold text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-450 mb-0.5 uppercase tracking-wide text-[9px]">Admin Password</label>
                      <input 
                        type="text"
                        required
                        value={manageAdminPassword}
                        onChange={(e) => setManageAdminPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-semibold text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* ROLE 2: CHEF / KITCHEN DISPLAY SYSTEM */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <h5 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">👨‍🍳 Chef & KDS Terminal</h5>
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="pr-4 space-y-0.5 text-left">
                      <span className="text-xs font-bold text-slate-800">Disable Chef KDS Monitor</span>
                      <span className="text-[10px] text-slate-450 leading-tight block">Suspends the Kitchen Display System monitor terminal.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setManageDisableKds(!manageDisableKds)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${manageDisableKds ? 'bg-indigo-650 justify-end font-normal' : 'bg-slate-300 justify-start font-normal'}`}
                    >
                      <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="pr-4 space-y-0.5 text-left">
                      <span className="text-xs font-bold text-slate-800">Chef KDS SLA Breach Warnings</span>
                      <span className="text-[10px] text-slate-450 leading-tight block">Enforce standard visual alerts and red breach triggers for ticket delays.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setManageEnableSlaWarning(!manageEnableSlaWarning)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${manageEnableSlaWarning ? 'bg-indigo-650 justify-end font-normal' : 'bg-slate-300 justify-start font-normal'}`}
                    >
                      <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-bold text-slate-450 mb-0.5 uppercase tracking-wide text-[9px]">Chef Email</label>
                      <input 
                        type="email"
                        required
                        value={manageChefEmail}
                        onChange={(e) => setManageChefEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-semibold text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-450 mb-0.5 uppercase tracking-wide text-[9px]">Chef Password</label>
                      <input 
                        type="text"
                        required
                        value={manageChefPassword}
                        onChange={(e) => setManageChefPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 rounded-lg font-semibold text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* ROLE 3: DINING USER MENU RULES */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5 text-left">
                  <h5 className="text-[10px] uppercase font-black text-slate-505 tracking-wider flex items-center gap-1">📱 Dining Guest Experience</h5>
                  {/* Lock All Items */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="pr-4 space-y-0.5">
                      <span className="text-xs font-bold text-slate-800">Recipe Catalog Lockdown</span>
                      <span className="text-[10px] text-slate-455 leading-tight block">Forces Read-Only access, disabling interactive client checkouts.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setManageLockAllItems(!manageLockAllItems)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${manageLockAllItems ? 'bg-indigo-650 justify-end font-normal' : 'bg-slate-300 justify-start font-normal'}`}
                    >
                      <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
                    </button>
                  </div>
                  {/* Block QR scaling */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="pr-4 space-y-0.5">
                      <span className="text-xs font-bold text-slate-800">Block QR Seating Allocations</span>
                      <span className="text-[10px] text-slate-455 leading-tight block">Restricts table setup adjustments or URL re-configurations.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setManageDisableQr(!manageDisableQr)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${manageDisableQr ? 'bg-indigo-650 justify-end font-normal' : 'bg-slate-300 justify-start font-normal'}`}
                    >
                      <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
                    </button>
                  </div>
                  {/* Hide older history */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="pr-4 space-y-0.5">
                      <span className="text-xs font-bold text-slate-800">Limit Dashboard Archive to 24 Hours</span>
                      <span className="text-[10px] text-slate-455 leading-tight block">Filters other historic data logs so the merchant and chefs only have active and recent visibility.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setManageHideHistory(!manageHideHistory)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${manageHideHistory ? 'bg-indigo-650 justify-end font-normal' : 'bg-slate-300 justify-start font-normal'}`}
                    >
                      <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: TENANT ANALYTICS */
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block">Gross Sales</span>
                    <span className="text-base font-black text-slate-905 mt-1 block">₹{tenantGrossSales.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block">Orders Count</span>
                    <span className="text-base font-black text-slate-905 mt-1 block">{tenantOrderCount}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block">Avg Ticket</span>
                    <span className="text-base font-black text-slate-905 mt-1 block">₹{tenantAverageTicket.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block">Scorecard Rating</span>
                    <span className="text-base font-black text-yellow-605 mt-1 block">★ {tenantAverageRating.toFixed(1)} / 5</span>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed text-left">
                  <h6 className="font-extrabold text-indigo-950 flex items-center gap-1.5 mb-1">📈 Tenant Operational Insights</h6>
                  <p className="text-[10.5px]">This scorecard combines order volume, gross receipts, and average ratings across active recipe cards to measure customer satisfaction and floor efficiency in real-time.</p>
                </div>
              </div>
            )}

            {/* Static policy notice */}
            <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100 text-[10px] text-purple-800 font-semibold leading-normal flex gap-2 select-none">
              <span className="text-purple-600 font-extrabold shrink-0">[SLA DIRECT]</span>
              <span>Modifying these settings alters the brand's database attributes in Firestore. These specifications will be processed immediately by Client-Side state handlers and routing systems globally.</span>
            </div>

            {/* Footer action buttons */}
            <div className="pt-3 border-t border-slate-150 flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsManageTenantOpen(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
              >
                Cancel / Dismiss
              </button>
              <button 
                type="button"
                onClick={handleSaveCapabilities}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow transition text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                Apply Guardrail Constraints
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SAAS TENANT LEDGER MODAL */}
      {isLedgerOpen && selectedLedgerTenant && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-205 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Tenant Gross Sales Audit</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">Operational audit ledger for {selectedLedgerTenant.name}. Highlights base subtotals, promotional exclusions, and actual received cash.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLedgerOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Total Base Subtotal</span>
                <p className="text-base font-black text-slate-900 mt-1">₹{selectedTenantLedgerBreakdown.baseSubtotal.toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 p-4 border border-rose-100 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-500 block">Excluded LTO Offers</span>
                <p className="text-base font-black text-rose-600 mt-1">-₹{selectedTenantLedgerBreakdown.deductions.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 block">Net Settle Received</span>
                <p className="text-base font-black text-emerald-700 mt-1">₹{selectedTenantLedgerBreakdown.finalNet.toFixed(2)}</p>
              </div>
            </div>

            <div className="relative mb-3 flex-shrink-0">
              <div className="text-[10px] font-bold text-slate-500 mb-1">Hold Him Home - SaaS Operational Ledger Filter</div>
              <div className="flex gap-2">
                <Search className="text-slate-400 mt-2 ml-2" size={14} />
                <input 
                  type="text" 
                  placeholder="Search ledger entries..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 pl-7 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800"
                />
                <input 
                  type="date" 
                  value={ledgerFromDate}
                  onChange={(e) => setLedgerFromDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800"
                />
                <input 
                  type="date" 
                  value={ledgerToDate}
                  onChange={(e) => setLedgerToDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800"
                />
                <button 
                 onClick={() => { setLedgerFromDate(''); setLedgerToDate(''); setLedgerSearch(''); }}
                 className="bg-slate-900 text-white rounded-xl px-3 py-1 text-xs font-bold"
                >Clear</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-150 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-500 sticky top-0 border-b border-slate-150">
                  <tr>
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Seat</th>
                    <th className="py-2.5 px-3">Customer Profile</th>
                    <th className="py-2.5 px-3">Base Price</th>
                    <th className="py-2.5 px-3">Promo Exclusion</th>
                    <th className="py-2.5 px-3 border-r border-slate-100">Received Cost</th>
                    <th className="py-2.5 px-3 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTenantLedgerBreakdown.validOrders.map(ord => {
                    const orderSummary = calculateBillSummary(ord.items);
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-400">#{ord.id.split('-')[1] || ord.id}</td>
                        <td className="py-2.5 px-3 font-extrabold">Table {ord.tableNumber}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{ord.userName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{ord.userPhone}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-600">₹{orderSummary.originalSubtotal.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-rose-500 font-bold">
                          {orderSummary.totalDeductions > 0 ? `-₹${orderSummary.totalDeductions.toFixed(2)}` : '₹0.00'}
                        </td>
                        <td className="py-2.5 px-3 font-black text-emerald-600 border-r border-slate-100">₹{ord.totalAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            ord.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedTenantLedgerBreakdown.validOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No auditable receipt logs found for this filter range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
