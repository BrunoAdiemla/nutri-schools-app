-- =====================================================
-- MIGRATION: Change quantidade_por_per_capita precision to 1 decimal place
-- =====================================================
-- Este script altera a coluna quantidade_por_per_capita na tabela ingrediente_preparacao
-- para ter apenas 1 casa decimal (ex: 100.5, 40.5, etc.)
--
-- IMPORTANTE: Execute este script apenas UMA vez!
-- Faça backup dos dados antes de executar.

-- =====================================================
-- 1. Verificar dados atuais
-- =====================================================
-- Execute esta query primeiro para ver exemplos dos dados atuais:

-- SELECT id, quantidade_por_per_capita, unidade_medida
-- FROM public.ingrediente_preparacao
-- LIMIT 10;

-- Verificar se há valores <= 0 (que causariam erro):
-- SELECT id, quantidade_por_per_capita
-- FROM public.ingrediente_preparacao
-- WHERE quantidade_por_per_capita <= 0;

-- =====================================================
-- 2. Remover constraint temporariamente
-- =====================================================
ALTER TABLE public.ingrediente_preparacao
DROP CONSTRAINT IF EXISTS ingrediente_preparacao_quantidade_por_per_capita_check;

-- =====================================================
-- 3. Alterar tipo da coluna para DECIMAL(10,1)
-- =====================================================
-- Isso limitará a coluna a ter apenas 1 casa decimal
-- Valores existentes serão arredondados automaticamente

ALTER TABLE public.ingrediente_preparacao
ALTER COLUMN quantidade_por_per_capita TYPE DECIMAL(10,1);

-- =====================================================
-- 4. Recriar constraint
-- =====================================================
ALTER TABLE public.ingrediente_preparacao
ADD CONSTRAINT ingrediente_preparacao_quantidade_por_per_capita_check 
CHECK (quantidade_por_per_capita > 0);

-- =====================================================
-- 5. Verificar resultados
-- =====================================================
-- Execute esta query após a migração para confirmar:

-- SELECT id, quantidade_por_per_capita, unidade_medida
-- FROM public.ingrediente_preparacao
-- LIMIT 10;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Valores existentes com mais de 1 casa decimal serão arredondados
--    Exemplo: 100.567 → 100.6
--             40.123 → 40.1
--             75.999 → 76.0
--
-- 2. Novos valores inseridos serão automaticamente limitados a 1 casa decimal
--
-- 3. O tipo DECIMAL(10,1) significa:
--    - 10 dígitos no total
--    - 1 dígito após o ponto decimal
--    - Permite valores de -999999999.9 até 999999999.9
--
-- 4. Esta alteração também afeta o database-setup.sql
--    que deve ser atualizado para refletir a mudança
--
-- 5. Se houver valores <= 0, eles violarão o constraint ao recriar
--    Nesse caso, corrija-os antes de executar este script
