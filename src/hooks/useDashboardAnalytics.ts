import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export const useMonthlySalesTrend = () => {
  return useQuery({
    queryKey: ['analytics', 'monthly-sales-trend'],
    queryFn: async () => {
      const now = new Date();
      const months: { label: string; start: Date; end: Date }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({
          label: format(d, 'MMM yy', { locale: localeId }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', months[0].start.toISOString())
        .lte('created_at', months[months.length - 1].end.toISOString());

      if (error) throw error;

      return months.map((m) => {
        const monthOrders = (data || []).filter((o) => {
          const d = new Date(o.created_at);
          return d >= m.start && d <= m.end;
        });
        return {
          month: m.label,
          penjualan: monthOrders.reduce((s, o) => s + Number(o.total_amount), 0),
          jumlahOrder: monthOrders.length,
        };
      });
    },
  });
};

export const useMonthlyReceivablesTrend = () => {
  return useQuery({
    queryKey: ['analytics', 'monthly-receivables-trend'],
    queryFn: async () => {
      const now = new Date();
      const months: { label: string; start: Date; end: Date }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({
          label: format(d, 'MMM yy', { locale: localeId }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }

      const { data, error } = await supabase
        .from('receivables')
        .select('total_amount, paid_amount, remaining_amount, created_at');

      if (error) throw error;

      return months.map((m) => {
        const monthData = (data || []).filter((r) => {
          const d = new Date(r.created_at);
          return d >= m.start && d <= m.end;
        });
        return {
          month: m.label,
          totalPiutang: monthData.reduce((s, r) => s + Number(r.total_amount), 0),
          terbayar: monthData.reduce((s, r) => s + Number(r.paid_amount), 0),
          outstanding: monthData.reduce((s, r) => s + Number(r.remaining_amount), 0),
        };
      });
    },
  });
};

export const useTopStoresByReceivables = () => {
  return useQuery({
    queryKey: ['analytics', 'top-stores-receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('store_id, remaining_amount, status, store:stores(name)')
        .neq('status', 'paid');

      if (error) throw error;

      const storeMap = new Map<string, { name: string; outstanding: number }>();

      (data || []).forEach((r: any) => {
        const existing = storeMap.get(r.store_id);
        const name = r.store?.name || 'Unknown';
        if (existing) {
          existing.outstanding += Number(r.remaining_amount);
        } else {
          storeMap.set(r.store_id, { name, outstanding: Number(r.remaining_amount) });
        }
      });

      return Array.from(storeMap.values())
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 5);
    },
  });
};
