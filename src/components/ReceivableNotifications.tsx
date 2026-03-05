import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReceivables } from '@/hooks/useReceivables';
import { useStores } from '@/hooks/useStores';
import { Bell, AlertTriangle, Clock, X, AlertOctagon, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency } from '@/lib/formatters';
import { format, differenceInDays, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const generateReminderMessage = (storeName: string, invoiceNumber: string, amount: number, dueDate: string | null) => {
  const formattedAmount = formatCurrency(amount);
  const formattedDate = dueDate ? format(new Date(dueDate), 'dd/MM/yyyy', { locale: localeId }) : '-';
  return `Kepada Yth. ${storeName}\n\nDengan hormat,\n\nBersama ini kami sampaikan pengingat pembayaran piutang dengan rincian sebagai berikut:\n\nNomor Transaksi: ${invoiceNumber}\nJumlah Terutang: ${formattedAmount}\nTanggal Jatuh Tempo: ${formattedDate}\n\nPembayaran dapat dilakukan melalui transfer ke rekening berikut:\n- BRI: 592501013144533\n- BCA: 0982222221\n- BNI: 5557773731\nAtas nama: ANDRI EKA SETIAWAN\n\nKami mohon pembayaran dapat segera dilakukan sebelum tanggal jatuh tempo.\n\nAtas perhatian dan kerjasamanya, kami ucapkan terima kasih.\n\nHormat kami,\nCV. Manunggal Karya`;
};

const ReceivableNotifications = () => {
  const { data: receivables } = useReceivables();
  const { data: stores = [] } = useStores();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const today = new Date();
  const warningDays = 7;

  const notifications = (receivables || [])
    .filter((r) => r.status !== 'paid' && r.due_date && !dismissed.has(r.id))
    .map((r) => {
      const dueDate = new Date(r.due_date!);
      const daysUntilDue = differenceInDays(dueDate, today);
      const isOverdue = isPast(dueDate);
      const isNearDue = !isOverdue && daysUntilDue <= warningDays;
      const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0;
      const isCritical = isOverdue && daysOverdue > 30;

      if (!isOverdue && !isNearDue) return null;

      return {
        ...r,
        dueDate,
        daysUntilDue,
        isOverdue,
        isNearDue,
        daysOverdue,
        isCritical,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      invoice_number: string;
      remaining_amount: number;
      due_date: string;
      store_id: string;
      store?: { id: string; name: string };
      dueDate: Date;
      daysUntilDue: number;
      isOverdue: boolean;
      isNearDue: boolean;
      daysOverdue: number;
      isCritical: boolean;
    }>;

  const criticalItems = notifications.filter((n) => n.isCritical);
  const overdueItems = notifications.filter((n) => n.isOverdue && !n.isCritical);
  const nearDueItems = notifications.filter((n) => n.isNearDue);
  const totalCount = notifications.length;
  const criticalCount = criticalItems.length;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleSendWhatsApp = (n: typeof notifications[0]) => {
    const storeName = n.store?.name || 'Pelanggan';
    const storeWhatsapp = stores.find(s => s.id === n.store_id)?.whatsapp;
    const message = generateReminderMessage(storeName, n.invoice_number, Number(n.remaining_amount), n.due_date);
    const encodedMessage = encodeURIComponent(message);
    let phone = storeWhatsapp ? storeWhatsapp.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    } else if (phone && !phone.startsWith('62')) {
      phone = '62' + phone;
    }
    const url = phone ? `https://wa.me/${phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  if (totalCount === 0) return null;

  const renderItem = (n: typeof notifications[0]) => (
    <div key={n.id} className={`p-3 transition-colors ${n.isCritical ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {n.isCritical ? (
            <AlertOctagon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          ) : n.isOverdue ? (
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-4 w-4 text-chart-4 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{n.invoice_number}</p>
            <p className="text-xs text-muted-foreground truncate">{n.store?.name || 'Unknown'}</p>
            <p className="text-xs font-medium mt-1">Sisa: {formatCurrency(Number(n.remaining_amount))}</p>
            <p className={`text-xs mt-0.5 ${n.isCritical ? 'text-destructive font-bold' : n.isOverdue ? 'text-destructive font-medium' : 'text-chart-4'}`}>
              {n.isOverdue
                ? `Terlambat ${n.daysOverdue} hari`
                : `${n.daysUntilDue} hari lagi`}
              {' · '}
              {format(n.dueDate, 'dd MMM yyyy', { locale: localeId })}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {n.isOverdue && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary hover:text-primary"
              onClick={() => handleSendWhatsApp(n)}
              title="Kirim reminder WhatsApp"
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dismiss(n.id)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center ${criticalCount > 0 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-destructive text-destructive-foreground'}`}>
              {totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Reminder Piutang</h4>
          <div className="flex gap-1 flex-wrap">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertOctagon className="h-3 w-3" />
                {criticalCount} kritis
              </Badge>
            )}
            {overdueItems.length > 0 && (
              <Badge variant="destructive" className="text-xs">{overdueItems.length} jatuh tempo</Badge>
            )}
            {nearDueItems.length > 0 && (
              <Badge variant="secondary" className="text-xs">{nearDueItems.length} mendekati</Badge>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {criticalItems.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-destructive/10">
                <p className="text-xs font-bold text-destructive flex items-center gap-1">
                  <AlertOctagon className="h-3 w-3" /> KRITIS — Overdue &gt; 30 Hari
                </p>
              </div>
              <div className="divide-y">{criticalItems.sort((a, b) => b.daysOverdue - a.daysOverdue).map(renderItem)}</div>
              {(overdueItems.length > 0 || nearDueItems.length > 0) && <Separator />}
            </>
          )}
          {overdueItems.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-muted/50">
                <p className="text-xs font-semibold text-destructive">Jatuh Tempo</p>
              </div>
              <div className="divide-y">{overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue).map(renderItem)}</div>
              {nearDueItems.length > 0 && <Separator />}
            </>
          )}
          {nearDueItems.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-muted/50">
                <p className="text-xs font-semibold text-chart-4">Mendekati Jatuh Tempo</p>
              </div>
              <div className="divide-y">{nearDueItems.sort((a, b) => a.daysUntilDue - b.daysUntilDue).map(renderItem)}</div>
            </>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Link to="/receivables">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Lihat semua piutang
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReceivableNotifications;
