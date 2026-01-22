-- Migration: Add fator_de_correcao column to ingredientes table
-- Description: Adds a correction factor column to ingredients for calculation adjustments
-- Date: 2026-01-08

-- Add the fator_de_correcao column to ingredientes table
ALTER TABLE ingredientes 
ADD COLUMN fator_de_correcao DECIMAL(5,2) DEFAULT 1.00;

-- Add comment to the column for documentation
COMMENT ON COLUMN ingredientes.fator_de_correcao IS 'Fator de correção para ajustes de cálculo nutricional (padrão: 1.00)';

-- Add constraint to ensure the correction factor is positive
ALTER TABLE ingredientes 
ADD CONSTRAINT check_fator_correcao_positive 
CHECK (fator_de_correcao > 0);

-- Add constraint to ensure reasonable range (0.01 to 999.99)
ALTER TABLE ingredientes 
ADD CONSTRAINT check_fator_correcao_range 
CHECK (fator_de_correcao >= 0.01 AND fator_de_correcao <= 999.99);

-- Update existing records to have default value of 1.00 (if any NULL values exist)
UPDATE ingredientes 
SET fator_de_correcao = 1.00 
WHERE fator_de_correcao IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE ingredientes 
ALTER COLUMN fator_de_correcao SET NOT NULL;

-- Create index for better query performance if needed
CREATE INDEX idx_ingredientes_fator_correcao ON ingredientes(fator_de_correcao);

-- Verify the migration
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ingredientes' 
AND column_name = 'fator_de_correcao';