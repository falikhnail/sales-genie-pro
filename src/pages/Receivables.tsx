import { useState, useMemo } from 'react';
import { useReceivables, useStoreSummary, useCreateReceivable, useAddPayment, usePayments, useDeleteReceivable } from '@/hooks/useReceivables';
import { useStores } from '@/hooks/useStores';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Wallet, AlertCircle, CheckCircle, Clock, Store, CreditCard, Eye, Trash2, MessageCircle, Search, AlertOctagon, FileText } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

const generateReminderMessage = (storeName: string, invoiceNumber: string, amount: number, dueDate: string | null) => {
  const formattedAmount = formatCurrency(amount);
  const formattedDate = dueDate ? format(new Date(dueDate), 'dd/MM/yyyy', { locale: localeId }) : '-';
  return `Kepada Yth. ${storeName}\n\nDengan hormat,\n\nBersama ini kami sampaikan pengingat pembayaran piutang dengan rincian sebagai berikut:\n\nNomor Transaksi: ${invoiceNumber}\nJumlah Terutang: ${formattedAmount}\nTanggal Jatuh Tempo: ${formattedDate}\n\nPembayaran dapat dilakukan melalui transfer ke rekening berikut:\n- BRI: 592501013144533\n- BCA: 0982222221\n- BNI: 5557773731\nAtas nama: ANDRI EKA SETIAWAN\n\nKami mohon pembayaran dapat segera dilakukan sebelum tanggal jatuh tempo.\n\nAtas perhatian dan kerjasamanya, kami ucapkan terima kasih.\n\nHormat kami,\nCV. Manunggal Karya`;
};

const Receivables = () => {
  const { data: receivables = [], isLoading } = useReceivables();
  const { data: storeSummary = [] } = useStoreSummary();
  const { data: stores = [] } = useStores();
  const createReceivable = useCreateReceivable();
  const addPayment = useAddPayment();
  const deleteReceivable = useDeleteReceivable();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newStoreId, setNewStoreId] = useState('');
  const [newAmount, setNewAmount] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');

  const today = new Date();

  // Critical overdue (>30 days)
  const criticalReceivables = useMemo(() => {
    return receivables.filter((r) => {
      if (r.status === 'paid' || !r.due_date) return false;
      const daysOverdue = differenceInDays(today, new Date(r.due_date));
      return daysOverdue > 30;
    });
  }, [receivables]);

  const criticalTotal = criticalReceivables.reduce((sum, r) => sum + Number(r.remaining_amount), 0);

  const filteredReceivables = receivables.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterStore !== 'all' && r.store_id !== filterStore) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchInvoice = r.invoice_number.toLowerCase().includes(q);
      const matchStore = r.store?.name?.toLowerCase().includes(q);
      if (!matchInvoice && !matchStore) return false;
    }
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

  const handleDeleteReceivable = () => {
    if (!selectedReceivable) return;
    deleteReceivable.mutate(selectedReceivable, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setSelectedReceivable(null);
      },
    });
  };

  const handleSendReminder = (receivable: any) => {
    const storeName = receivable.store?.name || 'Pelanggan';
    const storeWhatsapp = stores.find(s => s.id === receivable.store_id)?.whatsapp;
    const message = generateReminderMessage(storeName, receivable.invoice_number, Number(receivable.remaining_amount), receivable.due_date);
    const encodedMessage = encodeURIComponent(message);
    const phone = storeWhatsapp ? storeWhatsapp.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const openPaymentDialog = (receivableId: string) => { setSelectedReceivable(receivableId); setShowPaymentDialog(true); };
  const openDetailDialog = (receivableId: string) => { setSelectedReceivable(receivableId); setShowDetailDialog(true); };
  const openDeleteDialog = (receivableId: string) => { setSelectedReceivable(receivableId); setShowDeleteDialog(true); };

  const selectedReceivableData = receivables.find((r) => r.id === selectedReceivable);

  const getRowOverdueInfo = (r: any) => {
    if (r.status === 'paid' || !r.due_date) return { isOverdue: false, isCritical: false, daysOverdue: 0 };
    const daysOverdue = differenceInDays(today, new Date(r.due_date));
    return { isOverdue: daysOverdue > 0, isCritical: daysOverdue > 30, daysOverdue };
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
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
                      {stores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
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
                <Button onClick={handleCreateReceivable} disabled={!newStoreId || newAmount <= 0} className="w-full">Simpan Piutang</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Critical Alert Banner */}
        {criticalReceivables.length > 0 && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertOctagon className="h-4 w-4" />
            <AlertTitle className="font-bold">Peringatan: Piutang Kritis!</AlertTitle>
            <AlertDescription>
              Terdapat <span className="font-bold">{criticalReceivables.length} piutang</span> yang sudah jatuh tempo lebih dari 30 hari
              dengan total <span className="font-bold">{formatCurrency(criticalTotal)}</span>. Segera lakukan penagihan.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10"><Wallet className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Piutang</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent"><CreditCard className="w-5 h-5 text-accent-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Sudah Dibayar</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10"><AlertCircle className="w-5 h-5 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Sisa Piutang</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalRemaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-secondary"><Clock className="w-5 h-5 text-secondary-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Belum Lunas</p>
                  <p className="text-lg font-bold text-foreground">{unpaidCount} piutang</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`hover:shadow-md transition-shadow ${criticalReceivables.length > 0 ? 'border-destructive/30 bg-destructive/5' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/20"><AlertOctagon className="w-5 h-5 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Kritis (&gt;30hr)</p>
                  <p className="text-lg font-bold text-destructive">{criticalReceivables.length} piutang</p>
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
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari invoice atau toko..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="unpaid">Belum Bayar</SelectItem>
                  <SelectItem value="partial">Sebagian</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStore} onValueChange={setFilterStore}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Toko" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Toko</SelectItem>
                  {stores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
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
                      <TableHead>Progress</TableHead>
                      <TableHead>Sisa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Memuat data...</TableCell></TableRow>
                    ) : filteredReceivables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-10 w-10 text-muted-foreground/40" />
                            <p className="text-muted-foreground font-medium">Tidak ada data piutang</p>
                            <p className="text-xs text-muted-foreground">Tambahkan piutang baru untuk mulai mengelola tagihan</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReceivables.map((r) => {
                        const config = statusConfig[r.status] || statusConfig.unpaid;
                        const StatusIcon = config.icon;
                        const { isOverdue, isCritical, daysOverdue } = getRowOverdueInfo(r);
                        const paidPercent = Number(r.total_amount) > 0 ? (Number(r.paid_amount) / Number(r.total_amount)) * 100 : 0;

                        return (
                          <TableRow
                            key={r.id}
                            className={isCritical ? 'bg-destructive/8 hover:bg-destructive/12' : isOverdue ? 'bg-destructive/4 hover:bg-destructive/8' : ''}
                          >
                            <TableCell className="font-mono text-sm">{r.invoice_number}</TableCell>
                            <TableCell className="font-medium">{r.store?.name || '-'}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(Number(r.total_amount))}</TableCell>
                            <TableCell>
                              <div className="w-20">
                                <Progress value={paidPercent} className="h-2" />
                                <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(paidPercent)}%</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(Number(r.remaining_amount))}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={config.variant} className="gap-1 w-fit">
                                  <StatusIcon className="w-3 h-3" />
                                  {config.label}
                                </Badge>
                                {isCritical && (
                                  <Badge variant="destructive" className="text-[10px] gap-1 w-fit">
                                    <AlertOctagon className="w-2.5 h-2.5" />
                                    {daysOverdue}hr terlambat
                                  </Badge>
                                )}
                                {isOverdue && !isCritical && (
                                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 w-fit">
                                    {daysOverdue}hr terlambat
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{r.due_date ? formatDateShort(r.due_date) : '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => openDetailDialog(r.id)}><Eye className="w-3 h-3" /></Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Detail</TooltipContent>
                                </Tooltip>
                                {r.status !== 'paid' && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button size="sm" onClick={() => openPaymentDialog(r.id)}><CreditCard className="w-3 h-3" /></Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Catat Pembayaran</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button size="sm" variant="outline" onClick={() => handleSendReminder(r)} className="text-primary hover:text-primary">
                                          <MessageCircle className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Kirim Reminder WhatsApp</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => openDeleteDialog(r.id)} className="text-destructive hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Hapus</TooltipContent>
                                </Tooltip>
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
              {storeSummary.map((s) => {
                const storeReceivables = receivables.filter(r => r.store_id === s.store_id);
                const overdueCount = storeReceivables.filter(r => {
                  if (r.status === 'paid' || !r.due_date) return false;
                  return differenceInDays(today, new Date(r.due_date)) > 0;
                }).length;
                const paidPercent = s.total_amount > 0 ? (s.paid_amount / s.total_amount) * 100 : 0;

                return (
                  <Card key={s.store_id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10"><Store className="w-4 h-4 text-primary" /></div>
                          {s.store_name}
                        </span>
                        {overdueCount > 0 && (
                          <Badge variant="destructive" className="text-[10px]">{overdueCount} overdue</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
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
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>{s.total_receivables} piutang total</span>
                          <span>{Math.round(paidPercent)}% terbayar</span>
                        </div>
                        <Progress value={paidPercent} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {storeSummary.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Store className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">Belum ada data piutang</p>
                    </div>
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
                <Card className="bg-accent/30 border-0">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Sisa piutang</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(Number(selectedReceivableData.remaining_amount))}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedReceivableData.invoice_number} — {selectedReceivableData.store?.name}</p>
                    <Progress value={Number(selectedReceivableData.total_amount) > 0 ? (Number(selectedReceivableData.paid_amount) / Number(selectedReceivableData.total_amount)) * 100 : 0} className="h-1.5 mt-2" />
                  </CardContent>
                </Card>
                <div>
                  <Label>Jumlah Bayar</Label>
                  <CurrencyInput value={payAmount} onChange={setPayAmount} placeholder="0" />
                </div>
                <div>
                  <Label>Metode Pembayaran</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catatan (opsional)</Label>
                  <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Catatan pembayaran..." />
                </div>
                <Button onClick={handleAddPayment} disabled={payAmount <= 0} className="w-full">Simpan Pembayaran</Button>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Piutang</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus piutang{' '}
                <span className="font-semibold">{selectedReceivableData?.invoice_number}</span>?
                Semua data pembayaran terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteReceivable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

const ReceivableDetail = ({ receivable }: { receivable: any }) => {
  const { data: payments = [], isLoading } = usePayments(receivable.id);
  const paidPercent = Number(receivable.total_amount) > 0 ? (Number(receivable.paid_amount) / Number(receivable.total_amount)) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="bg-muted/30 border-0">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Invoice</p>
              <p className="font-mono font-medium">{receivable.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toko</p>
              <p className="font-medium">{receivable.store?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-medium">{formatCurrency(Number(receivable.total_amount))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sisa</p>
              <p className="font-bold text-destructive">{formatCurrency(Number(receivable.remaining_amount))}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress pembayaran</span>
              <span>{Math.round(paidPercent)}%</span>
            </div>
            <Progress value={paidPercent} className="h-2" />
          </div>
          {receivable.order && (
            <div className="text-sm"><span className="text-muted-foreground">Order:</span> <span className="font-mono">{receivable.order.order_number}</span></div>
          )}
          {receivable.due_date && (
            <div className="text-sm"><span className="text-muted-foreground">Jatuh Tempo:</span> {formatDateShort(receivable.due_date)}</div>
          )}
          {receivable.notes && (
            <div className="text-sm"><span className="text-muted-foreground">Catatan:</span> {receivable.notes}</div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <div>
        <h4 className="font-semibold text-sm mb-2">Riwayat Pembayaran</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : payments.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada pembayaran</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="bg-accent/20 border-0">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{formatCurrency(Number(p.amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {paymentMethods.find((m) => m.value === p.payment_method)?.label || p.payment_method}
                      {p.notes && ` — ${p.notes}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateShort(p.payment_date)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Receivables;
