import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, ChefHat, CheckCircle,
  AlertTriangle, DollarSign, QrCode, Plus, Edit, Trash2, Search,
  Wand2, FileText, X, Sparkles, RefreshCw, Printer, Download,
  AlertOctagon, ArrowLeftRight, Bell, Camera, Check, Loader2, Utensils,
  LayoutGrid, History, BarChart3, Clock
} from 'lucide-react';
import { Restaurant, MenuItem, Order, Buzzer, FloorDef } from '../types';
import { supabase } from '../supabase';
import html2canvas from 'html2canvas';
import AnalyticsDashboard from './analytics/AnalyticsDashboard';
import { calculateBillSummary } from '../utils/billing';
import { BhojanProvider, BhojanFloatingWidget, BhojanAdminChatDrawer } from './Bhojan';
import bhojanHead from '../assets/bhojan-head.png';
interface AdminProps {
  restaurant: Restaurant;
  restaurants: Restaurant[];
  onChangeRestaurantStatus: (status: 'active' | 'inactive') => void;
  onUpdateRestaurantPin?: (tenantId: string, pin: string) => void;
  menus: MenuItem[];
  onMenuItemSave: (menuItem: MenuItem, isEdit: boolean) => void;
  onMenuItemDelete: (id: string) => void;
  orders: Order[];
  onUpdateOrderStatus: (id: string, nextStatus: any, released?: boolean) => void;
  onCancelSpecificDish?: (orderId: string, itemIdx: number) => void;
  onTableUpdate: (count: number, floors?: FloorDef[]) => void;
  triggerAppAlert: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  buzzers: Buzzer[];
  activeTab?: 'orders' | 'floor' | 'menu' | 'tables' | 'history' | 'analytics';
  setActiveTab?: (tab: 'orders' | 'floor' | 'menu' | 'tables' | 'history' | 'analytics') => void;
  pendingCancellations?: any[];
}

export default function RestaurantAdminPanel({
  restaurant,
  restaurants,
  onChangeRestaurantStatus,
  onUpdateRestaurantPin,
  menus,
  onMenuItemSave,
  onMenuItemDelete,
  orders,
  onUpdateOrderStatus,
  onCancelSpecificDish,
  onTableUpdate,
  triggerAppAlert,
  buzzers,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  pendingCancellations
}: AdminProps) {
  if (restaurant?.disableAdminPortal) {
    return (
      <div id="restaurant-admin-panel-blocked" className="max-w-4xl mx-auto my-12 p-8 bg-white border border-rose-100 rounded-3xl shadow-xl text-center">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600 mb-4">
          <AlertOctagon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Admin Portal Access Suspended</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
          The administrative privileges for <span className="font-extrabold text-slate-800">{restaurant.name}</span> have been temporarily disabled or limited by the Platform Administrator. Contact support to request reinstatement.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => window.location.href = '/portal'}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Go to Portal Gateway
          </button>
        </div>
      </div>
    );
  }

  const [localActiveTab, setLocalActiveTab] = useState<'orders' | 'menu' | 'tables' | 'floor' | 'history' | 'analytics'>('orders');
  const [submittingOrderIds, setSubmittingOrderIds] = useState<Record<string, boolean>>({});
  const [isSettlingTable, setIsSettlingTable] = useState(false);
  const [showCancelWarningConfirm, setShowCancelWarningConfirm] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState(10);
  const [cancelTimerId, setCancelTimerId] = useState<any>(null);

  const handleUpdateStatusSecure = async (orderId: string, nextStatus: any, released?: boolean) => {
    if (submittingOrderIds[orderId]) return;
    if (pendingCancellations?.some((pc: any) => pc.orderId === orderId)) return;
    
    setSubmittingOrderIds(prev => ({ ...prev, [orderId]: true }));
    try {
      await onUpdateOrderStatus(orderId, nextStatus, released);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingOrderIds(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'rejected'>('all');
  const [historyReleaseFilter, setHistoryReleaseFilter] = useState<'all' | 'active' | 'cleared'>('all');
  const [historyMinAmount, setHistoryMinAmount] = useState<string>('');
  const [historyMaxAmount, setHistoryMaxAmount] = useState<string>('');
  const [showAllHistoryDates, setShowAllHistoryDates] = useState<boolean>(false);

  const pendingBuzzers = useMemo(() => {
    return buzzers.filter(b => b.restaurantId === restaurant.id);
  }, [buzzers, restaurant]);

  const handleDismissBuzzer = async (buzzerId: string) => {
    try {
      await supabase.from('buzzers').delete().eq('id', buzzerId);
      triggerAppAlert("Table Call Cleared", "The waiter has responded to the table.", "success");
    } catch (e) {
      triggerAppAlert("Alert Clear Error", "We couldn't clear the alert.", "error");
    }
  };

  const [isSalesLedgerOpen, setIsSalesLedgerOpen] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFromDate, setLedgerFromDate] = useState<string>('');
  const [ledgerToDate, setLedgerToDate] = useState<string>('');
  const [releasingTableNum, setReleasingTableNum] = useState<number | null>(null);

  // AI states
  const [isAiWritingDescription, setIsAiWritingDescription] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReportOutput, setAiReportOutput] = useState('');
  const [aiDailyBriefing, setAiDailyBriefing] = useState('');
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  // Seating print & download states
  const [printMode, setPrintMode] = useState<'single' | 'all' | 'custom' | null>(null);
  const [printTargetTable, setPrintTargetTable] = useState<number>(1);
  const [qrActionModal, setQrActionModal] = useState<'print' | 'download' | null>(null);
  const [customTablesInput, setCustomTablesInput] = useState<string>('');

  const downloadIndividualPNG = async (tableNum: number) => {
    const flyerEl = document.getElementById('flyer-preview-container');
    if (!flyerEl) {
      triggerAppAlert("Download Error", "Flyer preview element not found.", "error");
      return;
    }
    try {
      const canvas = await html2canvas(flyerEl, {
        scale: 3, // Premium quality
        backgroundColor: '#020617', // slate-950 color
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-table-${tableNum}-flyer.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      triggerAppAlert("Success", `Flyer for Table #${tableNum} downloaded.`, "success");
    } catch (err) {
      console.error(err);
      triggerAppAlert("Error", "Failed to generate flyer image.", "error");
    }
  };

  const downloadAllPNGs = async () => {
    triggerAppAlert("Bulk Download Started", "Preparing PNG flyers for all tables sequentially. Please do not close this window.", "info");
    const total = restaurant.totalTables || 8;
    const originalTable = selectedQRTable;
    
    for (let t = 1; t <= total; t++) {
      setSelectedQRTable(t);
      // Wait for React and the QR code image to fully load/render
      await new Promise((resolve) => setTimeout(resolve, 350));
      
      const flyerEl = document.getElementById('flyer-preview-container');
      if (flyerEl) {
        try {
          const canvas = await html2canvas(flyerEl, {
            scale: 2.5,
            backgroundColor: '#020617',
            useCORS: true,
          });
          const link = document.createElement('a');
          link.download = `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-table-${t}-flyer.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (err) {
          console.error(`Failed to download table ${t}`, err);
        }
      }
    }
    
    // Restore the original table selection
    setSelectedQRTable(originalTable);
    triggerAppAlert("Completed", "All table flyers generated and downloaded successfully.", "success");
  };

  const getSelectedTablesToProcess = (): number[] => {
    if (printMode === 'all') {
      return Array.from({ length: restaurant.totalTables || 8 }, (_, idx) => idx + 1);
    }
    if (printMode === 'custom') {
      const parsed = customTablesInput
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= (restaurant.totalTables || 8));
      return parsed.length > 0 ? parsed : [1];
    }
    return [printTargetTable];
  };

  const downloadCustomPNGs = async () => {
    const tablesToDownload = getSelectedTablesToProcess();
    triggerAppAlert("Bulk Download Started", `Preparing PNG flyers for tables: ${tablesToDownload.join(', ')} sequentially. Please do not close this window.`, "info");
    const originalTable = selectedQRTable;
    
    for (const t of tablesToDownload) {
      setSelectedQRTable(t);
      // Wait for React and the QR code image to fully load/render
      await new Promise((resolve) => setTimeout(resolve, 350));
      
      const flyerEl = document.getElementById('flyer-preview-container');
      if (flyerEl) {
        try {
          const canvas = await html2canvas(flyerEl, {
            scale: 2.5,
            backgroundColor: '#020617',
            useCORS: true,
          });
          const link = document.createElement('a');
          link.download = `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-table-${t}-flyer.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (err) {
          console.error(`Failed to download table ${t}`, err);
        }
      }
    }
    
    // Restore the original table selection
    setSelectedQRTable(originalTable);
    triggerAppAlert("Completed", "Custom table flyers generated and downloaded successfully.", "success");
  };

  const toTitleCaseName = (str: string): string => {
    if (!str) return '';
    return str
      .trim()
      .split(/\s+/)
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Menu Modal states
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: 'Mains',
    isAvailable: true, isLimitedTimeOffer: false, offerDetails: '', promoValue: '2.00', isVeg: true,
    imageUrl: '', availableFromHour: '', availableUntilHour: ''
  });

  // Food Photography AI Studio States
  const [isPhotoStudioOpen, setIsPhotoStudioOpen] = useState(false);
  const [selectedStudioLighting, setSelectedStudioLighting] = useState<'moody' | 'cafe' | 'flatlay' | 'rustic'>('moody');
  const [isPerformingShoot, setIsPerformingShoot] = useState(false);
  const [shootFlash, setShootFlash] = useState(false);
  const [customShootQuery, setCustomShootQuery] = useState('');
  const [shootResults, setShootResults] = useState<string[]>([]);
  const [aiCustomPromptDraft, setAiCustomPromptDraft] = useState('');
  const [isFormulatingPrompt, setIsFormulatingPrompt] = useState(false);

  const [tempTableCount, setTempTableCount] = useState<string>(restaurant?.totalTables.toString() || '8');
  const [useFloors, setUseFloors] = useState<boolean>(!!(restaurant?.floors && restaurant.floors.length > 0));
  const [floorsData, setFloorsData] = useState<FloorDef[]>(restaurant?.floors || [{ name: 'Main Floor', seats: restaurant?.totalTables || 8 }]);
  const [selectedQRTable, setSelectedQRTable] = useState<number>(1);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [pinFormVal, setPinFormVal] = useState<string>(restaurant?.verificationPin || '1234');

  useEffect(() => {
    if (restaurant) {
      setTempTableCount(restaurant.totalTables.toString());
      setUseFloors(!!(restaurant.floors && restaurant.floors.length > 0));
      setFloorsData(restaurant.floors || [{ name: 'Main Floor', seats: restaurant.totalTables || 8 }]);
      setSelectedQRTable(1);
      setPinFormVal(restaurant.verificationPin || '1234');
    }
  }, [restaurant]);

  const tenantOrders = useMemo(() => {
    let filtered = orders.filter(o => o.restaurantId === restaurant?.id && !o.id.toLowerCase().includes('rest') && o.id !== restaurant?.id);
    if (restaurant?.hideHistoryOlderThanOneDay) {
      const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => {
        const orderTime = new Date(o.createdAt).getTime();
        return orderTime >= oneDayAgo || o.status === 'pending' || o.status === 'accepted';
      });
    }
    return filtered;
  }, [orders, restaurant]);

  const dailyHistorySummaries = useMemo(() => {
    const summaries: Record<string, { count: number; revenue: number; orders: Order[] }> = {};

    tenantOrders.forEach(o => {
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
  }, [tenantOrders]);

  useEffect(() => {
    if (!selectedHistoryDate && dailyHistorySummaries.length > 0) {
      setSelectedHistoryDate(dailyHistorySummaries[0].dateStr);
    }
  }, [dailyHistorySummaries, selectedHistoryDate]);

  const filteredHistoryOrders = useMemo(() => {
    let sourceOrders: Order[] = [];
    if (showAllHistoryDates) {
      sourceOrders = tenantOrders;
    } else {
      const activeDateGroup = dailyHistorySummaries.find(g => g.dateStr === selectedHistoryDate);
      if (activeDateGroup) {
        sourceOrders = activeDateGroup.orders;
      }
    }

    return sourceOrders.filter(o => {
      // 1. Text Search Filter (Guarded against null/undefined values)
      const text = historySearch.trim().toLowerCase();
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
  }, [tenantOrders, dailyHistorySummaries, selectedHistoryDate, showAllHistoryDates, historySearch, historyStatusFilter, historyReleaseFilter, historyMinAmount, historyMaxAmount]);

  const formatHistoryDate = (dateStr: string) => {
    if (dateStr === 'Unknown Date') return 'Unknown Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const consolidatedHistory = useMemo(() => {
    if (filteredHistoryOrders.length === 0) return [];

    const groups: Record<string, { 
      phone: string, 
      date: string, 
      items: Record<string, number>, 
      total: number, 
      lastCheckout: string,
      userName: string 
    }> = {};

    filteredHistoryOrders.forEach(o => {
      const date = o.createdAt ? o.createdAt.split('T')[0] : 'Unknown';
      const key = `${o.userPhone}_${date}`;
      
      if (!groups[key]) {
        groups[key] = { 
          phone: o.userPhone || 'Unknown', 
          date, 
          items: {}, 
          total: 0, 
          lastCheckout: o.createdAt || '',
          userName: o.userName || 'Guest'
        };
      }
      
      o.items.forEach(it => {
        groups[key].items[it.name] = (groups[key].items[it.name] || 0) + it.quantity;
      });
      groups[key].total += o.totalAmount;
      if (new Date(o.createdAt).getTime() > new Date(groups[key].lastCheckout).getTime()) {
        groups[key].lastCheckout = o.createdAt;
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.lastCheckout).getTime() - new Date(a.lastCheckout).getTime());
  }, [filteredHistoryOrders]);

  const stats = useMemo(() => {
    const pending = tenantOrders.filter(o => o.status === 'pending').length;
    const accepted = tenantOrders.filter(o => o.status === 'accepted').length;
    const completed = tenantOrders.filter(o => o.status === 'completed').length;
    const revenue = tenantOrders.filter(o => o.status !== 'rejected').reduce((sum, o) => sum + o.totalAmount, 0);
    return { pending, accepted, completed, revenue };
  }, [tenantOrders]);

  const currentRestaurantMenus = useMemo(() => {
    return menus.filter(m => m.restaurantId === restaurant?.id);
  }, [menus, restaurant]);



  const ledgerBreakdown = useMemo(() => {
    const validOrders = tenantOrders.filter(o => {
      if (o.status === 'rejected') return false;
      const orderDate = o.createdAt ? o.createdAt.split('T')[0] : '';
      if (ledgerFromDate && orderDate < ledgerFromDate) return false;
      if (ledgerToDate && orderDate > ledgerToDate) return false;
      return true;
    });
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
  }, [tenantOrders, ledgerFromDate, ledgerToDate]);

  const handleToggleOperationalStatus = () => {
    if (restaurant.lockedBySuperAdmin) {
      triggerAppAlert(
        "System Paused",
        "Your kitchen access is currently paused by the system manager. Please contact the main administrator.",
        "error"
      );
      return;
    }

    const nextStatus = restaurant.status === 'active' ? 'inactive' : 'active';
    onChangeRestaurantStatus(nextStatus);
    triggerAppAlert(
      "Settings Updated",
      `Your kitchen status has been updated to ${nextStatus.toUpperCase()} successfully.`,
      "success"
    );
  };

  const scrollToOrderSection = (status: 'pending' | 'accepted' | 'completed' | 'rejected') => {
    const el = document.getElementById(`order-section-${status}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-indigo-500/30');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-indigo-500/30');
      }, 1500);
    }
  };

  const handleAiWriteDescription = async () => {
    if (!menuForm.name) {
      triggerAppAlert("Missing Dish Details", "Please enter a dish name so the AI can write a tasty description.", "error");
      return;
    }

    setIsAiWritingDescription(true);
    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: `Compose an elegant, brief (1-2 sentences), appetizing culinary description for a dish named "${menuForm.name}" under the general category of "${menuForm.category}". Focus on flavor profile, appetizing adjectives and artisan value. Do not write the price.`
        })
      });

      const data = await res.json();
      setMenuForm(prev => ({
        ...prev,
        description: data.text ? data.text.trim().replace(/^"|"$/g, '') : ""
      }));
      triggerAppAlert("Description Polished!", "AI has formulated a high-conversion culinary description.", "success");
    } catch (e) {
      triggerAppAlert("Description compose error", "Failed to retrieve AI Assistant. Let's try again.", "error");
    } finally {
      setIsAiWritingDescription(false);
    }
  };

  const handleGenerateAiOptimizerReport = async () => {
    setIsGeneratingReport(true);
    setAiReportOutput('');

    try {
      const res = await fetch("/api/gemini/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: `Examine this operational context:
Restaurant Name: ${restaurant.name}
Active menu catalog items: ${JSON.stringify(currentRestaurantMenus.map(m => ({ name: m.name, price: m.price, category: m.category, isPromo: m.isLimitedTimeOffer, isAvailable: m.isAvailable })))}
Recent chronological order transaction logs: ${JSON.stringify(tenantOrders.map(o => ({ id: o.id, itemsCount: o.items.length, itemsCombined: o.items.map(i => `${i.quantity}x ${i.name}`).join(', '), status: o.status, grossCollected: o.totalAmount })))}

Produce a premium operations audit summary. Provide 3 direct business recommendations on item optimizations, strategic discount options, or margins growth. Limit to 200 words with sharp bullet points.`
        })
      });

      const data = await res.json();
      setAiReportOutput(data.text || "Could not generate strategy report at this time.");
    } catch (err) {
      setAiReportOutput("AI diagnostics endpoint is taking a slight rest. Try submitting again shortly.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOpenMenuModal = (item: MenuItem | null = null) => {
    setIsPhotoStudioOpen(false);
    setShootResults([]);
    setAiCustomPromptDraft('');
    setCustomShootQuery('');
    if (item) {
      setEditingItem(item);
      setMenuForm({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category,
        isAvailable: item.isAvailable,
        isLimitedTimeOffer: item.isLimitedTimeOffer,
        offerDetails: item.offerDetails || '',
        promoValue: (item.promoValue || 2.00).toString(),
        isVeg: item.isVeg !== undefined ? item.isVeg : true,
        imageUrl: item.imageUrl || '',
        availableFromHour: item.availableFromHour !== undefined && item.availableFromHour !== null ? item.availableFromHour.toString() : '',
        availableUntilHour: item.availableUntilHour !== undefined && item.availableUntilHour !== null ? item.availableUntilHour.toString() : ''
      });
    } else {
      setEditingItem(null);
      setMenuForm({
        name: '', description: '', price: '', category: 'Mains',
        isAvailable: true, isLimitedTimeOffer: false, offerDetails: '', promoValue: '2.00',
        isVeg: true,
        imageUrl: '',
        availableFromHour: '',
        availableUntilHour: ''
      });
    }
    setIsMenuModalOpen(true);
  };

  const handleFormulatePhotographyPrompt = async () => {
    if (!menuForm.name) {
      triggerAppAlert("Missing Dish Details", "Please specify a Dish Title to instruct the AI Photography Director.", "error");
      return;
    }
    setIsFormulatingPrompt(true);
    try {
      const lightingText = {
        moody: "Moody Fine-Dining (DSLR overhead, dark slate background, warm dramatic spotlighting, side of rustic herbs, shallow depth of field)",
        cafe: "Vibrant Café (Bright marble countertop, airy natural light, fresh steam rises, cinematic soft shadows, macro styling)",
        flatlay: "Minimalist Flatlay (Perfect top-down symmetry, pristine pastel background, matching culinary tools, flat geometric balance)",
        rustic: "Rustic Tavern (Warm wooden table, sizzling hot-coal smoke glow, iron skillet plated, home-cooked comfort styling)"
      }[selectedStudioLighting];

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: `Compose a detailed, 1-sentence professional DSLR food photography design prompt for our dish named "${menuForm.name}" under the "${menuForm.category}" category, styled with the theme "${lightingText}". Include composition, garnish cues, plate elements, styling detail, and professional camera setting keywords (e.g. 85mm f/1.4, slow shutter, warm backlight). Respond with ONLY the one sentence, without quotes.`
        })
      });
      const data = await res.json();
      setAiCustomPromptDraft(data.text ? data.text.trim().replace(/^"|"$/g, '') : "");
      triggerAppAlert("Director's Draft Ready!", "Gourmet design guidelines engineered successfully.", "success");
    } catch {
      setAiCustomPromptDraft(`A stunning DSLR close-up of fresh, professional ${menuForm.name}, elegantly plated on a bespoke dish under ${selectedStudioLighting} studio lighting, 85mm f/1.4.`);
    } finally {
      setIsFormulatingPrompt(false);
    }
  };

  const handleExecutePhotoShoot = () => {
    const dishQuery = customShootQuery || menuForm.name || "Gourmet Dish";
    setIsPerformingShoot(true);

    // Quick camera flash visual simulation
    setShootFlash(true);
    setTimeout(() => setShootFlash(false), 250);

    setTimeout(() => {
      // Dynamic local index matching
      const queryLower = dishQuery.toLowerCase();
      let themeKey = 'general';
      if (queryLower.includes('chicken') || queryLower.includes('curry') || queryLower.includes('paneer') || queryLower.includes('tikka') || queryLower.includes('makhani') || queryLower.includes('gravy')) {
        themeKey = 'curry';
      } else if (queryLower.includes('rice') || queryLower.includes('biryani') || queryLower.includes('pulao') || queryLower.includes('manchurian')) {
        themeKey = 'rice';
      } else if (queryLower.includes('dosa') || queryLower.includes('idli') || queryLower.includes('vada') || queryLower.includes('samosa') || queryLower.includes('chaat') || queryLower.includes('starter') || queryLower.includes('fried')) {
        themeKey = 'crispy';
      } else if (queryLower.includes('jamun') || queryLower.includes('rabri') || queryLower.includes('sweet') || queryLower.includes('dessert') || queryLower.includes('cake') || queryLower.includes('ice') || queryLower.includes('kulfi')) {
        themeKey = 'dessert';
      } else if (queryLower.includes('lassi') || queryLower.includes('coffee') || queryLower.includes('tea') || queryLower.includes('drink') || queryLower.includes('beverage') || queryLower.includes('smoothie')) {
        themeKey = 'drink';
      } else if (queryLower.includes('pizza') || queryLower.includes('burger') || queryLower.includes('sandwich') || queryLower.includes('fast') || queryLower.includes('pasta') || queryLower.includes('noodle')) {
        themeKey = 'fastfood';
      } else if (queryLower.includes('naan') || queryLower.includes('kulcha') || queryLower.includes('roti') || queryLower.includes('bread') || queryLower.includes('flatbread')) {
        themeKey = 'bakery';
      }

      const matchingBasePool = {
        curry: [
          "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
          "https://images.unsplash.com/photo-1626074353765-517a681e40be",
          "https://images.unsplash.com/photo-1565557623262-b51c2513a641",
          "https://images.unsplash.com/photo-1621996346565-e3bb62732f84"
        ],
        rice: [
          "https://images.unsplash.com/photo-1633945274405-b6c8069047b0",
          "https://images.unsplash.com/photo-1512058564366-18510be2db19",
          "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8",
          "https://images.unsplash.com/photo-1541832676-9b763b0239ab"
        ],
        crispy: [
          "https://images.unsplash.com/photo-1668236543090-82eba5ee5976",
          "https://images.unsplash.com/photo-1601050690597-df056fb4ce78",
          "https://images.unsplash.com/photo-1589301760014-d929f3979dbc",
          "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec"
        ],
        dessert: [
          "https://images.unsplash.com/photo-1587314168485-3236d6710814",
          "https://images.unsplash.com/photo-1563805042-7684c019e1cb",
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
          "https://images.unsplash.com/photo-1551024601-bec78aea704b"
        ],
        drink: [
          "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3",
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
          "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
          "https://images.unsplash.com/photo-1536935338788-846bb9981813"
        ],
        fastfood: [
          "https://images.unsplash.com/photo-1513104890138-7c749659a591",
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
          "https://images.unsplash.com/photo-1606491956689-2ea866880c84",
          "https://images.unsplash.com/photo-1550547660-d9450f859349"
        ],
        bakery: [
          "https://images.unsplash.com/photo-1601356616077-695728ecf769",
          "https://images.unsplash.com/photo-1509440159596-0249088772ff",
          "https://images.unsplash.com/photo-1549931319-a545dcf3bc73",
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a"
        ],
        general: [
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
          "https://images.unsplash.com/photo-1498837167922-ddd27525d352",
          "https://images.unsplash.com/photo-1493770348161-369560ae357d"
        ]
      }[themeKey];

      // Build 4 stunning variants using high-quality crop & focus options on Unsplash
      const variants = matchingBasePool.map((baseUrl, idx) => {
        let width = 450 + (idx * 50);
        let lightingParam = {
          moody: "fit=crop&q=80&brightness=0.85&contrast=1.1&contrast=1.05",
          cafe: "fit=crop&q=80&exposure=1.15&saturation=1.05",
          flatlay: "fit=crop&q=80&sharp=15&contrast=1.02",
          rustic: "fit=crop&q=80&brightness=0.9&warmth=1.1"
        }[selectedStudioLighting];
        return `${baseUrl}?w=${width}&auto=format&${lightingParam}`;
      });

      setShootResults(variants);
      setIsPerformingShoot(false);

      if (!aiCustomPromptDraft) {
        setAiCustomPromptDraft(`Professional photography of delicious, appetizing ${dishQuery}, freshly garnished and served on a high-end chef's flat plate, DSLR f/1.8 with ${selectedStudioLighting} lighting.`);
      }

      triggerAppAlert("Shoot Render Complete", `Formed 4 world-class photorealistic variants matching "${dishQuery}"!`, "success");
    }, 1200);
  };

  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) {
      triggerAppAlert("Warning", "Title and base pricing indices are strictly required.", "error");
      return;
    }

    const priceNum = parseFloat(menuForm.price);
    const promoNum = parseFloat(menuForm.promoValue || '0');
    if (isNaN(priceNum)) {
      triggerAppAlert("Format Failure", "Please enter a valid numeric value for price.", "error");
      return;
    }

    const fromHour = menuForm.availableFromHour !== '' ? parseInt(menuForm.availableFromHour) : undefined;
    const untilHour = menuForm.availableUntilHour !== '' ? parseInt(menuForm.availableUntilHour) : undefined;

    const itemToSave: MenuItem = {
      id: editingItem ? editingItem.id : "menu-" + Math.floor(100 + Math.random() * 900) + "-" + Date.now().toString().slice(-4),
      restaurantId: restaurant.id,
      name: toTitleCaseName(menuForm.name),
      description: toTitleCaseName(menuForm.description),
      price: priceNum,
      category: menuForm.category,
      isAvailable: menuForm.isAvailable,
      isLimitedTimeOffer: menuForm.isLimitedTimeOffer,
      offerDetails: menuForm.isLimitedTimeOffer ? menuForm.offerDetails : '',
      promoValue: menuForm.isLimitedTimeOffer ? promoNum : 0,
      isVeg: menuForm.isVeg,
      imageUrl: menuForm.imageUrl || '',
      availableFromHour: fromHour,
      availableUntilHour: untilHour
    };

    onMenuItemSave(itemToSave, !!editingItem);
    setIsMenuModalOpen(false);
  };

  const handleGenerateDailyBriefing = async () => {
    setIsGeneratingBriefing(true);
    setAiDailyBriefing('');
    try {
      const totalOrdersCount = tenantOrders.length;
      const completedOrdersCount = tenantOrders.filter(o => o.status === 'completed').length;
      const totalRevenue = tenantOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);

      const itemCounts: Record<string, number> = {};
      tenantOrders.filter(o => o.status === 'completed').forEach(o => {
        o.items.forEach(it => {
          itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
        });
      });
      const topItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count} units)`)
        .join(', ');

      const statsSummary = {
        restaurantName: restaurant.name,
        totalOrdersCount,
        completedOrdersCount,
        totalRevenue,
        topItems: topItems || "None yet",
        activeBuzzersCount: buzzers.filter(b => b.status === 'pending').length
      };

      const prompt = `You are the chief operations analyst AI for restaurant "${restaurant.name}".
Construct a highly professional, motivating "Daily Morning Operations Briefing" dashboard checklist card using standard bullet points (no markdown tables, keep it concise under 4 key areas):
1. **Sales & Orders Performance**: Highlight ₹${totalRevenue.toFixed(2)} in completed sales across ${completedOrdersCount} orders (total: ${totalOrdersCount}).
2. **Top Dishes**: Mention the top 3 high-volume items: ${topItems}.
3. **Staff Alert & Buzzer Service**: Provide guidance based on ${statsSummary.activeBuzzersCount} pending floor buzzer chimes.
4. **Actionable Operations Optimization**: Give 1 or 2 high-impact operational recommendations for today (e.g. kitchen prep suggestions, menu adjustment or discount strategy).
Keep the tone energetic, clear, and highly professional. Avoid placeholders. Make it under 150 words.`;

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt,
          systemInstruction: "You are the chief operations analyst AI. Output a neat, premium daily checklist format operations summary."
        })
      });
      const data = await res.json();
      setAiDailyBriefing(data.text || "Could not synthesize report from the transaction engine.");
    } catch (err) {
      console.error("AI Briefing Error:", err);
      setAiDailyBriefing("Could not connect to operational AI assistant.");
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleCommitTableCount = () => {
    if (restaurant.disableQrGeneration) {
      triggerAppAlert("Action Blocked", "Live QR Table scaling/allocations are restricted for this brand by the platform Super Admin.", "error");
      return;
    }

    if (useFloors) {
      const sum = floorsData.reduce((acc, f) => acc + f.seats, 0);
      if (sum < 1 || sum > 200) {
        triggerAppAlert("Integrity Warning", "Total seats across floors must be between 1 and 200.", "error");
        return;
      }
      onTableUpdate(sum, floorsData);
      triggerAppAlert("Floor Scale Committed", `${sum} seats allocated across ${floorsData.length} floors.`, "success");
    } else {
      const val = parseInt(tempTableCount);
      if (isNaN(val) || val < 1 || val > 200) {
        triggerAppAlert("Integrity Warning", "Table count must be kept between 1 and 200 nodes.", "error");
        return;
      }
      onTableUpdate(val, []);
      triggerAppAlert("Tables Scale Committed", `${val} live QR seating nodes actively provisioned.`, "success");
    }
  };

  const handleCommitWaiterPin = () => {
    const pin = pinFormVal.trim();
    if (pin.length !== 4 || isNaN(parseInt(pin))) {
      triggerAppAlert("Validation Warning", "Verification PIN must be exactly 4 digits.", "error");
      return;
    }
    if (onUpdateRestaurantPin) {
      onUpdateRestaurantPin(restaurant.id, pin);
    }
  };

  const handleRandomizeWaiterPin = () => {
    const nextPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPinFormVal(nextPin);
    if (onUpdateRestaurantPin) {
      onUpdateRestaurantPin(restaurant.id, nextPin);
    }
  };

  const floorTableData = useMemo(() => {
    const total = restaurant?.totalTables || 8;
    return Array.from({ length: total }, (_, idx) => {
      const tableNum = idx + 1;
      const tableOrders = tenantOrders.filter(o => o.tableNumber === tableNum);
      const activeOrders = tableOrders.filter(o => o.status !== 'rejected' && o.released !== true);
      const isOccupied = activeOrders.length > 0;

      const openPendingCount = activeOrders.filter(o => o.status === 'pending').length;
      const openPreparingCount = activeOrders.filter(o => o.status === 'accepted').length;

      let floorState: 'empty' | 'pending' | 'preparing' | 'served' = 'empty';
      if (isOccupied) {
        if (openPendingCount > 0) {
          floorState = 'pending';
        } else if (openPreparingCount > 0) {
          floorState = 'preparing';
        } else {
          floorState = 'served';
        }
      }

      let occupantName = "";
      let occupantPhone = "";
      let earliestCreatedAt = "";

      if (isOccupied) {
        const sortedActive = [...activeOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        occupantName = sortedActive[0].userName;
        occupantPhone = sortedActive[0].userPhone;
        earliestCreatedAt = sortedActive[0].createdAt;
      }

      const billTotal = tableOrders
        .filter(o => o.status !== 'rejected')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        tableNum,
        floorState: isOccupied ? floorState : 'empty' as const,
        ordersCount: tableOrders.length,
        billTotal,
        isOccupied,
        occupantName,
        occupantPhone,
        earliestCreatedAt,
        activeOrders
      };
    });
  }, [tenantOrders, restaurant]);

  const handleSettleAndReleaseInitiation = (tableNum: number) => {
    const tableData = floorTableData.find(t => t.tableNum === tableNum);
    if (!tableData || !tableData.isOccupied) return;
    setReleasingTableNum(tableNum);
  };

  const triggerCancelSettleWarning = (tableNum: number) => {
    const tableData = floorTableData.find(t => t.tableNum === tableNum);
    if (!tableData) return;
    const hasActiveCooking = tableData.activeOrders.some(o => o.status === 'pending' || o.status === 'accepted');
    if (hasActiveCooking) {
      setShowCancelWarningConfirm(true);
      setCancelCountdown(10);
      const tid = setInterval(() => {
        setCancelCountdown(prev => {
          if (prev <= 1) {
            clearInterval(tid);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setCancelTimerId(tid);
    } else {
      handleCancelAndRelease(tableNum);
    }
  };

  const handlePrepareAndRelease = async (tableNum: number) => {
    const tableData = floorTableData.find(t => t.tableNum === tableNum);
    if (!tableData || !tableData.isOccupied) return;

    setIsSettlingTable(true);
    try {
      const updatePromises = tableData.activeOrders.map(order =>
        onUpdateOrderStatus(order.id, 'completed', true)
      );
      await Promise.all(updatePromises);

      // Clear occupants from supabase dine_in_users table
      await supabase
        .from('dine_in_users')
        .delete()
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', tableNum);

      // Clear buzzers for that table
      await supabase
        .from('buzzers')
        .delete()
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', tableNum);

      setReleasingTableNum(null);
      triggerAppAlert("Table Settled & Released", `Table #${tableNum} has been completely prepared, settled, and released.`, "success");
    } catch (err) {
      triggerAppAlert("Release Error", "Could not update all orders.", "error");
    } finally {
      setIsSettlingTable(false);
    }
  };

  const handleCancelAndRelease = async (tableNum: number) => {
    const tableData = floorTableData.find(t => t.tableNum === tableNum);
    if (!tableData || !tableData.isOccupied) return;

    setIsSettlingTable(true);
    try {
      const updatePromises = tableData.activeOrders.map(order => {
        const targetStatus = order.status === 'completed' ? 'completed' : 'rejected';
        return onUpdateOrderStatus(order.id, targetStatus, true);
      });
      await Promise.all(updatePromises);

      // Clear occupants from supabase dine_in_users table
      await supabase
        .from('dine_in_users')
        .delete()
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', tableNum);

      // Clear buzzers for that table
      await supabase
        .from('buzzers')
        .delete()
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', tableNum);

      if (cancelTimerId) {
        clearInterval(cancelTimerId);
        setCancelTimerId(null);
      }
      setShowCancelWarningConfirm(false);
      setReleasingTableNum(null);
      triggerAppAlert("Table Settled & Released", `Table #${tableNum} active orders processed and table released.`, "success");
    } catch (err) {
      triggerAppAlert("Release Error", "Could not settle orders.", "error");
    } finally {
      setIsSettlingTable(false);
    }
  };

  return (
    <BhojanProvider portalMode="admin">
      {isSettlingTable && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-xs font-black tracking-widest uppercase animate-pulse">Settling transaction and clearing table...</p>
        </div>
      )}
    <div className="flex-1 max-w-full w-full mx-auto px-4 sm:px-8 lg:px-12 py-6 space-y-6 text-slate-800">

      {/* PRINT-ONLY STYLES - hide all admin chrome during print */}
      <style>{`
        @media print {
          body { visibility: hidden !important; }
          #print-qr-flyer-area, #print-qr-flyer-area * { visibility: visible !important; }
          #print-qr-flyer-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
            background: white !important;
          }
          @page { margin: 0; size: auto; }
        }
      `}</style>




      {/* Dynamic Workspace layout containing left-side tabs and conditional right-side buzzer panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

        {/* Main Tab Content Area */}
        <div className={`${activeTab === 'orders' ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6 order-2 lg:order-1`}>

          {/* TAB: TICKETS DISPATCH OVERVIEW */}
          {activeTab === 'orders' && (
            <div id="live-override-hub" className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Live Orders</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Manage incoming orders and override preparation states.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['pending', 'accepted', 'completed', 'rejected'] as const).map(sectionStatus => {
                  const list = tenantOrders.filter(o => o.status === sectionStatus && o.released !== true);
                  return (<div
                    key={sectionStatus}
                    id={`order-section-${sectionStatus}`}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col space-y-3 transition-all duration-300"
                  >
                    <span className={`text-xs font-black uppercase flex items-center gap-1 pb-2 border-b border-slate-100 ${sectionStatus === 'pending' ? 'text-yellow-600' :
                      sectionStatus === 'accepted' ? 'text-blue-600' :
                        sectionStatus === 'completed' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                      {sectionStatus === 'pending' ? 'Pending' :
                        sectionStatus === 'accepted' ? 'Cooking' :
                          sectionStatus === 'completed' ? 'Served' : 'Cancelled'} ({list.length})
                    </span>

                    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-285px)] scrollbar-none">
                      {list.map(o => (
                        <div
                          key={o.id}
                          className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 relative border-l-4 ${o.status === 'pending' ? 'border-l-amber-500 bg-amber-50/5' :
                            o.status === 'accepted' ? 'border-l-blue-500 bg-blue-50/5' :
                              o.status === 'completed' ? 'border-l-emerald-500 bg-emerald-50/5' : 'border-l-rose-500 bg-rose-50/5'
                            }`}
                        >
                          <div className="flex justify-between font-bold text-[11px]">
                            <div>
                              <span className="text-slate-900 block font-black text-xs">Table #{o.tableNumber}</span>
                              <span className="text-[9px] text-slate-400 block font-mono">ID: {o.id.split('-')[1]}</span>
                            </div>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold">
                              {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="py-2 border-y border-dashed border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center group">
                                <span className="flex items-center gap-2">
                                  {onCancelSpecificDish && (
                                    <button
                                      onClick={() => onCancelSpecificDish(o.id, idx)}
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                      title="Cancel individual dish"
                                    >
                                      <X size={10} className="stroke-[3]" />
                                    </button>
                                  )}
                                  <span className={`px-1.5 py-0.5 text-[9px] font-black rounded ${o.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    o.status === 'accepted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                      'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}>
                                    {it.quantity}x
                                  </span>
                                  <span className="font-semibold text-slate-800">{it.name}</span>
                                </span>
                                <span className="font-bold text-slate-900">₹{(it.price * it.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Bill displaying precise exclusions */}
                          <div className="text-[10px] text-slate-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Base Subtotal:</span>
                              <span>₹{(calculateBillSummary(o.items).originalSubtotal).toFixed(2)}</span>
                            </div>
                            {calculateBillSummary(o.items).totalDeductions > 0 && (
                              <div className="flex justify-between text-rose-600 font-bold">
                                <span>Excluded Special Offer:</span>
                                <span>-₹{(calculateBillSummary(o.items).totalDeductions).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-950 font-black border-t border-slate-100 pt-1.5">
                              <span className="text-xs">Final Net:</span>
                              <span className="text-xs">₹{o.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* GEOFENCING ANTI-FRAUD DISPATCH INDICATOR */}
                          {o.requiresHandshake && !o.handshakeApproved ? (
                            <div id={`handshake-warning-${o.id}`} className="bg-amber-50 border border-amber-250 text-amber-950 rounded-2xl p-3.5 space-y-2 text-left text-[10.5px] shadow-sm ring-2 ring-amber-400/30 animate-pulse">
                              <div className="flex justify-between items-center">
                                <span className="font-black flex items-center gap-1.5 text-amber-800 text-[9px] uppercase tracking-wider">
                                  <AlertOctagon size={12} className="text-amber-600 shrink-0" />
                                  REMOTE GEOFENCE HOLD
                                </span>
                                <span className="text-[9.5px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.5 rounded-lg font-mono">CODE: {o.handshakeCode}</span>
                              </div>
                              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                                Diner ordered outside boundary range. Verify guest presence to unlock kitchen preparation.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateStatusSecure(o.id, 'accepted');
                                }}
                                disabled={submittingOrderIds[o.id] || pendingCancellations?.some((pc: any) => pc.orderId === o.id)}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-center py-2 rounded-xl font-black text-[9.5px] uppercase tracking-wider transition shadow-sm hover:shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Bypass Hold & Release
                              </button>
                            </div>
                          ) : o.requiresHandshake && o.handshakeApproved ? (
                            <div className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-150 rounded-xl p-2.5 flex items-center gap-1.5 font-bold">
                              <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                              <span>Remote Hold Released via Floor PIN</span>
                            </div>
                          ) : null}

                          {/* Administrative override buttons */}
                          <div className="flex gap-1">
                            {o.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatusSecure(o.id, 'rejected')}
                                  disabled={submittingOrderIds[o.id] || pendingCancellations?.some((pc: any) => pc.orderId === o.id)}
                                  className="w-1/2 bg-white hover:bg-rose-50 border border-slate-250 hover:border-rose-300 text-rose-500 px-2 py-1 text-[10px] font-black rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleUpdateStatusSecure(o.id, 'accepted')}
                                  disabled={submittingOrderIds[o.id] || pendingCancellations?.some((pc: any) => pc.orderId === o.id)}
                                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-black rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Accept
                                </button>
                              </>
                            )}

                            {o.status === 'accepted' && (
                              <div className="flex gap-1 w-full">
                                <button
                                  onClick={() => handleUpdateStatusSecure(o.id, 'rejected')}
                                  disabled={submittingOrderIds[o.id] || pendingCancellations?.some((pc: any) => pc.orderId === o.id)}
                                  className="w-1/2 bg-white hover:bg-rose-50 border border-slate-250 text-rose-500 px-2 py-1 text-[10px] font-black rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Cancel order
                                </button>
                                <button
                                  onClick={() => handleUpdateStatusSecure(o.id, 'completed')}
                                  disabled={submittingOrderIds[o.id] || pendingCancellations?.some((pc: any) => pc.orderId === o.id)}
                                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-[10px] font-black rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Deliver Table
                                </button>
                              </div>
                            )}

                            {(o.status === 'completed' || o.status === 'rejected') && (
                              <button
                                onClick={() => handleUpdateStatusSecure(o.id, 'accepted', false)}
                                disabled={submittingOrderIds[o.id] || pendingCancellations?.some((pc: any) => pc.orderId === o.id)}
                                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-800 px-2 py-1 text-[10px] font-black rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Revert to preparing
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {list.length === 0 && (
                        <p className="text-[11px] text-slate-400 font-bold text-center py-6">Current partition empty.</p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: MENU PROMOS ENGINE */}
          {activeTab === 'menu' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              {restaurant.lockAllItems && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
                  <div className="p-1 px-2 font-black rounded bg-rose-600 text-white shrink-0 self-start">CATALOG LOCKED</div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-rose-950">Recipe and Price Configuration Locked</h4>
                    <p className="text-rose-800 font-medium">This brand has its recipes locked in a strict Read-Only mode by the Platform Administrator. Item creation, price revisions, and deletion operations are suspended.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Menu Items ({currentRestaurantMenus.length})</h3>
                  <p className="text-xs text-slate-500">Manage dishes, prices, and promotional discounts.</p>
                </div>
                <button
                  onClick={() => {
                    if (restaurant.lockAllItems) {
                      triggerAppAlert("Action Blocked", "Your brand is set to read-only by the Super Admin.", "error");
                      return;
                    }
                    handleOpenMenuModal();
                  }}
                  disabled={!!restaurant.lockAllItems}
                  className={`font-bold text-xs py-2 px-4 rounded-xl transition flex items-center gap-1 self-start ${restaurant.lockAllItems
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                >
                  <Plus size={15} />
                  Add Menu Item
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search menu items by name, category, or description..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="overflow-x-auto max-h-[520px] overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200 text-slate-400 font-black uppercase hover:bg-transparent">
                      <th className="py-2.5 px-1.5">Item Details</th>
                      <th className="py-2.5 px-1.5">Category</th>
                      <th className="py-2.5 px-1.5">Price</th>
                      <th className="py-2.5 px-1.5">Special Offers</th>
                      <th className="py-2.5 px-1.5">Availability</th>
                      <th className="py-2.5 px-1.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRestaurantMenus.filter(item => {
                      if (!menuSearchQuery.trim()) return true;
                      const q = menuSearchQuery.toLowerCase();
                      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
                    }).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition duration-100">
                        <td className="py-3 px-1.5 max-w-sm">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.imageUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&auto=format&fit=crop&q=80"}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shadow-inner flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {item.isVeg !== undefined && (
                                  <div className={`w-3 h-3 border ${item.isVeg ? 'border-emerald-600' : 'border-rose-600'} flex items-center justify-center p-[1px] rounded-xs bg-white flex-shrink-0`} title={item.isVeg ? "Veg" : "Non-Veg"}>
                                    <div className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}></div>
                                  </div>
                                )}
                                <p className="font-extrabold text-slate-900 leading-snug truncate">{toTitleCaseName(item.name)}</p>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-1">{item.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-1.5">
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wide">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-1.5 font-bold text-slate-800">
                          <div>
                            <span>₹{item.price.toFixed(2)}</span>
                            {item.isLimitedTimeOffer && (
                              <span className="text-[10px] text-slate-400 block line-through">
                                ₹{(item.price + item.promoValue).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-1.5">
                          {item.isLimitedTimeOffer ? (
                            <div>
                              <span className="bg-amber-100 text-amber-800 font-black px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider">
                                ACTIVE PROMO
                              </span>
                              <p className="text-[10px] text-amber-600 truncate font-semibold mt-0.5">{item.offerDetails}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[10px]">Disabled</span>
                          )}
                        </td>
                        <td className="py-3 px-1.5">
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                if (restaurant.lockAllItems) {
                                  triggerAppAlert("Action Blocked", "Your recipe catalog is currently locked as Read-Only.", "error");
                                  return;
                                }
                                onMenuItemSave({ ...item, isAvailable: !item.isAvailable }, true);
                                // If marking as sold out, cancel pending orders with this item
                                if (item.isAvailable) {
                                  fetch("/api/menus/sold-out/" + item.id, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ restaurantId: restaurant.id })
                                  }).then(r => r.json()).then(data => {
                                    if (data.affectedOrders?.length > 0) {
                                      triggerAppAlert(
                                        "Items Auto-Cancelled",
                                        `Marked "${item.name}" as sold out. ${data.cancelledItems} item(s) auto-cancelled from ${data.affectedOrders.length} order(s).`,
                                        "info"
                                      );
                                    }
                                  }).catch(() => { });
                                }
                              }}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-black uppercase ${item.isAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' :
                                'bg-rose-50 text-rose-500 border border-rose-200'
                                } ${restaurant.lockAllItems ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {item.isAvailable ? "Available" : "Sold Out"}
                            </button>
                            {item.availableFromHour !== undefined && item.availableFromHour !== null && (
                              <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5 mt-0.5">
                                <Clock size={10} />
                                <span>{item.availableFromHour.toString().padStart(2, '0')}:00 - {item.availableUntilHour?.toString().padStart(2, '0')}:00</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-1.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (restaurant.lockAllItems) {
                                triggerAppAlert("Action Blocked", "Your recipe catalog is currently locked as Read-Only.", "error");
                                return;
                              }
                              handleOpenMenuModal(item);
                            }}
                            className={`p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded ${restaurant.lockAllItems ? 'cursor-not-allowed opacity-40' : ''}`}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (restaurant.lockAllItems) {
                                triggerAppAlert("Action Blocked", "Your recipe catalog is currently locked as Read-Only.", "error");
                                return;
                              }
                              onMenuItemDelete(item.id);
                            }}
                            className={`p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded ${restaurant.lockAllItems ? 'cursor-not-allowed opacity-40' : ''}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentRestaurantMenus.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 font-bold text-slate-400">No catalog items. Onboard menu cards above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: QR CODE flyers GENERATOR */}
          {activeTab === 'tables' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
              {restaurant.disableQrGeneration && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
                  <div className="p-1 px-2 font-black rounded bg-amber-600 text-white shrink-0 self-start">SCALING SUSPENDED</div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-amber-950">QR Table Modifications Blocked</h4>
                    <p className="text-amber-800 text-amber-800 font-medium">Your brand's table limits have been locked by the platform manager. Existing tabletop QR layouts remain routable, but scaling the quantities or re-routing URL parameters is currently suspended.</p>
                  </div>
                </div>
              )}

              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-bold text-slate-900">QR Code Generator</h3>
                <p className="text-xs text-slate-500">Create table QR codes and print physical posters.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-5 space-y-6">
                  {/* Card 1: QR Settings */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                    <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600">QR Suite Settings</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 block">1. Allocate Tables Quantity</label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={useFloors}
                            onChange={(e) => setUseFloors(e.target.checked)}
                            disabled={!!restaurant.disableQrGeneration}
                          />
                          <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Use Floors Layout</span>
                        </label>
                      </div>

                      {!useFloors ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="200"
                            disabled={!!restaurant.disableQrGeneration}
                            value={tempTableCount}
                            onChange={(e) => setTempTableCount(e.target.value)}
                            className={`w-20 bg-white border border-slate-300 rounded-xl text-center px-2 py-1.5 font-black text-slate-800 ${restaurant.disableQrGeneration ? 'opacity-50 bg-slate-100 cursor-not-allowed border-slate-200' : ''
                              }`}
                          />
                          <button
                            onClick={handleCommitTableCount}
                            disabled={!!restaurant.disableQrGeneration}
                            className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition text-xs shadow-xs ${restaurant.disableQrGeneration
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                              : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                              }`}
                          >
                            Set Global Table Count
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
                          {floorsData.map((floor, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Floor Name"
                                value={floor.name}
                                onChange={(e) => {
                                  const nd = [...floorsData];
                                  nd[index].name = e.target.value;
                                  setFloorsData(nd);
                                }}
                                disabled={!!restaurant.disableQrGeneration}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                              />
                              <input
                                type="number"
                                min="1" max="100"
                                value={floor.seats}
                                onChange={(e) => {
                                  const nd = [...floorsData];
                                  nd[index].seats = parseInt(e.target.value) || 0;
                                  setFloorsData(nd);
                                }}
                                disabled={!!restaurant.disableQrGeneration}
                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center"
                              />
                              <button
                                onClick={() => {
                                  if (floorsData.length > 1) {
                                    setFloorsData(floorsData.filter((_, i) => i !== index));
                                  }
                                }}
                                disabled={!!restaurant.disableQrGeneration || floorsData.length === 1}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => setFloorsData([...floorsData, { name: `Floor ${floorsData.length + 1}`, seats: 10 }])}
                              disabled={!!restaurant.disableQrGeneration}
                              className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-xl transition"
                            >
                              + Add Floor
                            </button>
                            <button
                              onClick={handleCommitTableCount}
                              disabled={!!restaurant.disableQrGeneration}
                              className="flex-1 py-1.5 px-3 rounded-lg font-bold transition text-[10px] uppercase shadow-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                            >
                              Save Configuration ({floorsData.reduce((a, c) => a + c.seats, 0)} Total)
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-[9.5px] text-slate-400 leading-normal">
                        Scale your physical seats dynamically. Max: 200.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block text-left">2. Choose Seat Showcase</label>
                      <select
                        value={selectedQRTable}
                        onChange={(e) => setSelectedQRTable(parseInt(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
                      >
                        {useFloors ? (() => {
                          let acc = 0;
                          return floorsData.map((floor, fIdx) => {
                            const start = acc + 1;
                            const end = acc + floor.seats;
                            acc += floor.seats;
                            if (floor.seats === 0) return null;
                            return (
                              <optgroup key={fIdx} label={`${floor.name} (Seats ${start}-${end})`}>
                                {Array.from({ length: floor.seats }, (_, idx) => start + idx).map(num => (
                                  <option key={num} value={num}>Desk Standing Card — Table #{num}</option>
                                ))}
                              </optgroup>
                            );
                          });
                        })() : Array.from({ length: restaurant.totalTables }, (_, idx) => idx + 1).map(num => (
                          <option key={num} value={num}>Desk Standing Card — Table #{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>


                  {/* Card 3: Customer Access Key */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-xs space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-700 uppercase text-[9px] tracking-wider">Customer Access Key</p>
                      <span className="font-mono text-xs bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-lg shadow-inner">
                        Key: <span className="font-black text-indigo-650">{restaurant?.verificationPin || '1234'}</span>
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                      Update code or auto-generate digits. Diners input this key to self-verify and place orders if geofencing or automatic GPS validation checks fail.
                    </p>
                    <div className="flex gap-2.5">
                      <input
                        type="text"
                        maxLength={4}
                        value={pinFormVal}
                        onChange={(e) => setPinFormVal(e.target.value.replace(/\D/g, ''))}
                        className="w-16 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-800 tracking-widest text-xs py-1.5"
                        placeholder="1234"
                      />
                      <button
                        onClick={handleCommitWaiterPin}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] py-1.5 rounded-xl font-bold transition cursor-pointer"
                      >
                        Save Key
                      </button>
                      <button
                        onClick={handleRandomizeWaiterPin}
                        title="Rotate Access Key"
                        className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] py-1.5 px-2 rounded-xl font-extrabold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} className="shrink-0" />
                        Rotate
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Column */}
                <div className="xl:col-span-7 space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-slate-800/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex flex-col xl:flex-row items-center gap-6 xl:items-start justify-between min-w-0">
                      {/* Real-time printable poster display mock */}
                      <div className="flex-1 space-y-4 min-w-0 w-full xl:w-auto">
                        <span className="bg-rose-500 text-white py-0.5 px-3 rounded-full text-[8.5px] font-black uppercase tracking-widest block w-max">
                          LIVE DESK TEMPLATE PREVIEW
                        </span>
                        <h4 className="text-lg font-black tracking-tight">Interactive Table Tent Flyer</h4>
                        <p className="text-xs text-slate-305 leading-relaxed">
                          Custom branded with your menu content & logo. Guests scan with their native camera to immediately initiate order tickets on our database.
                        </p>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Direct Dynamic Endpoint</span>
                          <div className="bg-slate-950 p-2 text-[10.5px] font-mono border border-slate-800 rounded-xl text-emerald-400 flex items-center justify-between select-all max-w-sm">
                            <span className="truncate">{window.location.origin}/r/{restaurant.id}/t/{selectedQRTable}</span>
                            <span className="text-[8px] bg-slate-800 text-slate-500 px-1 py-0.2 rounded shrink-0 ml-1">Live</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-3">
                          <button
                            onClick={() => setQrActionModal('print')}
                            className="bg-white hover:bg-slate-100 text-slate-950 font-black px-3 py-2 rounded-xl text-[10px] transition shadow-lg flex items-center gap-1.5 cursor-pointer flex-1 min-w-[130px] justify-center"
                          >
                            🖨 Print Desk-Tent
                          </button>
                          <button
                            onClick={() => setQrActionModal('download')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold px-3 py-2 rounded-xl text-[10px] transition cursor-pointer flex-1 min-w-[130px] justify-center flex items-center gap-1.5"
                          >
                            ↓ Download PNG
                          </button>
                        </div>
                      </div>

                      {/* Visual flyer container reflecting select design template */}
                      <div id="flyer-preview-container" className="w-[360px] bg-slate-950 border border-slate-800 text-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl shrink-0 transition-all duration-300 relative">
                        {/* Accent Line */}
                        <div className="absolute top-0 inset-x-0 h-2.5 rounded-t-3xl bg-indigo-600" />
                        
                        {/* Flyer Header Logo mockup */}
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-80 border-b border-white/20 pb-3 w-full justify-center pt-2">
                          <Utensils size={12} className="text-indigo-400" />
                          <span>{restaurant.name}</span>
                        </div>

                        <div className="my-6 space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Please Scan</div>
                          <h5 className="text-lg font-black tracking-tight text-white uppercase">ORDER DIRECTLY</h5>
                          <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                            View menu, request floor assistance, & self-checkout instantly
                          </p>
                        </div>

                        {/* QR Code Container */}
                        <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center border border-slate-200">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0f172a&data=${encodeURIComponent(`${window.location.origin}/r/${restaurant.id}/t/${selectedQRTable}`)}`}
                            alt={`QR code for Table ${selectedQRTable}`}
                            referrerPolicy="no-referrer"
                            className="w-36 h-36 object-contain"
                          />
                          <span className="text-[9px] font-black tracking-widest uppercase text-slate-900 mt-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-mono">
                            ✦ SCAN ME ✦
                          </span>
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/10 w-full">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">YOUR TABLE</div>
                          <div className="text-2xl font-black tracking-widest font-mono text-white mt-1">
                            TABLE #{selectedQRTable}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* ALWAYS RENDERED FOR DIRECT PRINT - INVISIBLE ON SCREEN, VISIBLE ON PRINT */}
                  <div id="print-qr-flyer-area" className="hidden print:block bg-white min-h-screen w-full">
                    {getSelectedTablesToProcess().map((tnum) => (
                      <div 
                        key={tnum} 
                        className="w-[380px] min-h-[500px] border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center relative bg-slate-950 text-white mx-auto my-12"
                        style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                      >
                        {/* Visual top accent ribbon */}
                        <div className="absolute top-0 inset-x-0 h-2.5 bg-indigo-600 rounded-t-3xl"></div>

                        {/* Restaurant Mark */}
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-90 border-b border-white/20 pb-3 w-full justify-center pt-2">
                          <Utensils size={14} className="text-indigo-400" />
                          <span>{restaurant.name}</span>
                        </div>

                        {/* Subheadings */}
                        <div className="my-6 space-y-2">
                          <div className="text-xs font-black tracking-widest uppercase text-indigo-400">
                            ORDER & PAY DIRECTLY
                          </div>
                          <h2 className="text-xl font-extrabold tracking-tight">SKIP THE WAIT</h2>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                            View menu, request waiter, & self-checkout instantly
                          </p>
                        </div>

                        {/* QR Core Code */}
                        <div className="bg-white p-4 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-200">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0f172a&data=${encodeURIComponent(`${window.location.origin}/r/${restaurant.id}/t/${tnum}`)}`}
                            alt={`Table ${tnum} QR`}
                            referrerPolicy="no-referrer"
                            className="w-40 h-40 object-contain"
                          />
                          <div className="text-[10px] font-black tracking-widest uppercase text-slate-900 mt-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-mono">
                            ✦ SCAN ME ✦
                          </div>
                        </div>

                        {/* Seat Indicator footer card */}
                        <div className="mt-8 pt-4 border-t border-white/10 w-full space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Table Address</div>
                          <div className="text-2xl font-black tracking-widest font-mono text-white">
                            TABLE #{tnum}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BULK QR PRINT MODAL */}
          {isBulkPrintOpen && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-slate-200 rounded-t-3xl">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">All Table QR Codes</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{restaurant.name} — {restaurant.totalTables} tables</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                    >
                      🖨 Print All
                    </button>
                    <button
                      onClick={() => setIsBulkPrintOpen(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl text-xs transition"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* QR Grid — grouped by floor */}
                <div className="p-4 bulk-print-grid">
                  {floorsData.map((floor, fi) => {
                    const startTable = floorsData.slice(0, fi).reduce((sum, f) => sum + f.seats, 0) + 1;
                    const endTable = startTable + floor.seats - 1;
                    const tableNumbers: number[] = [];
                    for (let t = startTable; t <= endTable && t <= (restaurant.totalTables || 50); t++) {
                      tableNumbers.push(t);
                    }
                    return (
                      <div key={fi} className="mb-6">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1.5">
                          {floor.name} — Tables {startTable}-{Math.min(endTable, restaurant.totalTables || 50)}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {tableNumbers.map((tnum) => (
                            <div
                              key={tnum}
                              className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center text-center shadow-sm"
                            >
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0f172a&data=${encodeURIComponent(`${window.location.origin}/r/${restaurant.id}/t/${tnum}`)}`}
                                alt={`Table ${tnum}`}
                                referrerPolicy="no-referrer"
                                className="w-20 h-20 object-contain"
                              />
                              <span className="text-[10px] font-black text-slate-800 mt-1 font-mono">TABLE {tnum}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Print-specific styles for bulk print */}
                <style>{`
              @media print {
                body * { visibility: hidden !important; }
                .bulk-print-grid, .bulk-print-grid * { visibility: visible !important; }
                .bulk-print-grid { position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
                @page { margin: 1cm; size: auto; }
              }
            `}</style>
              </div>
            </div>
          )}

          {/* CUSTOM PRINT/DOWNLOAD SELECTOR MODAL */}
          {qrActionModal && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                    {qrActionModal === 'print' ? <Printer size={20} className="text-indigo-600" /> : <Download size={20} className="text-indigo-600" />}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {qrActionModal === 'print' ? 'Print Seat Flyers' : 'Download Seat Flyers'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select if you would like to {qrActionModal === 'print' ? 'print' : 'download'} the standing card for Table #{selectedQRTable} or all tables at once.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        if (qrActionModal === 'print') {
                          setPrintMode('single');
                          setPrintTargetTable(selectedQRTable);
                          setQrActionModal(null);
                          setTimeout(() => {
                            window.print();
                          }, 250);
                        } else {
                          setQrActionModal(null);
                          await downloadIndividualPNG(selectedQRTable);
                        }
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-between"
                    >
                      <span>Current Table (Table #{selectedQRTable})</span>
                      <span className="text-[10px] opacity-75 font-mono">1 copy</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (qrActionModal === 'print') {
                          setPrintMode('all');
                          setQrActionModal(null);
                          setTimeout(() => {
                            window.print();
                          }, 250);
                        } else {
                          setQrActionModal(null);
                          await downloadAllPNGs();
                        }
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-between"
                    >
                      <span>All Tables (1 to {restaurant.totalTables || 8})</span>
                      <span className="text-[10px] opacity-75 font-mono">{restaurant.totalTables || 8} copies</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-left font-sans">
                      Or Custom Tables (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4,8,1"
                      value={customTablesInput}
                      onChange={(e) => setCustomTablesInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      onClick={async () => {
                        if (!customTablesInput.trim()) {
                          triggerAppAlert("Warning", "Please enter at least one table number.", "error");
                          return;
                        }
                        if (qrActionModal === 'print') {
                          setPrintMode('custom');
                          setQrActionModal(null);
                          setTimeout(() => {
                            window.print();
                          }, 250);
                        } else {
                          setQrActionModal(null);
                          await downloadCustomPNGs();
                        }
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-between"
                    >
                      <span>Process Custom Selection</span>
                      <span className="text-[10px] opacity-75 font-mono">Custom</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setQrActionModal(null)}
                    className="text-xs font-bold text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIVE FLOOR SEATING MONITOR */}
          {activeTab === 'floor' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Table Overview</h3>
                  <p className="text-xs text-slate-500">Monitor table occupancy, pending orders, and active bills.</p>
                </div>
                <button
                  onClick={() => setActiveTab('tables')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer w-max"
                >
                  <QrCode size={13} />
                  <span>QR Code Settings</span>
                </button>
              </div>

              <div className="space-y-8">
                {restaurant.floors && restaurant.floors.length > 0 ? (() => {
                  let acc = 0;
                  return restaurant.floors.map((floor, fIdx) => {
                    const start = acc;
                    const end = acc + floor.seats;
                    acc += floor.seats;
                    const floorTables = floorTableData.slice(start, end);

                    if (floorTables.length === 0) return null;

                    return (
                      <div key={fIdx} className="space-y-3">
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{floor.name}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                          {floorTables.map(t => {
                            let liveDurationStr = "";
                            if (t.isOccupied && t.earliestCreatedAt) {
                              const diffMs = Date.now() - new Date(t.earliestCreatedAt).getTime();
                              const totalSec = Math.floor(Math.max(0, diffMs) / 1000);
                              const min = Math.floor(totalSec / 60);
                              const sec = totalSec % 60;
                              liveDurationStr = `${min}m ${sec}s`;
                            }

                            return (
                              <div
                                key={t.tableNum}
                                className={`p-3 rounded-2xl border flex flex-col justify-between h-[185px] transition-all duration-300 relative ${t.floorState === 'empty' ? 'bg-slate-50 border-slate-200 opacity-60' :
                                  t.floorState === 'pending' ? 'bg-yellow-50 border-yellow-300 shadow-sm shadow-yellow-100' :
                                    t.floorState === 'preparing' ? 'bg-blue-50 border-blue-300 shadow-sm shadow-blue-105' :
                                      'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100'
                                  }`}
                              >
                                <div>
                                  <div className="flex justify-between items-center text-[8.5px] text-slate-400">
                                    <span className="font-mono">TABLE</span>
                                    <span className={`w-2 h-2 rounded-full ${t.floorState === 'empty' ? 'bg-slate-300' :
                                      t.floorState === 'pending' ? 'bg-yellow-500 animate-pulse' :
                                        t.floorState === 'preparing' ? 'bg-blue-500 animate-pulse' :
                                          'bg-emerald-500'
                                      }`}></span>
                                  </div>
                                  <h4 className="text-sm font-black text-slate-900 mt-0.5">Seat #{t.tableNum}</h4>
                                </div>

                                <div className="space-y-1.5 z-10 text-[9px] flex-1 flex flex-col justify-end mt-2">
                                  {t.isOccupied ? (
                                    <div className="space-y-1 w-full">
                                      <div className="flex justify-between items-center text-slate-800 leading-tight">
                                        <span className="font-extrabold truncate max-w-[70px]">👤 {t.occupantName}</span>
                                        <span className="text-[8px] text-indigo-600 font-bold font-mono">⏱ {liveDurationStr.split(' ')[0] || "0m"}</span>
                                      </div>
                                      
                                      {/* Order tickets list with status */}
                                      <div className="space-y-1 my-1 max-h-[50px] overflow-y-auto pr-0.5 scrollbar-thin">
                                        {t.activeOrders.map(ord => (
                                          <div key={ord.id} className="flex justify-between items-center text-[7.5px] border-b border-black/5 pb-0.5">
                                            <span className="font-mono text-slate-500">#{ord.id.split('-')[1]}</span>
                                            <span className={`px-1 rounded-full font-black uppercase text-[6.5px] ${
                                              ord.status === 'pending' 
                                                ? 'bg-yellow-105 text-yellow-800' 
                                                : ord.status === 'accepted' 
                                                  ? 'bg-blue-105 text-blue-800' 
                                                  : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                              {ord.status === 'pending' ? 'Pending' : ord.status === 'accepted' ? 'Preparing' : 'Delivered'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="flex justify-between items-center text-[8.5px] text-slate-500 pt-0.5">
                                        <span>{t.ordersCount} tickets</span>
                                        <span className="font-black text-slate-900">₹{t.billTotal.toFixed(0)}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSettleAndReleaseInitiation(t.tableNum)}
                                        className={`w-full text-white font-black py-0.5 rounded-lg text-[8px] uppercase tracking-wider transition cursor-pointer text-center block ${t.floorState === 'pending' || t.floorState === 'preparing' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-rose-600'}`}
                                      >
                                        {t.floorState === 'pending' || t.floorState === 'preparing' ? 'Release' : 'Settle'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 font-black text-[9px] tracking-wider uppercase text-center pb-2">
                                      VACANT
                                    </div>
                                  )}
                                </div>

                                <div className="absolute bottom-1 right-2 text-6xl font-black text-slate-950/5 select-none pointer-events-none">
                                  {t.tableNum}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })() : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {floorTableData.map(t => {
                      let liveDurationStr = "";
                      if (t.isOccupied && t.earliestCreatedAt) {
                        const diffMs = Date.now() - new Date(t.earliestCreatedAt).getTime();
                        const totalSec = Math.floor(Math.max(0, diffMs) / 1000);
                        const min = Math.floor(totalSec / 60);
                        const sec = totalSec % 60;
                        liveDurationStr = `${min}m ${sec}s`;
                      }

                      return (
                        <div
                          key={t.tableNum}
                          className={`p-3 rounded-2xl border flex flex-col justify-between h-[185px] transition-all duration-300 relative ${t.floorState === 'empty' ? 'bg-slate-50 border-slate-200 opacity-60' :
                            t.floorState === 'pending' ? 'bg-yellow-50 border-yellow-300 shadow-sm shadow-yellow-100' :
                              t.floorState === 'preparing' ? 'bg-blue-50 border-blue-300 shadow-sm shadow-blue-105' :
                                'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100'
                            }`}
                        >
                          <div>
                            <div className="flex justify-between items-center text-[8.5px] text-slate-400">
                              <span className="font-mono">TABLE</span>
                              <span className={`w-2 h-2 rounded-full ${t.floorState === 'empty' ? 'bg-slate-300' :
                                t.floorState === 'pending' ? 'bg-yellow-500 animate-pulse' :
                                  t.floorState === 'preparing' ? 'bg-blue-500 animate-pulse' :
                                    'bg-emerald-500'
                                }`}></span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 mt-0.5">Seat #{t.tableNum}</h4>
                          </div>

                          <div className="space-y-1.5 z-10 text-[9px] flex-1 flex flex-col justify-end mt-2">
                            {t.isOccupied ? (
                              <div className="space-y-1 w-full">
                                <div className="flex justify-between items-center text-slate-800 leading-tight">
                                  <span className="font-extrabold truncate max-w-[70px]">👤 {t.occupantName}</span>
                                  <span className="text-[8px] text-indigo-600 font-bold font-mono">⏱ {liveDurationStr.split(' ')[0] || "0m"}</span>
                                </div>

                                {/* Order tickets list with status */}
                                <div className="space-y-1 my-1 max-h-[50px] overflow-y-auto pr-0.5 scrollbar-thin">
                                  {t.activeOrders.map(ord => (
                                    <div key={ord.id} className="flex justify-between items-center text-[7.5px] border-b border-black/5 pb-0.5">
                                      <span className="font-mono text-slate-500">#{ord.id.split('-')[1]}</span>
                                      <span className={`px-1 rounded-full font-black uppercase text-[6.5px] ${
                                        ord.status === 'pending' 
                                          ? 'bg-yellow-105 text-yellow-800' 
                                          : ord.status === 'accepted' 
                                            ? 'bg-blue-105 text-blue-800' 
                                            : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {ord.status === 'pending' ? 'Pending' : ord.status === 'accepted' ? 'Preparing' : 'Delivered'}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-between items-center text-[8.5px] text-slate-500 pt-0.5">
                                  <span>{t.ordersCount} tickets</span>
                                  <span className="font-black text-slate-900">₹{t.billTotal.toFixed(0)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSettleAndReleaseInitiation(t.tableNum)}
                                  className={`w-full text-white font-black py-0.5 rounded-lg text-[8px] uppercase tracking-wider transition cursor-pointer text-center block ${t.floorState === 'pending' || t.floorState === 'preparing' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-rose-600'}`}
                                >
                                  {t.floorState === 'pending' || t.floorState === 'preparing' ? 'Release' : 'Settle'}
                                </button>
                              </div>
                            ) : (
                              <div className="text-slate-400 font-black text-[9px] tracking-wider uppercase text-center pb-2">
                                VACANT
                              </div>
                            )}
                          </div>

                          <div className="absolute bottom-1 right-2 text-6xl font-black text-slate-950/5 select-none pointer-events-none">
                            {t.tableNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-300 rounded-full"></span> Empty Unoccupied</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span> Customer Pending Order</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> Kitchen Cooking</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Delivered</span>
              </div>
            </div>
          )}

          {/* TAB: DAY-BY-DAY ORDER HISTORIES */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm font-sans animate-fade-in">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Order History</h3>
                  <p className="text-xs text-slate-500 mt-1">View day-by-day revenue and order records.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSalesLedgerOpen(true)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText size={14} />
                    <span>View Detailed Sales</span>
                  </button>
                </div>

                {/* Quick Reset All Filters */}
                {(historySearch || historyStatusFilter !== 'all' || historyReleaseFilter !== 'all' || historyMinAmount || historyMaxAmount || showAllHistoryDates) && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryStatusFilter('all');
                      setHistoryReleaseFilter('all');
                      setHistoryMinAmount('');
                      setHistoryMaxAmount('');
                      setShowAllHistoryDates(false);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    Clear All Filters (✕)
                  </button>
                )}
              </div>

              {dailyHistorySummaries.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-3xl border-slate-200 bg-slate-50">
                  <ClipboardList size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800">No Historical Records Found</p>
                  <p className="text-xs text-slate-400 mt-1">Concluded tickets or new transactions will materialize here on a day-to-day basis.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column: Day-by-Day summaries */}
                  <div className="space-y-3 lg:col-span-1 max-h-[600px] overflow-y-auto pr-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-1 font-mono">Select Business Day</span>

                    {/* All Available Dates toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllHistoryDates(true);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex justify-between items-center cursor-pointer mb-2 ${showAllHistoryDates
                        ? 'bg-slate-900 border-slate-950 text-white shadow-md'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100/50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">📅</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide">
                            All Records Combined
                          </p>
                          <p className={`text-[10px] mt-0.5 font-semibold ${showAllHistoryDates ? 'text-slate-300' : 'text-indigo-600'}`}>
                            Search across all timeline logs
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono">→</span>
                    </button>

                    {dailyHistorySummaries.map((day) => (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedHistoryDate(day.dateStr);
                          setShowAllHistoryDates(false);
                        }}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex justify-between items-center cursor-pointer ${(!showAllHistoryDates && selectedHistoryDate === day.dateStr)
                          ? 'bg-indigo-600 border-indigo-650 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                      >
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide">
                            {formatHistoryDate(day.dateStr)}
                          </p>
                          <p className={`text-[10px] mt-1 font-semibold ${(!showAllHistoryDates && selectedHistoryDate === day.dateStr) ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {day.count} Total Tickets
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">₹{day.revenue.toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Right Column: Detailed orders list with robust filters */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Advanced Search & Filtering Console */}
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-3xl space-y-3">
                      <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block font-mono">Filters</span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Text Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                          <input
                            type="text"
                            placeholder="Search name, phone, item, table, or ID..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800"
                          />
                        </div>

                        {/* Date Picker (Like Date Change Request!) */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1 border border-slate-200 rounded-xl">
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
                        {/* Status Filter */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase font-mono">Order Status</label>
                          <select
                            value={historyStatusFilter}
                            onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none text-slate-800"
                          >
                            <option value="all">All Order Statuses</option>
                            <option value="pending">Pending Only</option>
                            <option value="accepted">Accepted / Cooking</option>
                            <option value="completed">Completed Only</option>
                            <option value="rejected">Rejected Only</option>
                          </select>
                        </div>

                        {/* Table Release Settle Filter */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase font-mono">Billed State</label>
                          <select
                            value={historyReleaseFilter}
                            onChange={(e) => setHistoryReleaseFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none text-slate-800"
                          >
                            <option value="all">All States (Active + Cleared)</option>
                            <option value="active">Active Dining Bills Only</option>
                            <option value="cleared">Cleared / Released Only</option>
                          </select>
                        </div>

                        {/* Price Range */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase font-mono">Bill Range (INR)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Min ₹"
                              value={historyMinAmount}
                              onChange={(e) => setHistoryMinAmount(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none w-full text-slate-800"
                            />
                            <span className="text-slate-300 text-xs">-</span>
                            <input
                              type="number"
                              placeholder="Max ₹"
                              value={historyMaxAmount}
                              onChange={(e) => setHistoryMaxAmount(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none w-full text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected Day / Range Context Label */}
                    <div className="flex justify-between items-center bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                        <span className="text-xs font-bold text-slate-700">
                          Viewing: <strong className="text-indigo-950">{showAllHistoryDates ? "All Available Dates (Eco-timeline)" : formatHistoryDate(selectedHistoryDate)}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase font-mono text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg">
                        {filteredHistoryOrders.length} matching tickets
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredHistoryOrders.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 border rounded-2xl border-slate-200">
                          <p className="text-xs font-bold text-slate-500">No orders match the current active log filters.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Try to clear some filters or select "All Records Combined".</p>
                        </div>
                      ) : (
                        filteredHistoryOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition"
                          >
                            <div className="flex justify-between items-start gap-2 flex-wrap pb-2 border-b border-slate-100 mb-2">
                              <div>
                                <span className="text-[9px] font-mono font-bold text-indigo-600 block">
                                  #ID: {ord.id.split('-')[1] || ord.id}
                                </span>
                                <span className="text-xs font-black text-slate-900 mt-0.5 inline-block font-sans">
                                  Table #{ord.tableNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ord.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  ord.status === 'accepted' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                    ord.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                                      'bg-rose-50 text-rose-500 border border-rose-200'
                                  }`}>
                                  {ord.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ord.released === true
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                  : 'bg-orange-50 text-orange-600 border border-orange-200'
                                  }`}>
                                  {ord.released === true ? 'Cleared' : 'Active'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                              <div>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">
                                  Guest details
                                </p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{ord.userName}</p>
                                <p className="text-slate-500 font-mono text-[10px]">{ord.userPhone}</p>
                                <span className="text-[9px] text-slate-400 font-bold block mt-1.5">
                                  Ordered: {new Date(ord.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">
                                  Dishes ordered
                                </p>
                                <div className="mt-1 space-y-1">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between font-bold text-slate-700">
                                      <span>{it.quantity}x {it.name}</span>
                                      <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1.5 mt-1.5 border-t border-dashed border-slate-200 flex justify-between font-black text-slate-900">
                                  <span>Total Amount:</span>
                                  <span>₹{ord.totalAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <AnalyticsDashboard restaurantId={restaurant.id} restaurantName={restaurant.name} />
            </div>
          )}

        </div>

        {/* Conditional Right Side Panel: Live Guest Service Buzzers & Stats (Only on Orders Tab) */}
        {activeTab === 'orders' && (
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 order-1 lg:order-2 w-full">

            {/* Dynamic Operations Summary Stack (Similar to Active Buzzer, styled premium) */}
            <div className="bg-gradient-to-b from-blue-50/80 to-indigo-50/60 border border-blue-200/80 p-4 rounded-3xl shadow-sm animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200/50 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1">
                    <LayoutGrid size={12} className="text-indigo-600" /> Operations Hub
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tables')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-305 font-bold text-[11px] uppercase font-mono px-3 py-0.8 rounded-full shadow-xs transition cursor-pointer"
                >
                  Key: <span className="font-black text-indigo-650">{restaurant?.verificationPin || '1234'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Net Income Card */}
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="bg-white border border-blue-100 hover:border-indigo-400 hover:shadow-xs p-3 rounded-2xl text-left transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Net Income</span>
                    <DollarSign size={12} className="text-emerald-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-1.5 font-black text-sm text-slate-900 tracking-tight">
                    ₹{stats.revenue.toFixed(2)}
                  </div>
                  <span className="text-[8px] text-indigo-550 font-semibold mt-1 block group-hover:underline">Analytics →</span>
                </button>

                {/* Pending Orders Card */}
                <button
                  onClick={() => scrollToOrderSection('pending')}
                  className="bg-white border border-blue-100 hover:border-indigo-400 hover:shadow-xs p-3 rounded-2xl text-left transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pending</span>
                    <ClipboardList size={12} className="text-amber-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-1.5 font-black text-sm text-slate-900 tracking-tight">
                    {stats.pending}
                  </div>
                  <span className="text-[8px] text-indigo-555 font-semibold mt-1 block group-hover:underline">View Queue →</span>
                </button>

                {/* Completed Orders Card */}
                <button
                  onClick={() => scrollToOrderSection('completed')}
                  className="bg-white border border-blue-100 hover:border-indigo-400 hover:shadow-xs p-3 rounded-2xl text-left transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                    <CheckCircle size={12} className="text-emerald-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-1.5 font-black text-sm text-slate-900 tracking-tight">
                    {stats.completed}
                  </div>
                  <span className="text-[8px] text-indigo-555 font-semibold mt-1 block group-hover:underline">View Served →</span>
                </button>

                {/* Seats Occupied Card */}
                <button
                  onClick={() => setActiveTab('floor')}
                  className="bg-white border border-blue-100 hover:border-indigo-400 hover:shadow-xs p-3 rounded-2xl text-left transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Occupied</span>
                    <Utensils size={12} className="text-indigo-500 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-1.5 font-black text-sm text-slate-900 tracking-tight">
                    {floorTableData.filter(t => t.isOccupied).length} / {restaurant.totalTables}
                  </div>
                  <span className="text-[8px] text-indigo-550 font-semibold mt-1 block group-hover:underline">Floor Plan →</span>
                </button>
              </div>
            </div>

            {/* AI-Powered Daily Business Briefing Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-4.5 rounded-3xl shadow-lg border border-indigo-950 space-y-3.5 relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>

              <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-400/40 shadow-lg shadow-indigo-500/20">
                    <img src={bhojanHead} alt="Bhojan" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-100">
                      Bhojan's Briefing
                    </h3>
                    <p className="text-[8px] text-indigo-300 font-semibold uppercase tracking-widest">AI Operations Co-Pilot</p>
                  </div>
                </div>
                <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-500/30">
                  Operations Desk
                </span>
              </div>

              {aiDailyBriefing ? (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-200 leading-relaxed font-sans font-medium select-text whitespace-pre-wrap">
                    {aiDailyBriefing}
                  </div>
                  <button
                    onClick={handleGenerateDailyBriefing}
                    disabled={isGeneratingBriefing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-[9px] tracking-widest py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm border border-indigo-500 cursor-pointer"
                  >
                    <RefreshCw size={11} className={isGeneratingBriefing ? "animate-spin" : ""} />
                    Refresh Briefing
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 py-1 text-center">
                  <p className="text-[11px] text-indigo-200 leading-normal max-w-xs mx-auto font-medium">
                    Analyze sales metrics, top menu items, and active floor chimes to generate your operations report.
                  </p>
                  <button
                    onClick={handleGenerateDailyBriefing}
                    disabled={isGeneratingBriefing}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-[9.5px] tracking-wider py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md border border-amber-400 cursor-pointer"
                  >
                    {isGeneratingBriefing ? (
                      <>
                        <RefreshCw size={11} className="animate-spin text-slate-950" />
                        Analyzing operations ledger...
                      </>
                    ) : (
                      <>
                        <Wand2 size={12} className="text-slate-950" />
                        Generate Morning Briefing
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Live Guest Service Buzzers Widget */}
            <div className="bg-gradient-to-b from-rose-50 to-amber-50/60 border border-amber-200 p-4 rounded-3xl shadow-sm animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2.0 w-2.0 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1">
                    <Bell size={12} className="text-rose-500" /> Floor Buzzers
                  </h3>
                </div>
                <span className="bg-rose-600 text-white font-black text-[9px] uppercase font-mono px-2 py-0.5 rounded-full shadow-xs">
                  {pendingBuzzers.length} Active
                </span>
              </div>

              <div className="space-y-3 lg:overflow-y-auto lg:max-h-[550px] pr-1">
                {pendingBuzzers.length === 0 ? (
                  <div className="text-center py-6 px-3 bg-white/50 rounded-2xl border border-dashed border-amber-150">
                    <p className="text-[11px] text-slate-400 italic">
                      🎉 No active table chimes. All guests are dining peacefully!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-row overflow-x-auto gap-2 lg:flex-col pb-2 lg:pb-0 scrollbar-none snap-x">
                    {pendingBuzzers.map((b) => (
                      <div key={b.id} className="bg-white border border-amber-200/80 hover:border-amber-400/80 hover:shadow-xs rounded-2xl p-2 md:p-3 flex flex-none w-[190px] sm:w-[220px] lg:w-full flex-col justify-between transition snap-start">
                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] md:text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-1.5 md:px-2 py-0.5 rounded-full font-mono border border-indigo-100">
                              Table #{b.tableNumber}
                            </span>
                            <span className="text-[7px] md:text-[8px] font-mono text-slate-400">
                              {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-start gap-1 md:gap-1.5 pt-0.5 text-slate-800">
                            <div className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-amber-50 text-amber-600 rounded-full flex-shrink-0 border border-amber-100">
                              <Bell size={8} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-wide truncate">
                                {b.requestType === 'Request Table Service' ? '🤵 Table' :
                                  b.requestType === 'Bring Extra Water' ? '🥛 Water' :
                                    b.requestType === 'Table Clean Up' ? '🧹 Clean' :
                                      '🧾 Bill'}
                              </h4>
                              <p className="text-[8px] md:text-[9px] text-slate-500 italic leading-snug truncate">
                                "{b.requestType}"
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 mt-1.5 md:mt-2.5">
                          <button
                            type="button"
                            onClick={() => handleDismissBuzzer(b.id)}
                            className="w-full bg-slate-900 hover:bg-rose-600 text-white font-extrabold uppercase text-[7px] md:text-[8px] py-1 rounded-md md:rounded-lg transition shadow-xs flex items-center justify-center gap-0.5 cursor-pointer"
                          >
                            <Check size={7} className="stroke-[3]" />
                            <span>Resolve ✔</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* DETAILED GROSS SALES ACCOUNTING LEDGER MODAL */}
      {isSalesLedgerOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Sales</h4>
                </div>
              </div>
              <button
                onClick={() => setIsSalesLedgerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Financial indicators highlighting discount exclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Total Base Subtotal</span>
                <p className="text-base font-black text-slate-900 mt-1">₹{ledgerBreakdown.totalOriginalSubtotal.toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 p-4 border border-rose-100 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-500 block">Special Offer Deductions</span>
                <p className="text-base font-black text-rose-600 mt-1">-₹{ledgerBreakdown.totalDeductionsExcluded.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 block">Net Settle Received</span>
                <p className="text-base font-black text-emerald-700 mt-1">₹{ledgerBreakdown.totalFinalReceived.toFixed(2)}</p>
              </div>
            </div>

            <div className="relative mb-3 flex-shrink-0">
              <div className="flex gap-2">
                <Search className="text-slate-400 mt-2 ml-2" size={14} />
                <input
                  type="text"
                  placeholder="Search ledger entries..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 pl-7 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
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
                  onClick={() => { setLedgerFromDate(''); setLedgerToDate(''); }}
                  className="bg-slate-900 text-white rounded-xl px-3 py-1 text-xs font-bold"
                >Clear</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-500 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Sale ID</th>
                    <th className="py-2.5 px-3">Seat</th>
                    <th className="py-2.5 px-3">Customer Profile</th>
                    <th className="py-2.5 px-3">Base Price</th>
                    <th className="py-2.5 px-3">Offer Deduction</th>
                    <th className="py-2.5 px-3 border-r border-slate-100">Amount Received</th>
                    <th className="py-2.5 px-3 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerBreakdown.validOrders
                    .filter(o =>
                      o.userName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                      o.id.includes(ledgerSearch) ||
                      o.tableNumber.toString() === ledgerSearch
                    )
                    .map(ord => {
                      const orderSummary = calculateBillSummary(ord.items);
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-400">#{ord.id.split('-')[1]}</td>
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
                            <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${ord.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-600'}`}>
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {ledgerBreakdown.validOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 font-bold text-slate-405">No transactions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-3 flex-shrink-0">
              <button
                onClick={() => setIsSalesLedgerOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISH CREATE & EDIT MODAL (INTEGRATES SERVER-SIDE GEMINI COPYWRITER) */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 shrink-0">
              <h4 className="text-base font-black text-slate-900">
                {editingItem ? `Modify ${editingItem.name}` : "Create Catalog Option"}
              </h4>
              <button onClick={() => setIsMenuModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="flex-1 flex flex-col min-h-0 text-xs text-slate-800 mt-3">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 py-1 min-h-0 scrollbar-thin">

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Handmade Fettuccine"
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-slate-400 uppercase">Ingredients & Descriptions</label>
                    <button
                      type="button"
                      onClick={handleAiWriteDescription}
                      disabled={isAiWritingDescription || !menuForm.name}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 font-black px-2.5 py-1 text-[10px] rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-sm"
                    >
                      {isAiWritingDescription ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" />
                          <span>AI generating descriptors...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={11} className="text-indigo-500" />
                          <span>✨ AI Copywriter</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter details or let Gemini write copy..."
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-850"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Price (₹) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 299.00"
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Menu Category</label>
                    <select
                      value={['Starters', 'Mains', 'Desserts', 'Drinks'].includes(menuForm.category) ? menuForm.category : 'Custom...'}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 font-bold text-slate-700"
                    >
                      <option value="Starters">Starters</option>
                      <option value="Mains">Mains</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Custom...">Custom...</option>
                    </select>
                  </div>
                </div>

                {(!['Starters', 'Mains', 'Desserts', 'Drinks'].includes(menuForm.category) || menuForm.category === 'Custom...') && (
                  <div className="mt-2.5">
                    <label className="block font-bold text-slate-400 uppercase mb-1">Custom Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Breads"
                      value={menuForm.category === 'Custom...' ? '' : menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-850"
                    />
                  </div>
                )}

                {/* Visual Food Photography & AI Shoot Studio */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2 relative overflow-hidden">

                  {/* Shutter Camera Flash effect */}
                  {shootFlash && (
                    <div className="absolute inset-0 bg-white z-40 flex flex-col items-center justify-center animate-pulse">
                      <div className="text-indigo-600 flex flex-col items-center gap-1 font-black text-xs">
                        <Camera size={36} className="animate-bounce" />
                        <span>*SHUTTER FLASH*</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-700 block text-xs">📸 Food Photography</span>
                      <span className="text-[10px] text-slate-400 block leading-none mt-0.5">Apply a high-quality dish profile</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPhotoStudioOpen(!isPhotoStudioOpen)}
                      className={`font-black text-[10px] px-2.5 py-1 rounded-lg border transition duration-150 flex items-center gap-1 shadow-sm ${isPhotoStudioOpen
                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                        : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                        }`}
                    >
                      <Camera size={11} />
                      <span>{isPhotoStudioOpen ? "Hide Studio" : "✨ AI Photo Shoot"}</span>
                    </button>
                  </div>

                  {/* Image input and current preview */}
                  <div className="flex gap-2.5 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-xs flex items-center justify-center">
                      {menuForm.imageUrl ? (
                        <img
                          src={menuForm.imageUrl}
                          alt="Dish Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-slate-400 bg-slate-100 text-center font-bold px-1">
                          No Photo
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Image Location URL</label>
                      <input
                        type="text"
                        placeholder="Paste image address or use AI Studio..."
                        value={menuForm.imageUrl}
                        onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-750"
                      />
                    </div>
                  </div>

                  {/* AI Studio Expanded Panel */}
                  {isPhotoStudioOpen && (
                    <div className="bg-gradient-to-br from-indigo-50/40 to-slate-50 border border-indigo-200/70 rounded-xl p-3 space-y-2.5 transition-all duration-300">

                      {/* Interactive Lighting Selection */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 mb-1">STYLING DIRECTING & LIGHTING</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['moody', 'cafe', 'flatlay', 'rustic'] as const).map((style) => (
                            <button
                              type="button"
                              key={style}
                              onClick={() => setSelectedStudioLighting(style)}
                              className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all ${selectedStudioLighting === style
                                ? 'bg-white border-indigo-550 text-indigo-900 shadow-xs ring-1 ring-indigo-100'
                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                                }`}
                            >
                              <span className="font-extrabold text-[10px]">
                                {style === 'moody' && "🌟 Fine-Dining Moody"}
                                {style === 'cafe' && "☀️ Modern Café Style"}
                                {style === 'flatlay' && "🎨 Overhead Flatlay"}
                                {style === 'rustic' && "🪵 Rustic Tavern"}
                              </span>
                              <span className="text-[8px] text-slate-400 font-medium leading-tight">
                                {style === 'moody' && "Dark background with dramatic spotlighting"}
                                {style === 'cafe' && "Bright marble with warm natural air styling"}
                                {style === 'flatlay' && "Symmetric top-down geometry alignment"}
                                {style === 'rustic' && "Sizzling steam on warm comforting timber"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search Keyword adjustment */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-[9px] font-extrabold text-slate-500">CUSTOM SHOOT KEYWORD (OPTIONAL)</label>
                          <span className="text-[8px] text-slate-400">Defaults to dish name</span>
                        </div>
                        <input
                          type="text"
                          placeholder={`e.g. ${menuForm.name || "Handmade Pasta"}`}
                          value={customShootQuery}
                          onChange={(e) => setCustomShootQuery(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-750"
                        />
                      </div>

                      {/* Execute & Formulate prompting buttons */}
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={handleFormulatePhotographyPrompt}
                          disabled={isFormulatingPrompt || !menuForm.name}
                          className="w-1/3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[9px] font-extrabold py-1.5 px-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                        >
                          {isFormulatingPrompt ? (
                            <>
                              <RefreshCw size={10} className="animate-spin" />
                              <span>Planning...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 size={10} className="text-slate-400" />
                              <span>Draft Prompt</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleExecutePhotoShoot}
                          disabled={isPerformingShoot}
                          className="w-2/3 bg-indigo-600 hover:bg-indigo-755 text-white text-[10px] font-black py-1.5 px-2.5 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          {isPerformingShoot ? (
                            <>
                              <Loader2 size={11} className="animate-spin" />
                              <span>Performing Shoot...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="text-indigo-200 fill-indigo-200" />
                              <span>📸 Execute Food Photography Shoot</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Live Generated Prompt Draft by Director Gemini */}
                      {aiCustomPromptDraft && (
                        <div className="bg-slate-900 text-slate-100 p-2 text-[9px] leading-relaxed border border-slate-800 rounded-lg font-mono space-y-1">
                          <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-bold block">🎥 Director's Master Camera Instruction</span>
                          <span className="block italic">"{aiCustomPromptDraft}"</span>
                        </div>
                      )}

                      {/* Candidates Visual Selection pool */}
                      {shootResults.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200">
                          <span className="block text-[9px] font-extrabold text-slate-500">SELECT DEVELOPED PHOTO (CLICK TO ASSIGN)</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {shootResults.map((url, i) => (
                              <button
                                type="button"
                                key={i}
                                onClick={() => {
                                  setMenuForm({ ...menuForm, imageUrl: url });
                                  triggerAppAlert("Shot Assigned", "Item image set to this professional culinary variant!", "success");
                                }}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition duration-200 hover:scale-105 ${menuForm.imageUrl === url
                                  ? 'border-indigo-600 ring-2 ring-indigo-200'
                                  : 'border-slate-100 hover:border-slate-300'
                                  }`}
                              >
                                <img
                                  src={url}
                                  alt={`Shot Variant ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {menuForm.imageUrl === url && (
                                  <div className="absolute inset-0 bg-indigo-650/15 flex items-center justify-center z-10">
                                    <div className="bg-indigo-650 text-white rounded-full p-0.5 shadow">
                                      <Check size={8} strokeWidth={4} />
                                    </div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-slate-700 block">Food Preference Type</span>
                    <span className="text-[10px] text-slate-400">Classify diet type for digital menus</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, isVeg: !menuForm.isVeg })}
                    className={`relative w-28 h-9 rounded-xl p-1 transition-colors duration-300 flex items-center justify-between cursor-pointer shadow-inner border select-none ${
                      menuForm.isVeg 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    {/* Sliding Pill */}
                    <div 
                      className={`absolute top-1 bottom-1 w-[52px] rounded-lg transition-all duration-300 shadow-sm ${
                        menuForm.isVeg 
                          ? 'left-1 bg-emerald-600' 
                          : 'left-[60px] bg-rose-600'
                      }`}
                    />
                    
                    {/* Veg Text */}
                    <span className={`text-[9px] font-black uppercase tracking-wider z-10 w-1/2 text-center transition-colors duration-300 ${
                      menuForm.isVeg ? 'text-white' : 'text-emerald-700 opacity-60'
                    }`}>
                      VEG
                    </span>

                    {/* Non-Veg Text */}
                    <span className={`text-[9px] font-black uppercase tracking-wider z-10 w-1/2 text-center transition-colors duration-300 ${
                      !menuForm.isVeg ? 'text-white' : 'text-rose-700 opacity-60'
                    }`}>
                      NON-VEG
                    </span>
                  </button>
                </div>



                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-700 block">Apply Flash LTO Promo?</span>
                      <span className="text-[10px] text-slate-400">Flag instant value save to patrons</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={menuForm.isLimitedTimeOffer}
                      onChange={(e) => setMenuForm({ ...menuForm, isLimitedTimeOffer: e.target.checked })}
                      className="w-4 h-4 text-emerald-655 rounded"
                    />
                  </div>

                  {menuForm.isLimitedTimeOffer && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-amber-800 mb-0.5">Promo Details Headline</label>
                        <input
                          type="text"
                          placeholder="e.g. Save ₹50 Today!"
                          value={menuForm.offerDetails}
                          onChange={(e) => setMenuForm({ ...menuForm, offerDetails: e.target.value })}
                          className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-1.5 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-amber-800 mb-0.5">Deduction Value (₹)</label>
                        <input
                          type="text"
                          placeholder="e.g. 50.00"
                          value={menuForm.promoValue}
                          onChange={(e) => setMenuForm({ ...menuForm, promoValue: e.target.value })}
                          className="w-full bg-amber-50 border border-amber-200 text-amber-950 rounded-xl px-3 py-1.5 font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-Scheduler Availability */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-700 block">Set Service Hours Schedule?</span>
                      <span className="text-[10px] text-slate-400">Dim item & disable ordering outside these hours</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={menuForm.availableFromHour !== '' || menuForm.availableUntilHour !== ''}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMenuForm({ ...menuForm, availableFromHour: '11', availableUntilHour: '23' });
                        } else {
                          setMenuForm({ ...menuForm, availableFromHour: '', availableUntilHour: '' });
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>

                  {(menuForm.availableFromHour !== '' || menuForm.availableUntilHour !== '') && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <label className="block font-bold text-slate-500 mb-1">From Hour (0-23)</label>
                        <select
                          value={menuForm.availableFromHour}
                          onChange={(e) => setMenuForm({ ...menuForm, availableFromHour: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h.toString()}>{h.toString().padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1">Until Hour (0-23)</label>
                        <select
                          value={menuForm.availableUntilHour}
                          onChange={(e) => setMenuForm({ ...menuForm, availableUntilHour: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h.toString()}>{h.toString().padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="pt-4 border-t border-slate-105 flex gap-2 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-651 py-2 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold shadow transition text-sm"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPLICIT TABLE SETTLE & RELEASE OPTIONS CHOOSER MODAL */}
      {releasingTableNum !== null && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-200 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-indigo-600" />
                Settle & Release Table #{releasingTableNum}
              </h4>
              <button onClick={() => setReleasingTableNum(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose how you want to settle any outstanding tickets or orders for <strong className="text-slate-900">Table #{releasingTableNum}</strong> prior to discharging the customer and clearing the table.
              </p>

              {(() => {
                const tableData = floorTableData.find(t => t.tableNum === releasingTableNum);
                if (!tableData) return null;
                return (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1 text-xs text-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patron Summary</p>
                    <p className="font-extrabold">👤 {tableData.occupantName} ({tableData.occupantPhone})</p>
                    <p className="font-semibold text-slate-500">{tableData.ordersCount} tickets pending settle / delivery</p>
                    <p className="font-black text-indigo-600 text-sm mt-1">Total Bill: ₹{tableData.billTotal.toFixed(2)}</p>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSettlingTable}
                onClick={() => handlePrepareAndRelease(releasingTableNum)}
                className={`w-full text-white font-extrabold py-3.5 px-4 rounded-2xl text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${isSettlingTable ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isSettlingTable ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Settling Table...
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} />
                    Prepare and Release
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSettlingTable}
                onClick={() => triggerCancelSettleWarning(releasingTableNum)}
                className={`w-full text-white font-extrabold py-3.5 px-4 rounded-2xl text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-xs ${isSettlingTable ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                <X size={15} />
                Cancel and Release
              </button>

              <button
                type="button"
                disabled={isSettlingTable}
                onClick={() => setReleasingTableNum(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 px-4 rounded-2xl text-[10px] uppercase tracking-wider transition cursor-pointer text-center disabled:opacity-50"
              >
                Keep Table Seated
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelWarningConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border-2 border-rose-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-900">Settle Warning</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              There are active orders in progress for Table #{releasingTableNum} that will be cancelled. <br/>Are you absolutely sure you want to proceed?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                disabled={isSettlingTable}
                onClick={() => {
                  if (cancelTimerId) clearInterval(cancelTimerId);
                  setShowCancelWarningConfirm(false);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                disabled={cancelCountdown > 0 || isSettlingTable}
                onClick={() => handleCancelAndRelease(releasingTableNum)}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm ${cancelCountdown > 0 || isSettlingTable ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {isSettlingTable ? 'Settling...' : `Yes, Cancel & Settle ${cancelCountdown > 0 ? `(${cancelCountdown}s)` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <BhojanFloatingWidget />
      <BhojanAdminChatDrawer
        restaurantName={restaurant.name}
        menus={menus}
        orders={tenantOrders}
        buzzers={pendingBuzzers}
      />
    </div>
    </BhojanProvider>
  );
}
