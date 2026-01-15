import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BackupSummary {
  stores: number;
  products: number;
  orders: number;
  orderItems: number;
  storePrices: number;
  profiles: number;
  salesTargets: number;
  activityLogs: number;
  lastUpdated: string | null;
}

export interface BackupData {
  stores: any[];
  products: any[];
  orders: any[];
  order_items: any[];
  store_prices: any[];
  sales_targets: any[];
  exported_at: string;
  version: string;
}

export const useBackupSummary = () => {
  return useQuery({
    queryKey: ['backup-summary'],
    queryFn: async (): Promise<BackupSummary> => {
      const [
        storesRes,
        productsRes,
        ordersRes,
        orderItemsRes,
        storePricesRes,
        profilesRes,
        salesTargetsRes,
        activityLogsRes,
        lastOrderRes
      ] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('order_items').select('id', { count: 'exact', head: true }),
        supabase.from('store_prices').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('sales_targets').select('id', { count: 'exact', head: true }),
        supabase.from('activity_logs').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('updated_at').order('updated_at', { ascending: false }).limit(1)
      ]);

      return {
        stores: storesRes.count || 0,
        products: productsRes.count || 0,
        orders: ordersRes.count || 0,
        orderItems: orderItemsRes.count || 0,
        storePrices: storePricesRes.count || 0,
        profiles: profilesRes.count || 0,
        salesTargets: salesTargetsRes.count || 0,
        activityLogs: activityLogsRes.count || 0,
        lastUpdated: lastOrderRes.data?.[0]?.updated_at || null
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

export const useExportBackup = () => {
  const exportAllData = async (): Promise<BackupData> => {
    const [
      storesRes,
      productsRes,
      ordersRes,
      orderItemsRes,
      storePricesRes,
      salesTargetsRes
    ] = await Promise.all([
      supabase.from('stores').select('*'),
      supabase.from('products').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('order_items').select('*'),
      supabase.from('store_prices').select('*'),
      supabase.from('sales_targets').select('*')
    ]);

    return {
      stores: storesRes.data || [],
      products: productsRes.data || [],
      orders: ordersRes.data || [],
      order_items: orderItemsRes.data || [],
      store_prices: storePricesRes.data || [],
      sales_targets: salesTargetsRes.data || [],
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
  };

  return { exportAllData };
};
