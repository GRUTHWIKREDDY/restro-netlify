import React, { useState, useRef, useEffect } from 'react';
import { useBhojan } from './BhojanProvider';
import { X, Send, Bell, Coffee, HelpCircle, FileText } from 'lucide-react';
import bhojanHead from '../../assets/bhojan-head.png';
import { MenuItem, ChatMessage } from '../../types';

interface BhojanChatDrawerProps {
  restaurantName: string;
  tableNumber: number;
  customerName?: string;
  menus: MenuItem[];
  aiChatHistory: ChatMessage[];
  setAiChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isAiTyping: boolean;
  setIsAiTyping: React.Dispatch<React.SetStateAction<boolean>>;
  aiInputMessage: string;
  setAiInputMessage: React.Dispatch<React.SetStateAction<string>>;
  onCallBuzzer?: (type: string) => void;
}

export default function BhojanChatDrawer({
  restaurantName,
  tableNumber,
  customerName,
  menus,
  aiChatHistory,
  setAiChatHistory,
  isAiTyping,
  setIsAiTyping,
  aiInputMessage,
  setAiInputMessage,
  onCallBuzzer,
}: BhojanChatDrawerProps) {
  const { isChatOpen, closeChat } = useBhojan();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current && isChatOpen) {
      if (typeof chatBottomRef.current.scrollIntoView === 'function') {
        chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
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
      const liveMenuContext = menus.map(m => ({
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        available: m.isAvailable,
        limitedPromo: m.isLimitedTimeOffer ? m.offerDetails : null
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: userMsg,
          systemInstruction: `You are "Bhojan" (भोजन) — the warm, witty, and deeply knowledgeable Virtual Khansama & Digital Concierge for "${restaurantName}".
Your personality: Think of a favorite uncle who also happens to be a Michelin-star chef — warm, playful, endlessly helpful.
Client seating: Table #${tableNumber}, Guest Name: ${customerName || "Ji"}.

COMMUNICATION STYLE:
- Limit your answers strictly to a maximum of 5 to 6 lines. Keep it extremely brief, readable, and professional. Nobody wants to read long texts.
- Speak with extreme warmth & Indian hospitality (use "Ji", "Sahib/Madam" gracefully).
- Always recommend from the ACTUAL menu below.

BUZZER TRIGGERS:
- If the user explicitly requests waiter service, water, clean plates, or standard assistance, you must trigger the request by appending [BUZZER: Waiter], [BUZZER: Water], [BUZZER: Clean Plates], or [BUZZER: General] at the very end of your response.

LIVE MENU:
${JSON.stringify(liveMenuContext)}

RULES:
- Always highlight Veg 🟢 vs Non-Veg 🔴 
- Suggest pairings (e.g., Butter Naan + Paneer Makhani)
- Ask about spice tolerance if recommending
- Never make up items not on the menu`
        })
      });

      const data = await res.json();
      let rawText = data.text || "Apologies Ji, I couldn't reach the kitchen mind. Please try again!";

      // Intercept buzzer signals
      const buzzerMatch = rawText.match(/\[BUZZER:\s*([^\]]+)\]/i);
      if (buzzerMatch && onCallBuzzer) {
        const buzzerType = buzzerMatch[1].trim();
        onCallBuzzer(buzzerType);
        rawText = rawText.replace(/\[BUZZER:\s*[^\]]+\]/gi, "").trim();
      }

      setAiChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: rawText
      }]);
    } catch {
      setAiChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: "Oh dear! My connection seems a bit tangled. Shall we try again in a moment?" 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setAiInputMessage(prompt);
    setAiChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
    setIsAiTyping(true);

    const liveMenuContext = menus.map(m => ({
      name: m.name, description: m.description, price: m.price,
      category: m.category, available: m.isAvailable,
      limitedPromo: m.isLimitedTimeOffer ? m.offerDetails : null
    }));

    fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: prompt,
        systemInstruction: `You are "Bhojan" (भोजन) — Virtual Khansama for "${restaurantName}". Table #${tableNumber}, Guest: ${customerName || "Ji"}. Be warm, recommend from ACTUAL menu: ${JSON.stringify(liveMenuContext)}. Highlight veg/non-veg. Limit your response strictly to 5-6 lines maximum. If user wants assistance or water/service, append [BUZZER: Waiter] or [BUZZER: Water] or [BUZZER: Clean Plates] or [BUZZER: General] at the very end.`
      })
    })
      .then(r => r.json())
      .then(data => {
        let rawText = data.text || "Let me check with the kitchen...";
        const buzzerMatch = rawText.match(/\[BUZZER:\s*([^\]]+)\]/i);
        if (buzzerMatch && onCallBuzzer) {
          const buzzerType = buzzerMatch[1].trim();
          onCallBuzzer(buzzerType);
          rawText = rawText.replace(/\[BUZZER:\s*[^\]]+\]/gi, "").trim();
        }
        setAiChatHistory(prev => [...prev, { role: 'assistant', text: rawText }]);
      })
      .catch(() => {
        setAiChatHistory(prev => [...prev, { role: 'assistant', text: "Connection hiccup! Please try again Ji." }]);
      })
      .finally(() => {
        setIsAiTyping(false);
        setAiInputMessage('');
      });
  };

  const handleQuickBuzzer = (type: string) => {
    if (onCallBuzzer) {
      onCallBuzzer(type);
      setAiChatHistory(prev => [...prev, 
        { role: 'user', text: `Summon Staff: ${type}` },
        { role: 'assistant', text: `[Bhojan Concierge 🧑‍🍳]: I have successfully dispatched a wireless chime to our staff for "${type}". A member will attend to Table #${tableNumber} shortly! 🙏` }
      ]);
    }
  };

  if (!isChatOpen) return null;

  const quickPrompts = [
    { label: "🌱 Pure Veg Options", prompt: "What are the best pure vegetarian dishes on your menu?" },
    { label: "🔥 Spicy Specials", prompt: "Recommend your spiciest, most flavorful dishes!" },
    { label: "🍰 Sweet Endings", prompt: "What desserts do you recommend after a heavy meal?" },
    { label: "💰 Best Value", prompt: "What's the best value-for-money dishes on the menu?" },
  ];

  return (
    <div className="fixed inset-0 z-[998] flex flex-col" id="bhojan-chat-drawer">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeChat} />

      {/* Chat Panel */}
      <div 
        className="relative mt-auto w-full max-w-lg mx-auto bg-[#0F172A] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ 
          maxHeight: '85vh',
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
                Your Digital Khansama • AI Powered
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

        {/* Dynamic Waiter Buzzer Bar inside Bhojan */}
        {onCallBuzzer && (
          <div className="bg-slate-950 border-b border-slate-800/60 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex-shrink-0">Summon:</span>
            <button 
              onClick={() => handleQuickBuzzer('Waiter')}
              className="flex-shrink-0 flex items-center gap-1 bg-slate-850 hover:bg-indigo-950 text-indigo-300 hover:text-white text-[9.5px] font-bold px-2.5 py-1 rounded-lg border border-slate-800 transition cursor-pointer"
            >
              <Bell size={11} className="text-amber-400" />
              <span>Waiter</span>
            </button>
            <button 
              onClick={() => handleQuickBuzzer('Water')}
              className="flex-shrink-0 flex items-center gap-1 bg-slate-850 hover:bg-blue-950 text-blue-300 hover:text-white text-[9.5px] font-bold px-2.5 py-1 rounded-lg border border-slate-800 transition cursor-pointer"
            >
              <Coffee size={11} className="text-sky-400" />
              <span>Water</span>
            </button>
            <button 
              onClick={() => handleQuickBuzzer('Bill')}
              className="flex-shrink-0 flex items-center gap-1 bg-slate-850 hover:bg-emerald-950 text-emerald-300 hover:text-white text-[9.5px] font-bold px-2.5 py-1 rounded-lg border border-slate-800 transition cursor-pointer"
            >
              <FileText size={11} className="text-emerald-400" />
              <span>Bill Check</span>
            </button>
            <button 
              onClick={() => handleQuickBuzzer('Assistance')}
              className="flex-shrink-0 flex items-center gap-1 bg-slate-850 hover:bg-purple-950 text-purple-300 hover:text-white text-[9.5px] font-bold px-2.5 py-1 rounded-lg border border-slate-800 transition cursor-pointer"
            >
              <HelpCircle size={11} className="text-purple-400" />
              <span>Support</span>
            </button>
          </div>
        )}

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
                <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest">Bhojan is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompts */}
        {aiChatHistory.length <= 2 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 pb-2">
            {quickPrompts.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => handleQuickPrompt(qp.prompt)}
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
            placeholder="Ask Bhojan anything about the menu..."
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
