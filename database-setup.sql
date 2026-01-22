-- =====================================================
-- NUTRI SCHOOLS - DATABASE SETUP SCRIPT
-- =====================================================
-- Este script cria todas as tabelas necessárias para o sistema Nutri Schools
-- Execute no SQL Editor do Supabase Dashboard

-- =====================================================
-- 1. TABELA USERS (Usuários do sistema)
-- =====================================================
-- Nota: A tabela auth.users já existe no Supabase para autenticação
-- Esta tabela complementa com dados específicos do perfil

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cidade TEXT,
    estado TEXT,
    rua TEXT,
    bairro TEXT,
    cep TEXT,
    funcao TEXT CHECK (funcao IN ('nutricionista', 'gestor', 'outro')),
    nome_escola TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA INGREDIENTES (Ingredientes básicos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('kg', 'g', 'ml', 'l', 'unidade', 'xícara', 'colher')),
    kcal_por_100g_ou_100ml DECIMAL(10,2) NOT NULL CHECK (kcal_por_100g_ou_100ml >= 0),
    tipo TEXT,
    fator_correcao DECIMAL(5,2) DEFAULT 1.00 CHECK (fator_correcao > 0),
    default_ingredient BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA PREPARACOES (Preparações/pratos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.preparacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    valor_per_capita DECIMAL(10,2) CHECK (valor_per_capita >= 0),
    modo_preparo TEXT,
    tipo TEXT CHECK (tipo IN ('sólido', 'líquido', 'frutas', 'acompanhamento', 'guarnição', 'entrada', 'sobremesa', 'complemento', 'prato principal', 'salada')),
    unidade_medida TEXT,
    refeicoes_presente TEXT[] CHECK (refeicoes_presente <@ ARRAY['colação', 'almoço', 'lanche', 'jantar']),
    default_preparation BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA INGREDIENTE_PREPARACAO (Junção N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ingrediente_preparacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    preparacao_id UUID NOT NULL REFERENCES public.preparacoes(id) ON DELETE CASCADE,
    quantidade_por_per_capita DECIMAL(10,3) NOT NULL CHECK (quantidade_por_per_capita > 0),
    unidade_medida TEXT NOT NULL,
    nome_preparacao TEXT,
    nome_ingrediente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ingrediente_id, preparacao_id)
);

-- =====================================================
-- 5. TABELA CARDAPIOS_SEMANAIS (Cardápios semanais)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cardapios_semanais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (data_fim >= data_inicio)
);

-- =====================================================
-- 6. TABELA CARDAPIOS_DO_DIA (Cardápios por data)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cardapios_do_dia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    cardapio_semanal_id UUID REFERENCES public.cardapios_semanais(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, created_by)
);

-- =====================================================
-- 7. TABELA REFEICOES (Refeições do cardápio)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.refeicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('colação', 'almoço', 'lanche', 'jantar')),
    comensais_adultos INTEGER DEFAULT 0 CHECK (comensais_adultos >= 0),
    comensais_adolescentes INTEGER DEFAULT 0 CHECK (comensais_adolescentes >= 0),
    comensais_pequenos INTEGER DEFAULT 0 CHECK (comensais_pequenos >= 0),
    kcal_pequenos FLOAT,
    kcal_adolescentes FLOAT,
    kcal_adultos FLOAT,
    cardapio_id UUID NOT NULL REFERENCES public.cardapios_do_dia(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tipo, cardapio_id)
);

-- =====================================================
-- 8. TABELA REFEICAO_PREPARACOES (Preparações por refeição)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.refeicao_preparacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refeicao_id UUID NOT NULL REFERENCES public.refeicoes(id) ON DELETE CASCADE,
    preparacao_id UUID NOT NULL REFERENCES public.preparacoes(id) ON DELETE CASCADE,
    nome_exibicao TEXT,
    tipo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(refeicao_id, preparacao_id)
);

-- =====================================================
-- 9. TABELA LISTAS_COMPRAS (Listas de compras)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.listas_compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_inicial DATE NOT NULL,
    data_final DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (data_final >= data_inicial)
);

-- =====================================================
-- 10. TABELA INGREDIENTES_ESTOQUE (Controle de estoque)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ingredientes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    quantidade_atual DECIMAL(10,3) DEFAULT 0 CHECK (quantidade_atual >= 0),
    data_atualizacao DATE DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ingrediente_id, created_by)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_ingredientes_created_by ON public.ingredientes(created_by);
CREATE INDEX IF NOT EXISTS idx_ingredientes_tipo ON public.ingredientes(tipo);
CREATE INDEX IF NOT EXISTS idx_preparacoes_created_by ON public.preparacoes(created_by);
CREATE INDEX IF NOT EXISTS idx_preparacoes_tipo ON public.preparacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_cardapios_semanais_created_by ON public.cardapios_semanais(created_by);
CREATE INDEX IF NOT EXISTS idx_cardapios_data ON public.cardapios_do_dia(data);
CREATE INDEX IF NOT EXISTS idx_cardapios_created_by ON public.cardapios_do_dia(created_by);
CREATE INDEX IF NOT EXISTS idx_refeicoes_cardapio_id ON public.refeicoes(cardapio_id);
CREATE INDEX IF NOT EXISTS idx_refeicao_preparacoes_refeicao_id ON public.refeicao_preparacoes(refeicao_id);
CREATE INDEX IF NOT EXISTS idx_refeicao_preparacoes_preparacao_id ON public.refeicao_preparacoes(preparacao_id);
CREATE INDEX IF NOT EXISTS idx_refeicao_preparacoes_tipo ON public.refeicao_preparacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_ingredientes_estoque_ingrediente ON public.ingredientes_estoque(ingrediente_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para tabelas que precisam de updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredientes_updated_at BEFORE UPDATE ON public.ingredientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preparacoes_updated_at BEFORE UPDATE ON public.preparacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cardapios_semanais_updated_at BEFORE UPDATE ON public.cardapios_semanais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cardapios_updated_at BEFORE UPDATE ON public.cardapios_do_dia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refeicoes_updated_at BEFORE UPDATE ON public.refeicoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listas_compras_updated_at BEFORE UPDATE ON public.listas_compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredientes_estoque_updated_at BEFORE UPDATE ON public.ingredientes_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardapios_semanais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardapios_do_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refeicao_preparacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela users
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Políticas para ingredientes
CREATE POLICY "Users can view all ingredients" ON public.ingredientes FOR SELECT USING (true);
CREATE POLICY "Users can manage own ingredients" ON public.ingredientes FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Políticas para preparações
CREATE POLICY "Users can view all preparations" ON public.preparacoes FOR SELECT USING (true);
CREATE POLICY "Users can manage own preparations" ON public.preparacoes FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Políticas para cardápios semanais
CREATE POLICY "Users can manage own weekly menus" ON public.cardapios_semanais FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Políticas para cardápios do dia
CREATE POLICY "Users can manage own daily menus" ON public.cardapios_do_dia FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Políticas para refeições
CREATE POLICY "Users can manage own meals" ON public.refeicoes FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Políticas para refeicao_preparacoes
CREATE POLICY "Users can manage meal preparations" ON public.refeicao_preparacoes FOR ALL USING (
    refeicao_id IN (
        SELECT r.id FROM public.refeicoes r 
        WHERE r.created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

-- Políticas para listas de compras
CREATE POLICY "Users can manage own shopping lists" ON public.listas_compras FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Políticas para estoque de ingredientes
CREATE POLICY "Users can manage own ingredient stock" ON public.ingredientes_estoque FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);