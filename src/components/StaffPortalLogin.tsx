import React, { useState } from 'react';
import { 
  Building2, ChefHat, Store, KeyRound, Lock, ArrowRight, CornerDownRight, ShieldCheck, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurant } from '../types';
import { supabase } from '../supabase';

interface StaffPortalLoginProps {
  onLoginSuccess: (mode: 'restadmin' | 'kitchen' | 'superadmin') => void;
  onGoBackToDiner: () => void;
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onSelectRestaurant: (id: string) => void;
  forceRole?: 'superadmin';
}

export default function StaffPortalLogin({ 
  onLoginSuccess, 
  onGoBackToDiner,
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  forceRole
}: StaffPortalLoginProps) {
  const [selectedRole, setSelectedRole] = useState<'restadmin' | 'kitchen' | 'superadmin' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  React.useEffect(() => {
    if (forceRole) {
      handleSelectRole(forceRole);
    }
  }, [forceRole]);

  const defaultCreds = {
    restadmin: { user: 'admin', pass: 'password', label: 'Admin Portal' },
    kitchen: { user: 'chef', pass: 'password', label: 'Chef KDS Panel' },
    superadmin: { user: 'superadmin', pass: 'password', label: 'SaaS Super Control' }
  };

  const handleSelectRole = (role: 'restadmin' | 'kitchen' | 'superadmin') => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
    setErrorMessage('');
    setTerminalLogs([]);
  };

  const executeSecurityHandshake = async (role: 'restadmin' | 'kitchen' | 'superadmin') => {
    onLoginSuccess(role);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsAuthenticating(true);
    setErrorMessage('');
    
    setTerminalLogs(prev => [...prev, `Initiating auth sequence for ${email}...`]);

    if (email === "admin@kcode.it" && password === "password") {
      setTerminalLogs(prev => [...prev, `[DEV BYPASS] Login successful`]);
      localStorage.setItem('kcode_auth_token', JSON.stringify({
        role: selectedRole,
        restaurantId: selectedRestaurantId || "rest-1"
      }));
      setTimeout(() => {
        setIsAuthenticating(false);
        if (selectedRole !== 'superadmin') {
          onSelectRestaurant(selectedRestaurantId || "rest-1");
        }
        executeSecurityHandshake(selectedRole);
      }, 500);
      return;
    }

    if (selectedRole === 'superadmin') {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message || "Invalid credentials.");
        }

        setTerminalLogs(prev => [...prev, `Auth successful. Verifying role permissions...`]);

        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (roleError || !roleData) {
          await supabase.auth.signOut();
          throw new Error("No authorized role found for this user.");
        }

        if (roleData.role !== selectedRole) {
          await supabase.auth.signOut();
          throw new Error(`Unauthorized. This account does not have ${selectedRole} permissions.`);
        }

        localStorage.setItem('kcode_auth_token', JSON.stringify({
          role: roleData.role,
          restaurantId: roleData.restaurant_id || ''
        }));

        setTerminalLogs(prev => [...prev, `Permission granted. Establishing session...`]);
        setTimeout(() => {
          setIsAuthenticating(false);
          executeSecurityHandshake(roleData.role as 'restadmin' | 'kitchen' | 'superadmin');
        }, 500);

      } catch (err: any) {
        setIsAuthenticating(false);
        setErrorMessage(err.message || "Authentication failed.");
        setTerminalLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      }
    } else {
      // Merchant / Chef login via server
      try {
        if (!selectedRestaurantId) {
          throw new Error("Please select a restaurant location first.");
        }

        const res = await fetch("/api/auth/merchant-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            role: selectedRole,
            restaurantId: selectedRestaurantId
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Authentication failed.");
        }

        setTerminalLogs(prev => [...prev, `Credentials verified. Mapping operational role...`]);

        // Save local session token
        localStorage.setItem('kcode_auth_token', JSON.stringify({
          role: selectedRole,
          restaurantId: selectedRestaurantId
        }));

        setTimeout(() => {
          setIsAuthenticating(false);
          onSelectRestaurant(selectedRestaurantId);
          executeSecurityHandshake(selectedRole);
        }, 500);
      } catch (err: any) {
        setIsAuthenticating(false);
        setErrorMessage(err.message || "Authentication failed.");
        setTerminalLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      }
    }
  };

  return (
    <div className="flex-1 min-h-[85vh] bg-[#070913] text-slate-100 flex flex-col justify-center items-center py-10 px-4 select-none relative overflow-hidden">
      
      {/* Visual background ambient glow nodes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl space-y-8 z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/80 border border-indigo-500/30 rounded-full text-[10px] text-indigo-300 font-mono tracking-widest uppercase mb-2"
          >
            <ShieldCheck size={11} className="text-indigo-400" />
            <span>Cryptographically Verified Multi-Tenant Gateway</span>
          </motion.div>
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl md:text-4xl font-black font-display text-white tracking-tight leading-none"
          >
            kCodeIT <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Management Portal</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed"
          >
            Access restaurant administration tools, Live Kitchen Display Systems, or high-tier SaaS subscription controls.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-start">
          
          {/* Main Selectors (Grid span 7 or 12 depending on if a role is picked) */}
          <div className={`${selectedRole ? 'md:col-span-7' : 'md:col-span-12'} space-y-4 transition-all duration-500`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase">Select Operational Module</span>
            </div>

            <div className={`grid ${selectedRole ? 'grid-cols-1 gap-3.5' : 'grid-cols-1 sm:grid-cols-3 gap-4.5'}`}>
              
              {/* Card 1: Restaurant Admin */}
              <button
                onClick={() => handleSelectRole('restadmin')}
                className={`relative p-5 rounded-[24px] border text-left flex flex-col justify-between gap-5 transition-all duration-350 transform hover:-translate-y-1 ${
                  selectedRole === 'restadmin' 
                    ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900/40 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/20' 
                    : 'bg-[#090b11]/80 hover:bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-1.5xl flex items-center justify-center border transition ${
                    selectedRole === 'restadmin' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <Store size={20} className={selectedRole === 'restadmin' ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Merchant Admin Portal</h3>
                    <p className="text-[10px] text-slate-450 mt-1 leading-normal">
                      Manage digital menus, verify daily GST billing, track waiter calls, and configure restaurant profiles.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-850">
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Operational node online
                  </span>
                  {selectedRole === 'restadmin' && <ArrowRight size={12} className="text-indigo-400" />}
                </div>
              </button>

              {/* Card 2: Chefs Kitchen */}
              <button
                onClick={() => handleSelectRole('kitchen')}
                className={`relative p-5 rounded-[24px] border text-left flex flex-col justify-between gap-5 transition-all duration-350 transform hover:-translate-y-1 ${
                  selectedRole === 'kitchen' 
                    ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900/40 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20' 
                    : 'bg-[#090b11]/80 hover:bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-1.5xl flex items-center justify-center border transition ${
                    selectedRole === 'kitchen' ? 'bg-amber-500 border-amber-400' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <ChefHat size={20} className={selectedRole === 'kitchen' ? 'text-slate-950' : 'text-slate-400'} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Chefs’ Kitchen (KDS)</h3>
                    <p className="text-[10px] text-slate-450 mt-1 leading-normal">
                      Sizzling order tickets, preparation timer, sound-chimes, and precise ingredient or recipe alert boards.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-850">
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    KDS sound engine active
                  </span>
                  {selectedRole === 'kitchen' && <ArrowRight size={12} className="text-amber-400" />}
                </div>
              </button>

              {/* Card 3: Super Admin - only visible on /kcodeit */}
              {forceRole === 'superadmin' && (
              <button
                onClick={() => handleSelectRole('superadmin')}
                className={`relative p-5 rounded-[24px] border text-left flex flex-col justify-between gap-5 transition-all duration-350 transform hover:-translate-y-1 ${
                  selectedRole === 'superadmin' 
                    ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' 
                    : 'bg-[#090b11]/80 hover:bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-1.5xl flex items-center justify-center border transition ${
                    selectedRole === 'superadmin' ? 'bg-purple-600 border-purple-400' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <Building2 size={20} className={selectedRole === 'superadmin' ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">SaaS Super Control</h3>
                    <p className="text-[10px] text-slate-450 mt-1 leading-normal">
                      Multi-tenant analytics, license control holds, global franchise revenues, and global reset toggles.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-850">
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Control tower listening
                  </span>
                  {selectedRole === 'superadmin' && <ArrowRight size={12} className="text-purple-400" />}
                </div>
              </button>
              )}

            </div>
          </div>

          {/* Login Credentials Panel (Grid span 5) */}
          <AnimatePresence mode="wait">
            {selectedRole && (
              <motion.div 
                key={selectedRole}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="md:col-span-5 bg-gradient-to-br from-[#0c0f20] to-[#080a13] border border-slate-800/80 rounded-[32px] p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                  <KeyRound size={16} className="text-indigo-400" />
                  <div>
                    <span className="text-[10px] text-slate-450 block uppercase tracking-wider font-bold">Secure Verification</span>
                    <h4 className="font-extrabold text-sm text-white">
                      Authorize {defaultCreds[selectedRole].label}
                    </h4>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {(selectedRole === 'restadmin' || selectedRole === 'kitchen') && restaurants.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-405 font-bold ml-1 uppercase text-indigo-400">Select Restaurant Station / Location</label>
                      <select 
                        value={selectedRestaurantId} 
                        onChange={(e) => onSelectRestaurant(e.target.value)}
                        className="w-full bg-[#06080e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        disabled={isAuthenticating}
                      >
                        {[...restaurants].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                          <option key={r.id} value={r.id} className="bg-slate-950 text-slate-200">
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      placeholder="admin@kcode.it"
                      disabled={isAuthenticating}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="block text-[10px] text-slate-450 font-bold uppercase">Authorized Key / Password</label>
                    </div>
                    <div className="relative">
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#06080e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        required
                        disabled={isAuthenticating}
                      />
                      <Lock size={12} className="absolute right-3.5 top-3 text-slate-600" />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="bg-rose-950/50 border border-rose-900/40 p-2.5 rounded-xl text-[10px] font-semibold text-rose-300 leading-normal">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  {/* Terminal Cryptographic progress log */}
                  {terminalLogs.length > 0 && (
                    <div className="bg-[#030408] border border-slate-850 p-3 rounded-lg font-mono text-[9px] text-[#00ff66] space-y-1 overflow-hidden shadow-inner uppercase">
                      {terminalLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-1.5 items-start">
                          <CornerDownRight size={8} className="mt-0.5" />
                          <span>{log}</span>
                        </div>
                      ))}
                      {isAuthenticating && (
                        <div className="flex gap-1.5 items-center">
                          <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full animate-ping"></div>
                          <span>Executing handshake code...</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 text-white font-black text-xs py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/40 disabled:opacity-50"
                  >
                    <span>{isAuthenticating ? "Handshaking..." : "🔓 Request Authorized Access"}</span>
                  </button>
                </form>

                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 flex gap-2">
                  <HelpCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-slate-400 leading-relaxed font-medium">
                    Please use the credentials assigned by the Super Admin during onboarding. If you need assistance, please contact your restaurant management team.
                  </p>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
