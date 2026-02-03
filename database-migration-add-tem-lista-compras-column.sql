-- Migration: Add tem_lista_compras column to cardapios_semanais table
-- Purpose: Optimize performance by avoiding N+1 queries when checking if a cardapio has a shopping list
-- Date: 2025-02-03

-- Step 1: Add the new boolean column with default value FALSE
ALTER TABLE cardapios_semanais 
ADD COLUMN tem_lista_compras BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing records that already have shopping lists
-- This will set tem_lista_compras = TRUE for cardapios that have associated lists
UPDATE cardapios_semanais 
SET tem_lista_compras = TRUE 
WHERE id IN (
    SELECT DISTINCT cardapio_semanal_id 
    FROM listas_compras 
    WHERE cardapio_semanal_id IS NOT NULL
);

-- Step 3: Create an index for better query performance
-- This will make queries filtering by tem_lista_compras much faster
CREATE INDEX idx_cardapios_semanais_tem_lista_compras 
ON cardapios_semanais(tem_lista_compras);

-- Step 4: Add a comment to document the column purpose
COMMENT ON COLUMN cardapios_semanais.tem_lista_compras IS 
'Boolean flag indicating if this cardapio has an associated shopping list. Updated automatically when lists are created/deleted.';

-- Verification query (optional - run after migration to check results)
-- SELECT 
--     COUNT(*) as total_cardapios,
--     COUNT(CASE WHEN tem_lista_compras = TRUE THEN 1 END) as com_lista,
--     COUNT(CASE WHEN tem_lista_compras = FALSE THEN 1 END) as sem_lista
-- FROM cardapios_semanais;