import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStores } from '@/hooks/useStores';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useSalesTarget } from '@/hooks/useSalesTargets';
import { useReceivables } from '@/hooks/useReceivables';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Package, ShoppingCart, TrendingUp, Target, ArrowRight, AlertTriangle, CreditCard, BarChart3 } from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SalesTrendChart } from '@/components/dashboard/SalesTrendChart';
import { ReceivablesTrendChart } from '@/components/dashboard/ReceivablesTrendChart';
import { TopStoresChart } from '@/components/dashboard/TopStoresChart';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const { data: stores, isLoading: storesLoading } = useStores();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: receivables, isLoading: receivablesLoading } = useReceivables();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { data: currentTarget, isLoading: targetLoading } = useSalesTarget(currentYear, currentMonth);

  // Receivables summary
  const totalReceivable = receivables?.reduce((sum, r) => sum + Number(r.remaining_amount), 0) || 0;
  const overdueReceivables = receivables?.filter(r => {
    if (!r.due_date || r.status === 'paid') return false;
    return new Date(r.due_date) < new Date();
  }) || [];
  const overdueAmount = overdueReceivables.reduce((sum, r) => sum + Number(r.remaining_amount), 0);

  // Calculate current month's sales
  const { data: monthSales, isLoading: monthSalesLoading } = useQuery({
    queryKey: ['current_month_sales'],
    queryFn: async () => {
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (error) throw error;
      return data.reduce((sum, order) => sum + Number(order.total_amount), 0);
    },
  });

  const todayOrders = orders?.filter(order => {
    const today = new Date().toDateString();
    return new Date(order.created_at).toDateString() === today;
  }) || [];

  const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

  const targetAmount = currentTarget ? Number(currentTarget.target_amount) : 0;
  const targetPercentage = targetAmount > 0 ? ((monthSales || 0) / targetAmount) * 100 : 0;

  const stats = [
    {
      title: 'Total Toko',
      value: stores?.length || 0,
      icon: Store,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Total Produk',
      value: products?.filter(p => p.is_active).length || 0,
      icon: Package,
      color: 'bg-accent text-accent-foreground',
    },
    {
      title: 'Order Hari Ini',
      value: todayOrders.length,
      icon: ShoppingCart,
      color: 'bg-chart-2/10 text-chart-2',
    },
    {
      title: 'Pendapatan Hari Ini',
      value: formatCurrency(todayRevenue),
      icon: TrendingUp,
      color: 'bg-chart-1/10 text-chart-1',
    },
  ];

  const recentOrders = orders?.slice(0, 5) || [];

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan aktivitas penjualan</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isLoading = storesLoading || productsLoading || ordersLoading;

          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monthly Target Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle>Target Bulan {monthNames[currentMonth - 1]} {currentYear}</CardTitle>
          </div>
          <Link to="/targets">
            <Button variant="ghost" size="sm">
              Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {targetLoading || monthSalesLoading ? (
            <Skeleton className="h-24" />
          ) : targetAmount === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-2">Belum ada target untuk bulan ini</p>
              {isAdmin && (
                <Link to="/targets">
                  <Button variant="outline" size="sm">Set Target</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-muted-foreground">Pencapaian</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(monthSales || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">dari target</p>
                  <p className="text-xl font-medium text-muted-foreground">
                    {formatCurrency(targetAmount)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={Math.min(targetPercentage, 100)} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className={cn(
                    "font-medium",
                    targetPercentage >= 100 ? "text-chart-1" : 
                    targetPercentage >= 75 ? "text-chart-2" : 
                    targetPercentage >= 50 ? "text-chart-4" : "text-destructive"
                  )}>
                    {targetPercentage.toFixed(1)}% tercapai
                  </span>
                  <span className="text-muted-foreground">
                    Sisa: {formatCurrency(Math.max(0, targetAmount - (monthSales || 0)))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receivables Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Ringkasan Piutang</CardTitle>
          </div>
          <Link to="/receivables">
            <Button variant="ghost" size="sm">
              Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {receivablesLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Sisa Piutang</p>
                <p className="text-2xl font-bold">{formatCurrency(totalReceivable)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivables?.filter(r => r.status !== 'paid').length || 0} faktur belum lunas
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-destructive" /> Jatuh Tempo
                </p>
                <p className={cn("text-2xl font-bold", overdueAmount > 0 ? "text-destructive" : "")}>
                  {formatCurrency(overdueAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overdueReceivables.length} faktur jatuh tempo
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Terbayar</p>
                <p className="text-2xl font-bold text-chart-1">
                  {formatCurrency(receivables?.reduce((sum, r) => sum + Number(r.paid_amount), 0) || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivables?.filter(r => r.status === 'paid').length || 0} faktur lunas
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <SalesTrendChart />
        <ReceivablesTrendChart />
      </div>

      <TopStoresChart />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Belum ada order</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.store?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(Number(order.total_amount))}</p>
                      <p className="text-xs text-muted-foreground">{formatDateShort(order.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Statistik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Total Order</span>
                <span className="font-bold">{orders?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Total Pendapatan</span>
                <span className="font-bold">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Rata-rata per Order</span>
                <span className="font-bold">
                  {formatCurrency(orders?.length ? totalRevenue / orders.length : 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
