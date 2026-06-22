import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface BhojanTip {
  id: string;
  message: string;
  emoji?: string;
  autoDismissMs?: number;
}

interface BhojanContextType {
  // Welcome overlay
  hasSeenWelcome: boolean;
  dismissWelcome: () => void;
  // Floating tips
  currentTip: BhojanTip | null;
  showTip: (tip: BhojanTip) => void;
  dismissTip: () => void;
  // Chat drawer
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  // Portal mode
  portalMode: 'customer' | 'admin';
}

const BhojanContext = createContext<BhojanContextType | undefined>(undefined);

export function useBhojan() {
  const ctx = useContext(BhojanContext);
  if (!ctx) throw new Error('useBhojan must be used inside BhojanProvider');
  return ctx;
}

interface BhojanProviderProps {
  children: React.ReactNode;
  portalMode: 'customer' | 'admin';
}

export default function BhojanProvider({ children, portalMode }: BhojanProviderProps) {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    try {
      return localStorage.getItem('bhojan_welcome_seen') === 'true';
    } catch { return false; }
  });

  const [currentTip, setCurrentTip] = useState<BhojanTip | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissWelcome = useCallback(() => {
    setHasSeenWelcome(true);
    try { localStorage.setItem('bhojan_welcome_seen', 'true'); } catch {}
  }, []);

  const dismissTip = useCallback(() => {
    setCurrentTip(null);
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const showTip = useCallback((tip: BhojanTip) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setCurrentTip(tip);
    const ms = tip.autoDismissMs ?? 6000;
    dismissTimer.current = setTimeout(() => {
      setCurrentTip(null);
      dismissTimer.current = null;
    }, ms);
  }, []);

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);
  const toggleChat = useCallback(() => setIsChatOpen(p => !p), []);

  useEffect(() => {
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, []);

  return (
    <BhojanContext.Provider value={{
      hasSeenWelcome, dismissWelcome,
      currentTip, showTip, dismissTip,
      isChatOpen, openChat, closeChat, toggleChat,
      portalMode
    }}>
      {children}
    </BhojanContext.Provider>
  );
}
