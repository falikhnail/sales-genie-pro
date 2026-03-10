import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import ReceivableNotifications from '@/components/ReceivableNotifications';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={isMobile ? 'min-h-screen pb-20' : 'ml-64 min-h-screen'}>
        <div className="flex items-center justify-end p-3 border-b">
          {isMobile && <div className="w-10" />}
          <ReceivableNotifications />
        </div>
        <div className={isMobile ? 'p-3' : 'p-6'}>
          {children}
        </div>
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default MainLayout;
