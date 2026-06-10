import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ChefHat, Clock, AlertTriangle, Check, X, ClipboardList, Info, ArrowLeftRight, AlertOctagon } from 'lucide-react';
import { Restaurant, Order, Buzzer } from '../types';

interface KdsProps {
  restaurant: Restaurant;
  orders: Order[];
  onUpdateOrderStatus: (id: string, selectStatus: any) => void;
  onCancelSpecificDish: (orderId: string, itemIdx: number) => void;
  ticker?: number;
  buzzers: Buzzer[];
  restaurants?: Restaurant[];
  onSelectRestaurant?: (id: string) => void;
}

export default function KitchenDisplaySystem({
  restaurant,
  orders,
  onUpdateOrderStatus,
  onCancelSpecificDish,
  ticker,
  buzzers,
  restaurants,
  onSelectRestaurant
}: KdsProps) {
  if (restaurant?.disableKdsPortal) {
    return (
      <div id="kitchen-display-system-blocked" className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl text-center text-slate-100">
        <div className="w-16 h-16 bg-slate-850 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-amber-500 mb-4 animate-pulse">
          <AlertOctagon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Chef KDS Terminal Restricted</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
          The Kitchen Display System access for <span className="font-extrabold text-white">{restaurant.name}</span> has been temporarily restricted by the SaaS platform administrator. Contact your administrator for assistance.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => window.location.href = '/portal'}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Go to Portal Gateway
          </button>
        </div>
      </div>
    );
  }

  const activeRestaurantOrders = useMemo(() => {
    let filtered = orders.filter(o => o.restaurantId === restaurant?.id && o.released !== true);
    if (restaurant?.hideHistoryOlderThanOneDay) {
      const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => {
        const orderTime = new Date(o.createdAt).getTime();
        return orderTime >= oneDayAgo || o.status === 'pending' || o.status === 'accepted';
      });
    }
    return filtered;
  }, [orders, restaurant]);

  const pendingKitchenBuzzers = useMemo(() => {
    return (buzzers || []).filter(b => b.restaurantId === restaurant?.id && b.status === 'pending');
  }, [buzzers, restaurant]);

  // Local seconds ticker for ticket duration age calculation
  const [localTicker, setLocalTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio system chime alert for incoming pending tickets
  const prevPendingCount = useRef(0);
  const pendingOrdersCount = useMemo(() => {
    return activeRestaurantOrders.filter(o => o.status === 'pending').length;
  }, [activeRestaurantOrders]);

  useEffect(() => {
    if (pendingOrdersCount > prevPendingCount.current) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Ring tone 1 (D5 key chord)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.6);

        // Ring tone 2 (A5 chime key chord) delayed by 150ms
        setTimeout(() => {
          try {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.8);
          } catch (err) {}
        }, 150);
      } catch (err) {
        console.error("Audio API warning:", err);
      }
    }
    prevPendingCount.current = pendingOrdersCount;
  }, [pendingOrdersCount]);

  return (
    <div id="kitchen-display-system-root" className="flex-1 bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col space-y-4">
      
      {/* Static kitchen identifier for chefs */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-mono font-black text-slate-400 tracking-wider">Kitchen Station Monitor:</span>
            <span className="text-amber-400 font-extrabold uppercase bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-900/40 text-sm">{restaurant?.name || "Unselected"}</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-455 font-mono tracking-wide uppercase bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-850">
          🔒 Secure Authenticated Workspace
        </div>
      </div>

      {/* Wireless chimes alerts banner */}
      {pendingKitchenBuzzers.length > 0 && (
        <div className="bg-rose-955/70 border border-rose-900/60 p-3 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-rose-300">
            <span className="text-base animate-bounce">🛎️</span>
            <div>
              <p className="font-extrabold text-rose-200 uppercase tracking-wider">Active Table summon services ({pendingKitchenBuzzers.length})</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Tables: {Array.from(new Set(pendingKitchenBuzzers.map(b => b.tableNumber))).join(', ')} require floor staff assist.</p>
            </div>
          </div>
          <span className="text-[9px] bg-rose-600 text-white font-mono font-black px-2 py-0.5 rounded uppercase shrink-0 animate-pulse">
            ATTN DISPATCH
          </span>
        </div>
      )}

      {/* KDS Header including active restaurant state tracking badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500 text-slate-950 p-2.5 rounded-xl flex items-center justify-center">
            <ChefHat size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-none">
              {restaurant?.name || "Kitchen"} Wall Monitor
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-[11px] text-slate-400 font-semibold">Real-Time Kitchen Display System (KDS)</p>
              <span>•</span>
              
              {/* Resto status indicator inside KDS header */}
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                restaurant?.status === 'active' ? 'bg-emerald-950/80 text-emerald-450 border border-emerald-900/50' :
                'bg-rose-950/80 text-rose-450 border border-rose-900/50'
              }`}>
                RESTO STATUS: {restaurant?.status === 'active' ? 'ONLINE (ACTIVE)' : 'HOLD (INACTIVE)'}
              </span>
            </div>
          </div>
        </div>

        {/* Quantities indicator panel */}
        <div className="flex gap-4 text-xs font-mono font-bold bg-slate-900 px-4 py-2 border border-slate-800 rounded-xl">
          <span className="text-yellow-400">
            Incoming: {activeRestaurantOrders.filter(o => o.status === 'pending').length}
          </span>
          <span className="text-blue-400">
            Cooking: {activeRestaurantOrders.filter(o => o.status === 'accepted').length}
          </span>
          <span className="text-emerald-400 text-opacity-80">
            Served Today: {activeRestaurantOrders.filter(o => o.status === 'completed').length}
          </span>
        </div>
      </div>

      {/* Main KDS Columns layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COL 1: NEW INCOMING INBOX */}
        <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-850 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              Incoming Queue
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {activeRestaurantOrders.filter(o => o.status === 'pending').length}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[640px] scrollbar-none pr-0.5">
            {activeRestaurantOrders
              .filter(o => o.status === 'pending')
              .map(o => (
                <KdsTicketCard
                  key={o.id}
                  order={o}
                  onStatusUpdate={onUpdateOrderStatus}
                  onCancelDish={onCancelSpecificDish}
                  ticker={localTicker}
                  enableSlaWarning={restaurant?.enableSlaWarning}
                />
              ))}

            {activeRestaurantOrders.filter(o => o.status === 'pending').length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-2xl">
                <ClipboardList className="text-slate-700 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-500">Queue is completely clear.</p>
                <p className="text-[10px] text-slate-600 mt-1">Ready for incoming tables...</p>
              </div>
            )}
          </div>
        </div>

        {/* COL 2: CHEF PREPARING STATIONS */}
        <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-850 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Culinary Prep Lines
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {activeRestaurantOrders.filter(o => o.status === 'accepted').length}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[640px] scrollbar-none pr-0.5">
            {activeRestaurantOrders
              .filter(o => o.status === 'accepted')
              .map(o => (
                <KdsTicketCard
                  key={o.id}
                  order={o}
                  onStatusUpdate={onUpdateOrderStatus}
                  onCancelDish={onCancelSpecificDish}
                  ticker={localTicker}
                  enableSlaWarning={restaurant?.enableSlaWarning}
                />
              ))}

            {activeRestaurantOrders.filter(o => o.status === 'accepted').length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-2xl">
                <ChefHat className="text-slate-700 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-500">No active prep lines.</p>
                <p className="text-[10px] text-slate-600 mt-1">Accept tickets from incoming to start cooking.</p>
              </div>
            )}
          </div>
        </div>

        {/* COL 3: SERVED / ARCHIVED HISTORY */}
        <div className="bg-slate-900/40 rounded-3xl p-4 border border-slate-850 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Fulfilled Tickets
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {activeRestaurantOrders.filter(o => o.status === 'completed' || o.status === 'rejected').length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[640px] pr-0.5 scrollbar-none">
            {activeRestaurantOrders
              .filter(o => o.status === 'completed' || o.status === 'rejected')
              .map(o => (
                <div 
                  key={o.id} 
                  className="bg-slate-900 p-3 rounded-2xl border border-slate-850 space-y-2 opacity-65 hover:opacity-100 transition duration-150 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-slate-150">Table #{o.tableNumber}</h4>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">Order: {o.id.split('-')[1]}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      o.status === 'completed' ? 'bg-emerald-950/80 text-emerald-450 border-emerald-900/30' : 
                      'bg-rose-955/80 text-rose-450 border-rose-900/30'
                    }`}>
                      {o.status}
                    </span>
                  </div>

                  <ul className="space-y-1 text-slate-350 border-t border-slate-850 pt-2 text-[10.5px]">
                    {o.items.map((it, idx) => (
                      <li key={idx}>
                        <span className="font-extrabold text-slate-400">{it.quantity}x</span> {it.name}
                      </li>
                    ))}
                  </ul>

                  <p className="text-[9px] text-slate-550 border-t border-slate-850 pt-1 text-right font-mono">
                    Total unbilled: ₹{o.totalAmount.toFixed(2)}
                  </p>
                </div>
              ))}

            {activeRestaurantOrders.filter(o => o.status === 'completed' || o.status === 'rejected').length === 0 && (
              <p className="text-xs text-slate-500 font-bold text-center py-12">No historical tickets.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface KdsTicketProps {
  key?: any;
  order: Order;
  onStatusUpdate: (id: string, selectStatus: any) => void;
  onCancelDish: (orderId: string, itemIdx: number) => void;
  ticker: number;
  enableSlaWarning?: boolean;
}

function KdsTicketCard({ order, onStatusUpdate, onCancelDish, ticker, enableSlaWarning }: KdsTicketProps) {
  const elapsedMinutes = useMemo(() => {
    const createdTime = new Date(order.createdAt).getTime();
    const diff = Date.now() - createdTime;
    return Math.floor(diff / (60 * 1000));
  }, [order.createdAt, ticker]);

  const isSlaBreached = !!enableSlaWarning && elapsedMinutes >= 15;

  return (
    <div 
      className={`bg-slate-900 rounded-2xl p-4 border transition-all duration-300 text-xs space-y-4 relative ${
        isSlaBreached ? 'border-rose-600 shadow-xl shadow-rose-900/20 bg-slate-950 sla-breach-pulse' : 'border-slate-800'
      }`}
    >
      
      {isSlaBreached && (
        <div className="absolute top-2.5 right-2 px-2 py-0.5 bg-rose-600 text-white font-black text-[8px] rounded-full flex items-center gap-1 uppercase tracking-wider animate-bounce">
          <AlertTriangle size={10} /> SLA BREACH WARNING!
        </div>
      )}

      {/* Ticket metadata */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h4 className="text-base font-black text-white">Table #{order.tableNumber}</h4>
            <span className={`px-2 py-0.2 rounded-full font-bold text-[9px] uppercase ${order.status === 'pending' ? 'bg-amber-950 text-amber-400' : 'bg-blue-950 text-blue-400'}`}>
              {order.status}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Diner: {order.userName} • Order ID: {order.id.split('-')[1]}</p>
        </div>

        <div className={`flex items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-mono font-black ${isSlaBreached ? 'bg-rose-950 text-rose-455' : 'bg-slate-850 text-slate-350'}`}>
          <Clock size={11} />
          <span>{elapsedMinutes}m ago</span>
        </div>
      </div>

      {/* ANTI-FRAUD HOLD STAGING WARNING */}
      {order.requiresHandshake && !order.handshakeApproved && (
        <div className="bg-amber-955/65 border border-amber-900/60 text-amber-300 p-2.5 rounded-xl flex flex-col gap-1 text-[10.5px]">
          <span className="font-extrabold flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
            ANTI-FRAUD HOLD ACTIVATED — REMOTE ORDER
          </span>
          <p className="text-[9.5px] text-slate-400 font-medium leading-normal">
            Customer physical coordinates are away from restaurant. Waiting for staff handshake.
          </p>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-amber-900/40">
            <span className="font-extrabold text-[12px] tracking-wider text-white">PIN CODE: {order.handshakeCode}</span>
            <button
              onClick={() => onStatusUpdate(order.id, 'accepted')}
              className="bg-amber-550 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded text-[8px] font-black cursor-pointer transition uppercase"
            >
              Chef Release
            </button>
          </div>
        </div>
      )}

      {/* Ticket dish items lists */}
      <div className="border-t border-slate-850 pt-3 space-y-1.5">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">Order Details</p>
        <ul className="space-y-1 text-slate-205 font-medium">
          {order.items.map((item, index) => (
            <li 
              key={index}
              className="flex items-center justify-between bg-slate-950/50 p-2 rounded-xl border border-slate-850 gap-2"
            >
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center">
                  <span className="font-extrabold text-rose-500 mr-2">{item.quantity}x</span>
                  <span className="font-bold truncate">{item.name}</span>
                </div>
                {item.notes && (
                  <p className="text-[10px] text-amber-400 font-bold italic mt-0.5 bg-amber-950/50 border border-amber-900/40 px-2 py-0.5 rounded inline-block">
                    🍳 Request: {item.notes}
                  </p>
                )}
              </div>

              {/* Chef Cancel Single Dish implementation */}
              <button
                onClick={() => onCancelDish(order.id, index)}
                className="p-1 hover:bg-rose-955 text-slate-500 hover:text-rose-400 rounded shrink-0 transition"
                title="Chef cancel specific dish"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* SLA Timer warning message */}
      {isSlaBreached && (
        <div className="text-[10px] text-rose-455 font-bold flex items-center gap-1 bg-rose-950/20 p-2 rounded-xl border border-rose-900/30">
          <Info size={12} /> Seated table has been waiting for {elapsedMinutes} minutes. Expedite cooking immediately!
        </div>
      )}

      {/* State actions */}
      <div className="pt-2 border-t border-slate-850 flex gap-1.5">
        {order.status === 'pending' && (
          <>
            <button
              onClick={() => onStatusUpdate(order.id, 'rejected')}
              className="w-1/3 bg-slate-950 border border-slate-800 hover:bg-rose-950 hover:text-rose-450 hover:border-rose-905 py-1.5 text-[10px] font-black uppercase rounded-xl transition text-slate-400"
            >
              Reject
            </button>
            <button
              onClick={() => onStatusUpdate(order.id, 'accepted')}
              className="w-2/3 bg-yellow-500 hover:bg-yellow-600 text-slate-955 py-1.5 text-[10px] font-black uppercase rounded-xl transition shadow"
            >
              Accept Order
            </button>
          </>
        )}

        {order.status === 'accepted' && (
          <div className="flex flex-col gap-1.5 w-full">
            <button
              onClick={() => onStatusUpdate(order.id, 'completed')}
              className="w-full bg-emerald-650 hover:bg-emerald-700 text-white py-2 text-[10px] font-black uppercase rounded-xl transition shadow-lg flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check size={14} className="stroke-[3]" />
              Mark Fulfilled & Served
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
