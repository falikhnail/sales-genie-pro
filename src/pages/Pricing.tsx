import { useState, useMemo } from 'react';
import { useStores } from '@/hooks/useStores';
import { useActiveProducts } from '@/hooks/useProducts';
import { useActiveStorePrices, useUpsertStorePrice, useDeleteStorePrice } from '@/hooks/useStorePrices';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Save, X, Search, Percent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

const Pricing = () => {
  const { data: stores, isLoading: storesLoading } = useStores();
  const { data: products, isLoading: productsLoading } = useActiveProducts();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const { data: storePrices, isLoading: pricesLoading } = useActiveStorePrices(selectedStoreId);
  const upsertPrice = useUpsertStorePrice();
  const deletePrice = useDeleteStorePrice();

  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState('');
  const [percentages, setPercentages] = useState<Record<string, number>>({});

  const handlePercentageChange = (productId: string, defaultPrice: number, percent: number) => {
    setPercentages(prev => ({ ...prev, [productId]: percent }));
    const newPrice = Math.round(defaultPrice + (defaultPrice * percent / 100));
    setEditingPrices(prev => ({ ...prev, [productId]: newPrice }));
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch.trim()) return products;
    
    const search = productSearch.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(search) ||
      (product.sku && product.sku.toLowerCase().includes(search)) ||
      (product.category && product.category.toLowerCase().includes(search))
    );
  }, [products, productSearch]);

  const getCustomPrice = (productId: string) => {
    return storePrices?.find(sp => sp.product_id === productId);
  };

  const handlePriceChange = (productId: string, value: number) => {
    setEditingPrices(prev => ({ ...prev, [productId]: value }));
  };

  const handleSavePrice = async (productId: string) => {
    const priceNum = editingPrices[productId];
    if (priceNum !== undefined && selectedStoreId) {
      await upsertPrice.mutateAsync({
        store_id: selectedStoreId,
        product_id: productId,
        custom_price: priceNum,
      });
      setEditingPrices(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    await deletePrice.mutateAsync(priceId);
  };

  const isLoading = storesLoading || productsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Harga Khusus per Toko</h1>
        <p className="text-muted-foreground">Atur harga spesial untuk setiap toko</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pilih Toko
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="store">Toko</Label>
            <SearchableSelect
              options={stores?.map((store) => ({
                value: store.id,
                label: store.name,
                description: store.address || undefined,
              })) || []}
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              placeholder="Pilih toko..."
              searchPlaceholder="Cari toko..."
              emptyText="Toko tidak ditemukan."
            />
          </div>
        </CardContent>
      </Card>

      {selectedStoreId && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || pricesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari produk (nama, SKU, kategori)..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  {filteredProducts.length} dari {products?.length || 0} produk
                </p>
              </div>
                
                {filteredProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {productSearch ? 'Produk tidak ditemukan' : 'Belum ada produk aktif'}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Harga Default</TableHead>
                        <TableHead>Harga Khusus</TableHead>
                        <TableHead className="w-[120px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const customPrice = getCustomPrice(product.id);
                        const editingValue = editingPrices[product.id];
                        const isEditing = editingValue !== undefined;

                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.sku && (
                                  <p className="text-sm text-muted-foreground">{product.sku}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatCurrency(Number(product.default_price))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-44">
                                  <CurrencyInput
                                    placeholder="0"
                                    value={isEditing ? editingValue : (customPrice ? Number(customPrice.custom_price) : 0)}
                                    onChange={(value) => handlePriceChange(product.id, value)}
                                  />
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="shrink-0">
                                      <Percent className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72" align="start">
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium">Sesuaikan dengan Persentase</p>
                                      <p className="text-xs text-muted-foreground">
                                        Harga default: {formatCurrency(Number(product.default_price))}
                                      </p>
                                      <div className="flex items-center gap-3">
                                        <Slider
                                          min={-50}
                                          max={100}
                                          step={1}
                                          value={[percentages[product.id] ?? 0]}
                                          onValueChange={([val]) => handlePercentageChange(product.id, Number(product.default_price), val)}
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Input
                                            type="number"
                                            className="w-16 h-8 text-center text-sm"
                                            value={percentages[product.id] ?? 0}
                                            onChange={(e) => handlePercentageChange(product.id, Number(product.default_price), Number(e.target.value))}
                                          />
                                          <span className="text-sm text-muted-foreground">%</span>
                                        </div>
                                      </div>
                                      <p className="text-sm font-medium">
                                        Hasil: {formatCurrency(Math.round(Number(product.default_price) + (Number(product.default_price) * (percentages[product.id] ?? 0) / 100)))}
                                      </p>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {isEditing && (
                                  <Button
                                    size="icon"
                                    onClick={() => handleSavePrice(product.id)}
                                    disabled={upsertPrice.isPending}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                )}
                                {customPrice && !isEditing && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeletePrice(customPrice.id)}
                                    disabled={deletePrice.isPending}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Pricing;
