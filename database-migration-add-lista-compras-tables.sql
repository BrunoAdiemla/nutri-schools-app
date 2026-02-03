-- =====================================================
-- MIGRATION: Lista de Compras - Tabelas e Configurações
-- =====================================================
-- Este script cria as tabelas necessárias para o sistema de lista de compras
-- Execute no SQL Editor do Supabase Dashboard

-- =====================================================
-- 1. ATUALIZAR TABELA listas_compras (adicionar novos campos)
-- =====================================================

-- Adicionar campo para vincular ao cardápio semanal
ALTER TABLE public.listas_compras 
ADD COLUMN IF NOT EXISTS cardapio_semanal_id UUID REFERENCES public.cardapios_semanais(id) ON DELETE CASCADE;

-- Adicionar campo nome
ALTER TABLE public.listas_compras 
ADD COLUMN IF NOT EXISTS nome TEXT;

-- Adicionar campo status
ALTER TABLE public.listas_compras 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizada', 'comprada'));

-- Adicionar campo observações
ALTER TABLE public.listas_compras 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- =====================================================
-- 2. CRIAR TABELA lista_compras_itens
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lista_compras_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_compras_id UUID NOT NULL REFERENCES public.listas_compras(id) ON DELETE CASCADE,
    ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    
    -- Dados do ingrediente (desnormalizados para histórico)
    ingrediente_nome TEXT NOT NULL,
    unidade_medida TEXT NOT NULL,
    
    -- Quantidades calculadas
    quantidade_calculada DECIMAL(10,3) NOT NULL CHECK (quantidade_calculada > 0),
    quantidade_ajustada DECIMAL(10,3),
    fator_correcao_aplicado DECIMAL(5,2) NOT NULL,
    
    -- Detalhamento do cálculo (JSONB para flexibilidade)
    detalhes_calculo JSONB,
    
    -- Controle de compra
    comprado BOOLEAN DEFAULT FALSE,
    quantidade_comprada DECIMAL(10,3),
    preco_unitario DECIMAL(10,2),
    preco_total DECIMAL(10,2),
    fornecedor TEXT,
    
    -- Observações específicas do item
    observacoes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(lista_compras_id, ingrediente_id)
);

-- =====================================================
-- 3. CRIAR TABELA fatores_faixa_etaria (configuração por usuário)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fatores_faixa_etaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Fatores de ajuste por faixa etária
    fator_pequenos DECIMAL(3,2) DEFAULT 0.70 CHECK (fator_pequenos > 0),
    fator_adolescentes DECIMAL(3,2) DEFAULT 1.00 CHECK (fator_adolescentes > 0),
    fator_adultos DECIMAL(3,2) DEFAULT 1.20 CHECK (fator_adultos > 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Cada usuário tem apenas uma configuração
    UNIQUE(user_id)
);

-- =====================================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para lista_compras
CREATE INDEX IF NOT EXISTS idx_listas_compras_cardapio_id 
ON public.listas_compras(cardapio_semanal_id);

CREATE INDEX IF NOT EXISTS idx_listas_compras_status 
ON public.listas_compras(status);

CREATE INDEX IF NOT EXISTS idx_listas_compras_created_by 
ON public.listas_compras(created_by);

-- Índices para lista_compras_itens
CREATE INDEX IF NOT EXISTS idx_lista_compras_itens_lista_id 
ON public.lista_compras_itens(lista_compras_id);

CREATE INDEX IF NOT EXISTS idx_lista_compras_itens_ingrediente_id 
ON public.lista_compras_itens(ingrediente_id);

CREATE INDEX IF NOT EXISTS idx_lista_compras_itens_comprado 
ON public.lista_compras_itens(comprado);

-- Índice para fatores_faixa_etaria
CREATE INDEX IF NOT EXISTS idx_fatores_faixa_etaria_user_id 
ON public.fatores_faixa_etaria(user_id);

-- =====================================================
-- 5. CRIAR TRIGGER PARA updated_at
-- =====================================================

-- Trigger para lista_compras_itens
CREATE TRIGGER update_lista_compras_itens_updated_at 
BEFORE UPDATE ON public.lista_compras_itens 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para fatores_faixa_etaria
CREATE TRIGGER update_fatores_faixa_etaria_updated_at 
BEFORE UPDATE ON public.fatores_faixa_etaria 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.lista_compras_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatores_faixa_etaria ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CRIAR POLÍTICAS RLS
-- =====================================================

-- Políticas para lista_compras_itens
CREATE POLICY "Users can view own shopping list items" 
ON public.lista_compras_itens FOR SELECT 
USING (
    lista_compras_id IN (
        SELECT id FROM public.listas_compras 
        WHERE created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

CREATE POLICY "Users can insert own shopping list items" 
ON public.lista_compras_itens FOR INSERT 
WITH CHECK (
    lista_compras_id IN (
        SELECT id FROM public.listas_compras 
        WHERE created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

CREATE POLICY "Users can update own shopping list items" 
ON public.lista_compras_itens FOR UPDATE 
USING (
    lista_compras_id IN (
        SELECT id FROM public.listas_compras 
        WHERE created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

CREATE POLICY "Users can delete own shopping list items" 
ON public.lista_compras_itens FOR DELETE 
USING (
    lista_compras_id IN (
        SELECT id FROM public.listas_compras 
        WHERE created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

-- Políticas para fatores_faixa_etaria
CREATE POLICY "Users can view own age group factors" 
ON public.fatores_faixa_etaria FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own age group factors" 
ON public.fatores_faixa_etaria FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own age group factors" 
ON public.fatores_faixa_etaria FOR UPDATE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own age group factors" 
ON public.fatores_faixa_etaria FOR DELETE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- =====================================================
-- 8. COMENTÁRIOS NAS TABELAS E COLUNAS (Documentação)
-- =====================================================

COMMENT ON TABLE public.lista_compras_itens IS 
'Itens individuais de cada lista de compras, com quantidades calculadas e controle de compra';

COMMENT ON COLUMN public.lista_compras_itens.detalhes_calculo IS 
'Detalhamento em JSON de como a quantidade foi calculada (breakdown por dia/refeição/preparação)';

COMMENT ON COLUMN public.lista_compras_itens.quantidade_calculada IS 
'Quantidade calculada automaticamente pelo sistema';

COMMENT ON COLUMN public.lista_compras_itens.quantidade_ajustada IS 
'Quantidade ajustada manualmente pelo nutricionista (sobrescreve a calculada)';

COMMENT ON TABLE public.fatores_faixa_etaria IS 
'Fatores de ajuste por faixa etária para cálculo de quantidades per capita';

COMMENT ON COLUMN public.fatores_faixa_etaria.fator_pequenos IS 
'Fator multiplicador para crianças pequenas (padrão: 0.70)';

COMMENT ON COLUMN public.fatores_faixa_etaria.fator_adolescentes IS 
'Fator multiplicador para adolescentes (padrão: 1.00)';

COMMENT ON COLUMN public.fatores_faixa_etaria.fator_adultos IS 
'Fator multiplicador para adultos (padrão: 1.20)';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Verificar se tudo foi criado corretamente
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'lista_compras_itens') as lista_compras_itens_created,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'fatores_faixa_etaria') as fatores_faixa_etaria_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'listas_compras' AND column_name = 'cardapio_semanal_id') as listas_compras_updated;
