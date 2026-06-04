import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, PieChart, Users, ClipboardList, Package, Star, BarChart3, Download, Calendar } from 'lucide-react';
import { AnalyticsFilters } from '../../types';

// ======================
// TYPES
// ======================
interface AnalyticsProps {
  restaurantId: string;
  restaurantName: string;
}

type AnalyticsTab = 'sales' | 'menu' | 'operations' | 'labor' | 'customers' | 'feedback' | 'inventory' | 'scorecard';

const TAB_META: Record<AnalyticsTab, { label: string; icon: React.ReactNode; color: string }> = {
  sales:      { label: 'Sales',       icon: <DollarSign size={13} />,     color: 'indigo' },
  menu:       { label: 'Menu',        icon: <PieChart size={13} />,      color: 'emerald' },
  operations: { label: 'Operations',  icon: <BarChart3 size={13} />,    color: 'amber' },
  labor:      { label: 'Labor',       icon: <Users size={13} />,        color: 'rose' },
  customers:  { label: 'Customers',   icon: <Users size={13} />,        color: 'violet' },
  feedback:   { label: 'Feedback',    icon: <Star size={13} />,         color: 'yellow' },
  inventory:  { label: 'Inventory',   icon: <Package size={13} />,      color: 'cyan' },
  scorecard:  { label: 'Scorecard',   icon: <ClipboardList size={13} />,color: 'slate' },
};

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-IN');
}

// ======================
// MAIN COMPONENT
// ======================
export default function AnalyticsDashboard({ restaurantId, restaurantName }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('sales');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  const fetchAnalytics = async (tab: AnalyticsTab) => {
    setLoading(true);
    try {
      const endpoints: Record<string, string> = {
        sales: `/api/${restaurantId}/analytics/sales?range=${range}`,
        menu: `/api/${restaurantId}/analytics/menu`,
        operations: `/api/${restaurantId}/analytics/operations`,
        labor: `/api/${restaurantId}/analytics/labor?range=${range}`,
        customers: `/api/${restaurantId}/analytics/customers?range=${range}`,
        feedback: `/api/${restaurantId}/analytics/feedback?range=${range}`,
        inventory: `/api/${restaurantId}/analytics/inventory`,
        scorecard: `/api/${restaurantId}/analytics/scorecard`,
      };
      const res = await fetch(endpoints[tab]);
      const json = await res.json();
      setData((prev: any) => ({ ...prev, [tab]: json }));
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(activeTab);
  }, [activeTab, range, restaurantId]);

  const handleExportCsv = () => {
    const d = data[activeTab];
    if (!d) return;
    const headers = Object.keys(d).join(',');
    const values = Object.values(d).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(',');
    const blob = new Blob([[headers, values].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${restaurantName}-${activeTab}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header + Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">📊 {restaurantName} Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time KPIs and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button onClick={handleExportCsv} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-500" title="Export CSV">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
        {(Object.entries(TAB_META) as [AnalyticsTab, typeof TAB_META[AnalyticsTab]][]).map(([key, meta]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition ${activeTab === key ? `bg-white text-slate-900 shadow-sm` : 'text-slate-500 hover:text-slate-800'}`}>
            {meta.icon}
            {meta.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-slate-500 font-bold">Loading analytics...</span>
          </div>
        ) : (
          <>
            {activeTab === 'sales' && <SalesView data={data.sales} />}
            {activeTab === 'menu' && <MenuView data={data.menu} />}
            {activeTab === 'operations' && <OperationsView data={data.operations} />}
            {activeTab === 'labor' && <LaborView data={data.labor} />}
            {activeTab === 'customers' && <CustomerView data={data.customers} />}
            {activeTab === 'feedback' && <FeedbackView data={data.feedback} />}
            {activeTab === 'inventory' && <InventoryView data={data.inventory} />}
            {activeTab === 'scorecard' && <ScorecardView data={data.scorecard} />}
          </>
        )}
      </div>
    </div>
  );
}

// ======================
// MODULE VIEWS
// ======================

function KpiCard({ label, value, sub, color = 'indigo' }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-100 text-indigo-900',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-100 text-emerald-900',
    amber: 'from-amber-50 to-amber-100/50 border-amber-100 text-amber-900',
    rose: 'from-rose-50 to-rose-100/50 border-rose-100 text-rose-900',
    violet: 'from-violet-50 to-violet-100/50 border-violet-100 text-violet-900',
    cyan: 'from-cyan-50 to-cyan-100/50 border-cyan-100 text-cyan-900',
    slate: 'from-slate-50 to-slate-100/50 border-slate-100 text-slate-900',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.indigo} rounded-2xl p-4 border`}>
      <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</span>
      <p className="text-xl font-black mt-1">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function SalesView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmt(data.totalRevenue)} color="indigo" />
        <KpiCard label="Total Orders" value={fmtNum(data.totalOrders)} color="emerald" />
        <KpiCard label="Avg Order Value" value={fmt(data.avgOrderValue)} sub="per ticket" color="amber" />
        <KpiCard label="Discount %" value={fmtPct(data.discountPercent)} sub={`₹${data.totalDiscount?.toFixed(0)} given`} color="rose" />
      </div>

      {/* Daily Sales Trend */}
      {data.dailySales?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Daily Sales Trend</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-left text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3 text-right">Orders</th>
                <th className="pb-2 pr-3 text-right">Revenue</th>
                <th className="pb-2 text-right">Discount</th>
              </tr></thead>
              <tbody>
                {data.dailySales.slice(-14).map((d: any, i: number) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 font-bold text-slate-700">{d.date}</td>
                    <td className="py-1.5 pr-3 text-right font-semibold">{d.orders}</td>
                    <td className="py-1.5 pr-3 text-right font-black text-emerald-700">{fmt(d.revenue)}</td>
                    <td className="py-1.5 text-right text-rose-600 font-semibold">{fmt(d.discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Day of Week */}
      {data.dayOfWeek?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Sales by Day of Week</h4>
          <div className="grid grid-cols-7 gap-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => {
              const d = data.dayOfWeek.find((x: any) => x.day === day);
              const maxRev = Math.max(...data.dayOfWeek.map((x: any) => x.revenue));
              return (
                <div key={day} className="text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{day}</div>
                  <div className="bg-slate-100 rounded-lg h-20 relative overflow-hidden flex items-end">
                    <div className="w-full bg-indigo-500 rounded-t" style={{ height: d ? `${(d.revenue / maxRev) * 100}%` : '5%' }} />
                  </div>
                  <div className="text-[9px] font-bold text-slate-600 mt-1">{d ? fmt(d.revenue) : '—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Items */}
      {data.topItems?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Top Selling Items</h4>
          <div className="space-y-1.5">
            {data.topItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 w-4">{i + 1}.</span>
                  <span className="text-xs font-bold text-slate-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="font-semibold text-slate-500">{item.quantity} sold</span>
                  <span className="font-black text-emerald-700">{fmt(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Items" value={fmtNum(data.totalItems)} color="indigo" />
        <KpiCard label="Stars" value={fmtNum(data.matrix?.star || 0)} sub={`${(data.matrixPercent?.star || 0).toFixed(0)}% of menu`} color="emerald" />
        <KpiCard label="Dogs" value={fmtNum(data.matrix?.dog || 0)} sub={`${(data.matrixPercent?.dog || 0).toFixed(0)}% of menu`} color="rose" />
        <KpiCard label="Avg Rating" value={(data.avgRating || 0).toFixed(1)} sub="★ customer score" color="amber" />
      </div>

      {/* Menu Engineering Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Menu Engineering Matrix</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'star', label: '⭐ Stars', desc: 'High margin + High orders', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            { key: 'plowhorse', label: '🐴 Plowhorses', desc: 'Low margin + High orders', color: 'bg-amber-100 text-amber-800 border-amber-200' },
            { key: 'puzzle', label: '🧩 Puzzles', desc: 'High margin + Low orders', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            { key: 'dog', label: '🐕 Dogs', desc: 'Low margin + Low orders', color: 'bg-rose-100 text-rose-800 border-rose-200' },
          ].map(m => (
            <div key={m.key} className={`${m.color} border rounded-2xl p-3`}>
              <span className="text-xs font-black block">{m.label}</span>
              <span className="text-2xl font-black block mt-1">{data.matrix?.[m.key] || 0}</span>
              <span className="text-[9px] opacity-70 block mt-0.5">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Item List */}
      {data.items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">All Menu Items</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-left text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="pb-2 pr-3">Item</th>
                <th className="pb-2 pr-3">Price</th>
                <th className="pb-2 pr-3 text-right">Orders</th>
                <th className="pb-2 pr-3 text-right">Revenue</th>
                <th className="pb-2 text-right">Rating</th>
              </tr></thead>
              <tbody>
                {data.items.map((item: any, i: number) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 font-bold text-slate-700">{item.name}</td>
                    <td className="py-1.5 pr-3 text-slate-500">{fmt(item.price)}</td>
                    <td className="py-1.5 pr-3 text-right font-semibold">{item.orders}</td>
                    <td className="py-1.5 pr-3 text-right font-black text-emerald-700">{fmt(item.revenue)}</td>
                    <td className="py-1.5 text-right">{item.avgRating ? `${item.avgRating.toFixed(1)}★` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OperationsView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Orders" value={fmtNum(data.totalOrders)} color="indigo" />
        <KpiCard label="Avg Ticket Time" value={`${(data.avgTicketTimeMinutes || 0).toFixed(0)}m`} sub={data.avgKdsTicketTimeMinutes ? `KDS: ${data.avgKdsTicketTimeMinutes.toFixed(0)}m` : undefined} color="amber" />
        <KpiCard label="Peak Orders/hr" value={(data.peakOrdersPerHour || 0).toFixed(1)} color="emerald" />
        <KpiCard label="Off-Peak Orders/hr" value={(data.offPeakOrdersPerHour || 0).toFixed(1)} color="rose" />
      </div>
    </div>
  );
}

function LaborView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Sales / Labor Hour" value={fmt(data.salesPerLaborHour)} sub={`Target: ₹800-1,200`} color="indigo" />
        <KpiCard label="Labor Cost %" value={fmtPct(data.laborCostPercent)} sub={`Target: 18-25%`} color={data.laborCostPercent <= 25 ? 'emerald' : 'rose'} />
        <KpiCard label="Total Hours" value={fmtNum(data.totalHours)} color="amber" />
        <KpiCard label="Orders/Staff Hour" value={(data.ordersPerStaffHour || 0).toFixed(2)} color="violet" />
      </div>
      {data.slotPerformance?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Shift Slot Performance</h4>
          <div className="space-y-2">
            {data.slotPerformance.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <span className="text-xs font-black text-slate-700 uppercase">{s.slot}</span>
                <div className="flex items-center gap-4 text-[10px]">
                  <span>{s.orders} orders</span>
                  <span className="font-bold">{s.hours.toFixed(1)}h</span>
                  <span className="font-black text-emerald-700">{fmt(s.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Customers" value={fmtNum(data.totalCustomers)} color="indigo" />
        <KpiCard label="Repeat Rate" value={fmtPct(data.repeatRate)} sub="returning within 30d" color="emerald" />
        <KpiCard label="Est. CLV" value={fmt(data.estimatedCLV)} sub="lifetime value estimate" color="amber" />
        <KpiCard label="Churn Candidates" value={fmtNum(data.churnCandidates)} sub="inactive 45+ days" color="rose" />
      </div>
      {data.visitFrequency && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Visit Frequency</h4>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(data.visitFrequency).map(([key, val]) => (
              <div key={key} className="text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-lg font-black text-slate-800">{val as number}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">{key}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Feedback" value={fmtNum(data.total)} color="indigo" />
        <KpiCard label="Avg Rating" value={(data.avgRating || 0).toFixed(1)} sub="★ out of 5" color="amber" />
        <KpiCard label="Positive" value={fmtPct(data.sentimentBreakdown?.positive || 0)} color="emerald" />
        <KpiCard label="Actionable" value={fmtNum(data.actionableCount)} sub="needs response" color="rose" />
      </div>
      {data.themeBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Complaint Themes</h4>
          <div className="space-y-2">
            {data.themeBreakdown.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 w-24 truncate">{t.theme}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(t.count / Math.max(...data.themeBreakdown.map((x: any) => x.count))) * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Inventory Items" value={fmtNum(data.totalItems)} color="indigo" />
        <KpiCard label="Total Value" value={fmt(data.totalInventoryValue)} color="emerald" />
        <KpiCard label="Low Stock Alerts" value={fmtNum(data.lowStockItems)} color={data.lowStockItems > 0 ? 'rose' : 'emerald'} />
        <KpiCard label="Spoilage %" value={fmtPct(data.spoilagePercent)} color="amber" />
      </div>

      {data.lowStockList?.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            Low Stock Alerts
          </h4>
          <div className="space-y-1.5">
            {data.lowStockList.slice(0, 10).map((item: any, i: number) => (
              <div key={i} className="flex justify-between bg-white rounded-xl px-3 py-2 border border-rose-100 text-xs">
                <span className="font-bold text-slate-800">{item.name}</span>
                <span className="font-black text-rose-600">{item.currentStock || 0} / {item.parLevel || 0} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.inventory?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">All Inventory</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-left text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="pb-2 pr-3">Item</th>
                <th className="pb-2 pr-3 text-right">Stock</th>
                <th className="pb-2 pr-3 text-right">Par</th>
                <th className="pb-2 text-right">Cost/Unit</th>
              </tr></thead>
              <tbody>
                {data.inventory.slice(0, 30).map((item: any, i: number) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 font-bold text-slate-700">{item.name}</td>
                    <td className={`py-1.5 pr-3 text-right font-bold ${(item.currentStock || 0) <= (item.parLevel || 0) ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {item.currentStock || 0}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-slate-500">{item.parLevel || 0}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-700">{fmt(item.costPerUnit || 0)}/{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ScorecardView({ data }: { data: any }) {
  if (!data) return <EmptyState />;
  const { scorecard, greenCount, totalMetrics, passThreshold, recommendation } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Unit Economics Scorecard</span>
          <div className="text-3xl font-black mt-1">{greenCount}/{totalMetrics} <span className="text-base font-bold text-slate-400">Green</span></div>
          <p className="text-[11px] text-slate-400 mt-1">{passThreshold ? '✅ Expansion-ready signal' : '⚠️ Below expansion threshold'}</p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-black ${passThreshold ? 'text-emerald-400' : 'text-amber-400'}`}>
            {((greenCount / totalMetrics) * 100).toFixed(0)}%
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Score</div>
        </div>
      </div>

      {scorecard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(scorecard).map(([key, s]: [string, any]) => (
            <div key={key} className={`rounded-2xl p-4 border ${s.green ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.green ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                  {s.green ? '✓ ON TRACK' : '✗ BELOW TARGET'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black">{s.unit === '₹' ? fmt(s.value) : s.unit === '%' ? fmtPct(s.value) : s.value.toFixed(1)}{s.unit === 'min' ? 'm' : ''}</span>
                <span className="text-[10px] opacity-60">/ target {s.unit === '₹' ? fmt(s.target) : s.target}{s.unit === 'min' ? 'm' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-bold text-slate-600">{recommendation}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <BarChart3 size={48} className="mx-auto text-slate-300 mb-3" />
      <p className="text-sm font-bold text-slate-400">No analytics data available</p>
      <p className="text-xs text-slate-400 mt-1">Place orders or seed data to populate analytics</p>
    </div>
  );
}
