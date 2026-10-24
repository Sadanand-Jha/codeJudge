-- The legacy touch triggers still assigned an Asia/Kolkata wall-clock value to
-- columns that are now TIMESTAMPTZ. In a UTC session that would shift every
-- updated_at/updatedat value by +05:30, so redefine them to write UTC.

CREATE OR REPLACE FUNCTION public.touch_updated_at_kolkata()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.touch_updatedat_kolkata()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updatedat := CURRENT_TIMESTAMP;
  RETURN NEW;
END
$function$;
