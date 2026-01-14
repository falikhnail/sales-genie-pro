import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StorePrice } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Get active prices only for a store
export const useActiveStorePrices = (storeId?: string) => {
  return useQuery({
    queryKey: ['store_prices', 'active', storeId],
    queryFn: async () => {
      let query = supabase
        .from('store_prices')
        .select('*')
        .eq('is_active', true);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StorePrice[];
    },
    enabled: storeId !== undefined,
  });
};

// Get all prices (including history) for a store
export const useStorePrices = (storeId?: string) => {
  return useQuery({
    queryKey: ['store_prices', storeId],
    queryFn: async () => {
      let query = supabase.from('store_prices').select('*');
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StorePrice[];
    },
    enabled: storeId !== undefined,
  });
};

// Get price history for all stores with product info
export const usePriceHistory = (storeId?: string) => {
  return useQuery({
    queryKey: ['price_history', storeId],
    queryFn: async () => {
      let query = supabase
        .from('store_prices')
        .select(`
          *,
          product:products (*),
          store:stores (*)
        `)
        .order('created_at', { ascending: false });
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

export const useStorePricesWithProducts = (storeId: string) => {
  return useQuery({
    queryKey: ['store_prices_with_products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_prices')
        .select(`
          *,
          products:product_id (*)
        `)
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
};

// Get all custom prices for a product in a store (for dropdown selection)
export const useProductCustomPrices = (storeId: string, productId: string) => {
  return useQuery({
    queryKey: ['product_custom_prices', storeId, productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_prices')
        .select('*')
        .eq('store_id', storeId)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StorePrice[];
    },
    enabled: !!storeId && !!productId,
  });
};

export const useUpsertStorePrice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ store_id, product_id, custom_price }: Omit<StorePrice, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      // Deactivate any existing active price for this store/product combination
      await supabase
        .from('store_prices')
        .update({ is_active: false })
        .eq('store_id', store_id)
        .eq('product_id', product_id)
        .eq('is_active', true);

      // Insert new price as active
      const { data, error } = await supabase
        .from('store_prices')
        .insert({ store_id, product_id, custom_price, is_active: true })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_prices'] });
      queryClient.invalidateQueries({ queryKey: ['store_prices_with_products'] });
      queryClient.invalidateQueries({ queryKey: ['price_history'] });
      queryClient.invalidateQueries({ queryKey: ['product_custom_prices'] });
      toast({ title: 'Berhasil', description: 'Harga khusus berhasil disimpan' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

// Set an existing price as active (from history)
export const useSetActivePrice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, store_id, product_id }: { id: string; store_id: string; product_id: string }) => {
      // Deactivate current active price
      await supabase
        .from('store_prices')
        .update({ is_active: false })
        .eq('store_id', store_id)
        .eq('product_id', product_id)
        .eq('is_active', true);

      // Activate the selected price
      const { data, error } = await supabase
        .from('store_prices')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_prices'] });
      queryClient.invalidateQueries({ queryKey: ['store_prices_with_products'] });
      queryClient.invalidateQueries({ queryKey: ['price_history'] });
      queryClient.invalidateQueries({ queryKey: ['product_custom_prices'] });
      toast({ title: 'Berhasil', description: 'Harga berhasil diaktifkan' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteStorePrice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_prices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_prices'] });
      queryClient.invalidateQueries({ queryKey: ['store_prices_with_products'] });
      queryClient.invalidateQueries({ queryKey: ['price_history'] });
      queryClient.invalidateQueries({ queryKey: ['product_custom_prices'] });
      toast({ title: 'Berhasil', description: 'Harga khusus berhasil dihapus' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
