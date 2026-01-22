-- =====================================================
-- MIGRATION: Update Preparacao Types
-- =====================================================
-- This script updates the tipo field in preparacoes table
-- to replace 'entrada' with 'salada' and add 'prato principal'
-- 
-- Execute this in the Supabase SQL Editor

-- Current values in database: acompanhamento, entrada, guarnição, líquido, sobremesa, sólido
-- New values will be: acompanhamento, complemento, frutas, guarnição, líquido, prato principal, salada, sobremesa, sólido

-- Step 1: Drop the existing CHECK constraint
-- This allows us to modify the data freely
ALTER TABLE public.preparacoes
DROP CONSTRAINT IF EXISTS preparacoes_tipo_check;

-- Step 2: Update existing 'entrada' records to 'salada'
-- This preserves your existing data with the new naming
UPDATE public.preparacoes
SET tipo = 'salada'
WHERE tipo = 'entrada';

-- Step 3: Add new CHECK constraint with ALL values (old + new)
-- This constraint now includes all types: existing ones + 'salada', 'prato principal', 'frutas', 'complemento'
ALTER TABLE public.preparacoes
ADD CONSTRAINT preparacoes_tipo_check 
CHECK (tipo IN ('sólido', 'líquido', 'frutas', 'acompanhamento', 'guarnição', 'salada', 'prato principal', 'sobremesa', 'complemento'));

-- Step 4: Verification query (uncomment to verify changes)
-- SELECT DISTINCT tipo FROM public.preparacoes ORDER BY tipo;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully!';
  RAISE NOTICE '✓ Changed: entrada → salada';
  RAISE NOTICE '✓ New allowed types: sólido, líquido, frutas, acompanhamento, guarnição, salada, prato principal, sobremesa, complemento';
END $$;
