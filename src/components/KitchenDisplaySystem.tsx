import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ChefHat, Clock, AlertTriangle, Check, X, ClipboardList, Info, ArrowLeftRight, AlertOctagon, Volume2, VolumeX } from 'lucide-react';
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
      <div id="kitchen-display-system-blocked" className="max-w-4xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center text-slate-900">
        <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-amber-500 mb-4 animate-pulse">
          <AlertOctagon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Chef KDS Terminal Restricted</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
          The Kitchen Display System access for <span className="font-extrabold text-slate-900">{restaurant.name}</span> has been temporarily restricted by the SaaS platform administrator. Contact your administrator for assistance.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => window.location.href = '/portal'}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
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
        return orderTime >= oneDayAgo || o.status === 'Waiting' || o.status === 'accepted';
      });
    }
    return filtered;
  }, [orders, restaurant]);

  const WaitingKitchenBuzzers = useMemo(() => {
    return (buzzers || []).filter(b => b.restaurantId === restaurant?.id && b.status === 'Waiting');
  }, [buzzers, restaurant]);

  // Local seconds ticker for ticket duration age calculation
  const [localTicker, setLocalTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio system: "Dong" bell alert for new incoming orders
  const prevPendingCount = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const WaitingOrdersCount = useMemo(() => {
    return activeRestaurantOrders.filter(o => o.status === 'Waiting').length;
  }, [activeRestaurantOrders]);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playDongSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // Deep bell "dong" — low fundamental + harmonics for resonance
      const notes = [
        { freq: 329.63, start: 0, dur: 1.2 },   // E4 — warm low bell
        { freq: 659.25, start: 0, dur: 1.0 },   // E5 — octave harmonic
        { freq: 987.77, start: 0.08, dur: 0.8 }, // B5 — fifth shimmer
        { freq: 1318.51, start: 0.15, dur: 0.6 }, // E6 — bright ring
      ];

      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.18, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (err) {
      console.error("Alert Sound Error:", err);
    }
  };

  const playBuzzerAlert = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // Rapid double-tap alert for buzzer
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now + i * 0.18);
        gain.gain.setValueAtTime(0.12, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.12);
      }
    } catch (err) {
      console.error("Buzzer Sound Error:", err);
    }
  };

  useEffect(() => {
    if (WaitingOrdersCount > prevPendingCount.current) {
      playDongSound();
    }
    prevPendingCount.current = WaitingOrdersCount;
  }, [WaitingOrdersCount]);

  // Buzzer alert sound
  const prevBuzzerCount = useRef(0);
  const WaitingBuzzersCount = WaitingKitchenBuzzers.length;
  useEffect(() => {
    if (WaitingBuzzersCount > prevBuzzerCount.current) {
      playBuzzerAlert();
    }
    prevBuzzerCount.current = WaitingBuzzersCount;
  }, [WaitingBuzzersCount]);

  return (
    <div id="kitchen-display-system-root" className="flex-1 bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 flex flex-col space-y-4">

      {/* Merged top bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-tight text-slate-800">Live Order Board</span>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${restaurant?.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
              {restaurant?.status === 'active' ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono font-bold">New Orders: {activeRestaurantOrders.filter(o => o.status === 'Waiting').length}</span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Cooking: {activeRestaurantOrders.filter(o => o.status === 'accepted').length}</span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Done: {activeRestaurantOrders.filter(o => o.status === 'completed').length}</span>
          <div className="h-4 w-px bg-slate-200"></div>
          <button
            onClick={() => setSoundEnabled(p => !p)}
            className={`text-sm p-1.5 rounded-lg border transition cursor-pointer leading-none ${soundEnabled ? 'bg-slate-100 border-slate-200 text-emerald-600 hover:bg-slate-200' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}
            title={soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to unmute'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Wireless chimes alerts banner */}
      {WaitingKitchenBuzzers.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-rose-700">
            <span className="text-base animate-bounce">🛎️</span>
            <div>
              <p className="font-extrabold text-rose-800 uppercase tracking-wider">Active Table summon services ({WaitingKitchenBuzzers.length})</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Tables: {Array.from(new Set(WaitingKitchenBuzzers.map(b => b.tableNumber))).join(', ')} require floor staff assist.</p>
            </div>
          </div>
          <span className="text-[9px] bg-rose-500 text-white font-mono font-black px-2 py-0.5 rounded uppercase shrink-0 animate-pulse">
            ATTN DISPATCH
          </span>
        </div>
      )}

      {/* Main KDS Columns layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* COL 1: NEW ORDERS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              New Orders
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {activeRestaurantOrders.filter(o => o.status === 'Waiting').length}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[640px] scrollbar-none pr-0.5">
            {activeRestaurantOrders
              .filter(o => o.status === 'Waiting')
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

            {activeRestaurantOrders.filter(o => o.status === 'Waiting').length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-300 rounded-xl">
                <ClipboardList className="text-slate-300 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-500">Queue is completely clear.</p>
                <p className="text-[10px] text-slate-400 mt-1">Ready for incoming tables...</p>
              </div>
            )}
          </div>
        </div>

        {/* COL 2: COOKING */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Cooking
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-300 rounded-xl">
                <ChefHat className="text-slate-300 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-500">No active prep lines.</p>
                <p className="text-[10px] text-slate-400 mt-1">Accept tickets from incoming to start cooking.</p>
              </div>
            )}
          </div>
        </div>

        {/* COL 3: COMPLETED ORDERS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Completed Orders
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {activeRestaurantOrders.filter(o => o.status === 'completed' || o.status === 'rejected').length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[640px] pr-0.5 scrollbar-none">
            {activeRestaurantOrders
              .filter(o => o.status === 'completed' || o.status === 'rejected')
              .map(o => (
                <div
                  key={o.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 opacity-65 hover:opacity-100 transition duration-150 text-xs shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-slate-800">Table #{o.tableNumber}</h4>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">Order: {o.id.split('-')[1]}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      'bg-rose-100 text-rose-700 border-rose-200'
                      }`}>
                      {o.status}
                    </span>
                  </div>

                  <ul className="space-y-1 text-slate-600 border-t border-slate-100 pt-2 text-[10.5px]">
                    {o.items.map((it, idx) => (
                      <li key={idx}>
                        <span className="font-extrabold text-slate-500">{it.quantity}x</span> {it.name}
                      </li>
                    ))}
                  </ul>

                  <p className="text-[9px] text-slate-400 border-t border-slate-100 pt-1 text-right font-mono">
                    Total unbilled: ₹{o.totalAmount.toFixed(2)}
                  </p>
                </div>
              ))}

            {activeRestaurantOrders.filter(o => o.status === 'completed' || o.status === 'rejected').length === 0 && (
              <p className="text-xs text-slate-500 font-bold text-center py-12">No orders completed yet.</p>
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
      className={`bg-white rounded-xl p-4 border transition-all duration-300 text-xs space-y-4 relative shadow-sm ${isSlaBreached ? 'border-rose-400 shadow-xl shadow-rose-200 bg-rose-50 sla-breach-pulse' : 'border-slate-200'
        }`}
    >

      {isSlaBreached && (
        <div className="absolute top-2.5 right-2 px-2 py-0.5 bg-rose-500 text-white font-black text-[8px] rounded-full flex items-center gap-1 uppercase tracking-wider animate-bounce">
          <AlertTriangle size={10} /> SLA BREACH WARNING!
        </div>
      )}

      {/* Ticket metadata */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h4 className="text-base font-black text-slate-800">Table #{order.tableNumber}</h4>
            <span className={`px-2 py-0.2 rounded-full font-bold text-[9px] uppercase ${order.status === 'Waiting' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {order.status}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Diner: {order.userName} • Order ID: {order.id.split('-')[1]}</p>
        </div>

        <div className={`flex items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-mono font-black ${isSlaBreached ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
          <Clock size={11} />
          <span>{elapsedMinutes}m ago</span>
        </div>
      </div>

      {/* ANTI-FRAUD HOLD STAGING WARNING */}
      {order.requiresHandshake && !order.handshakeApproved && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl flex flex-col gap-1 text-[10.5px]">
          <span className="font-extrabold flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
            ANTI-FRAUD HOLD ACTIVATED — REMOTE ORDER
          </span>
          <p className="text-[9.5px] text-slate-500 font-medium leading-normal">
            Customer physical coordinates are away from restaurant. Waiting for staff handshake.
          </p>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-amber-100">
            <span className="font-extrabold text-[12px] tracking-wider text-slate-800">PIN CODE: {order.handshakeCode}</span>
            <button
              onClick={() => onStatusUpdate(order.id, 'accepted')}
              className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded text-[8px] font-black cursor-pointer transition uppercase"
            >
              Chef Release
            </button>
          </div>
        </div>
      )}

      {/* Ticket dish items lists */}
      <div className="border-t border-slate-100 pt-3 space-y-1.5">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">Items</p>
        <ul className="space-y-1 text-slate-600 font-medium">
          {order.items.map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 gap-2"
            >
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center">
                  <span className="font-extrabold text-rose-600 mr-2">{item.quantity}x</span>
                  <span className="font-bold truncate text-slate-700">{item.name}</span>
                </div>
                {item.notes && (
                  <p className="text-[10px] text-amber-600 font-bold italic mt-0.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                    🍳 Request: {item.notes}
                  </p>
                )}
              </div>

              {/* Chef Cancel Single Dish implementation */}
              <button
                onClick={() => onCancelDish(order.id, index)}
                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded shrink-0 transition"
                title="Remove Item"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* SLA Timer warning message */}
      {isSlaBreached && (
        <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 bg-rose-50 p-2 rounded-xl border border-rose-200">
          <Info size={12} /> Seated table has been waiting for {elapsedMinutes} minutes. Expedite cooking immediately!
        </div>
      )}

      {/* State actions */}
      <div className="pt-2 border-t border-slate-100 flex gap-1.5">
        {order.status === 'Waiting' && (
          <>
            <button
              onClick={() => onStatusUpdate(order.id, 'rejected')}
              className="w-1/3 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 py-1.5 text-[10px] font-black uppercase rounded-xl transition text-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={() => onStatusUpdate(order.id, 'accepted')}
              className="w-2/3 bg-amber-500 hover:bg-amber-600 text-white py-1.5 text-[10px] font-black uppercase rounded-xl transition shadow"
            >
              Start Cooking
            </button>
          </>
        )}

        {order.status === 'accepted' && (
          <div className="flex flex-col gap-1.5 w-full">
            <button
              onClick={() => onStatusUpdate(order.id, 'completed')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 text-[10px] font-black uppercase rounded-xl transition shadow flex items-center justify-center gap-1 cursor-pointer"
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
