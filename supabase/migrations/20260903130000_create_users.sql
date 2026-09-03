-- Cyclists register, play 1-minute race; higher meters wins.
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nick text NOT NULL,
  email text,
  phone text,
  meters double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_nick_nonempty CHECK (char_length(trim(nick)) > 0),
  CONSTRAINT users_meters_nonnegative CHECK (meters IS NULL OR meters >= 0)
);

CREATE INDEX users_created_at_desc_idx ON public.users (created_at DESC);

COMMENT ON TABLE public.users IS 'Velo cyclists: nick for display, optional contacts, best meters in 1 min';
COMMENT ON COLUMN public.users.nick IS 'Display name shown in-game';
COMMENT ON COLUMN public.users.meters IS 'Best distance (m) in a 1-minute race; only increases';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Kiosk game: anon clients can register, list, and patch profiles.
CREATE POLICY users_select_anon ON public.users
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY users_insert_anon ON public.users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY users_update_anon ON public.users
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;

-- Set meters only when new value is strictly greater than current (or current is null).
CREATE OR REPLACE FUNCTION public.set_user_meters(p_user_id uuid, p_meters double precision)
RETURNS public.users
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result public.users;
BEGIN
  IF p_meters IS NULL OR p_meters < 0 THEN
    RAISE EXCEPTION 'meters must be a non-negative number';
  END IF;

  UPDATE public.users
  SET meters = p_meters
  WHERE id = p_user_id
    AND (meters IS NULL OR meters < p_meters)
  RETURNING * INTO result;

  IF NOT FOUND THEN
    SELECT * INTO result FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'user not found: %', p_user_id;
    END IF;
  END IF;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.set_user_meters(uuid, double precision) IS
  'Updates user meters only if new value is greater than existing';

GRANT EXECUTE ON FUNCTION public.set_user_meters(uuid, double precision) TO anon, authenticated;
