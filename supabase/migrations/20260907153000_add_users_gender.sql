-- Gender for kiosk registration. Existing rows become male.
ALTER TABLE public.users
  ADD COLUMN gender text NOT NULL DEFAULT 'male',
  ADD CONSTRAINT users_gender_allowed CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN public.users.gender IS 'Participant gender: male (default) or female';
