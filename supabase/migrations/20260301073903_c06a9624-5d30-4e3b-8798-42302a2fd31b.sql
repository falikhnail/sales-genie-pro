
-- Trigger to auto-create receivable when a new order is inserted
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv_number TEXT;
  counter INTEGER;
BEGIN
  -- Generate invoice number
  SELECT COUNT(*) + 1 INTO counter FROM public.receivables 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  inv_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');

  INSERT INTO public.receivables (
    order_id,
    store_id,
    invoice_number,
    total_amount,
    remaining_amount,
    created_by,
    notes
  ) VALUES (
    NEW.id,
    NEW.store_id,
    inv_number,
    NEW.total_amount,
    NEW.total_amount,
    NEW.sales_user_id,
    'Auto-generated from order ' || NEW.order_number
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_create_receivable_from_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_receivable_from_order();
