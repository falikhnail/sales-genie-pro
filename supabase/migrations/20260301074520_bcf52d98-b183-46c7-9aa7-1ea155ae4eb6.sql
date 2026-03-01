
-- Drop existing triggers to recreate them properly
DROP TRIGGER IF EXISTS trigger_create_receivable_from_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_receivable_on_payment ON public.payments;
DROP TRIGGER IF EXISTS trigger_update_receivable_on_payment_delete ON public.payments;
DROP TRIGGER IF EXISTS trigger_delete_receivable_on_order_delete ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_receivable_on_order_update ON public.orders;

-- Recreate all triggers
CREATE TRIGGER trigger_create_receivable_from_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_receivable_from_order();

CREATE TRIGGER trigger_update_receivable_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receivable_on_payment();

CREATE TRIGGER trigger_update_receivable_on_payment_delete
  AFTER DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receivable_on_payment_delete();

-- Delete receivable when order deleted
CREATE OR REPLACE FUNCTION public.delete_receivable_on_order_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.payments WHERE receivable_id IN (
    SELECT id FROM public.receivables WHERE order_id = OLD.id
  );
  DELETE FROM public.receivables WHERE order_id = OLD.id;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trigger_delete_receivable_on_order_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_receivable_on_order_delete();

-- Update receivable when order amount changes
CREATE OR REPLACE FUNCTION public.update_receivable_on_order_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    UPDATE public.receivables
    SET 
      total_amount = NEW.total_amount,
      remaining_amount = NEW.total_amount - paid_amount,
      status = CASE 
        WHEN NEW.total_amount <= paid_amount THEN 'paid'
        WHEN paid_amount > 0 THEN 'partial'
        ELSE 'unpaid'
      END
    WHERE order_id = OLD.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_receivable_on_order_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receivable_on_order_update();
