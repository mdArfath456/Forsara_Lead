import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Search, FolderKanban, Table2, BarChart3, Download, Settings, Map, BellRing } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/search', label: 'Search Leads', icon: Search },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/leads', label: 'Lead Management', icon: Table2 },
  { to: '/map', label: 'Map View', icon: Map },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Saved Alerts', icon: BellRing },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav({ layoutId, onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 px-2.5 space-y-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={17} className={`relative z-10 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span className={`relative z-10 font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
