-- =====================================================
-- MIGRATION: Add 'tipo' column to ingredientes table
-- =====================================================
-- Execute this in the Supabase SQL Editor to add the tipo column

-- Add the new 'tipo' column to the ingredientes table
ALTER TABLE public.ingredientes 
ADD COLUMN tipo TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ingredientes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;