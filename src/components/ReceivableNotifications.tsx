import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReceivables } from '@/hooks/useReceivables';
import { Bell, AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency } from '@/lib/formatters';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

const ReceivableNotifications = () => {
  const { data: receivables } = useReceivables();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const today = new Date();
  const warningDays = 7; // Warn 7 days before due

  const notifications = (receivables || [])
    .filter((r) => r.status !== 'paid' && r.due_date && !dismissed.has(r.id))
    .map((r) => {
      const dueDate = new Date(r.due_date!);
      const daysUntilDue = differenceInDays(dueDate, today);
      const isOverdue = isPast(dueDate);
      const isNearDue = !isOverdue && daysUntilDue <= warningDays;

      if (!isOverdue && !isNearDue) return null;

      return {
        ...r,
        dueDate,
        daysUntilDue,
        isOverdue,
        isNearDue,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      invoice_number: string;
      remaining_amount: number;
      due_date: string;
      store?: { id: string; name: string };
      dueDate: Date;
      daysUntilDue: number;
      isOverdue: boolean;
      isNearDue: boolean;
    }>;

  const overdueCount = notifications.filter((n) => n.isOverdue).length;
  const nearDueCount = notifications.filter((n) => n.isNearDue).length;
  const totalCount = notifications.length;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  if (totalCount === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Reminder Piutang</h4>
          <div className="flex gap-1">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">{overdueCount} jatuh tempo</Badge>
            )}
            {nearDueCount > 0 && (
              <Badge variant="secondary" className="text-xs">{nearDueCount} mendekati</Badge>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          <div className="divide-y">
            {notifications
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
              .map((n) => (
                <div key={n.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {n.isOverdue ? (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="h-4 w-4 text-chart-4 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{n.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {n.store?.name || 'Unknown'}
                        </p>
                        <p className="text-xs font-medium mt-1">
                          Sisa: {formatCurrency(Number(n.remaining_amount))}
                        </p>
                        <p className={`text-xs mt-0.5 ${n.isOverdue ? 'text-destructive font-medium' : 'text-chart-4'}`}>
                          {n.isOverdue
                            ? `Terlambat ${Math.abs(n.daysUntilDue)} hari`
                            : `${n.daysUntilDue} hari lagi`}
                          {' · '}
                          {format(n.dueDate, 'dd MMM yyyy', { locale: localeId })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => dismiss(n.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
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
