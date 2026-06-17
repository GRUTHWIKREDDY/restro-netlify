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
  const [selectedRole, setSelectedRole] = useState<'restadmin' | 'kitchen' | 'superadmin' | null>('restadmin');
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
      try {
        const res = await fetch("/api/auth/merchant-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            role: selectedRole
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Authentication failed.");
        }

        setTerminalLogs(prev => [...prev, `Credentials verified. Mapping operational role...`]);

        localStorage.setItem('kcode_auth_token', JSON.stringify({
          role: selectedRole,
          restaurantId: data.restaurantId
        }));

        setTimeout(() => {
          setIsAuthenticating(false);
          onSelectRestaurant(data.restaurantId);
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
    <div className="flex-1 min-h-[85vh] bg-gray-50 text-gray-900 flex flex-col justify-center items-center py-10 px-4 select-none relative overflow-hidden">

      <div className="w-full max-w-4xl space-y-8 z-10">

        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <motion.h2
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl md:text-4xl font-black font-display text-gray-800 tracking-tight leading-none"
          >
            Restro <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Management Portal</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed"
          >
            Access restaurant administration tools, Live Kitchen Display Systems, or high-tier SaaS subscription controls.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-center">

          {/* Main Selectors */}
          <div className={`${selectedRole ? 'md:col-span-7' : 'md:col-span-12'} space-y-4 transition-all duration-500`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">Select Operational Module</span>
            </div>

            <div className={`grid ${selectedRole ? 'grid-cols-1 gap-3.5' : 'grid-cols-1 sm:grid-cols-3 gap-4.5'}`}>

              {/* Card 1: Restaurant Admin */}
              <button
                onClick={() => handleSelectRole('restadmin')}
                className={`relative p-5 rounded-[24px] border text-left flex flex-col justify-between gap-5 transition-all duration-350 transform hover:-translate-y-1 ${
                  selectedRole === 'restadmin'
                    ? 'bg-white border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.1)] ring-1 ring-indigo-500/30'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-1.5xl flex items-center justify-center border transition ${
                    selectedRole === 'restadmin' ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-100 border-gray-200'
                    }`}>
                    <Store size={20} className={selectedRole === 'restadmin' ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-800">Merchant Admin Portal</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-gray-100">
                  <span className="font-mono text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Operational node online
                  </span>
                  {selectedRole === 'restadmin' && <ArrowRight size={12} className="text-indigo-500" />}
                </div>
              </button>

              {/* Card 2: Chefs Kitchen */}
              <button
                onClick={() => handleSelectRole('kitchen')}
                className={`relative p-5 rounded-[24px] border text-left flex flex-col justify-between gap-5 transition-all duration-350 transform hover:-translate-y-1 ${
                  selectedRole === 'kitchen'
                    ? 'bg-white border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/30'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-1.5xl flex items-center justify-center border transition ${
                    selectedRole === 'kitchen' ? 'bg-amber-500 border-amber-400' : 'bg-gray-100 border-gray-200'
                    }`}>
                    <ChefHat size={20} className={selectedRole === 'kitchen' ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-800">Chefs' Kitchen (KDS)</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-gray-100">
                  <span className="font-mono text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    KDS sound engine active
                  </span>
                  {selectedRole === 'kitchen' && <ArrowRight size={12} className="text-amber-500" />}
                </div>
              </button>

              {/* Card 3: Super Admin - only visible on /kcodeit */}
              {forceRole === 'superadmin' && (
                <button
                  onClick={() => handleSelectRole('superadmin')}
                  className={`relative p-5 rounded-[24px] border text-left flex flex-col justify-between gap-5 transition-all duration-350 transform hover:-translate-y-1 ${
                    selectedRole === 'superadmin'
                      ? 'bg-white border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/30'
                      : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                >
                  <div className="space-y-3">
                    <div className={`w-10 h-10 rounded-1.5xl flex items-center justify-center border transition ${
                      selectedRole === 'superadmin' ? 'bg-purple-600 border-purple-500' : 'bg-gray-100 border-gray-200'
                      }`}>
                      <Building2 size={20} className={selectedRole === 'superadmin' ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-800">SaaS Super Control</h3>
                      <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                        Multi-tenant analytics, license control holds, global franchise revenues, and global reset toggles.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-gray-100">
                    <span className="font-mono text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Control tower listening
                    </span>
                    {selectedRole === 'superadmin' && <ArrowRight size={12} className="text-purple-500" />}
                  </div>
                </button>
              )}

            </div>
          </div>

          {/* Login Credentials Panel */}
          <AnimatePresence mode="wait">
            {selectedRole && (
              <motion.div
                key={selectedRole}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="md:col-span-5 bg-white border border-gray-200 rounded-[32px] p-6 shadow-xl space-y-5"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <KeyRound size={16} className="text-indigo-600" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-800">
                      {selectedRole === "restadmin" ? "Admin Portal Login" : selectedRole === "kitchen" ? "Kitchen Portal Login" : "Super Admin Login"}
                    </h4>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-gray-400"
                      placeholder="admin@kcode.it"
                      disabled={isAuthenticating}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase">Password</label>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                        required
                        disabled={isAuthenticating}
                      />
                      <Lock size={12} className="absolute right-3.5 top-3 text-gray-400" />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-[10px] font-semibold text-red-600 leading-normal">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    <span>{isAuthenticating ? "Logging in..." : "Login"}</span>
                  </button>
                </form>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}