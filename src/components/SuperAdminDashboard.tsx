import React, { useState, useMemo } from 'react';
import { 
  Building2, Plus, Search, Sparkles, BrainCircuit, Bot, X, 
  TrendingUp, QrCode, ClipboardList, AlertOctagon, CheckCircle, 
  Trash2, RefreshCw 
} from 'lucide-react';
import { Restaurant, MenuItem, Order } from '../types';

interface SuperAdminProps {
  restaurants: Restaurant[];
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>;
  menus: MenuItem[];
  orders: Order[];
  onUpdateOrderStatusGlobal: (orderId: string, targetStatus: any) => void;
  onModifyRestaurantTablesGlobal: (id: string, amount: number) => void;
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
  const [overlayTab, setOverlayTab] = useState<'tenants' | 'seating' | 'feed' | 'accounting' | 'aiSaaS' | null>(null);
  const [overlaySearch, setOverlaySearch] = useState('');

  // AI states
  const [isGeneratingSaaSReport, setIsGeneratingSaaSReport] = useState(false);
  const [aiSaaSReport, setAiSaaSReport] = useState('');

  // Add Tenant states
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantLogo, setTenantLogo] = useState('');
  const [tenantTables, setTenantTables] = useState('8');

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

  // Pricing calculation helper
  const calculateBillSummary = (items: { price: number; promoValue: number; quantity: number }[]) => {
    let originalSubtotal = 0;
    let totalDeductions = 0;
    let finalPayable = 0;

    items.forEach(item => {
      const qty = item.quantity || 1;
      const finalPrice = item.price || 0;
      const unitDiscount = item.promoValue || 0;
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

  const globalFinancials = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'rejected');
    let totalOriginalSubtotal = 0;
    let totalDeductionsExcluded = 0;
    let totalFinalReceived = 0;

    validOrders.forEach(ord => {
      const summary = calculateBillSummary(ord.items);
      totalOriginalSubtotal += summary.originalSubtotal;
      totalDeductionsExcluded += summary.totalDeductions;
      totalFinalReceived += summary.finalPayable;
    });

    return {
      validOrders,
      totalOriginalSubtotal,
      totalDeductionsExcluded,
      totalFinalReceived
    };
  }, [orders]);

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

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) {
      triggerAppAlert("Validation Warning", "A descriptive Tenant Restaurant name is mandatory.", "error");
      return;
    }

    const tQty = parseInt(tenantTables);
    if (isNaN(tQty) || tQty < 1 || tQty > 50) {
      triggerAppAlert("Configuration limits", "Set allocated table nodes count between 1 and 50 seats.", "error");
      return;
    }

    const newTenant: Restaurant = {
      id: "rest-" + (restaurants.length + 1),
      name: tenantName.trim(),
      logoUrl: tenantLogo.trim() || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80",
      status: "active",
      lockedBySuperAdmin: false,
      totalTables: tQty
    };

    setRestaurants(prev => [...prev, newTenant]);
    setIsAddTenantOpen(false);

    setTenantName('');
    setTenantLogo('');
    setTenantTables('8');

    triggerAppAlert("Tenant Brand Onboarded", `Successfully registered ${newTenant.name} as an operational kCodeIT subscriber.`, "success");
  };

  const handleToggleSuperAdminHold = (id: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id === id) {
        const nextLock = !r.lockedBySuperAdmin;
        return {
          ...r,
          lockedBySuperAdmin: nextLock,
          status: nextLock ? 'inactive' as const : r.status
        };
      }
      return r;
    }));
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
      </div>

      {/* Global Interactive Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
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
          onClick={() => setOverlayTab('feed')}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-yellow-500 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-yellow-600">Transactions processed</span>
            <h3 className="text-xl font-black text-slate-905 mt-1">{globalAnalytics.totalOrders} Receipts</h3>
            <p className="text-[9px] text-yellow-600 font-bold mt-1">View transaction logs →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
            <ClipboardList size={18} />
          </div>
        </button>

        <button
          onClick={() => setOverlayTab('accounting')}
          className="bg-white p-4 rounded-3xl border border-slate-205 text-left hover:border-emerald-555 hover:shadow-md transition active:scale-[0.99] group flex justify-between items-center"
        >
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 block group-hover:text-emerald-600">Global Gross Revenue</span>
            <h3 className="text-xl font-black text-emerald-600 mt-1">₹{globalAnalytics.totalRevenue.toFixed(2)}</h3>
            <p className="text-[9px] text-emerald-600 font-bold mt-1">Consolidated ledger →</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
                          className="w-9 h-9 rounded-xl object-cover border border-slate-100" 
                        />
                        <div>
                          <p className="font-extrabold text-slate-900 leading-none">{tenant.name}</p>
                          <span className={`text-[9px] font-bold uppercase mt-1 inline-block ${tenant.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            KITCHEN STATUS: {tenant.status.toUpperCase()}
                          </span>
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

                      <div className="flex items-center gap-1.5">
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
                            onClick={() => onModifyRestaurantTablesGlobal(r.id, -1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-black"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black">{r.totalTables}</span>
                          <button 
                            onClick={() => onModifyRestaurantTablesGlobal(r.id, 1)}
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

            <div className="my-3 relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405" size={14} />
              <input 
                type="text" 
                placeholder="Search feeds by Brand name, Diner phone, Order ID, or location..."
                value={overlaySearch}
                onChange={(e) => setOverlaySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-202 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none"
              />
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

            {/* Total indicators highlighting the required separations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 flex-shrink-0">
              <div className="bg-slate-50 p-4 border rounded-2xl border-slate-200 shadow-inner">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Total Base Subtotal</span>
                <p className="text-base font-black text-slate-950 mt-1">₹{globalFinancials.totalOriginalSubtotal.toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 p-4 border rounded-2xl border-rose-100 shadow-inner">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-500 block">LTO Promo Exclusions deducted</span>
                <p className="text-base font-black text-rose-600 mt-1">- ₹{globalFinancials.totalDeductionsExcluded.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-4 border rounded-2xl border-emerald-110 shadow-inner">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 block">Net Collected Earnings</span>
                <p className="text-base font-black text-emerald-700 mt-1">₹{globalFinancials.totalFinalReceived.toFixed(2)}</p>
              </div>
            </div>

            <div className="my-2 relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search financials by Order ID or restaurant..."
                value={overlaySearch}
                onChange={(e) => setOverlaySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:outline-none"
              />
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
                  {globalFinancials.validOrders
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
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl shadow transition"
                >
                  Register Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
