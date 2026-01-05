-- =====================================================
-- DIAGNÓSTICO - VERIFICAR ESTADO DO USUÁRIO E POLÍTICAS
-- =====================================================

-- 1. Verificar se o usuário atual tem perfil na tabela users
SELECT 
    'Usuário autenticado:' as info,
    auth.uid() as auth_user_id;

-- 2. Verificar se existe perfil para o usuário atual
SELECT 
    'Perfil do usuário:' as info,
    id,
    nome,
    email,
    auth_user_id
FROM public.users 
WHERE auth_user_id = auth.uid();

-- 3. Verificar políticas RLS ativas na tabela preparacoes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'preparacoes';

-- 4. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'preparacoes';

-- 5. Testar a subconsulta da política
SELECT 
    'Resultado da subconsulta da política:' as info,
    (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) as user_id_from_policy;