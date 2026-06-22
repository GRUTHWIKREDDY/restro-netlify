import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBhojan } from './BhojanProvider';
import { X, Send, BarChart2, TrendingUp, Bell, Sparkles } from 'lucide-react';
import bhojanHead from '../../assets/bhojan-head.png';
import { MenuItem, Order, Buzzer, ChatMessage } from '../../types';

interface BhojanAdminChatDrawerProps {
  restaurantName: string;
  menus: MenuItem[];
  orders: Order[];
  buzzers: Buzzer[];
}

export default function BhojanAdminChatDrawer({
  restaurantName,
  menus,
  orders,
  buzzers,
}: BhojanAdminChatDrawerProps) {
  const { isChatOpen, closeChat } = useBhojan();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Compute live local metrics for the KPI dashboard & prompt context
  const todayCompletedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);
  const todayRevenue = useMemo(() => todayCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0), [todayCompletedOrders]);
  const todayActiveOrdersCount = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length, [orders]);

  // Aggregate items sold today
  const popularDishesStr = useMemo(() => {
    const counts: Record<string, number> = {};
    todayCompletedOrders.forEach(o => {
      (o.items || []).forEach(it => {
        counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
      });
    });
    return Object.entries(counts)
      .map(([name, qty]) => `${name} (${qty} sold)`)
      .slice(0, 5)
      .join(', ') || "No items sold yet today";
  }, [todayCompletedOrders]);

  const [aiChatHistory, setAiChatHistory] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiInputMessage, setAiInputMessage] = useState('');

  // Initialize with greeting
  useEffect(() => {
    if (aiChatHistory.length === 0) {
      setAiChatHistory([
        {
          role: 'assistant',
          text: `Pranam, Chef! 🧑‍🍳 I am Bhojan, your AI operations co-pilot. I have loaded today's live orders, revenue metrics, and menu items. Ask me anything about our sales performance, top dishes, or buzzer activity today!`
        }
      ]);
    }
  }, [aiChatHistory.length]);

  useEffect(() => {
    if (chatBottomRef.current && isChatOpen) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory, isChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputMessage.trim() || isAiTyping) return;

    const userMsg = aiInputMessage.trim();
    setAiInputMessage('');
    setAiChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiTyping(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: userMsg,
          systemInstruction: `You are "Bhojan" (भोजन) — the operations co-pilot and AI business assistant for the restaurant admin panel of "${restaurantName}".
Your personality: Think of an elite, warm Michelin-star kitchen consultant who speaks with respect and hospitality.

ADMIN CONTEXT & DYNAMIC METRICS:
- Date: ${new Date().toLocaleDateString()}
- Completed Orders Today: ${todayCompletedOrders.length}
- Active Kitchen Tickets: ${todayActiveOrdersCount}
- Gross Revenue Today: ₹${todayRevenue.toFixed(2)}
- Menu Catalog size: ${menus.length} dishes
- Top Selling Dishes Today: ${popularDishesStr}
- Pending Waiter Buzzer Chimes: ${buzzers.length} table calls

COMMUNICATION STYLE:
- Limit your answers strictly to a maximum of 5 to 6 lines. Keep it extremely brief, readable, and professional. Nobody wants to read long texts.
- Refer to the admin/chef with respect (e.g. "Chef", "Sahib/Madam", "Ji").
- If asked about metrics (revenue, orders, popular dishes), read from the ADMIN CONTEXT above and provide the exact numbers.
- You can format details with small bold words. Avoid long bulleted lists.
- Maintain a warm, encouraging, Indian hospitality-infused tone.`
        })
      });

      const data = await res.json();
      setAiChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: data.text || "Apologies Chef, I couldn't compute the report. Please try again!" 
      }]);
    } catch {
      setAiChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: "Operations server currently unresponsive. Please check network logs Chef!" 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string, label: string) => {
    setAiChatHistory(prev => [...prev, { role: 'user', text: label }]);
    setIsAiTyping(true);

    fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: prompt,
        systemInstruction: `You are "Bhojan" (भोजन) — operations co-pilot for "${restaurantName}". Date: ${new Date().toLocaleDateString()}. Completed Orders: ${todayCompletedOrders.length}, Active: ${todayActiveOrdersCount}, Revenue: ₹${todayRevenue.toFixed(2)}, Top Dishes: ${popularDishesStr}, Pending Buzzers: ${buzzers.length}. Answer in 5-6 lines maximum. Be warm, professional, and concise.`
      })
    })
      .then(r => r.json())
      .then(data => {
        setAiChatHistory(prev => [...prev, { role: 'assistant', text: data.text || "Report computed Chef." }]);
      })
      .catch(() => {
        setAiChatHistory(prev => [...prev, { role: 'assistant', text: "Data sync issue Chef. Try again!" }]);
      })
      .finally(() => {
        setIsAiTyping(false);
      });
  };

  if (!isChatOpen) return null;

  const quickPrompts = [
    { label: "📊 Revenue & Orders", prompt: "How many orders have we completed today and what is our gross revenue today?" },
    { label: "🏆 Top Dishes Sold", prompt: "Which dishes are selling the most today and what are their quantities?" },
    { label: "🛎️ Pending Chimes", prompt: "Are there any pending buzzer chimes or waiter calls in the queue right now?" },
    { label: "⚙️ Quick SLA Check", prompt: "How can we optimize our kitchen efficiency based on today's active tickets?" },
  ];

  return (
    <div className="fixed inset-0 z-[998] flex flex-col font-sans" id="bhojan-admin-chat-drawer">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={closeChat} />

      {/* Chat Panel */}
      <div 
        className="relative mt-auto ml-auto mr-4 mb-4 h-[85vh] w-full max-w-md bg-[#0F172A] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800/80"
        style={{ 
          animation: 'bhojanDrawerUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3.5 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20">
              <img src={bhojanHead} alt="Bhojan" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-white font-black text-sm flex items-center gap-1.5">
                Bhojan
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              </h4>
              <p className="text-[9px] text-indigo-300 font-semibold uppercase tracking-widest">
                AI Operations Co-Pilot
              </p>
            </div>
          </div>
          <button 
            onClick={closeChat}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Admin Dashboard Metrics Cards */}
        <div className="bg-slate-950 border-b border-slate-800/60 p-3 shrink-0 grid grid-cols-3 gap-2">
          <div className="bg-slate-900 rounded-xl p-2 border border-slate-800 text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Orders Done</p>
            <p className="text-xs font-black text-amber-400 mt-0.5">{todayCompletedOrders.length}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-2 border border-slate-800 text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Revenue</p>
            <p className="text-xs font-black text-emerald-400 mt-0.5">₹{todayRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-2 border border-slate-800 text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Pending Buzz</p>
            <p className="text-xs font-black text-rose-400 mt-0.5">{buzzers.length}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none min-h-[200px]">
          {aiChatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-indigo-500/30 mt-1">
                  <img src={bhojanHead} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-md shadow-lg shadow-indigo-500/20' 
                  : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isAiTyping && (
            <div className="flex justify-start gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-indigo-500/30 mt-1">
                <img src={bhojanHead} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-slate-800/80 text-slate-400 rounded-2xl rounded-bl-md px-4 py-3 text-xs border border-slate-700/50 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest">Bhojan is compiling...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggested Queries */}
        {aiChatHistory.length <= 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 pb-2">
            {quickPrompts.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => handleQuickPrompt(qp.prompt, qp.label)}
                disabled={isAiTyping}
                className="flex-shrink-0 text-[9px] bg-slate-800/80 border border-slate-700/50 text-amber-300 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-700/80 hover:border-amber-500/30 transition disabled:opacity-40 cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/80 border-t border-slate-800/60 flex gap-2">
          <input 
            type="text"
            placeholder="Ask Bhojan about operations & data..."
            value={aiInputMessage}
            onChange={(e) => setAiInputMessage(e.target.value)}
            disabled={isAiTyping}
            className="flex-1 bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500 transition"
          />
          <button
            type="submit"
            disabled={isAiTyping || !aiInputMessage.trim()}
            className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 transition flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes bhojanDrawerUp {
          0% { opacity: 0; transform: translateY(100%); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
