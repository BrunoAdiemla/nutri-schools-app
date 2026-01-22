-- Migration: Add unidade_de_medida column to preparacoes table
-- Description: Adds a new TEXT column to store the unit of measurement for preparations
-- Date: 2026-01-06

-- Add the new column to the preparacoes table
ALTER TABLE public.preparacoes 
ADD COLUMN unidade_de_medida TEXT;

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.preparacoes.unidade_de_medida IS 'Unit of measurement for the preparation (e.g., g, kg, ml, l, unidade, xícara, colher)';

-- Optional: Add a check constraint to ensure valid units (uncomment if you want to restrict values)
-- ALTER TABLE public.preparacoes 
-- ADD CONSTRAINT check_unidade_medida_valid 
-- CHECK (unidade_de_medida IN ('g', 'kg', 'ml', 'l', 'unidade', 'xícara', 'colher'));

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'preparacoes' 
  AND column_name = 'unidade_de_medida';