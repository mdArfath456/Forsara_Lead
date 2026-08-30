import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '../store/authStore';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { SidebarNav, NAV_ITEMS } from './SidebarNav';

const PAGE_TITLES = Object.fromEntries(NAV_ITEMS.map((item) => [item.to, item.label]));

export function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sets the browser tab title per route — good practice regardless of the
  // noindex directive (helps with bookmarks, multiple open tabs, a11y).
  useEffect(() => {
    const label = PAGE_TITLES[location.pathname] || 'Forsara Lead Extractor';
    document.title = `${label} — Forsara Consultancy`;
  }, [location.pathname]);

  // Close the mobile drawer automatically on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden">
      {/* Desktop sidebar — hidden below md breakpoint */}
      <aside className="hidden md:flex w-64 shrink-0 m-3 mr-0 rounded-2xl glass-panel flex-col overflow-hidden">
        <Brand />
        <SidebarNav layoutId="active-nav-pill-desktop" />
        <SidebarFooter onLogout={logout} />
      </aside>

      {/* Mobile/tablet top bar — hidden at md and above */}
      <div className="md:hidden fixed top-3 inset-x-3 z-40 flex min-w-0 items-center justify-between gap-2 px-3 py-3 rounded-2xl glass-panel">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <div className="w-6 h-6 rounded-md bg-brand-gradient flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="truncate">Forsara</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="md:hidden fixed left-0 top-0 h-full w-72 z-50 glass-panel flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-2">
                <Brand />
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="w-9 h-9 mr-3 rounded-lg flex items-center justify-center hover:bg-white/[0.06]"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarNav layoutId="active-nav-pill-mobile" onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter onLogout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-20 sm:px-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="px-5 py-5 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow">
        <Sparkles size={16} className="text-white" />
      </div>
      <div>
        <div className="font-semibold text-sm leading-tight">Forsara</div>
        <div className="text-xs text-gray-500 leading-tight">Lead Extractor</div>
      </div>
    </div>
  );
}

function SidebarFooter({ onLogout }) {
  return (
    <div className="m-2.5 flex items-center gap-2">
      <button
        onClick={onLogout}
        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
      >
        <LogOut size={16} /> Log out
      </button>
      <div className="hidden md:flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
      </div>
    </div>
  );
}
