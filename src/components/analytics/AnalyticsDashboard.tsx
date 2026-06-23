import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, PieChart, Users, ClipboardList, Package, Star, BarChart3, Download, Calendar, X } from 'lucide-react';
import { AnalyticsFilters } from '../../types';

// ======================
// TYPES
// ======================
interface AnalyticsProps {
  restaurantId: string;
  restaurantName: string;
}

type AnalyticsTab = 'sales' | 'gst' | 'menu' | 'operations' | 'labor' | 'customers' | 'feedback' | 'inventory' | 'scorecard';

const TAB_META: Record<AnalyticsTab, { label: string; icon: React.ReactNode; color: string }> = {
  sales:      { label: 'Sales',       icon: <DollarSign size={13} />,     color: 'indigo' },
  gst:        { label: 'GST',         icon: <TrendingUp size={13} />,     color: 'purple' },
  menu:       { label: 'Menu',        icon: <PieChart size={13} />,      color: 'emerald' },
  operations: { label: 'Operations',  icon: <BarChart3 size={13} />,    color: 'amber' },
  labor:      { label: 'Labor',       icon: <Users size={13} />,        color: 'rose' },
  customers:  { label: 'Customers',   icon: <Users size={13} />,        color: 'violet' },
  feedback:   { label: 'Feedback',    icon: <Star size={13} />,         color: 'yellow' },
  inventory:  { label: 'Inventory',   icon: <Package size={13} />,      color: 'cyan' },
  scorecard:  { label: 'Scorecard',   icon: <ClipboardList size={13} />,color: 'slate' },
};

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtPct(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '0.0%';
  return n.toFixed(1) + '%';
}

function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return n.toLocaleString('en-IN');
}

// =====================
// MAIN COMPONENT
// =====================
export default function AnalyticsDashboard({ restaurantId, restaurantName }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('sales');
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  const fetchAnalytics = async (tab: AnalyticsTab) => {
    setLoading(true);
    try {
      const baseRange = range === 'custom'
        ? `range=custom&startDate=${customStartDate}&endDate=${customEndDate}`
        : `range=${range}`;
      const endpoints: Record<string, string> = {
        sales: `/api/${restaurantId}/analytics/sales?${baseRange}`,
        gst: `/api/${restaurantId}/analytics/sales?${baseRange}`,
        menu: `/api/${restaurantId}/analytics/menu`,
        operations: `/api/${restaurantId}/analytics/operations`,
        labor: `/api/${restaurantId}/analytics/labor?${baseRange}`,
        customers: `/api/${restaurantId}/analytics/customers?${baseRange}`,
        feedback: `/api/${restaurantId}/analytics/feedback?${baseRange}`,
        inventory: `/api/${restaurantId}/analytics/inventory`,
        scorecard: `/api/${restaurantId}/analytics/scorecard`,
      };
      const res = await fetch(endpoints[tab]);
      const json = await res.json();
      if (json.error) {
        console.error(`Analytics API error for ${tab}:`, json.error);
        setData((prev: any) => ({ ...prev, [tab]: null }));
      } else {
        setData((prev: any) => ({ ...prev, [tab]: json }));
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setData((prev: any) => ({ ...prev, [tab]: null }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(activeTab);
  }, [activeTab, range, customStartDate, customEndDate, restaurantId]);

  const handleExportCsv = () => {
    const d = data[activeTab];
    if (!d) return;

    let csvContent = "";
    
    if (activeTab === 'sales') {
      csvContent += "DAILY SALES REPORT\\n";
      csvContent += "Date,Orders,Revenue,Discount,Avg Order Value\\n";
      if (d.dailySales && Array.isArray(d.dailySales)) {
        d.dailySales.forEach((day: any) => {
          csvContent += `${day.date},${day.orders},${day.revenue.toFixed(2)},${day.discount.toFixed(2)},${day.orders ? (day.revenue / day.orders).toFixed(2) : 0}\\n`;
        });
      }
      csvContent += "\\nTOP SELLING ITEMS\\n";
      csvContent += "Item Name,Quantity Sold,Revenue Generated\\n";
      if (d.topItems && Array.isArray(d.topItems)) {
        d.topItems.forEach((item: any) => {
          csvContent += `\"${item.name}\",${item.quantity},${item.revenue.toFixed(2)}\\n`;
        });
      }
    } else if (activeTab === 'menu') {
      csvContent += "MENU SALES REPORT\\n";
      csvContent += "Category,Item Name,Total Sold,Total Revenue\\n";
      if (d.salesByCategory && Array.isArray(d.salesByCategory)) {
        d.salesByCategory.forEach((cat: any) => {
          if (cat.items && Array.isArray(cat.items)) {
            cat.items.forEach((item: any) => {
              csvContent += `\"${cat.category}\",\"${item.name}\",${item.sold},${item.revenue.toFixed(2)}\\n`;
            });
          }
        });
      }
    } else {
      const headers = Object.keys(d).filter(k => typeof d[k] !== 'object').join(',');
      const values = Object.keys(d).filter(k => typeof d[k] !== 'object').map(k => d[k]).join(',');
      csvContent = `${headers}\\n${values}`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${restaurantName}-${activeTab}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="">
          <h3 className="text-base font-black text-slate-900">{restaurantName} Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time business health and sales track</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            {(['7d', '30d', '90d', 'custom'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <span className="text-[10px] text-slate-400">—</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div >
          )}
          <button onClick={handleExportCsv} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-500" title="Export CSV">
            <Download size={14} />
          </button>
        </div >
      </div >

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
        {(Object.entries(TAB_META) as [AnalyticsTab, typeof TAB_META[AnalyticsTab]][]).map(([key, meta]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition ${activeTab === key ? `bg-white text-slate-900 shadow-sm` : 'text-slate-500 hover:text-slate-800'}`}>\n            {meta.icon}\n            {meta.label}\n          </button>\n        ))}\n      </div >

      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-slate-500 font-bold">Loading analytics...</span>
          </div >
        ) : (
          <>\n            {activeTab === 'sales' && <SalesView data={data.sales} />}\n            {activeTab === 'gst' && <GstView data={data.gst} />}\n            {activeTab === 'menu' && <MenuView data={data.menu} />}\n            {activeTab === 'operations' && <OperationsView data={data.operations} />}\n            {activeTab === 'labor' && <LaborView data={data.labor} />}\n            {activeTab === 'customers' && <CustomerView data={data.customers} />}\n            {activeTab === 'feedback' && <FeedbackView data={data.feedback} />}\n            {activeTab === 'inventory' && <InventoryView data={data.inventory} />}\n            {activeTab === 'scorecard' && <ScorecardView data={data.scorecard} />}\n          </>\n        )}\n      </div >
    </div >
  );
}

function KpiCard({ label, value, sub, color = 'indigo' }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-100 text-indigo-900',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-100 text-emerald-900',
    amber: 'from-amber-50 to-amber-100/50 border-amber-100 text-amber-900',
    rose: 'from-rose-50 to-rose-100/50 border-rose-100 text-rose-900',
    violet: 'from-violet-50 to-violet-100/50 border-violet-100 text-violet-900',
    cyan: 'from-cyan-50 to-cyan-100/50 border-cyan-100 text-cyan-900',
    slate: 'from-slate-50 to-slate-100/50 border-slate-100 text-slate-900',
    purple: 'from-purple-50 to-purple-100/50 border-purple-100 text-purple-900',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.indigo} rounded-2xl p-4 border`}>\n      <span className=\"text-[9px] font-black uppercase tracking-wider opacity-70\">{label}</span>\n      <p className=\"text-xl font-black mt-1\">{value}</p>\n      {sub && <p className=\"text-[10px] opacity-60 mt-0.5\">{sub}</p>}\n    </div >
  );
}

function DailySalesChart({ salesData }: { salesData: { date: string; revenue: number }[] }) {
  if (!salesData || salesData.length === 0) return null;
  const items = salesData.slice(-14);
  const width = 500;
  const height = 180;
  const padding = 40;
  
  const maxVal = Math.max(...items.map(d => d.revenue), 100);
  const minVal = 0;
  const range = maxVal - minVal;
  
  const getX = (index: number) => padding + (index * (width - padding * 2)) / (items.length - 1);
  const getY = (value: number) => height - padding - ((value - minVal) * (height - padding * 2)) / range;

  let points = '';
  let areaPoints = '';
  items.forEach((d, idx) => {
    const x = getX(idx);
    const y = getY(d.revenue);
    if (idx === 0) {
      points += `M ${x} ${y}`;
      areaPoints += `M ${x} ${height - padding} L ${x} ${y}`;
    } else {
      points += ` L ${x} ${y}`;
      areaPoints += ` L ${x} ${y}`;
    }
    if (idx === items.length - 1) {
      areaPoints += ` L ${x} ${height - padding} Z`;
    }
  });

  return (
    <div className=\"bg-white rounded-2xl border border-slate-200 p-4 shadow-xs\">\n      <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-4\">Daily Sales Trend</h4>\n      <div className=\"w-full\">\n        <svg viewBox={`0 0 ${width} ${height}`} className=\"w-full h-auto overflow-visible\">\n          <defs>\n            <linearGradient id=\"areaGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n              <stop offset=\"0%\" stopColor=\"#4f46e5\" stopOpacity=\"0.2\" />\n              <stop offset=\"100%\" stopColor=\"#4f46e5\" stopOpacity=\"0.0\" />\n            </linearGradient>\n          </defs>\n          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {\n            const val = minVal + ratio * range;\n            const y = getY(val);\n            return (\n              <g key={ratio} className=\"opacity-40\">\n                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke=\"#cbd5e1\" strokeWidth=\"0.5\" strokeDasharray=\"3 3\" />\n                <text x={padding - 8} y={y + 3} textAnchor=\"end\" className=\"text-[8px] font-mono fill-slate-400 font-bold\">\n                  ₹{Math.round(val).toLocaleString('en-IN')}\n                </text>\n              </g>\n            );\n          })}\n          {points && <path d={areaPoints} fill=\"url(#areaGrad)\" />}\n          {points && <path d={points} fill=\"none\" stroke=\"#4f46e5\" strokeWidth=\"2.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />}\n          {items.map((d, idx) => (\n            <g key={idx} className=\"group cursor-pointer\">\n              <circle cx={getX(idx)} cy={getY(d.revenue)} r=\"3.5\" className=\"fill-indigo-650 hover:fill-indigo-500 transition animate-pulse\" />\n              <title>{`${d.date}: ₹${d.revenue.toFixed(0)}`}</title>\n            </g>\n          ))}\n          {items.map((d, idx) => {\n            if (idx % 2 !== 0 && idx !== items.length - 1) return null;\n            const x = getX(idx);\n            const shortDate = d.date.split('-').slice(1).join('/');\n            return (\n              <text key={idx} x={x} y={height - 10} textAnchor=\"middle\" className=\"text-[8px] font-mono fill-slate-400 font-bold\">\n                {shortDate}\n              </text>\n            );\n          })}\n        </svg>\n      </div >\n    </div >
  );
}

function DayOfWeekChart({ dayData }: { dayData: { day: string; revenue: number }[] }) {
  if (!dayData || dayData.length === 0) return null;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const maxRev = Math.max(...dayData.map(x => x.revenue), 105);
  
  return (
    <div className=\"bg-white rounded-2xl border border-slate-200 p-4 shadow-xs\">\n      <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-4\">Sales by Day of Week</h4>\n      <div className=\"flex justify-between items-end h-32 pt-6\">\n        {days.map(day => {\n          const d = dayData.find(x => x.day === day);\n          const val = d ? d.revenue : 0;\n          const pct = Math.max(5, (val / maxRev) * 100);\n          return (\n            <div key={day} className=\"flex-1 flex flex-col items-center group relative px-1\">\n              <span className=\"opacity-0 group-hover:opacity-100 transition duration-200 absolute -top-5 text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono font-bold shadow z-10\">\n                ₹{val.toFixed(0)}\n              </span>\n              <div className=\"w-full max-w-[20px] bg-slate-100 rounded-xl h-24 flex items-end overflow-hidden\">\n                <div \n                  style={{ height: `${pct}%` }} \n                  className=\"w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl transition-all duration-500\" \n                />\n              </div >\n              <span className=\"text-[9px] font-black text-slate-400 uppercase mt-2\">{day}</span>\n              <span className=\"text-[8.5px] font-bold text-slate-705 mt-0.5\">₹{Math.round(val / 1000)}k</span>\n            </div >\n          );\n        })}\n      </div >\n    </div >
  );
}

function SalesView({ data }: { data: any }) {
  if (!data || typeof data.totalRevenue !== 'number') return <EmptyState />;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Total Revenue\" value={fmt(data.totalRevenue)} color=\"indigo\" />\n        <KpiCard label=\"Total Orders\" value={fmtNum(data.totalOrders)} color=\"emerald\" />\n        <KpiCard label=\"Avg Order Value\" value={fmt(data.avgOrderValue)} sub=\"per ticket\" color=\"amber\" />\n        <KpiCard label=\"Discount %\" value={fmtPct(data.discountPercent)} sub={`₹${data.totalDiscount?.toFixed(0)} given`} color=\"rose\" />\n      </div>\n\n      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-4\">\n        <DailySalesChart salesData={data.dailySales} />\n        <DayOfWeekChart dayData={data.dayOfWeek} />\n      </div >\n\n      {data.topItems?.length > 0 && (\n        <div className=\"bg-white rounded-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">Top Selling Items</h4>\n          <div className=\"space-y-1.5\">\n            {data.topItems.map((item: any, i: number) => (\n              <div key={i} className=\"flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2\">\n                <div className=\"flex items-center gap-2\">\n                  <span className=\"text-[9px] font-black text-slate-400 w-4\">{i + 1}.</span>\n                  <span className=\"text-xs font-bold text-slate-800\">{item.name}</span>\n                </div >\n                <div className=\"flex items-center gap-3 text-[10px]\">\n                  <span className=\"font-semibold text-slate-500\">{item.quantity} sold</span>\n                  <span className=\"font-black text-emerald-700\">{fmt(item.revenue)}</span>\n                </div >\n              </div >\n            ))}\n          </div >\n        </div >\n      )}\n    </div >\n  );
}

function GstView({ data }: { data: any }) {
  if (!data || typeof data.gstTotal !== 'number') return <EmptyState />;
  const cgst = data.gstBreakdown?.cgst || data.gstTotal / 2;
  const sgst = data.gstBreakdown?.sgst || data.gstTotal / 2;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Total GST Collected\" value={fmt(data.gstTotal || 0)} sub={`@ ${data.gstRate || 5}% GST rate`} color=\"purple\" />\n        <KpiCard label=\"CGST (2.5%)\" value={fmt(cgst)} sub=\"Central GST\" color=\"indigo\" />\n        <KpiCard label=\"SGST (2.5%)\" value={fmt(sgst)} sub=\"State GST\" color=\"emerald\" />\n        <KpiCard label=\"Taxable Revenue\" value={fmt(data.totalRevenue || 0)} sub=\"before GST\" color=\"amber\" />\n      </div >\n      <div className=\"bg-purple-50 border border-purple-200 rounded-2xl p-4\">\n        <h4 className=\"text-xs font-black text-purple-700 uppercase tracking-wider mb-2\">GST Summary</h4>\n        <div className=\"text-sm text-purple-800 space-y-1\">\n          <p><span className=\"font-bold\">Period:</span> Based on selected date range</p>\n          <p><span className=\"font-bold\">GST Rate:</span> {data.gstRate || 5}% (standard Indian restaurant rate on food bills)</p>\n          <p><span className=\"font-bold\">Total GST:</span> {fmt(data.gstTotal || 0)}</p>\n          <p className=\"border-t border-purple-200 pt-1 mt-1\">\n            <span className=\"font-bold\">Net Revenue (excl. GST):</span> {fmt((data.totalRevenue || 0) - (data.gstTotal || 0))}\n          </p>\n        </div >\n      </div >\n      {data.dailySales?.length > 0 && (\n        <div className=\"bg-white rounded-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">Daily GST Collected</h4>\n          <div className=\"overflow-x-auto\">\n            <table className=\"w-full text-[11px]\">\n              <thead><tr className=\"text-left text-slate-400 font-bold uppercase tracking-wider text-[9px]\">\n                <th className=\"pb-2 pr-3\">Date</th>\n                <th className=\"pb-2 pr-3 text-right\">Revenue</th>\n                <th className=\"pb-2 text-right\">GST @ {data.gstRate || 5}%</th>\n              </tr></thead>\n              <tbody>\n                {data.dailySales.slice(-30).map((d: any, i: number) => (\n                  <tr key={i} className=\"border-t border-slate-100\">\n                    <td className=\"py-1.5 pr-3 font-bold text-slate-700\">{d.date}</td>\n                    <td className=\"py-1.5 pr-3 text-right font-semibold\">{fmt(d.revenue)}</td>\n                    <td className=\"py-1.5 text-right font-black text-purple-700\">{fmt(Math.round(d.revenue * (data.gstRate || 5) / 100 * 100) / 100)}</td>\n                  </tr>\n                ))}\n              </tbody>\n            </table>\n          </div >\n        </div >\n      )}\n    </div >\n  );
}

function MenuView({ data }: { data: any }) {
  const [activeMatrixPopup, setActiveMatrixPopup] = useState<string | null>(null);

  if (!data || typeof data.totalItems !== 'number') return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Items" value={fmtNum(data.totalItems)} color="indigo" />
        <KpiCard label="Best Sellers" value={fmtNum(data.matrix?.star || 0)} sub={`${(data.matrixPercent?.star || 0).toFixed(0)}% of menu`} color="emerald" />
        <KpiCard label="Low Profit, Low Sales" value={fmtNum(data.matrix?.dog || 0)} sub={`${(data.matrixPercent?.dog || 0).toFixed(0)}% of menu`} color="rose" />
        <KpiCard label="Average Star Rating" value={(data.avgRating || 0).toFixed(1)} sub="★ customer score" color="amber" />
      </div >

      {/* Dish Performance Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Dish Performance Chart</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'star', label: 'Best Sellers', title: '🌟 Stars', desc: 'These are your high-profit, high-volume champions. They define your brand and drive the bulk of your revenue. Keep quality consistent and use them to anchor your marketing.', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            { key: 'plowhorse', label: 'Popular but Low Profit', title: '🐎 Plowhorses', desc: 'High volume but low margins. Customers love them, but they aren\'t making you much money. Strategy: Gently increase price or reduce portion cost.', color: 'bg-amber-100 text-amber-800 border-amber-200' },
            { key: 'puzzle', label: 'High Profit, Low Sales', title: '🧩 Puzzles', desc: 'High margins but low demand. These are hidden gems. Strategy: Give them more visibility on the digital menu or offer a limited-time promo to trigger trial.', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            { key: 'dog', label: 'Low Profit, Low Sales', title: '🐕 Dogs', desc: 'Low margins and low demand. They occupy kitchen space and mental energy without returning value. Strategy: Remove from menu or completely rework the recipe.', color: 'bg-rose-100 text-rose-800 border-rose-200' },
          ].map(m => (
            <div 
              key={m.key} 
              onClick={() => setActiveMatrixPopup(m.key)}
              className={`${m.color} border rounded-2xl p-3 cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm active:scale-95`}
            >
              <span className="text-xs font-black block">{m.label}</span>
              <span className="text-2xl font-black block mt-1">{data.matrix?.[m.key] || 0}</span>
              <span className="text-[9px] opacity-70 block mt-0.5 truncate">{m.desc.split('—')[0]}</span>
            </div >
          ))}\n        </div >
      </div >

      {/* Matrix Detail Popup */}
      {activeMatrixPopup && (() => {
        const meta = [
          { key: 'star', title: '🌟 Stars', desc: 'High profit + High sales — Promote actively. These are your high-profit, high-volume champions. They define your brand and drive the bulk of your revenue. Keep quality consistent and use them to anchor your marketing.' },
          { key: 'plowhorse', title: '🐎 Plowhorses', desc: 'Low profit + High sales — Consider repricing upward. High volume but low margins. Customers love them, but they aren\'t making you much money. Strategy: Gently increase price or reduce portion cost.' },
          { key: 'puzzle', title: '🧩 Puzzles', desc: 'High profit + Low sales — Market more aggressively. High margins but low demand. These are hidden gems. Strategy: Give them more visibility on the digital menu or offer a limited-time promo to trigger trial.' },
          { key: 'dog', title: '🐕 Dogs', desc: 'Low profit + Low sales — Consider removing or reworking. Low margins and low demand. They occupy kitchen space and mental energy without returning value. Strategy: Remove from menu or completely rework the recipe.' },
        ].find(x => x.key === activeMatrixPopup);

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-200 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-10 -mt-10 opacity-50" />
              <button onClick={() => setActiveMatrixPopup(null)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X size={18} />
              </button>\n              <div className=\"flex flex-col items-center text-center space-y-2\">\n                <span className=\"text-3xl\">{meta?.title.split(' ')[0]}</span>\n                <h4 className=\"text-lg font-black text-slate-900\">{meta?.title.split(' ').slice(1).join(' ')}</h4>\n              </div >
              <div className=\"bg-slate-50 rounded-2xl p-4 border border-slate-100\">\n                <p className=\"text-xs text-slate-600 leading-relaxed font-medium\">\n                  {meta?.desc}\n                </p>\n              </div >
              <button \n                onClick={() => setActiveMatrixPopup(null)}\n                className=\"w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-slate-800 transition cursor-pointer\"\n              >\n                Got it\n              </button>\n            </div >
          </div >
        );
      })()}\n\n      {/* Item List */}\n      {data.items?.length > 0 && (\n        <div className=\"bg-white rounded-2 la-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">Full Menu List</h4>\n          <div className=\"overflow-x-auto\">\n            <table className=\"w-full text-[11px]\">\n              <thead className=\"text-left text-slate-400 font-bold uppercase tracking-wider text-[9px]\">\n                <tr className=\"border-b border-slate-100\">\n                  <th className=\"pb-2 pr-3\">Item</th>\n                  <th className=\"pb-2 pr-3\">Price</th>\n                  <th className=\"pb-2 pr-3 text-right\">Orders</th>\n                  <th className=\"pb-2 pr-3 text-right\">Revenue</th>\n                  <th className=\"pb-2 text-right\">Rating</th>\n                </tr>\n              </thead>\n              <tbody className=\"divide-y divide-slate-100\">\n                {data.items.map((item: any, i: number) => (\n                  <tr key={i} className=\"group hover:bg-slate-50 transition-colors\">\n                    <td className=\"py-2 pr-3 font-bold text-slate-700\">{item.name}</td>\n                    <td className=\"py-2 pr-3 text-slate-500\">{fmt(item.price)}</td>\n                    <td className=\"py-2 pr-3 text-right font-semibold\">{item.orders}</td>\n                    <td className=\"py-2 pr-3 text-right font-black text-emerald-700\">{fmt(item.revenue)}</td>\n                    <td className=\"py-2 text-right\">{item.avgRating ? `${item.avgRating.toFixed(1)}★` : '—'}</td>\n                  </tr>\n                ))}\n              </tbody>\n            </table>\n          </div >\n        </div >\n      )}\n    </div >\n  );
}

function OperationsView({ data }: { data: any }) {
  if (!data || typeof data.totalOrders !== 'number') return <EmptyState />;
  const totalMinutes = data.avgTicketTimeMinutes || 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  const ticketTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const kdsMinutes = data.avgKdsTicketTimeMinutes || 0;
  const kdsHours = Math.floor(kdsMinutes / 60);
  const kdsMins = Math.round(kdsMinutes % 60);
  const kdsStr = kdsHours > 0 ? `${kdsHours}h ${kdsMins}m` : `${kdsMins}m`;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Total Orders\" value={fmtNum(data.totalOrders)} color=\"indigo\" />\n        <KpiCard label=\"Avg Ticket Time\" value={ticketTimeStr} sub={data.avgKdsTicketTimeMinutes ? `KDS: ${kdsStr}` : undefined} color=\"amber\" />\n        <KpiCard label=\"Peak Orders/hr\" value={(data.peakOrdersPerHour || 0).toFixed(1)} color=\"emerald\" />\n        <KpiCard label=\"Off-Peak Orders/hr\" value={(data.offPeakOrdersPerHour || 0).toFixed(1)} color=\"rose\" />\n      </div >\n    </div >\n  );\n}

function LaborView({ data }: { data: any }) {
  if (!data || typeof data.totalHours !== 'number') return <EmptyState />;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Sales / Labor Hour\" value={fmt(data.salesPerLaborHour)} sub={`Target: ₹800-1,200`} color=\"indigo\" />\n        <KpiCard label=\"Labor Cost %\" value={fmtPct(data.laborCostPercent)} sub={`Target: 18-25%`} color={data.laborCostPercent <= 25 ? 'emerald' : 'rose'} />\n        <KpiCard label=\"Total Hours\" value={fmtNum(data.totalHours)} color=\"amber\" />\n        <KpiCard label=\"Orders/Staff Hour\" value={(data.ordersPerStaffHour || 0).toFixed(2)} color=\"violet\" />\n      </div >\n      {data.slotPerformance?.length > 0 && (\n        <div className=\"bg-white rounded-2 la-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">Shift Slot Performance</h4>\n          <div className=\"space-y-2\">\n            {data.slotPerformance.map((s: any, i: number) => {\n              const slotTimes: Record<string, string> = {\n                morning: '6:00 AM - 12:00 PM',\n                afternoon: '12:00 PM - 5:00 PM',\n                evening: '5:00 PM - 11:00 PM',\n              };\n              return (\n              <div key={i} className=\"flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2\">\n                <div className=\"\">\n                  <span className=\"text-xs font-black text-slate-700 uppercase block\">{s.slot}</span>\n                  <span className=\"text-[9px] text-slate-400 font-mono\">{slotTimes[s.slot] || ''}</span>\n                </div >\n                <div className=\"flex items-center gap-4 text-[10px]\">\n                  <span className=\"\">{s.orders} orders</span>\n                  <span className=\"font-bold\">{s.hours.toFixed(1)}h</span>\n                  <span className=\"font-black text-emerald-700\">{fmt(s.revenue)}</span>\n                </div >\n              </div >\n            );\n            })}\n          </div >\n        </div >\n      )}\n    </div >\n  );\n}

function CustomerView({ data }: { data: any }) {
  if (!data || typeof data.totalCustomers !== 'number') return <EmptyState />;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Total Customers\" value={fmtNum(data.totalCustomers)} color=\"indigo\" />\n        <KpiCard label=\"Repeat Rate\" value={fmtPct(data.repeatRate)} sub=\"returning within 30d\" color=\"emerald\" />\n        <KpiCard label=\"Est. CLV\" value={fmt(data.estimatedCLV)} sub=\"lifetime value estimate\" color=\"amber\" />\n        <KpiCard label=\"Inactive Guests\" value={fmtNum(data.churnCandidates)} sub=\"inactive 45+ days\" color=\"rose\" />\n      </div >\n      {data.visitFrequency && (\n        <div className=\"bg-white rounded-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">Visit Frequency</h4>\n          <div className=\"grid grid-cols-4 gap-3\">\n            {Object.entries(data.visitFrequency).map(([key, val]) => (\n              <div key={key} className=\"text-center bg-slate-50 rounded-xl p-3 border border-slate-100\">\n                <div className=\"text-lg font-black text-slate-800\">{val as number}</div >\n                <div className=\"text-[9px] font-bold text-slate-400 uppercase\">{key}</div>\n              </div >\n            ))}\n          </div >\n        </div >\n      )}\n    </div >\n  );
}

function FeedbackView({ data }: { data: any }) {
  if (!data || typeof data.total !== 'number') return <EmptyState />;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Total Feedback\" value={fmtNum(data.total)} color=\"indigo\" />\n        <KpiCard label=\"Average Star Rating\" value={(data.avgRating || 0).toFixed(1)} sub=\"★ out of 5\" color=\"amber\" />\n        <KpiCard label=\"Positive\" value={fmtPct(data.sentimentBreakdown?.positive || 0)} color=\"emerald\" />\n        <KpiCard label=\"Actionable\" value={fmtNum(data.actionableCount)} sub=\"needs response\" color=\"rose\" />\n      </div >\n      {data.themeBreakdown?.length > 0 && (\n        <div className=\"bg-white rounded-2 la-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">Complaint Themes</h4>\n          <div className=\"space-y-2\">\n            {data.themeBreakdown.map((t: any, i: number) => (\n              <div key={i} className=\"flex items-center gap-2\">\n                <span className=\"text-[10px] font-bold text-slate-600 w-24 truncate\">{t.theme}</span>\n                <div className=\"flex-1 bg-slate-100 rounded-full h-2 overflow-hidden\">\n                  <div className=\"bg-rose-500 h-full rounded-full\" style={{ width: `${(t.count / Math.max(...data.themeBreakdown.map((x: any) => x.count))) * 100}%` }} />\n                </div >\n                <span className=\"text-[10px] font-bold text-slate-500 w-8 text-right\">{t.count}</span>\n              </div >\n            ))}\n          </div >\n        </div >\n      )}\n    </div >\n  );\n}

function InventoryView({ data }: { data: any }) {
  if (!data || typeof data.totalItems !== 'number') return <EmptyState />;
  return (
    <div className=\"space-y-4\">\n      <div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3\">\n        <KpiCard label=\"Inventory Items\" value={fmtNum(data.totalItems)} color=\"indigo\" />\n        <KpiCard label=\"Total Value\" value={fmt(data.totalInventoryValue)} color=\"emerald\" />\n        <KpiCard label=\"Low Stock Alerts\" value={fmtNum(data.lowStockItems)} color={data.lowStockItems > 0 ? 'rose' : 'emerald'} />\n        <KpiCard label=\"Spoilage %\" value={fmtPct(data.spoilagePercent)} color=\"amber\" />\n      </div >\n\n      {data.lowStockList?.length > 0 && (\n        <div className=\"bg-rose-50 border border-rose-200 rounded-2xl p-4\">\n          <h4 className=\"text-xs font-black text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1.5\">\n            <span className=\"w-2 h-2 bg-rose-500 rounded-full animate-pulse\" />\n            Low Stock Alerts\n          </h4>\n          <div className=\"space-y-1.5\">\n            {data.lowStockList.slice(0, 10).map((item: any, i: number) => (\n              <div key={i} className=\"flex justify-between bg-white rounded-xl px-3 py-2 border border-rose-100 text-xs\">\n                <span className=\"font-bold text-slate-800\">{item.name}</span>\n                <span className=\"font-black text-rose-600\">{item.currentStock || 0} / {item.parLevel || 0} {item.unit}</span>\n              </div >\n            ))}\n          </div >\n        </div >\n      )}\n\n      {data.inventory?.length > 0 && (\n        <div className=\"bg-white rounded-2xl border border-slate-200 p-4\">\n          <h4 className=\"text-xs font-black text-slate-700 uppercase tracking-wider mb-3\">All Inventory</h4>\n          <div className=\"overflow-x-auto\">\n            <table className=\"w-full text-[11px]\">\n              <thead className=\"text-left text-slate-400 font-bold uppercase tracking-wider text-[9px]\">\n                <tr className=\"border-b border-slate-100\">\n                  <th className=\"pb-2 pr-3\">Item</th>\n                  <th className=\"pb-2 pr-3 text-right\">Stock</th>\n                  <th className=\"pb-2 pr-3 text-right\">Par</th>\n                  <th className=\"pb-2 text-right\">Cost/Unit</th>\n                </tr>\n              </thead>\n              <tbody className=\"divide-y divide-slate-100\">\n                {data.inventory.slice(0, 30).map((item: any, i: number) => (\n                  <tr key={i} className=\"group hover:bg-slate-50 transition-colors\">\n                    <td className=\"py-1.5 pr-3 font-bold text-slate-700\">{item.name}</td>\n                    <td className={`py-1.5 pr-3 text-right font-bold ${(item.currentStock || 0) <= (item.parLevel || 0) ? 'text-rose-600' : 'text-emerald-600'}`}>\n                      {item.currentStock || 0}\n                    </td >\n                    <td className=\"py-1.5 pr-3 text-right text-slate-500\">{item.parLevel || 0}</td>\n                    <td className=\"py-1.5 text-right font-semibold text-slate-700\">{fmt(item.costPerUnit || 0)}/{item.unit}</td>\n                  </tr >\n                ))}\n              </tB></body>\n            </table>\n          </div >\n        </div >\n      )}\n    </div >\n  );
}

function ScorecardView({ data }: { data: any }) {
  if (!data || !data.scorecard) return <EmptyState />;
  const { scorecard, greenCount, totalMetrics, passThreshold, recommendation } = data;\n\n  return (
    <div className=\"space-y-4\">\n      <div className=\"flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white\">\n        <div className=\"\">\n          <span className=\"text-[9px] font-black uppercase tracking-wider text-slate-400\">Unit Economics Scorecard</span>\n          <div className=\"text-3xl font-black mt-1\">{greenCount}/{totalMetrics} <span className=\"text-base font-bold text-slate-400\">Green</span></div >\n          <p className=\"text-[11px] text-slate-400 mt-1\">{passThreshold ? '✅ Expansion-ready signal' : '⚠️ Below expansion threshold'}</p>\n        </div >\n        <div className=\"text-right\">\n          <div className={`text-4xl font-black ${passThreshold ? 'text-emerald-400' : 'text-amber-400'}`}>\n            {((greenCount / totalMetrics) * 100).toFixed(0)}%\n          </div >\n          <div className=\"text-[9px] text-slate-500 uppercase tracking-wider mt-0.5\">Score</div >\n        </div >\n      </div >\n\n      {scorecard && (\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-3\">\n          {Object.entries(scorecard).map(([key, s]: [string, any]) => (\n            <div key={key} className={`rounded-2 la-2xl p-4 border ${s.green ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>\n              <div className=\"flex justify-between items-start\">\n                <span className=\"text-[9px] font-black uppercase tracking-wider opacity-70\">\n                  {key.replace(/([A-Z])/g, ' $1').trim()}\n                </span>\n                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.green ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>\n                  {s.green ? '✓ ON TRACK' : '✗ BELOW TARGET'}\n                </span>\n              </div >\n              <div className=\"flex items-baseline gap-2 mt-1\">\n                <span className=\"text-2xl font-black\">{\n                  s.unit === '₹' ? fmt(s.value) : \n                  s.unit === '%' ? fmtPct(s.value) : \n                  s.unit === 'min' ? (() => { const h = Math.floor(s.value / 60); const m = Math.round(s.value % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; })() : \n                  s.value.toFixed(1)\n                }{s.unit === 'min' ? '' : s.unit === '★' ? '' : ''}</span>\n                <span className=\"text-[10px] opacity-60\">/ target {s.unit === '₹' ? fmt(s.target) : s.unit === 'min' ? (() => { const h = Math.floor(s.target / 60); const m = Math.round(s.target % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; })() : s.target}{s.unit === '★' ? ' ★' : ''}</span>\n              </div >\n            </div >\n          ))}\n        </div >\n      )}\n\n      <div className=\"bg-slate-50 border border-slate-200 rounded-2 la-2xl p-4 text-center\">\n        <p className=\"text-sm font-bold text-slate-600\">{recommendation}</p>\n      </div >\n    </div >\n  );
}

function EmptyState() {
  return (
    <div className=\"text-center py-16\">\n      <BarChart3 size={48} className=\"mx-auto text-slate-300 mb-3\" />\n      <p className=\"text-sm font-bold text-slate-400\">No analytics data available</p>\n      <p className=\"text-xs text-slate-400 mt-1\">Place orders or seed data to populate analytics</p>\n    </div >\n  );\n}
