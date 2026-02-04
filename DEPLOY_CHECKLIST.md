# ✅ Checklist de Deploy - AWS Amplify

## Antes de Começar

- [ ] **Repositório GitHub atualizado** com todas as mudanças
- [ ] **Build local funcionando**: `npm run build` sem erros
- [ ] **Projeto testado localmente**: `npm run preview`

## Arquivos Criados ✅

- [x] `amplify.yml` - Configuração de build do Amplify
- [x] `public/_redirects` - Redirects para SPA
- [x] `AWS_AMPLIFY_DEPLOYMENT_GUIDE.md` - Guia completo

## Passos no AWS Console

### 1. Acessar AWS Amplify
- [ ] Fazer login no [AWS Console](https://console.aws.amazon.com/)
- [ ] Procurar por "Amplify" nos serviços
- [ ] Clicar em "Create new app" > "Host web app"

### 2. Conectar GitHub
- [ ] Selecionar "GitHub" como source provider
- [ ] Autorizar AWS Amplify a acessar sua conta GitHub
- [ ] Selecionar o repositório do NutriSchools
- [ ] Selecionar a branch principal (main/master)

### 3. Configurar Build
- [ ] App name: `nutri-schools`
- [ ] Environment: `production`
- [ ] Verificar se detectou o `amplify.yml` automaticamente

### 4. Variáveis de Ambiente ⚠️ IMPORTANTE
- [ ] `VITE_SUPABASE_URL`: `https://vukvmlqxzuifttuzszja.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1a3ZtbHF4enVpZnR0dXpzemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMDI0OTgsImV4cCI6MjA4MTY3ODQ5OH0.HeO76-yxP8IGE2BkJ8Slbqpggn-RXohCWFXmWJHlOaQ`
- [ ] `VITE_APP_ENV`: `production`

### 5. Deploy
- [ ] Clicar em "Save and deploy"
- [ ] Aguardar o build (5-10 minutos)
- [ ] Verificar se não há erros nos logs

## Após o Deploy

### 6. Configurar Supabase
- [ ] Acessar [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Settings > Authentication
- [ ] Adicionar a URL do Amplify em "Site URL"
- [ ] Adicionar em "Redirect URLs": `https://sua-app.amplifyapp.com/**`

### 7. Testar Aplicação
- [ ] Acessar a URL fornecida pelo Amplify
- [ ] Testar login/registro
- [ ] Testar funcionalidades principais
- [ ] Verificar se não há erros no console do browser

### 8. Configurações Opcionais
- [ ] Configurar domínio personalizado (se tiver)
- [ ] Configurar notificações de build
- [ ] Configurar branch protection

## URLs Importantes

- **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
- **Supabase Dashboard**: https://supabase.com/dashboard

## Em Caso de Problemas

### Build Falha
1. Verificar logs de build no Amplify
2. Corrigir erros de TypeScript/ESLint
3. Fazer novo commit e push

### Página em Branco
1. Verificar variáveis de ambiente
2. Verificar console do browser
3. Verificar se `_redirects` está funcionando

### Autenticação Não Funciona
1. Verificar URLs no Supabase
2. Verificar variáveis de ambiente
3. Verificar HTTPS

## Comandos Úteis

```bash
# Testar build local
npm run build
npm run preview

# Verificar se não há erros
npm run lint

# Fazer commit das mudanças
git add .
git commit -m "feat: add AWS Amplify configuration"
git push origin main
```

---

**Próximo passo**: Seguir o guia detalhado em `AWS_AMPLIFY_DEPLOYMENT_GUIDE.md`