-- =====================================================
-- MIGRAÇÃO: Adicionar coluna 'tipo' na tabela refeicao_preparacoes
-- =====================================================
-- Este script adiciona a coluna 'tipo' do tipo TEXT na tabela refeicao_preparacoes
-- Execute no SQL Editor do Supabase Dashboard

-- Adicionar a coluna 'tipo' na tabela refeicao_preparacoes
ALTER TABLE public.refeicao_preparacoes 
ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Criar índice para melhorar performance nas consultas por tipo
CREATE INDEX IF NOT EXISTS idx_refeicao_preparacoes_tipo 
ON public.refeicao_preparacoes(tipo);

-- Opcional: Popular a coluna 'tipo' com dados existentes das preparações
-- Este comando busca o tipo da preparação e atualiza na tabela de junção
UPDATE public.refeicao_preparacoes 
SET tipo = preparacoes.tipo
FROM public.preparacoes
WHERE refeicao_preparacoes.preparacao_id = preparacoes.id
AND refeicao_preparacoes.tipo IS NULL;

-- Verificar se a migração foi aplicada corretamente
-- Execute esta query para confirmar que a coluna foi criada:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'refeicao_preparacoes' AND column_name = 'tipo';