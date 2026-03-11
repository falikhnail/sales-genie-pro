
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  visit_type TEXT NOT NULL DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view visits" ON public.visits FOR SELECT USING (is_authenticated());
CREATE POLICY "Authenticated users can insert visits" ON public.visits FOR INSERT WITH CHECK (is_authenticated());
CREATE POLICY "Authenticated users can update visits" ON public.visits FOR UPDATE USING (is_authenticated());
CREATE POLICY "Admin can delete visits" ON public.visits FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
