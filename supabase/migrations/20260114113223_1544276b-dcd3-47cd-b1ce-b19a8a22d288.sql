-- Add is_active column to store_prices for price history tracking
ALTER TABLE public.store_prices 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create index for faster queries on active prices
CREATE INDEX idx_store_prices_active ON public.store_prices(store_id, product_id, is_active) WHERE is_active = true;