-- =====================================================
-- MIGRATION: Convert measurement units in ingrediente_preparacao table
-- =====================================================
-- Este script converte as unidades de medida na tabela ingrediente_preparacao:
-- - 'kg' (quilogramas) → 'g' (gramas)
-- - 'l' (litros) → 'ml' (mililitros)
--
-- IMPORTANTE: Execute este script apenas UMA vez!
-- Faça backup dos dados antes de executar.
-- Execute DEPOIS do script de conversão da tabela ingredientes.

-- =====================================================
-- 1. Verificar quantos registros serão afetados
-- =====================================================
-- Execute estas queries primeiro para ver o impacto:

-- SELECT COUNT(*) as total_kg 
-- FROM public.ingrediente_preparacao 
-- WHERE unidade_medida = 'kg';

-- SELECT COUNT(*) as total_l 
-- FROM public.ingrediente_preparacao 
-- WHERE unidade_medida = 'l';

-- =====================================================
-- 2. Converter unidades de medida
-- =====================================================

-- Converter 'kg' para 'g'
UPDATE public.ingrediente_preparacao
SET unidade_medida = 'g'
WHERE unidade_medida = 'kg';

-- Converter 'l' para 'ml'
UPDATE public.ingrediente_preparacao
SET unidade_medida = 'ml'
WHERE unidade_medida = 'l';

-- =====================================================
-- 3. Verificar resultados
-- =====================================================
-- Execute estas queries após a migração para confirmar:

-- SELECT unidade_medida, COUNT(*) as total
-- FROM public.ingrediente_preparacao
-- GROUP BY unidade_medida
-- ORDER BY unidade_medida;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Esta tabela NÃO tem coluna updated_at, então não atualizamos timestamp
--
-- 2. Os valores de quantidade_por_per_capita NÃO são alterados
--    porque representam quantidades específicas já definidas
--
-- 3. Esta migração deve ser executada DEPOIS da migração
--    da tabela 'ingredientes' para manter consistência
--
-- 4. A coluna kcal_por_100g_ou_100ml (se existir) não é alterada
--    pois já está normalizada por 100g ou 100ml
