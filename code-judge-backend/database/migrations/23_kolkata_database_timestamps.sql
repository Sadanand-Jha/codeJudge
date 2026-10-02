-- Make Kolkata time the database write/display policy for creation and update
-- timestamps. TIMESTAMP columns store Kolkata wall-clock values. TIMESTAMPTZ
-- columns continue to store absolute instants (PostgreSQL's required behavior)
-- and are rendered in Asia/Kolkata for database/application sessions.

SET TIME ZONE 'Asia/Kolkata';

-- Persist the timezone for new database sessions when the deployment role owns
-- the database. Managed providers may disallow ALTER DATABASE; application pool
-- connections still execute SET TIME ZONE on connect in that case.
DO $timezone$
BEGIN
  BEGIN
    EXECUTE format(
      'ALTER DATABASE %I SET timezone TO %L',
      current_database(),
      'Asia/Kolkata'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not persist database timezone; connection-level Asia/Kolkata setting remains active: %', SQLERRM;
  END;
END
$timezone$;

-- Trigger functions are type-specific so TIMESTAMP values receive an explicit
-- Kolkata wall clock while TIMESTAMPTZ values retain the correct instant.
CREATE OR REPLACE FUNCTION public.touch_updated_at_kolkata_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at_kolkata_timestamptz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.touch_updatedat_kolkata_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updatedat := CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.touch_updatedat_kolkata_timestamptz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updatedat := CURRENT_TIMESTAMP;
  RETURN NEW;
END
$function$;

-- Add safe defaults to every current creation/update timestamp column,
-- including the legacy users.createdat/users.updatedat names.
DO $defaults$
DECLARE
  column_record RECORD;
  default_expression TEXT;
BEGIN
  FOR column_record IN
    SELECT columns.table_schema,
           columns.table_name,
           columns.column_name,
           columns.data_type
    FROM information_schema.columns AS columns
    JOIN information_schema.tables AS tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE columns.table_schema = 'public'
      AND tables.table_type = 'BASE TABLE'
      AND columns.column_name IN ('created_at', 'updated_at', 'createdat', 'updatedat')
      AND columns.data_type IN ('timestamp without time zone', 'timestamp with time zone')
  LOOP
    default_expression := CASE
      WHEN column_record.data_type = 'timestamp without time zone'
        THEN '(CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Kolkata'')'
      ELSE 'CURRENT_TIMESTAMP'
    END;

    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %s',
      column_record.table_schema,
      column_record.table_name,
      column_record.column_name,
      default_expression
    );
  END LOOP;
END
$defaults$;

-- Keep update timestamps correct even when an UPDATE statement forgets to set
-- the field explicitly. Existing trigger names are replaced idempotently.
DO $triggers$
DECLARE
  column_record RECORD;
  trigger_name TEXT;
  trigger_function TEXT;
BEGIN
  FOR column_record IN
    SELECT columns.table_schema,
           columns.table_name,
           columns.column_name,
           columns.data_type
    FROM information_schema.columns AS columns
    JOIN information_schema.tables AS tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE columns.table_schema = 'public'
      AND tables.table_type = 'BASE TABLE'
      AND columns.column_name IN ('updated_at', 'updatedat')
      AND columns.data_type IN ('timestamp without time zone', 'timestamp with time zone')
  LOOP
    trigger_name := 'trg_kolkata_touch_' || column_record.column_name;
    trigger_function := CASE
      WHEN column_record.column_name = 'updated_at'
           AND column_record.data_type = 'timestamp without time zone'
        THEN 'touch_updated_at_kolkata_timestamp'
      WHEN column_record.column_name = 'updated_at'
        THEN 'touch_updated_at_kolkata_timestamptz'
      WHEN column_record.data_type = 'timestamp without time zone'
        THEN 'touch_updatedat_kolkata_timestamp'
      ELSE 'touch_updatedat_kolkata_timestamptz'
    END;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      trigger_name,
      column_record.table_schema,
      column_record.table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.%I()',
      trigger_name,
      column_record.table_schema,
      column_record.table_name,
      trigger_function
    );
  END LOOP;
END
$triggers$;
