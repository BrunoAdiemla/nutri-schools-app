-- =====================================================
-- MIGRATION: Convert measurement units in ingredientes table
-- =====================================================
-- Este script converte as unidades de medida na tabela ingredientes:
-- - 'kg' (quilogramas) → 'g' (gramas)
-- - 'l' (litros) → 'ml' (mililitros)
--
-- IMPORTANTE: Execute este script apenas UMA vez!
-- Faça backup dos dados antes de executar.

-- =====================================================
-- 1. Verificar quantos registros serão afetados
-- =====================================================
-- Execute estas queries primeiro para ver o impacto:

-- SELECT COUNT(*) as total_kg 
-- FROM public.ingredientes 
-- WHERE unidade_medida = 'kg';

-- SELECT COUNT(*) as total_l 
-- FROM public.ingredientes 
-- WHERE unidade_medida = 'l';

-- =====================================================
-- 2. Converter unidades de medida
-- =====================================================

-- Converter 'kg' para 'g'
UPDATE public.ingredientes
SET unidade_medida = 'g',
    updated_at = NOW()
WHERE unidade_medida = 'kg';

-- Converter 'l' para 'ml'
UPDATE public.ingredientes
SET unidade_medida = 'ml',
    updated_at = NOW()
WHERE unidade_medida = 'l';

-- =====================================================
-- 3. Verificar resultados
-- =====================================================
-- Execute estas queries após a migração para confirmar:

-- SELECT unidade_medida, COUNT(*) as total
-- FROM public.ingredientes
-- GROUP BY unidade_medida
-- ORDER BY unidade_medida;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Os valores de kcal_por_100g_ou_100ml NÃO são alterados
--    porque já estão normalizados por 100g ou 100ml
--
-- 2. Esta migração afeta apenas a tabela 'ingredientes'
--    A tabela 'ingrediente_preparacao' mantém suas unidades
--    conforme foram registradas no momento da associação
--
-- 3. Não há necessidade de converter valores numéricos
--    pois as calorias já estão por 100g/100ml
