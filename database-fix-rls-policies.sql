-- =====================================================
-- FIX RLS POLICIES - PREPARACOES TABLE
-- =====================================================
-- Este script corrige as políticas RLS para permitir que usuários
-- criem preparações mesmo se não tiverem perfil completo na tabela users

-- Remover políticas existentes para preparacoes
DROP POLICY IF EXISTS "Users can view own preparations and defaults" ON public.preparacoes;
DROP POLICY IF EXISTS "Users can insert own preparations" ON public.preparacoes;
DROP POLICY IF EXISTS "Users can update own preparations" ON public.preparacoes;
DROP POLICY IF EXISTS "Users can delete own preparations" ON public.preparacoes;

-- Criar novas políticas mais robustas para PREPARACOES
-- Política para SELECT: permite ver preparações padrão e próprias
CREATE POLICY "Users can view own preparations and defaults" ON public.preparacoes FOR SELECT USING (
    default_preparation = true OR 
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Política para INSERT: permite inserir se o created_by corresponde ao usuário logado
CREATE POLICY "Users can insert own preparations" ON public.preparacoes FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Política para UPDATE: permite atualizar apenas preparações próprias
CREATE POLICY "Users can update own preparations" ON public.preparacoes FOR UPDATE USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Política para DELETE: permite deletar apenas preparações próprias
CREATE POLICY "Users can delete own preparations" ON public.preparacoes FOR DELETE USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- =====================================================
-- VERIFICAR SE O USUÁRIO TEM PERFIL NA TABELA USERS
-- =====================================================
-- Esta query pode ser usada para verificar se o usuário atual tem perfil
-- SELECT id FROM public.users WHERE auth_user_id = auth.uid();

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================