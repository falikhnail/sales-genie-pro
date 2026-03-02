import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem } from '@/types';
import { useReceivables } from '@/hooks/useReceivables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, Download, CalendarIcon, TrendingUp, Package, Store, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { exportOrdersToExcel, exportDetailedReportToExcel, exportProductSalesToExcel } from '@/lib/excel-export';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type PeriodType = 'daily' | 'weekly' | 'monthly';
type RangeType = '7days' | '30days' | '3months' | '6months' | '1year' | 'custom';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const Reports = () => {
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [rangeType, setRangeType] = useState<RangeType>('30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (rangeType) {
      case '7days':
        return { from: subDays(now, 7), to: now };
      case '30days':
        return { from: subDays(now, 30), to: now };
      case '3months':
        return { from: subMonths(now, 3), to: now };
      case '6months':
        return { from: subMonths(now, 6), to: now };
      case '1year':
        return { from: subMonths(now, 12), to: now };
      case 'custom':
        return customDateRange;
      default:
        return { from: subDays(now, 30), to: now };
    }
  }, [rangeType, customDateRange]);

  // Fetch orders with store data
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['reports_orders', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, store:stores (*)`)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as (Order & { store: any })[];
    },
  });

  // Fetch order items with product data
  const { data: orderItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['reports_order_items', orders?.map(o => o.id)],
    queryFn: async () => {
      if (!orders?.length) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`*, product:products (*)`)
        .in('order_id', orders.map(o => o.id));

      if (error) throw error;
      return data as (OrderItem & { product: any })[];
    },
    enabled: !!orders?.length,
  });

  // Process chart data based on period type
  const chartData = useMemo(() => {
    if (!orders?.length) return [];

    const groupedData: Record<string, { date: string; revenue: number; orders: number }> = {};

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      let key: string;

      switch (periodType) {
        case 'daily':
          key = format(orderDate, 'yyyy-MM-dd');
          break;
        case 'weekly':
          key = format(startOfWeek(orderDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'monthly':
          key = format(startOfMonth(orderDate), 'yyyy-MM');
          break;
        default:
          key = format(orderDate, 'yyyy-MM-dd');
      }

      if (!groupedData[key]) {
        groupedData[key] = { date: key, revenue: 0, orders: 0 };
      }
      groupedData[key].revenue += Number(order.total_amount);
      groupedData[key].orders += 1;
    });

    return Object.values(groupedData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        label: periodType === 'monthly' 
          ? format(new Date(item.date + '-01'), 'MMM yyyy', { locale: id })
          : periodType === 'weekly'
          ? `Minggu ${format(new Date(item.date), 'd MMM', { locale: id })}`
          : format(new Date(item.date), 'd MMM', { locale: id }),
      }));
  }, [orders, periodType]);

  // Product sales data
  const productSalesData = useMemo(() => {
    if (!orderItems?.length) return [];

    const productMap: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};

    orderItems.forEach(item => {
      const productId = item.product_id;
      if (!productMap[productId]) {
        productMap[productId] = {
          name: item.product?.name || 'Unknown',
          sku: item.product?.sku || '',
          quantity: 0,
          revenue: 0,
        };
      }
      productMap[productId].quantity += item.quantity;
      productMap[productId].revenue += Number(item.subtotal);
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [orderItems]);

  // Store sales data
  const storeSalesData = useMemo(() => {
    if (!orders?.length) return [];

    const storeMap: Record<string, { name: string; orders: number; revenue: number }> = {};

    orders.forEach(order => {
      const storeId = order.store_id;
      if (!storeMap[storeId]) {
        storeMap[storeId] = {
          name: order.store?.name || 'Unknown',
          orders: 0,
          revenue: 0,
        };
      }
      storeMap[storeId].orders += 1;
      storeMap[storeId].revenue += Number(order.total_amount);
    });

    return Object.values(storeMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [orders]);

  // Summary stats
  const stats = useMemo(() => {
    if (!orders?.length) return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalProducts: 0 };

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const totalProducts = orderItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalProducts,
    };
  }, [orders, orderItems]);

  const { data: receivables, isLoading: receivablesLoading } = useReceivables();

  // Aging piutang data
  const agingData = useMemo(() => {
    if (!receivables?.length) return { categories: [], byStore: [] };

    const now = new Date();
    const categories = [
      { label: '0-30 hari', min: 0, max: 30, amount: 0, count: 0, color: 'hsl(var(--chart-1))' },
      { label: '31-60 hari', min: 31, max: 60, amount: 0, count: 0, color: 'hsl(var(--chart-2))' },
      { label: '61-90 hari', min: 61, max: 90, amount: 0, count: 0, color: 'hsl(var(--chart-4))' },
      { label: '> 90 hari', min: 91, max: Infinity, amount: 0, count: 0, color: 'hsl(var(--destructive))' },
    ];

    const storeAging: Record<string, { name: string; cat0: number; cat1: number; cat2: number; cat3: number; total: number }> = {};

    receivables
      .filter(r => r.status !== 'paid')
      .forEach(r => {
        const createdDate = new Date(r.created_at);
        const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = Number(r.remaining_amount);
        const storeName = r.store?.name || 'Unknown';

        if (!storeAging[r.store_id]) {
          storeAging[r.store_id] = { name: storeName, cat0: 0, cat1: 0, cat2: 0, cat3: 0, total: 0 };
        }

        for (let i = 0; i < categories.length; i++) {
          if (daysDiff >= categories[i].min && daysDiff <= categories[i].max) {
            categories[i].amount += remaining;
            categories[i].count += 1;
            const catKey = `cat${i}` as 'cat0' | 'cat1' | 'cat2' | 'cat3';
            storeAging[r.store_id][catKey] += remaining;
            storeAging[r.store_id].total += remaining;
            break;
          }
        }
      });

    return {
      categories,
      byStore: Object.values(storeAging).sort((a, b) => b.total - a.total),
    };
  }, [receivables]);

  const isLoading = ordersLoading || itemsLoading;

  const handleExportOrders = () => {
    if (!orders?.length) return;
    const dateStr = format(new Date(), 'yyyyMMdd');
    exportOrdersToExcel(orders, `laporan-penjualan-${dateStr}`);
  };

  const handleExportDetailed = () => {
    if (!orders?.length || !orderItems?.length) return;
    const ordersWithItems = orders.map(order => ({
      order,
      items: orderItems.filter(item => item.order_id === order.id),
    }));
    const dateStr = format(new Date(), 'yyyyMMdd');
    exportDetailedReportToExcel(ordersWithItems, `laporan-detail-${dateStr}`);
  };

  const handleExportProducts = () => {
    if (!productSalesData.length) return;
    const dateStr = format(new Date(), 'yyyyMMdd');
    exportProductSalesToExcel(productSalesData, `laporan-produk-${dateStr}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan Penjualan</h1>
          <p className="text-muted-foreground">Analisis performa penjualan</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={handleExportOrders} className="justify-start">
                  Ringkasan Order
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportDetailed} className="justify-start">
                  Detail Lengkap
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportProducts} className="justify-start">
                  Per Produk
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Periode</label>
              <Select value={periodType} onValueChange={(v: PeriodType) => setPeriodType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Harian</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rentang Waktu</label>
              <Select value={rangeType} onValueChange={(v: RangeType) => setRangeType(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30days">30 Hari Terakhir</SelectItem>
                  <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="6months">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="1year">1 Tahun Terakhir</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rangeType === 'custom' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Tanggal</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-32 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(customDateRange.from, 'd MMM yy', { locale: id })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.from}
                        onSelect={(date) => date && setCustomDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="self-center">-</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-32 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(customDateRange.to, 'd MMM yy', { locale: id })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.to}
                        onSelect={(date) => date && setCustomDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Pendapatan', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'bg-primary/10 text-primary' },
          { title: 'Total Order', value: stats.totalOrders, icon: BarChart3, color: 'bg-chart-1/10 text-chart-1' },
          { title: 'Rata-rata Order', value: formatCurrency(stats.avgOrderValue), icon: Store, color: 'bg-chart-2/10 text-chart-2' },
          { title: 'Produk Terjual', value: stats.totalProducts, icon: Package, color: 'bg-chart-3/10 text-chart-3' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2 rounded-lg', stat.color)}>
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

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Pendapatan</TabsTrigger>
          <TabsTrigger value="orders">Jumlah Order</TabsTrigger>
          <TabsTrigger value="products">Per Produk</TabsTrigger>
          <TabsTrigger value="stores">Per Toko</TabsTrigger>
          <TabsTrigger value="aging">Aging Piutang</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Grafik Pendapatan</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80" />
              ) : chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Tidak ada data untuk periode ini
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-muted-foreground" fontSize={12} />
                    <YAxis 
                      className="text-muted-foreground" 
                      fontSize={12}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Grafik Jumlah Order</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80" />
              ) : chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Tidak ada data untuk periode ini
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-muted-foreground" fontSize={12} />
                    <YAxis className="text-muted-foreground" fontSize={12} />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Order']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Produk (Pendapatan)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-80" />
                ) : productSalesData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Tidak ada data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={productSalesData}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name.slice(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {productSalesData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detail Penjualan Produk</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-80" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productSalesData.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stores">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Toko (Pendapatan)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-80" />
                ) : storeSalesData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Tidak ada data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={storeSalesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} fontSize={12} />
                      <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detail Penjualan per Toko</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-80" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Toko</TableHead>
                        <TableHead className="text-right">Order</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeSalesData.map((store, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{store.name}</TableCell>
                          <TableCell className="text-right">{store.orders}</TableCell>
                          <TableCell className="text-right">{formatCurrency(store.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aging">
          <div className="space-y-6">
            {/* Aging Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              {agingData.categories.map((cat, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{cat.label}</CardTitle>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                      <Clock className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {receivablesLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{formatCurrency(cat.amount)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{cat.count} faktur</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Aging Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Aging Piutang</CardTitle>
              </CardHeader>
              <CardContent>
                {receivablesLoading ? (
                  <Skeleton className="h-80" />
                ) : agingData.categories.every(c => c.amount === 0) ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    Tidak ada piutang yang belum lunas
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={agingData.categories.filter(c => c.amount > 0)}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {agingData.categories.filter(c => c.amount > 0).map((cat, i) => (
                          <Cell key={i} fill={cat.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Jumlah']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Aging by Store Table */}
            <Card>
              <CardHeader>
                <CardTitle>Aging Piutang per Toko</CardTitle>
              </CardHeader>
              <CardContent>
                {receivablesLoading ? (
                  <Skeleton className="h-40" />
                ) : agingData.byStore.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Tidak ada data</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Toko</TableHead>
                        <TableHead className="text-right">0-30 hari</TableHead>
                        <TableHead className="text-right">31-60 hari</TableHead>
                        <TableHead className="text-right">61-90 hari</TableHead>
                        <TableHead className="text-right">&gt; 90 hari</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agingData.byStore.map((store, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{store.name}</TableCell>
                          <TableCell className="text-right">{store.cat0 > 0 ? formatCurrency(store.cat0) : '-'}</TableCell>
                          <TableCell className="text-right">{store.cat1 > 0 ? formatCurrency(store.cat1) : '-'}</TableCell>
                          <TableCell className="text-right">{store.cat2 > 0 ? formatCurrency(store.cat2) : '-'}</TableCell>
                          <TableCell className="text-right text-destructive">{store.cat3 > 0 ? formatCurrency(store.cat3) : '-'}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(store.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
