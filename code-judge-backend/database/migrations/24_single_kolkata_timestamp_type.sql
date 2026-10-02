-- Canonical timestamp policy for lifecycle audit columns:
--   created_at / updated_at / createdat / updatedat
-- are all TIMESTAMP WITHOUT TIME ZONE containing Asia/Kolkata wall-clock time.
-- This removes the mixed TIMESTAMP/TIMESTAMPTZ schema introduced by legacy
-- migrations while preserving the Kolkata value represented by existing rows.

SET TIME ZONE 'Asia/Kolkata';

-- Remove the type-specific triggers installed by migration 23 before changing
-- column types. Trigger names are table-local, so the same names are safe.
DO $drop_old_triggers$
DECLARE
  column_record RECORD;
BEGIN
  FOR column_record IN
    SELECT columns.table_schema, columns.table_name, columns.column_name
    FROM information_schema.columns AS columns
    JOIN information_schema.tables AS tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE columns.table_schema = 'public'
      AND tables.table_type = 'BASE TABLE'
      AND columns.column_name IN ('updated_at', 'updatedat')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      'trg_kolkata_touch_' || column_record.column_name,
      column_record.table_schema,
      column_record.table_name
    );
  END LOOP;
END
$drop_old_triggers$;

-- Convert only the four audit columns. `AT TIME ZONE` materializes the current
-- Kolkata wall-clock value instead of retaining a UTC-looking value.
DO $standardize_columns$
DECLARE
  column_record RECORD;
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
    IF column_record.data_type = 'timestamp with time zone' THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
        column_record.table_schema,
        column_record.table_name,
        column_record.column_name
      );
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I TYPE TIMESTAMP WITHOUT TIME ZONE USING %I AT TIME ZONE %L',
        column_record.table_schema,
        column_record.table_name,
        column_record.column_name,
        column_record.column_name,
        'Asia/Kolkata'
      );
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE %L)',
      column_record.table_schema,
      column_record.table_name,
      column_record.column_name,
      'Asia/Kolkata'
    );
  END LOOP;
END
$standardize_columns$;

DROP FUNCTION IF EXISTS public.touch_updated_at_kolkata_timestamp();
DROP FUNCTION IF EXISTS public.touch_updated_at_kolkata_timestamptz();
DROP FUNCTION IF EXISTS public.touch_updatedat_kolkata_timestamp();
DROP FUNCTION IF EXISTS public.touch_updatedat_kolkata_timestamptz();

CREATE OR REPLACE FUNCTION public.touch_updated_at_kolkata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.touch_updatedat_kolkata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updatedat := CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
  RETURN NEW;
END
$function$;

-- One trigger implementation per legacy spelling; there are no longer
-- separate implementations for separate timestamp types.
DO $install_triggers$
DECLARE
  column_record RECORD;
  trigger_function TEXT;
BEGIN
  FOR column_record IN
    SELECT columns.table_schema, columns.table_name, columns.column_name
    FROM information_schema.columns AS columns
    JOIN information_schema.tables AS tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE columns.table_schema = 'public'
      AND tables.table_type = 'BASE TABLE'
      AND columns.column_name IN ('updated_at', 'updatedat')
      AND columns.data_type = 'timestamp without time zone'
  LOOP
    trigger_function := CASE
      WHEN column_record.column_name = 'updated_at'
        THEN 'touch_updated_at_kolkata'
      ELSE 'touch_updatedat_kolkata'
    END;

    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.%I()',
      'trg_kolkata_touch_' || column_record.column_name,
      column_record.table_schema,
      column_record.table_name,
      trigger_function
    );
  END LOOP;
END
$install_triggers$;
