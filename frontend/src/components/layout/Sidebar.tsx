import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Mic, Users, Scissors, Receipt,
  LogOut, Settings, Crown, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/entry', icon: Mic, label: 'Smart Entry' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/services', icon: Scissors, label: 'Services' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out border-r border-[rgba(212,160,23,0.1)] lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
          <X className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>

        {/* Logo / Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-[rgba(255,255,255,0.1)] h-16">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D4A017] shadow-md shadow-[#D4A017]/20"
          >
            <Crown className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#D4A017] tracking-wide">Fashion World</h1>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-secondary)]">Studio OS</p>
          </div>
        </div>

        {/* Navigation Links - Scrollable */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `h-12 px-5 py-3 flex items-center gap-3 font-medium transition-all duration-200 border-l-[3px] ${
                  isActive
                    ? 'bg-[rgba(212,160,23,0.15)] border-[#D4A017] text-[#D4A017]'
                    : 'border-transparent text-[#9ca3af] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Admin Profile & Sign Out - Fixed at the bottom */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.1)] bg-[var(--bg-sidebar)]">
          <div className="flex items-center gap-3 mb-4 px-2 py-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold bg-[#D4A017] text-black shadow shadow-amber-500/10"
            >
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{user?.full_name}</p>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-[var(--danger)] hover:bg-red-500/10 border border-transparent hover:border-red-500/20 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
