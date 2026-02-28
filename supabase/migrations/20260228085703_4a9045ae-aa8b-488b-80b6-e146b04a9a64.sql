
-- Receivables table (piutang)
CREATE TABLE public.receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  due_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table (pembayaran)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for receivables
CREATE POLICY "Authenticated users can view receivables" ON public.receivables FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert receivables" ON public.receivables FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update receivables" ON public.receivables FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Admin can delete receivables" ON public.receivables FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for payments
CREATE POLICY "Authenticated users can view payments" ON public.payments FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert payments" ON public.payments FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Admin can delete payments" ON public.payments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update trigger for receivables
CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.receivables 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Function to update receivable amounts when payment is made
CREATE OR REPLACE FUNCTION public.update_receivable_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.receivables
  SET 
    paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = NEW.receivable_id),
    remaining_amount = total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = NEW.receivable_id),
    status = CASE 
      WHEN total_amount <= (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = NEW.receivable_id) THEN 'paid'
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = NEW.receivable_id) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = NEW.receivable_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_receivable_after_payment
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_receivable_on_payment();

-- Also handle payment deletion
CREATE OR REPLACE FUNCTION public.update_receivable_on_payment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.receivables
  SET 
    paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = OLD.receivable_id),
    remaining_amount = total_amount - (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = OLD.receivable_id),
    status = CASE 
      WHEN total_amount <= (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = OLD.receivable_id) THEN 'paid'
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE receivable_id = OLD.receivable_id) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = OLD.receivable_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER update_receivable_after_payment_delete
AFTER DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_receivable_on_payment_delete();
