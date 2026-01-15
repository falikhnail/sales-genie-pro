-- Remove unique constraint to allow price history
ALTER TABLE public.store_prices 
DROP CONSTRAINT store_prices_store_id_product_id_key;