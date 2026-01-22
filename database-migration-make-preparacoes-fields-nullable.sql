-- Migration: Make valor_per_capita and unidade_de_medida nullable in preparacoes table
-- Description: Allows these fields to be optional in the preparacoes table
-- Date: 2026-01-08

-- Make valor_per_capita nullable
ALTER TABLE preparacoes 
ALTER COLUMN valor_per_capita DROP NOT NULL;

-- Make unidade_de_medida nullable
ALTER TABLE preparacoes 
ALTER COLUMN unidade_de_medida DROP NOT NULL;

-- Add comments to document the change
COMMENT ON COLUMN preparacoes.valor_per_capita IS 'Valor per capita da preparação (opcional)';
COMMENT ON COLUMN preparacoes.unidade_de_medida IS 'Unidade de medida da preparação (opcional)';

-- Verify the migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'preparacoes' 
AND column_name IN ('valor_per_capita', 'unidade_de_medida')
ORDER BY column_name;