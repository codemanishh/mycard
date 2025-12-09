-- Add borrower_phone column to lendings table for in-app reminders
ALTER TABLE public.lendings 
ADD COLUMN borrower_phone text;