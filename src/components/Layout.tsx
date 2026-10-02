import { LayoutDashboard, Users, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type Page = 'dashboard' | 'new-patient' | 'patient-list';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'new-patient', label: 'Yeni Hasta', icon: UserPlus },
  { id: 'patient-list', label: 'Hastalar', icon: Users },
];

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-slate-800">
          <div>
            <h1 className="text-sm font-bold leading-tight text-white">Saç Ekimi & PRP</h1>
            <p className="text-xs text-slate-400 mt-0.5">Hasta Yönetim Sistemi</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Giriş yapıldı</p>
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900 z-30 flex items-center justify-around border-t border-slate-800 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px]">Çıkış</span>
        </button>
      </nav>
    </div>
  );
}
