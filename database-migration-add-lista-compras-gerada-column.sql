-- =====================================================
-- MIGRATION: Adicionar coluna lista_compras_gerada
-- =====================================================
-- Este script adiciona uma coluna booleana para controlar se o cardápio já teve lista de compras gerada
-- Execute no SQL Editor do Supabase Dashboard

-- =====================================================
-- 1. ADICIONAR COLUNA lista_compras_gerada
-- =====================================================

-- Adicionar coluna booleana na tabela cardapios_semanais
ALTER TABLE public.cardapios_semanais 
ADD COLUMN IF NOT EXISTS lista_compras_gerada BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 2. COMENTÁRIO NA COLUNA (Documentação)
-- =====================================================

COMMENT ON COLUMN public.cardapios_semanais.lista_compras_gerada IS 
'Indica se já foi gerada pelo menos uma lista de compras para este cardápio semanal';

-- =====================================================
-- 3. CRIAR ÍNDICE PARA PERFORMANCE (Opcional)
-- =====================================================

-- Índice para consultas que filtram por cardápios com/sem lista gerada
CREATE INDEX IF NOT EXISTS idx_cardapios_semanais_lista_gerada 
ON public.cardapios_semanais(lista_compras_gerada);

-- =====================================================
-- 4. ATUALIZAR REGISTROS EXISTENTES (Opcional)
-- =====================================================

-- Marcar como TRUE os cardápios que já possuem listas de compras
UPDATE public.cardapios_semanais 
SET lista_compras_gerada = TRUE 
WHERE id IN (
    SELECT DISTINCT cardapio_semanal_id 
    FROM public.listas_compras 
    WHERE cardapio_semanal_id IS NOT NULL
);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Verificar se a coluna foi criada corretamente
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'cardapios_semanais' 
     AND column_name = 'lista_compras_gerada') as column_created,
    (SELECT COUNT(*) FROM public.cardapios_semanais 
     WHERE lista_compras_gerada = TRUE) as cardapios_with_lists;