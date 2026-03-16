import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'home', label: 'Dashboard' },
  { to: '/generate-qr', icon: 'qr_code_scanner', label: 'Generate QR' },
  { to: '/analytics', icon: 'analytics', label: 'Analytics' },
];

export default function Sidebar() {
  const { logout, profile } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col justify-between bg-white border-r border-slate-200 p-4 sticky top-0">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex gap-3 items-center">
          <div className="bg-primary/10 rounded-lg p-2 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">school</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-base font-bold leading-normal">DCC Admin</h1>
            <p className="text-slate-500 text-xs font-medium leading-normal">Dean Career Cloud</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'hover:bg-slate-100 text-slate-700'
                }`
              }
            >
              <span className="material-symbols-outlined text-xl">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-2">
        {/* User info */}
        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 mb-2">
          <p className="text-slate-900 text-sm font-semibold truncate">{profile?.name || '—'}</p>
          <p className="text-xs text-primary font-medium capitalize">{profile?.role?.replace('_', ' ') || 'member'}</p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors w-full"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <p className="text-sm font-medium">Logout</p>
        </button>
      </div>
    </div>
  );
}
