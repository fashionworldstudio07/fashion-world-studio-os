import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, LayoutDashboard, Mic, Users, Receipt, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/entry': 'Smart Entry',
  '/customers': 'Customers',
  '/services': 'Services',
  '/transactions': 'Transactions',
  '/settings': 'Settings',
};

const mobileTabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/entry', icon: Mic, label: 'Smart Entry' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const currentPage = routeNames[location.pathname] || 'Fashion Boys';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main viewport */}
      <div className="flex-1 flex flex-col sidebar-offset transition-all duration-300">
        
        {/* Header Bar */}
        <header 
          className="sticky top-0 z-30 h-16 px-4 flex items-center justify-between border-b border-[rgba(212,160,23,0.1)]"
          style={{ backgroundColor: '#0d1117' }}
        >
          {/* Left Side: Hamburger (mobile only) + Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-[var(--text-primary)] select-none">
              {currentPage}
            </h2>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-4">
            {/* Search Bar (Desktop only) */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search..."
                className="w-[200px] pl-9 pr-4 py-1.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4A017] transition-all"
              />
            </div>

            {/* Notification Bell (Desktop only, collapsed on mobile) */}
            <button className="hidden md:block p-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow shadow-red-500/50" />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#D4A017] text-black shadow shadow-amber-500/10 cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-[var(--text-primary)] max-w-24 truncate">
                {user?.full_name?.split(' ')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content area with bottom padding on mobile/tablet to clear the bottom tab bar */}
        <main className="p-4 md:p-6 pb-24 lg:pb-6 flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>

      {/* Bottom Tab Bar (Mobile/Tablet only, hidden on Desktop) */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 h-16 flex items-center justify-around lg:hidden border-t border-[rgba(212,160,23,0.2)]"
        style={{ backgroundColor: '#0d1117' }}
      >
        {mobileTabs.map((tab) => {
          const isActive = location.pathname === tab.to || (tab.to !== '/' && location.pathname.startsWith(tab.to));
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center w-16 h-full transition-colors"
            >
              <tab.icon 
                className="w-6 h-6 mb-1" 
                style={{ color: isActive ? '#D4A017' : '#6b7280' }}
              />
              <span 
                className="text-[10px] font-semibold"
                style={{ color: isActive ? '#D4A017' : '#6b7280' }}
              >
                {tab.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
