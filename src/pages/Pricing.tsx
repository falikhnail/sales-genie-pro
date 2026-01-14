import { useState, useMemo } from 'react';
import { useStores } from '@/hooks/useStores';
import { useActiveProducts } from '@/hooks/useProducts';
import { useStorePrices, useUpsertStorePrice, useDeleteStorePrice } from '@/hooks/useStorePrices';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Save, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';

const Pricing = () => {
  const { data: stores, isLoading: storesLoading } = useStores();
  const { data: products, isLoading: productsLoading } = useActiveProducts();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const { data: storePrices, isLoading: pricesLoading } = useStorePrices(selectedStoreId);
  const upsertPrice = useUpsertStorePrice();
  const deletePrice = useDeleteStorePrice();

  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});

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
            ) : products?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Belum ada produk aktif</p>
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
                  {products?.map((product) => {
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
                          <div className="w-44">
                            <CurrencyInput
                              placeholder="0"
                              value={isEditing ? editingValue : (customPrice ? Number(customPrice.custom_price) : 0)}
                              onChange={(value) => handlePriceChange(product.id, value)}
                            />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Pricing;
