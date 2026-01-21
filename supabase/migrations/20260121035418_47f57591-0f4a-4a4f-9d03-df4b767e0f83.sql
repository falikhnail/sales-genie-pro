-- Add whatsapp_sent_at column to track when WhatsApp was last sent
ALTER TABLE public.orders ADD COLUMN whatsapp_sent_at TIMESTAMP WITH TIME ZONE;