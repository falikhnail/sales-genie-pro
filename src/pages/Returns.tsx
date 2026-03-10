import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useReturns, useCreateReturn, useDeleteReturn, ReturnItem } from '@/hooks/useReturns';
import { useReceivables } from '@/hooks/useReceivables';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { Plus, Trash2, RotateCcw, Search } from 'lucide-react';

const Returns = () => {
  const { isAdmin } = useAuth();
  const { data: returns, isLoading } = useReturns();
  const { data: receivables } = useReceivables();
  const createReturn = useCreateReturn();
  const deleteReturn = useDeleteReturn();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceivableId, setSelectedReceivableId] = useState('');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([{ product_name: '', quantity: 1, unit_price: 0, subtotal: 0 }]);

  const unpaidReceivables = receivables?.filter(r => r.status !== 'paid') || [];

  const selectedReceivable = receivables?.find(r => r.id === selectedReceivableId);

  const receivableOptions = unpaidReceivables.map(r => ({
    value: r.id,
    label: `${r.invoice_number} - ${r.store?.name || 'Unknown'} (Sisa: ${formatCurrency(r.remaining_amount)})`,
  }));

  const handleAddItem = () => {
    setReturnItems([...returnItems, { product_name: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ReturnItem, value: string | number) => {
    const updated = [...returnItems];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].subtotal = updated[index].quantity * updated[index].unit_price;
    }
    setReturnItems(updated);
    const total = updated.reduce((sum, item) => sum + item.subtotal, 0);
    setAmount(total);
  };

  const resetForm = () => {
    setSelectedReceivableId('');
    setAmount(0);
    setReason('');
    setReturnItems([{ product_name: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const handleSubmit = () => {
    if (!selectedReceivableId || amount <= 0) return;
    const recv = receivables?.find(r => r.id === selectedReceivableId);
    if (!recv) return;

    createReturn.mutate({
      receivable_id: selectedReceivableId,
      store_id: recv.store_id,
      order_id: recv.order_id || undefined,
      amount,
      reason: reason || undefined,
      items: returnItems.filter(i => i.product_name && i.subtotal > 0),
    }, {
      onSuccess: () => {
        resetForm();
        setDialogOpen(false);
      },
    });
  };

  const filteredReturns = returns?.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.store?.name?.toLowerCase().includes(q) ||
      r.receivable?.invoice_number?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Retur Barang</h1>
          <p className="text-muted-foreground">Kelola pengembalian barang dan pemotongan piutang otomatis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Retur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Catat Retur Barang</DialogTitle>
              <DialogDescription>Pilih piutang dan masukkan detail barang yang diretur. Total retur akan otomatis memotong piutang.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Piutang (Invoice)</Label>
                <SearchableSelect
                  options={receivableOptions}
                  value={selectedReceivableId}
                  onValueChange={setSelectedReceivableId}
                  placeholder="Pilih piutang..."
                />
                {selectedReceivable && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                    Toko: <strong>{selectedReceivable.store?.name}</strong> | 
                    Total: {formatCurrency(selectedReceivable.total_amount)} | 
                    Sisa: {formatCurrency(selectedReceivable.remaining_amount)}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Item Retur</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-3 h-3 mr-1" /> Tambah Item
                  </Button>
                </div>
                {returnItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {index === 0 && <Label className="text-xs">Nama Produk</Label>}
                      <Input
                        placeholder="Nama produk"
                        value={item.product_name}
                        onChange={e => handleItemChange(index, 'product_name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs">Qty</Label>}
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3">
                      {index === 0 && <Label className="text-xs">Harga Satuan</Label>}
                      <CurrencyInput
                        value={item.unit_price}
                        onChange={v => handleItemChange(index, 'unit_price', v)}
                      />
                    </div>
                    <div className="col-span-2 text-sm font-medium text-right pt-2">
                      {formatCurrency(item.subtotal)}
                    </div>
                    <div className="col-span-1">
                      {returnItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Total Retur:</span>
                <span className="text-lg font-bold text-destructive">{formatCurrency(amount)}</span>
              </div>

              <div className="space-y-2">
                <Label>Alasan Retur</Label>
                <Textarea
                  placeholder="Masukkan alasan retur..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedReceivableId || amount <= 0 || createReturn.isPending}
              >
                {createReturn.isPending ? 'Menyimpan...' : 'Simpan Retur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Retur</p>
                <p className="text-2xl font-bold text-foreground">{returns?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nilai Retur</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(returns?.reduce((sum, r) => sum + Number(r.amount), 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retur Bulan Ini</p>
                <p className="text-2xl font-bold text-foreground">
                  {returns?.filter(r => {
                    const d = new Date(r.created_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Retur</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari retur..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filteredReturns?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada data retur</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead className="text-right">Nilai Retur</TableHead>
                  {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDateShort(r.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.receivable?.invoice_number || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.store?.name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.reason || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      -{formatCurrency(r.amount)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Retur?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Piutang akan dikembalikan sebesar {formatCurrency(r.amount)}. Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteReturn.mutate(r.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
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

export default Returns;
