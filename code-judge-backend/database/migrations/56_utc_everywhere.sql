-- Convert every legacy naive timestamp to an absolute UTC instant.
-- Existing testing data is treated as UTC (per project decision), so the
-- conversion attaches UTC without shifting the clock time. New defaults are
-- UTC timestamps.

DO $$
DECLARE
  target record;
  has_default boolean;
BEGIN
  FOR target IN
    SELECT c.table_name, c.column_name, c.column_default
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'timestamp without time zone'
      AND c.is_generated = 'NEVER'
    ORDER BY c.table_name, c.ordinal_position
  LOOP
    has_default := target.column_default IS NOT NULL;

    IF has_default THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT',
        target.table_name,
        target.column_name
      );
    END IF;

    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE %L',
      target.table_name,
      target.column_name,
      target.column_name,
      'UTC'
    );

    IF has_default
       AND (
         target.column_default ILIKE '%CURRENT_TIMESTAMP%'
         OR target.column_default ILIKE '%now()%'
       ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT CURRENT_TIMESTAMP',
        target.table_name,
        target.column_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET timezone TO %L',
    current_database(),
    'UTC'
  );
END $$;
