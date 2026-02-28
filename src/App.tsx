import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import Auth from "./pages/Auth";
import InitialSetup from "./pages/InitialSetup";
import Dashboard from "./pages/Dashboard";
import Stores from "./pages/Stores";
import Products from "./pages/Products";
import Pricing from "./pages/Pricing";
import PriceHistory from "./pages/PriceHistory";
import PriceComparison from "./pages/PriceComparison";
import NewOrder from "./pages/NewOrder";
import EditOrder from "./pages/EditOrder";
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Targets from "./pages/Targets";
import ActivityLogs from "./pages/ActivityLogs";
import Backup from "./pages/Backup";
import Receivables from "./pages/Receivables";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<InitialSetup />} />
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/stores" element={<MainLayout><Stores /></MainLayout>} />
            <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
            <Route path="/pricing" element={<MainLayout><Pricing /></MainLayout>} />
            <Route path="/price-history" element={<MainLayout><PriceHistory /></MainLayout>} />
            <Route path="/price-comparison" element={<MainLayout><PriceComparison /></MainLayout>} />
            <Route path="/orders/new" element={<MainLayout><NewOrder /></MainLayout>} />
            <Route path="/orders/edit/:id" element={<MainLayout><EditOrder /></MainLayout>} />
            <Route path="/orders" element={<MainLayout><Orders /></MainLayout>} />
            <Route path="/targets" element={<MainLayout><Targets /></MainLayout>} />
            <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
            <Route path="/users" element={<MainLayout><Users /></MainLayout>} />
            <Route path="/activity-logs" element={<MainLayout><ActivityLogs /></MainLayout>} />
            <Route path="/receivables" element={<MainLayout><Receivables /></MainLayout>} />
            <Route path="/backup" element={<MainLayout><Backup /></MainLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
