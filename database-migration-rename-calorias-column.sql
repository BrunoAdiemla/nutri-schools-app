-- =====================================================
-- MIGRAÇÃO: RENOMEAR COLUNA CALORIAS_POR_UNIDADE
-- =====================================================
-- Data: 2026-01-21
-- Descrição: Renomeia a coluna 'calorias_por_unidade' para 'kcal_por_100g_ou_100ml' 
--           na tabela 'ingredientes' para melhor clareza semântica
-- =====================================================

-- Verificar se a coluna atual existe antes de renomear
DO $$ 
BEGIN
    -- Verificar se a coluna 'calorias_por_unidade' existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ingredientes' 
        AND column_name = 'calorias_por_unidade'
    ) THEN
        -- Renomear a coluna
        ALTER TABLE public.ingredientes 
        RENAME COLUMN calorias_por_unidade TO kcal_por_100g_ou_100ml;
        
        RAISE NOTICE 'Coluna renomeada com sucesso: calorias_por_unidade -> kcal_por_100g_ou_100ml';
    ELSE
        RAISE NOTICE 'Coluna calorias_por_unidade não encontrada. Migração já pode ter sido executada.';
    END IF;
END $$;

-- Verificar o resultado da migração
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ingredientes' 
AND column_name IN ('calorias_por_unidade', 'kcal_por_100g_ou_100ml')
ORDER BY column_name;

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- =====================================================
-- A coluna 'calorias_por_unidade' foi renomeada para 'kcal_por_100g_ou_100ml'
-- Todos os dados existentes foram preservados
-- Todas as constraints e índices foram mantidos automaticamente
-- =====================================================