import { useState } from 'react';
import { useReceivables, useStoreSummary, useCreateReceivable, useAddPayment, usePayments } from '@/hooks/useReceivables';
import { useStores } from '@/hooks/useStores';
import { formatCurrency, formatDateShort, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Wallet, AlertCircle, CheckCircle, Clock, Store, CreditCard, Eye } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  unpaid: { label: 'Belum Bayar', variant: 'destructive', icon: AlertCircle },
  partial: { label: 'Sebagian', variant: 'secondary', icon: Clock },
  paid: { label: 'Lunas', variant: 'default', icon: CheckCircle },
};

const paymentMethods = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'giro', label: 'Giro' },
  { value: 'other', label: 'Lainnya' },
];

const Receivables = () => {
  const { data: receivables = [], isLoading } = useReceivables();
  const { data: storeSummary = [] } = useStoreSummary();
  const { data: stores = [] } = useStores();
  const createReceivable = useCreateReceivable();
  const addPayment = useAddPayment();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');

  // Form states
  const [newStoreId, setNewStoreId] = useState('');
  const [newAmount, setNewAmount] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');

  const filteredReceivables = receivables.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterStore !== 'all' && r.store_id !== filterStore) return false;
    return true;
  });

  const totalRemaining = receivables.reduce((sum, r) => sum + Number(r.remaining_amount), 0);
  const totalPaid = receivables.reduce((sum, r) => sum + Number(r.paid_amount), 0);
  const totalAmount = receivables.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const unpaidCount = receivables.filter((r) => r.status !== 'paid').length;

  const handleCreateReceivable = () => {
    if (!newStoreId || newAmount <= 0) return;
    createReceivable.mutate(
      { store_id: newStoreId, total_amount: newAmount, due_date: newDueDate || undefined, notes: newNotes || undefined },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setNewStoreId('');
          setNewAmount(0);
          setNewDueDate('');
          setNewNotes('');
        },
      }
    );
  };

  const handleAddPayment = () => {
    if (!selectedReceivable || payAmount <= 0) return;
    addPayment.mutate(
      { receivable_id: selectedReceivable, amount: payAmount, payment_method: payMethod, notes: payNotes || undefined },
      {
        onSuccess: () => {
          setShowPaymentDialog(false);
          setPayAmount(0);
          setPayMethod('cash');
          setPayNotes('');
        },
      }
    );
  };

  const openPaymentDialog = (receivableId: string) => {
    setSelectedReceivable(receivableId);
    setShowPaymentDialog(true);
  };

  const openDetailDialog = (receivableId: string) => {
    setSelectedReceivable(receivableId);
    setShowDetailDialog(true);
  };

  const selectedReceivableData = receivables.find((r) => r.id === selectedReceivable);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Piutang</h1>
          <p className="text-muted-foreground">Kelola piutang dan pembayaran per toko</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Tambah Piutang</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Piutang Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Toko</Label>
                <Select value={newStoreId} onValueChange={setNewStoreId}>
                  <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah Piutang</Label>
                <CurrencyInput value={newAmount} onChange={setNewAmount} placeholder="0" />
              </div>
              <div>
                <Label>Jatuh Tempo (opsional)</Label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Catatan piutang..." />
              </div>
              <Button onClick={handleCreateReceivable} disabled={!newStoreId || newAmount <= 0} className="w-full">
                Simpan Piutang
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Wallet className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Piutang</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent"><CreditCard className="w-5 h-5 text-accent-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Sisa Piutang</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10"><Clock className="w-5 h-5 text-secondary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Belum Lunas</p>
                <p className="text-xl font-bold text-foreground">{unpaidCount} piutang</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Daftar Piutang</TabsTrigger>
          <TabsTrigger value="stores">Ringkasan per Toko</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="unpaid">Belum Bayar</SelectItem>
                <SelectItem value="partial">Sebagian</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStore} onValueChange={setFilterStore}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter toko" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Toko</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Dibayar</TableHead>
                    <TableHead>Sisa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
                  ) : filteredReceivables.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data piutang</TableCell></TableRow>
                  ) : (
                    filteredReceivables.map((r) => {
                      const config = statusConfig[r.status] || statusConfig.unpaid;
                      const StatusIcon = config.icon;
                      const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status !== 'paid';
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm">{r.invoice_number}</TableCell>
                          <TableCell className="font-medium">{r.store?.name || '-'}</TableCell>
                          <TableCell>{formatCurrency(Number(r.total_amount))}</TableCell>
                          <TableCell>{formatCurrency(Number(r.paid_amount))}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(Number(r.remaining_amount))}</TableCell>
                          <TableCell>
                            <Badge variant={config.variant} className="gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="ml-1 text-xs">Jatuh Tempo</Badge>
                            )}
                          </TableCell>
                          <TableCell>{r.due_date ? formatDateShort(r.due_date) : '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => openDetailDialog(r.id)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              {r.status !== 'paid' && (
                                <Button size="sm" onClick={() => openPaymentDialog(r.id)}>
                                  <CreditCard className="w-3 h-3 mr-1" /> Bayar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeSummary.map((s) => (
              <Card key={s.store_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="w-4 h-4" /> {s.store_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Piutang</span>
                    <span className="font-medium">{formatCurrency(s.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sudah Dibayar</span>
                    <span className="font-medium text-primary">{formatCurrency(s.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sisa Hutang</span>
                    <span className="font-bold text-destructive">{formatCurrency(s.remaining_amount)}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{s.total_receivables} piutang total</span>
                      <span>{s.unpaid_count} belum lunas</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: s.total_amount > 0 ? `${(s.paid_amount / s.total_amount) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {storeSummary.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Belum ada data piutang
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
          {selectedReceivableData && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-sm text-muted-foreground">Sisa piutang</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(Number(selectedReceivableData.remaining_amount))}</p>
                <p className="text-xs text-muted-foreground">{selectedReceivableData.invoice_number} — {selectedReceivableData.store?.name}</p>
              </div>
              <div>
                <Label>Jumlah Bayar</Label>
                <CurrencyInput value={payAmount} onChange={setPayAmount} placeholder="0" />
              </div>
              <div>
                <Label>Metode Pembayaran</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Catatan pembayaran..." />
              </div>
              <Button onClick={handleAddPayment} disabled={payAmount <= 0} className="w-full">
                Simpan Pembayaran
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Piutang</DialogTitle></DialogHeader>
          {selectedReceivableData && (
            <ReceivableDetail receivable={selectedReceivableData} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ReceivableDetail = ({ receivable }: { receivable: any }) => {
  const { data: payments = [], isLoading } = usePayments(receivable.id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Invoice:</span> <span className="font-mono">{receivable.invoice_number}</span></div>
        <div><span className="text-muted-foreground">Toko:</span> <span className="font-medium">{receivable.store?.name}</span></div>
        <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{formatCurrency(Number(receivable.total_amount))}</span></div>
        <div><span className="text-muted-foreground">Sisa:</span> <span className="font-bold text-destructive">{formatCurrency(Number(receivable.remaining_amount))}</span></div>
        {receivable.order && (
          <div className="col-span-2"><span className="text-muted-foreground">Order:</span> <span className="font-mono">{receivable.order.order_number}</span></div>
        )}
        {receivable.due_date && (
          <div className="col-span-2"><span className="text-muted-foreground">Jatuh Tempo:</span> {formatDateShort(receivable.due_date)}</div>
        )}
        {receivable.notes && (
          <div className="col-span-2"><span className="text-muted-foreground">Catatan:</span> {receivable.notes}</div>
        )}
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Riwayat Pembayaran</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pembayaran</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/30 text-sm">
                <div>
                  <p className="font-medium">{formatCurrency(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground">
                    {paymentMethods.find((m) => m.value === p.payment_method)?.label || p.payment_method}
                    {p.notes && ` — ${p.notes}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateShort(p.payment_date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const paymentMethods2 = paymentMethods; // reuse for detail

export default Receivables;
