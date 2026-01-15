import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceComparisonData {
  productId: string;
  productName: string;
  productSku: string | null;
  defaultPrice: number;
  storePrices: {
    storeId: string;
    storeName: string;
    customPrice: number;
    isActive: boolean;
    priceDiff: number; // percentage difference from default
  }[];
}

export const usePriceComparisonData = (productIds?: string[]) => {
  return useQuery({
    queryKey: ['price_comparison', productIds],
    queryFn: async () => {
      // Fetch all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (productsError) throw productsError;

      // Fetch all active store prices with store info
      const { data: storePrices, error: pricesError } = await supabase
        .from('store_prices')
        .select(`
          *,
          store:stores (id, name)
        `)
        .eq('is_active', true);
      
      if (pricesError) throw pricesError;

      // Fetch all stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');
      
      if (storesError) throw storesError;

      // Build comparison data
      const comparisonData: PriceComparisonData[] = products.map(product => {
        const productPrices = storePrices.filter(sp => sp.product_id === product.id);
        
        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          defaultPrice: Number(product.default_price),
          storePrices: productPrices.map(sp => ({
            storeId: sp.store_id,
            storeName: (sp.store as any)?.name || 'Unknown',
            customPrice: Number(sp.custom_price),
            isActive: sp.is_active,
            priceDiff: product.default_price > 0 
              ? ((Number(sp.custom_price) - Number(product.default_price)) / Number(product.default_price)) * 100
              : 0,
          })),
        };
      }).filter(p => p.storePrices.length > 0);

      return { comparisonData, stores };
    },
  });
};

export const useProductPricesByStore = (productId: string) => {
  return useQuery({
    queryKey: ['product_prices_by_store', productId],
    queryFn: async () => {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;

      const { data: storePrices, error: pricesError } = await supabase
        .from('store_prices')
        .select(`
          *,
          store:stores (id, name)
        `)
        .eq('product_id', productId)
        .eq('is_active', true);
      
      if (pricesError) throw pricesError;

      return {
        product,
        storePrices: storePrices.map(sp => ({
          storeId: sp.store_id,
          storeName: (sp.store as any)?.name || 'Unknown',
          customPrice: Number(sp.custom_price),
          defaultPrice: Number(product.default_price),
          priceDiff: product.default_price > 0
            ? ((Number(sp.custom_price) - Number(product.default_price)) / Number(product.default_price)) * 100
            : 0,
        })),
      };
    },
    enabled: !!productId,
  });
};
