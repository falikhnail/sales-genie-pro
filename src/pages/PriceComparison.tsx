import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { usePriceComparisonData, useProductPricesByStore } from '@/hooks/usePriceComparison';
import { useProducts } from '@/hooks/useProducts';
import { SearchableSelect } from '@/components/ui/searchable-select';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
];

const PriceComparison = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [viewType, setViewType] = useState<'chart' | 'table'>('chart');
  
  const { data: comparisonResult, isLoading: comparisonLoading } = usePriceComparisonData();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: productPrices, isLoading: productPricesLoading } = useProductPricesByStore(selectedProductId);

  // Products with custom prices for dropdown
  const productsWithPrices = useMemo(() => {
    return comparisonResult?.comparisonData || [];
  }, [comparisonResult]);

  // Chart data for selected product
  const productChartData = useMemo(() => {
    if (!productPrices?.storePrices) return [];
    
    return [
      {
        name: 'Harga Standar',
        price: productPrices.product.default_price,
        fill: 'hsl(var(--muted-foreground))',
      },
      ...productPrices.storePrices.map((sp, index) => ({
        name: sp.storeName,
        price: sp.customPrice,
        priceDiff: sp.priceDiff,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    ];
  }, [productPrices]);

  // Overview chart data - average price variance per store
  const overviewChartData = useMemo(() => {
    if (!comparisonResult?.comparisonData || !comparisonResult?.stores) return [];

    const storeStats: Record<string, { name: string; totalDiff: number; count: number; products: string[] }> = {};

    comparisonResult.comparisonData.forEach(product => {
      product.storePrices.forEach(sp => {
        if (!storeStats[sp.storeId]) {
          storeStats[sp.storeId] = { name: sp.storeName, totalDiff: 0, count: 0, products: [] };
        }
        storeStats[sp.storeId].totalDiff += sp.priceDiff;
        storeStats[sp.storeId].count += 1;
        storeStats[sp.storeId].products.push(product.productName);
      });
    });

    return Object.values(storeStats)
      .map((store, index) => ({
        name: store.name.length > 15 ? store.name.substring(0, 15) + '...' : store.name,
        fullName: store.name,
        avgDiff: store.count > 0 ? store.totalDiff / store.count : 0,
        productCount: store.count,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.avgDiff - a.avgDiff);
  }, [comparisonResult]);

  // Products for dropdown
  const productOptions = useMemo(() => {
    return productsWithPrices.map(p => ({
      value: p.productId,
      label: `${p.productName}${p.productSku ? ` (${p.productSku})` : ''}`,
    }));
  }, [productsWithPrices]);

  const isLoading = comparisonLoading || productsLoading;

  const renderPriceDiffBadge = (diff: number) => {
    if (diff > 0) {
      return (
        <Badge variant="outline" className="text-destructive border-destructive">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{diff.toFixed(1)}%
        </Badge>
      );
    } else if (diff < 0) {
      return (
        <Badge variant="outline" className="text-chart-2 border-chart-2">
          <TrendingDown className="w-3 h-3 mr-1" />
          {diff.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Minus className="w-3 h-3 mr-1" />
        0%
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perbandingan Harga</h1>
          <p className="text-muted-foreground">Analisis harga khusus antar toko</p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Ringkasan Toko</TabsTrigger>
          <TabsTrigger value="product">Per Produk</TabsTrigger>
          <TabsTrigger value="table">Tabel Lengkap</TabsTrigger>
        </TabsList>

        {/* Overview - Average price variance by store */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Rata-rata Variansi Harga per Toko</CardTitle>
              <p className="text-sm text-muted-foreground">
                Persentase rata-rata perbedaan harga khusus dari harga standar
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80" />
              ) : overviewChartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Tidak ada data harga khusus untuk ditampilkan
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={overviewChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      type="number" 
                      fontSize={12}
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      domain={['auto', 'auto']}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      fontSize={12}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(2)}% (${props.payload.productCount} produk)`,
                        props.payload.fullName,
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="avgDiff" radius={[0, 4, 4, 0]}>
                      {overviewChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.avgDiff >= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Toko dengan Harga Khusus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewChartData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Produk dengan Harga Khusus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productsWithPrices.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rata-rata Variansi Keseluruhan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewChartData.length > 0
                    ? `${(overviewChartData.reduce((sum, s) => sum + s.avgDiff, 0) / overviewChartData.length).toFixed(1)}%`
                    : '0%'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Per Product View */}
        <TabsContent value="product">
          <Card>
            <CardHeader>
              <CardTitle>Perbandingan Harga per Produk</CardTitle>
              <div className="mt-4">
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  placeholder="Pilih produk..."
                  searchPlaceholder="Cari produk..."
                  emptyText="Produk tidak ditemukan"
                  className="w-full md:w-80"
                />
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProductId ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Pilih produk untuk melihat perbandingan harga antar toko
                </div>
              ) : productPricesLoading ? (
                <Skeleton className="h-80" />
              ) : productChartData.length <= 1 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Tidak ada harga khusus untuk produk ini
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Product Info */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{productPrices?.product.name}</h3>
                        {productPrices?.product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {productPrices.product.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Harga Standar</p>
                        <p className="text-lg font-bold">{formatCurrency(productPrices?.product.default_price || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={productChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        fontSize={12}
                        tickFormatter={(v) => formatCurrency(v).replace('Rp', '')}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => {
                          const diff = props.payload.priceDiff;
                          const diffStr = diff !== undefined ? ` (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)` : '';
                          return [formatCurrency(value) + diffStr, 'Harga'];
                        }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                        {productChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Price List Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Toko</TableHead>
                        <TableHead className="text-right">Harga Khusus</TableHead>
                        <TableHead className="text-right">Selisih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productPrices?.storePrices.map((sp) => (
                        <TableRow key={sp.storeId}>
                          <TableCell className="font-medium">{sp.storeName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sp.customPrice)}</TableCell>
                          <TableCell className="text-right">
                            {renderPriceDiffBadge(sp.priceDiff)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Table View */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Lengkap Harga Khusus</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80" />
              ) : productsWithPrices.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  Tidak ada data harga khusus
                </div>
              ) : (
                <div className="space-y-6">
                  {productsWithPrices.map((product) => (
                    <div key={product.productId} className="border rounded-lg overflow-hidden">
                      <div className="p-4 bg-muted/50 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{product.productName}</h4>
                          {product.productSku && (
                            <p className="text-sm text-muted-foreground">SKU: {product.productSku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Harga Standar</p>
                          <p className="font-semibold">{formatCurrency(product.defaultPrice)}</p>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Toko</TableHead>
                            <TableHead className="text-right">Harga Khusus</TableHead>
                            <TableHead className="text-right">Selisih</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {product.storePrices.map((sp) => (
                            <TableRow key={sp.storeId}>
                              <TableCell>{sp.storeName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(sp.customPrice)}</TableCell>
                              <TableCell className="text-right">
                                {renderPriceDiffBadge(sp.priceDiff)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PriceComparison;
