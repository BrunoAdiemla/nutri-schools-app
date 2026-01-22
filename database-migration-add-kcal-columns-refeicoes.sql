-- Migration: Add kcal columns to refeicoes table
-- Description: Adds kcal_pequenos, kcal_adolescentes, and kcal_adultos columns to track calories by age group
-- Date: 2026-01-22

-- Check if we're connected to the correct database
DO $$
BEGIN
    RAISE NOTICE 'Starting migration: Add kcal columns to refeicoes table';
END $$;

-- Add kcal_pequenos column
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'refeicoes' 
        AND column_name = 'kcal_pequenos'
    ) THEN
        ALTER TABLE refeicoes ADD COLUMN kcal_pequenos FLOAT;
        RAISE NOTICE 'Added column kcal_pequenos to refeicoes table';
    ELSE
        RAISE NOTICE 'Column kcal_pequenos already exists in refeicoes table';
    END IF;
END $$;

-- Add kcal_adolescentes column
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'refeicoes' 
        AND column_name = 'kcal_adolescentes'
    ) THEN
        ALTER TABLE refeicoes ADD COLUMN kcal_adolescentes FLOAT;
        RAISE NOTICE 'Added column kcal_adolescentes to refeicoes table';
    ELSE
        RAISE NOTICE 'Column kcal_adolescentes already exists in refeicoes table';
    END IF;
END $$;

-- Add kcal_adultos column
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'refeicoes' 
        AND column_name = 'kcal_adultos'
    ) THEN
        ALTER TABLE refeicoes ADD COLUMN kcal_adultos FLOAT;
        RAISE NOTICE 'Added column kcal_adultos to refeicoes table';
    ELSE
        RAISE NOTICE 'Column kcal_adultos already exists in refeicoes table';
    END IF;
END $$;

-- Verify the columns were added successfully
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'refeicoes' 
    AND column_name IN ('kcal_pequenos', 'kcal_adolescentes', 'kcal_adultos');
    
    IF column_count = 3 THEN
        RAISE NOTICE '✅ Migration completed successfully: All 3 kcal columns added to refeicoes table';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: Expected 3 columns, found %', column_count;
    END IF;
END $$;

-- Show table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'refeicoes' 
AND column_name IN ('kcal_pequenos', 'kcal_adolescentes', 'kcal_adultos')
ORDER BY column_name;