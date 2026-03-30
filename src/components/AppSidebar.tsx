import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, CreditCard, Wallet, Building2, LogOut, Zap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Mandates', icon: FileText, path: '/mandates' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Bank Accounts', icon: Building2, path: '/bank-accounts' },
  { label: 'Payouts', icon: CreditCard, path: '/payouts' },
];

const AppSidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && <span className="text-sm font-bold text-foreground truncate">AutoCollect</span>}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active ? "bg-sidebar-accent text-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
        )}
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-2 text-muted-foreground hover:text-foreground transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
