import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  History,
  Users,
  LogOut,
  Armchair,
  DollarSign,
  BarChart3,
  Target,
  ClipboardList,
  GitCompare,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, signOut } = useAuth();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/stores', label: 'Toko', icon: Store },
    { path: '/products', label: 'Produk', icon: Package, adminOnly: true },
    { path: '/pricing', label: 'Harga Khusus', icon: DollarSign },
    { path: '/price-history', label: 'Riwayat Harga', icon: History },
    { path: '/price-comparison', label: 'Perbandingan Harga', icon: GitCompare },
    { path: '/orders/new', label: 'Order Baru', icon: ShoppingCart },
    { path: '/orders', label: 'Riwayat Order', icon: ClipboardList },
    { path: '/targets', label: 'Target', icon: Target },
    { path: '/reports', label: 'Laporan', icon: BarChart3 },
    { path: '/backup', label: 'Backup Data', icon: Database, adminOnly: true },
    { path: '/users', label: 'Pegawai', icon: Users, adminOnly: true },
    { path: '/activity-logs', label: 'Log Aktivitas', icon: ClipboardList, adminOnly: true },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Armchair className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Furniture Sales</h1>
            <p className="text-xs text-muted-foreground">Manajemen Penjualan</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
