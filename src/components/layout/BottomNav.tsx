import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Wallet, Store, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/orders', label: 'Order', icon: ClipboardList },
  { path: '/orders/new', label: 'Baru', icon: ShoppingCart, highlight: true },
  { path: '/receivables', label: 'Piutang', icon: Wallet },
  { path: '/stores', label: 'Toko', icon: Store },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.highlight) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center -mt-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] mt-0.5 text-muted-foreground">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
