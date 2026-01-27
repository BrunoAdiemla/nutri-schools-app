-- =====================================================
-- MIGRATION: Add kcal_por_100g_ou_100ml to ingrediente_preparacao
-- =====================================================
-- Este script adiciona a coluna kcal_por_100g_ou_100ml na tabela ingrediente_preparacao
-- para armazenar o valor calórico do ingrediente no momento da associação

-- Adicionar coluna kcal_por_100g_ou_100ml
ALTER TABLE public.ingrediente_preparacao 
ADD COLUMN IF NOT EXISTS kcal_por_100g_ou_100ml DECIMAL(10,2) CHECK (kcal_por_100g_ou_100ml >= 0);

-- Comentário explicativo
COMMENT ON COLUMN public.ingrediente_preparacao.kcal_por_100g_ou_100ml IS 
'Valor calórico por 100g ou 100ml do ingrediente no momento da associação com a preparação';
