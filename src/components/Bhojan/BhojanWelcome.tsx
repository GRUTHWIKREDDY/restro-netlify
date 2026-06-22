import React, { useState } from 'react';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { useBhojan } from './BhojanProvider';
import bhojanFull from '../../assets/bhojan-full.png';

interface BhojanWelcomeProps {
  restaurantName: string;
  tableNumber: number;
}

export default function BhojanWelcome({ restaurantName, tableNumber }: BhojanWelcomeProps) {
  const { hasSeenWelcome, dismissWelcome } = useBhojan();
  const [step, setStep] = useState(0);

  if (hasSeenWelcome) return null;

  const steps = [
    {
      title: `Namaste! Welcome to ${restaurantName}`,
      subtitle: `Table #${tableNumber}`,
      message: "I'm Bhojan, your digital Khansama! I'll be your personal guide throughout your dining experience today.",
      emoji: '🙏',
    },
    {
      title: 'Browse & Discover',
      subtitle: 'Step 1',
      message: "Explore our curated menu — filter by category, search for dishes, or ask me for personalized recommendations. I know every recipe!",
      emoji: '📖',
    },
    {
      title: 'Order & Track',
      subtitle: 'Step 2',
      message: "Add items to your cart, place your order with one tap, and track your food in real-time as our chefs prepare it fresh!",
      emoji: '🍳',
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" id="bhojan-welcome-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={dismissWelcome}
      />

      {/* Card */}
      <div 
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'bhojanWelcomeIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Close button */}
        <button 
          onClick={dismissWelcome}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
          aria-label="Skip introduction"
        >
          <X size={14} />
        </button>

        {/* Avatar section with gradient */}
        <div className="bg-gradient-to-b from-indigo-50 via-purple-50 to-white pt-8 pb-4 flex flex-col items-center relative">
          {/* Decorative sparkles */}
          <div className="absolute top-4 left-8 text-amber-400 animate-pulse"><Sparkles size={14} /></div>
          <div className="absolute top-6 right-12 text-indigo-400 animate-pulse" style={{animationDelay:'0.5s'}}><Sparkles size={10} /></div>
          
          <div 
            className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl shadow-indigo-200/50 mb-3"
            style={{ animation: step === 0 ? 'bhojanFloat 3s ease-in-out infinite' : 'none' }}
          >
            <img src={bhojanFull} alt="Bhojan" className="w-full h-full object-cover" />
          </div>
          
          {/* Step indicator dots */}
          <div className="flex gap-2 mt-2">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step 
                    ? 'bg-indigo-600 w-6' 
                    : i < step 
                      ? 'bg-indigo-300' 
                      : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">{current.emoji}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{current.subtitle}</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">{current.title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-5">{current.message}</p>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) {
                  dismissWelcome();
                } else {
                  setStep(s => s + 1);
                }
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-1.5"
            >
              {isLast ? "Let's Dine!" : 'Next'}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bhojanWelcomeIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bhojanFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
