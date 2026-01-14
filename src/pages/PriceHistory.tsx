import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { usePriceHistory, useSetActivePrice, useDeleteStorePrice } from '@/hooks/useStorePrices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, Check, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const PriceHistory = () => {
  const { data: stores, isLoading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const { data: priceHistory, isLoading: historyLoading } = usePriceHistory(selectedStoreId || undefined);
  const setActivePrice = useSetActivePrice();
  const deletePrice = useDeleteStorePrice();

  const handleSetActive = async (price: any) => {
    await setActivePrice.mutateAsync({
      id: price.id,
      store_id: price.store_id,
      product_id: price.product_id,
    });
  };

  const handleDelete = async (id: string) => {
    await deletePrice.mutateAsync(id);
  };

  const isLoading = storesLoading || historyLoading;

  // Group by store and product
  const groupedHistory = priceHistory?.reduce((acc: any, price: any) => {
    const key = `${price.store_id}-${price.product_id}`;
    if (!acc[key]) {
      acc[key] = {
        store: price.store,
        product: price.product,
        prices: [],
      };
    }
    acc[key].prices.push(price);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Riwayat Harga Khusus</h1>
        <p className="text-muted-foreground">Lihat dan kelola riwayat perubahan harga per toko</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Filter Toko
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <SearchableSelect
              options={[
                { value: '', label: 'Semua Toko' },
                ...(stores?.map((store) => ({
                  value: store.id,
                  label: store.name,
                  description: store.address || undefined,
                })) || []),
              ]}
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              placeholder="Pilih toko..."
              searchPlaceholder="Cari toko..."
              emptyText="Toko tidak ditemukan."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Riwayat Harga</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !priceHistory?.length ? (
            <p className="text-muted-foreground text-center py-8">Belum ada riwayat harga</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Toko</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-[120px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistory?.map((price: any) => (
                  <TableRow key={price.id}>
                    <TableCell>
                      <p className="font-medium">{price.store?.name || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{price.product?.name || '-'}</p>
                        {price.product?.sku && (
                          <p className="text-sm text-muted-foreground">{price.product.sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(price.custom_price))}
                    </TableCell>
                    <TableCell>
                      {price.is_active ? (
                        <Badge variant="default">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Tidak Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(price.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!price.is_active && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleSetActive(price)}
                            disabled={setActivePrice.isPending}
                            title="Aktifkan harga ini"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(price.id)}
                          disabled={deletePrice.isPending}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceHistory;
