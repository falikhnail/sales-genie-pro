
-- Create returns table
CREATE TABLE public.returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receivable_id uuid NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  order_id uuid REFERENCES public.orders(id),
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  items jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view returns" ON public.returns FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert returns" ON public.returns FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Admin can delete returns" ON public.returns FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-deduct receivable when return is created
CREATE OR REPLACE FUNCTION public.deduct_receivable_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.receivables
  SET 
    total_amount = total_amount - NEW.amount,
    remaining_amount = remaining_amount - NEW.amount,
    status = CASE 
      WHEN (remaining_amount - NEW.amount) <= 0 THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = NEW.receivable_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_return_created
  AFTER INSERT ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_receivable_on_return();

-- Trigger to restore receivable when return is deleted
CREATE OR REPLACE FUNCTION public.restore_receivable_on_return_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.receivables
  SET 
    total_amount = total_amount + OLD.amount,
    remaining_amount = remaining_amount + OLD.amount,
    status = CASE 
      WHEN (remaining_amount + OLD.amount) <= 0 THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = OLD.receivable_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_return_deleted
  AFTER DELETE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_receivable_on_return_delete();

-- Updated at trigger
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
