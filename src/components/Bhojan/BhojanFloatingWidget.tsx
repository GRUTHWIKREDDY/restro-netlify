import React, { useState, useEffect, useRef } from 'react';
import { useBhojan } from './BhojanProvider';
import bhojanHead from '../../assets/bhojan-head.png';
import { MessageCircle, X } from 'lucide-react';

interface BhojanFloatingWidgetProps {
  restaurantName?: string;
  customerSession?: { phone: string; name: string } | null;
  cartItemCount?: number;
  activeOrderCount?: number;
  orderWaitMinutes?: number;
}

export default function BhojanFloatingWidget({
  restaurantName,
  customerSession,
  cartItemCount = 0,
  activeOrderCount = 0,
  orderWaitMinutes = 0,
}: BhojanFloatingWidgetProps) {
  const { currentTip, dismissTip, showTip, toggleChat, isChatOpen, portalMode } = useBhojan();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasShownIdleTip, setHasShownIdleTip] = useState(false);
  const [hasShownOrderTip, setHasShownOrderTip] = useState(false);
  const [hasShownWaitTip, setHasShownWaitTip] = useState(false);
  const [hasShownAdminMorning, setHasShownAdminMorning] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Customer-side contextual tips
  useEffect(() => {
    if (portalMode !== 'customer' || !customerSession) return;

    // Idle tip — show after 12s if empty cart
    if (cartItemCount === 0 && !hasShownIdleTip) {
      idleTimer.current = setTimeout(() => {
        showTip({
          id: 'idle-browse',
          message: `Looking for inspiration? Try our Chef's Specials! 🍽️`,
          emoji: '💡',
          autoDismissMs: 7000,
        });
        setHasShownIdleTip(true);
      }, 12000);
      return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    }
  }, [cartItemCount, customerSession, portalMode, hasShownIdleTip, showTip]);

  // Order placed tip
  useEffect(() => {
    if (portalMode !== 'customer') return;
    if (activeOrderCount > 0 && !hasShownOrderTip) {
      showTip({
        id: 'order-placed',
        message: "Your order is being prepared! I'll keep you updated 🍳",
        emoji: '👨‍🍳',
        autoDismissMs: 6000,
      });
      setHasShownOrderTip(true);
    }
  }, [activeOrderCount, portalMode, hasShownOrderTip, showTip]);

  // Long wait tip
  useEffect(() => {
    if (portalMode !== 'customer') return;
    if (orderWaitMinutes > 15 && !hasShownWaitTip) {
      showTip({
        id: 'long-wait',
        message: "Good things take time! Your chef is perfecting your dish ⏳",
        emoji: '🧑‍🍳',
        autoDismissMs: 8000,
      });
      setHasShownWaitTip(true);
    }
  }, [orderWaitMinutes, portalMode, hasShownWaitTip, showTip]);

  // Admin-side morning greeting
  useEffect(() => {
    if (portalMode !== 'admin' || hasShownAdminMorning) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setTimeout(() => {
      showTip({
        id: 'admin-greeting',
        message: `${greeting}, Chef! Ready for today's service? Check the AI Briefing for insights ☀️`,
        emoji: '📊',
        autoDismissMs: 8000,
      });
      setHasShownAdminMorning(true);
    }, 2000);
  }, [portalMode, hasShownAdminMorning, showTip]);

  const handleAvatarClick = () => {
    if (currentTip) {
      dismissTip();
    } else {
      toggleChat();
    }
  };

  return (
    <div className="fixed bottom-6 right-4 z-[999] flex flex-col items-end gap-2" id="bhojan-floating-widget">
      {/* Speech Bubble */}
      {currentTip && (
        <div 
          className="animate-in slide-in-from-bottom-2 fade-in duration-400 max-w-[260px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl shadow-indigo-500/10 p-3.5 relative"
          style={{ animation: 'bhojanBubbleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <button 
            onClick={dismissTip} 
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition"
            aria-label="Dismiss tip"
          >
            <X size={12} />
          </button>
          <div className="flex items-start gap-2.5">
            <span className="text-lg flex-shrink-0 mt-0.5">{currentTip.emoji || '💬'}</span>
            <p className="text-[11px] font-semibold text-slate-700 leading-relaxed pr-3">{currentTip.message}</p>
          </div>
          {/* Arrow pointing to avatar */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white/95 border-b border-r border-slate-200 rotate-45" />
        </div>
      )}

      {/* Avatar Button */}
      <button
        onClick={handleAvatarClick}
        className={`group relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110 ${
          isChatOpen 
            ? 'border-indigo-500 ring-4 ring-indigo-200/50 shadow-indigo-300/30' 
            : currentTip
              ? 'border-amber-400 ring-4 ring-amber-200/50 shadow-amber-300/20'
              : 'border-white/80 shadow-slate-300/40'
        }`}
        style={{ animation: currentTip ? 'none' : 'bhojanBreathe 3s ease-in-out infinite' }}
        title="Talk to Bhojan"
        aria-label="Bhojan Digital Concierge"
      >
        <img 
          src={bhojanHead} 
          alt="Bhojan — Your Digital Khansama" 
          className="w-full h-full object-cover"
        />
        
        {/* Notification dot when chat is closed and there's something to say */}
        {!isChatOpen && !currentTip && portalMode === 'customer' && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full animate-pulse" />
        )}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes bhojanBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes bhojanBubbleIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
