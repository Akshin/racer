-- Email is unused: kiosk registration collects nick, phone, and gender only.
ALTER TABLE public.users DROP COLUMN IF EXISTS email;
