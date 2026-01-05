-- =====================================================
-- MIGRATION: ADD NAME FIELDS TO INGREDIENTE_PREPARACAO
-- =====================================================
-- Este script adiciona os campos nome_preparacao e nome_ingrediente
-- na tabela ingrediente_preparacao para facilitar consultas e relatórios

-- Adicionar campo nome_preparacao (nome da preparação)
ALTER TABLE public.ingrediente_preparacao 
ADD COLUMN IF NOT EXISTS nome_preparacao TEXT;

-- Adicionar campo nome_ingrediente (nome do ingrediente)
ALTER TABLE public.ingrediente_preparacao 
ADD COLUMN IF NOT EXISTS nome_ingrediente TEXT;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN public.ingrediente_preparacao.nome_preparacao IS 'Nome da preparação (desnormalizado para facilitar consultas)';
COMMENT ON COLUMN public.ingrediente_preparacao.nome_ingrediente IS 'Nome do ingrediente (desnormalizado para facilitar consultas)';

-- =====================================================
-- POPULAR CAMPOS COM DADOS EXISTENTES (OPCIONAL)
-- =====================================================
-- Se você quiser popular os campos com dados existentes, descomente as queries abaixo:

-- Atualizar nome_preparacao com dados da tabela preparacoes
-- UPDATE public.ingrediente_preparacao 
-- SET nome_preparacao = p.nome
-- FROM public.preparacoes p
-- WHERE ingrediente_preparacao.preparacao_id = p.id
-- AND ingrediente_preparacao.nome_preparacao IS NULL;

-- Atualizar nome_ingrediente com dados da tabela ingredientes
-- UPDATE public.ingrediente_preparacao 
-- SET nome_ingrediente = i.nome
-- FROM public.ingredientes i
-- WHERE ingrediente_preparacao.ingrediente_id = i.id
-- AND ingrediente_preparacao.nome_ingrediente IS NULL;

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================
-- Query para verificar a estrutura da tabela após a migração
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ingrediente_preparacao' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Query para verificar alguns registros (se existirem)
-- SELECT 
--     id,
--     nome_preparacao,
--     nome_ingrediente,
--     quantidade_por_per_capita,
--     unidade_medida
-- FROM public.ingrediente_preparacao 
-- LIMIT 5;

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- =====================================================