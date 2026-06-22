import React from 'react';
import bhojanFull from '../../assets/bhojan-full.png';

type EmptyStateType = 
  | 'empty-cart' 
  | 'no-orders' 
  | 'no-menu' 
  | 'error' 
  | 'loading'
  | 'all-caught-up'
  | 'no-data';

interface BhojanEmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const STATES: Record<EmptyStateType, { defaultTitle: string; defaultMessage: string; emoji: string }> = {
  'empty-cart': {
    defaultTitle: 'Your cart is empty!',
    defaultMessage: "Browse our delicious menu and add items you'd love. I'm here to help if you need recommendations!",
    emoji: '🛒',
  },
  'no-orders': {
    defaultTitle: 'All caught up!',
    defaultMessage: "No pending orders right now. It's the perfect time to review your menu or check analytics.",
    emoji: '✅',
  },
  'no-menu': {
    defaultTitle: 'No menu items yet!',
    defaultMessage: "Start by adding your signature dishes. Let's build a menu that'll wow your diners!",
    emoji: '📋',
  },
  'error': {
    defaultTitle: 'Oops! Something went wrong',
    defaultMessage: "Don't worry, these things happen! Let me try to sort this out for you.",
    emoji: '😅',
  },
  'loading': {
    defaultTitle: 'Cooking up your data...',
    defaultMessage: "Just a moment while I gather everything fresh from the kitchen!",
    emoji: '🍳',
  },
  'all-caught-up': {
    defaultTitle: 'You\'re all caught up!',
    defaultMessage: "No new notifications or pending items. Great job managing the operations!",
    emoji: '🎉',
  },
  'no-data': {
    defaultTitle: 'Nothing here yet',
    defaultMessage: "This section will come alive once there's data flowing in. Stay tuned!",
    emoji: '📊',
  },
};

export default function BhojanEmptyState({ 
  type, 
  title, 
  message, 
  actionLabel, 
  onAction 
}: BhojanEmptyStateProps) {
  const state = STATES[type];
  const displayTitle = title || state.defaultTitle;
  const displayMessage = message || state.defaultMessage;

  return (
    <div 
      className="flex flex-col items-center justify-center py-10 px-6 text-center"
      style={{ animation: 'bhojanEmptyIn 0.5s ease-out both' }}
    >
      {/* Bhojan avatar with context emoji */}
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-slate-200 shadow-lg mx-auto"
          style={{ animation: type === 'loading' ? 'bhojanSpin 2s linear infinite' : 'bhojanFloat 3s ease-in-out infinite' }}
        >
          <img src={bhojanFull} alt="Bhojan" className="w-full h-full object-cover" />
        </div>
        <span className="absolute -bottom-1 -right-1 text-2xl">{state.emoji}</span>
      </div>

      <h3 className="text-sm font-black text-slate-800 mb-1">{displayTitle}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed max-w-[260px] mb-4">{displayMessage}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-lg shadow-indigo-200"
        >
          {actionLabel}
        </button>
      )}

      <style>{`
        @keyframes bhojanEmptyIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes bhojanFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes bhojanSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
