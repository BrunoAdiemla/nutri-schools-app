# Guia de Deploy no AWS Amplify - NutriSchools

## Pré-requisitos

✅ **Projeto já configurado:**
- ✅ Repositório GitHub atualizado
- ✅ Projeto React + Vite funcionando
- ✅ Supabase configurado
- ✅ Variáveis de ambiente definidas

## Passo 1: Preparar o Projeto para Produção

### 1.1 Verificar Build de Produção

Primeiro, teste se o build funciona localmente:

```bash
cd nutri-schools-app
npm run build
```

Se houver erros, corrija-os antes de continuar.

### 1.2 Criar Arquivo de Configuração do Amplify

Crie o arquivo `amplify.yml` na raiz do projeto:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### 1.3 Configurar Variáveis de Ambiente para Produção

Crie um arquivo `.env.production` (não commitado):

```env
VITE_SUPABASE_URL=https://vukvmlqxzuifttuzszja.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1a3ZtbHF4enVpZnR0dXpzemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMDI0OTgsImV4cCI6MjA4MTY3ODQ5OH0.HeO76-yxP8IGE2BkJ8Slbqpggn-RXohCWFXmWJHlOaQ
VITE_APP_ENV=production
```

### 1.4 Atualizar .gitignore

Certifique-se que o `.gitignore` inclui:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production
```

## Passo 2: Configurar AWS Amplify

### 2.1 Acessar o Console AWS

1. Acesse [AWS Console](https://console.aws.amazon.com/)
2. Faça login na sua conta AWS
3. Procure por "Amplify" nos serviços

### 2.2 Criar Nova Aplicação

1. No AWS Amplify, clique em **"Create new app"**
2. Selecione **"Host web app"**
3. Escolha **"GitHub"** como source provider
4. Clique em **"Continue"**

### 2.3 Conectar Repositório

1. **Autorize o AWS Amplify** a acessar sua conta GitHub
2. **Selecione o repositório** do NutriSchools
3. **Selecione a branch** (geralmente `main` ou `master`)
4. Clique em **"Next"**

### 2.4 Configurar Build Settings

1. **App name**: `nutri-schools`
2. **Environment name**: `production`
3. **Build and test settings**: O Amplify deve detectar automaticamente que é um projeto Vite
4. Se não detectar, cole a configuração do `amplify.yml` criado anteriormente
5. Clique em **"Next"**

### 2.5 Configurar Variáveis de Ambiente

**IMPORTANTE**: Antes de fazer o deploy, configure as variáveis de ambiente:

1. Na seção **"Environment variables"**, adicione:
   - `VITE_SUPABASE_URL`: `https://vukvmlqxzuifttuzszja.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1a3ZtbHF4enVpZnR0dXpzemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMDI0OTgsImV4cCI6MjA4MTY3ODQ5OH0.HeO76-yxP8IGE2BkJ8Slbqpggn-RXohCWFXmWJHlOaQ`
   - `VITE_APP_ENV`: `production`

2. Clique em **"Next"**

### 2.6 Review e Deploy

1. **Revise todas as configurações**
2. Clique em **"Save and deploy"**
3. **Aguarde o primeiro build** (pode levar 5-10 minutos)

## Passo 3: Configurações Pós-Deploy

### 3.1 Configurar Domínio Personalizado (Opcional)

1. Na aba **"Domain management"**
2. Clique em **"Add domain"**
3. Configure seu domínio personalizado se tiver

### 3.2 Configurar Redirects para SPA

Como é uma Single Page Application (SPA), configure redirects:

1. Vá para **"Rewrites and redirects"**
2. Adicione a regra:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`

### 3.3 Configurar HTTPS

O Amplify configura HTTPS automaticamente, mas verifique:

1. Na aba **"Domain management"**
2. Certifique-se que o SSL está ativo

## Passo 4: Configurar Supabase para Produção

### 4.1 Atualizar URLs Permitidas no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **Settings > Authentication**
3. Em **"Site URL"**, adicione a URL do Amplify
4. Em **"Redirect URLs"**, adicione:
   - `https://sua-app.amplifyapp.com`
   - `https://sua-app.amplifyapp.com/**`

### 4.2 Configurar RLS (Row Level Security)

Certifique-se que as políticas RLS estão configuradas corretamente para produção.

## Passo 5: Monitoramento e Logs

### 5.1 Verificar Logs de Build

1. Na aba **"Build history"**
2. Clique no build mais recente
3. Verifique se não há erros

### 5.2 Configurar Notificações

1. Configure notificações por email para builds falhados
2. Configure webhooks se necessário

## Comandos Úteis

### Build Local para Teste
```bash
npm run build
npm run preview
```

### Verificar Variáveis de Ambiente
```bash
echo $VITE_SUPABASE_URL
```

## Troubleshooting Comum

### Problema: Build Falha
**Solução**: Verifique os logs de build no Amplify e corrija erros de TypeScript/ESLint

### Problema: Página em Branco
**Solução**: 
1. Verifique se as variáveis de ambiente estão configuradas
2. Verifique se o redirect para SPA está configurado
3. Verifique o console do browser para erros

### Problema: Erro de CORS
**Solução**: Configure as URLs permitidas no Supabase

### Problema: Autenticação Não Funciona
**Solução**: 
1. Verifique as redirect URLs no Supabase
2. Certifique-se que a Site URL está correta

## Estrutura de Arquivos Necessária

```
nutri-schools-app/
├── amplify.yml                 # Configuração do Amplify
├── package.json               # Scripts e dependências
├── vite.config.ts            # Configuração do Vite
├── .env.production           # Variáveis de produção (não commitado)
├── .gitignore               # Arquivos ignorados
└── src/                     # Código fonte
```

## URLs Importantes

- **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Documentação Amplify**: https://docs.amplify.aws/

## Próximos Passos Após Deploy

1. ✅ Testar todas as funcionalidades em produção
2. ✅ Configurar monitoramento de erros
3. ✅ Configurar backup do banco de dados
4. ✅ Configurar CI/CD para deploys automáticos
5. ✅ Configurar domínio personalizado
6. ✅ Configurar SSL/TLS
7. ✅ Otimizar performance (CDN, cache)

## Custos Estimados

- **AWS Amplify**: ~$1-5/mês para aplicações pequenas
- **Supabase**: Gratuito até 500MB de banco + 2GB de transferência
- **Domínio personalizado**: ~$10-15/ano (opcional)

---

**Nota**: Este guia assume que você já tem uma conta AWS. Se não tiver, será necessário criar uma e configurar billing.