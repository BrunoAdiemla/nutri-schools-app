-- Migration: Add cardapios_semanais table and cardapio_semanal_id to cardapios_do_dia
-- Description: Creates the cardapios_semanais table and adds foreign key relationship
-- Date: 2026-01-22

-- Check if we're connected to the correct database
DO $$
BEGIN
    RAISE NOTICE 'Starting migration: Add cardapios_semanais table and relationships';
END $$;

-- Create cardapios_semanais table
CREATE TABLE IF NOT EXISTS public.cardapios_semanais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (data_fim >= data_inicio)
);

-- Add cardapio_semanal_id column to cardapios_do_dia if it doesn't exist
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cardapios_do_dia' 
        AND column_name = 'cardapio_semanal_id'
    ) THEN
        ALTER TABLE cardapios_do_dia ADD COLUMN cardapio_semanal_id UUID REFERENCES public.cardapios_semanais(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added column cardapio_semanal_id to cardapios_do_dia table';
    ELSE
        RAISE NOTICE 'Column cardapio_semanal_id already exists in cardapios_do_dia table';
    END IF;
END $$;

-- Verify the migration was successful
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Check if cardapios_semanais table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cardapios_semanais'
    ) INTO table_exists;
    
    -- Check if cardapio_semanal_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cardapios_do_dia' 
        AND column_name = 'cardapio_semanal_id'
    ) INTO column_exists;
    
    IF table_exists AND column_exists THEN
        RAISE NOTICE '✅ Migration completed successfully: cardapios_semanais table and relationships created';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: table_exists=%, column_exists=%', table_exists, column_exists;
    END IF;
END $$;

-- Show table structures for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('cardapios_semanais', 'cardapios_do_dia')
ORDER BY table_name, ordinal_position;