# Atualização: Precisão da Quantidade por Per Capita

## Resumo
Alteração da precisão da coluna `quantidade_por_per_capita` na tabela `ingrediente_preparacao` de 3 casas decimais para 1 casa decimal.

## Alterações Realizadas

### 1. Database Schema

#### Script de Migração: `database-migration-change-quantidade-precision.sql`
- Altera o tipo da coluna de `DECIMAL(10,3)` para `DECIMAL(10,1)`
- Valores existentes serão arredondados automaticamente

#### Arquivo: `database-setup.sql`
**Antes:**
```sql
quantidade_por_per_capita DECIMAL(10,3) NOT NULL CHECK (quantidade_por_per_capita > 0)
```

**Depois:**
```sql
quantidade_por_per_capita DECIMAL(10,1) NOT NULL CHECK (quantidade_por_per_capita > 0)
```

### 2. Frontend - PreparacaoModal.tsx

#### Placeholder do Input
**Antes:** `placeholder="0.000"`
**Depois:** `placeholder="0.0"`

#### Validação do Input (Regex)
**Antes:**
```typescript
// Allow numbers with up to three decimal places
const regex = /^\d*\.?\d{0,3}$/;
```

**Depois:**
```typescript
// Allow numbers with up to one decimal place
const regex = /^\d*\.?\d{0,1}$/;
```

## Impacto

### Valores Existentes
Valores com mais de 1 casa decimal serão arredondados:
- `100.567` → `100.6`
- `40.123` → `40.1`
- `75.999` → `76.0`
- `50.5` → `50.5` (sem mudança)

### Novos Valores
- Usuários só poderão inserir valores com até 1 casa decimal
- Exemplos válidos: `100.5`, `40.0`, `75.9`
- Exemplos inválidos: `100.55`, `40.123`

### Interface do Usuário
- Placeholder mudou de "0.000" para "0.0"
- Input aceita apenas 1 dígito após o ponto decimal
- Validação em tempo real impede entrada de mais casas decimais

## Executando a Migração

### Passo 1: Backup
```sql
CREATE TABLE ingrediente_preparacao_backup AS 
SELECT * FROM public.ingrediente_preparacao;
```

### Passo 2: Verificar Dados Atuais
```sql
SELECT id, quantidade_por_per_capita, unidade_medida
FROM public.ingrediente_preparacao
WHERE quantidade_por_per_capita::text LIKE '%.___'
LIMIT 20;
```

### Passo 3: Executar Migração
Execute o script `database-migration-change-quantidade-precision.sql` no SQL Editor do Supabase.

### Passo 4: Verificar Resultados
```sql
-- Ver exemplos de valores após migração
SELECT id, quantidade_por_per_capita, unidade_medida
FROM public.ingrediente_preparacao
LIMIT 10;

-- Verificar se há valores com mais de 1 casa decimal (não deve retornar nada)
SELECT COUNT(*) 
FROM public.ingrediente_preparacao
WHERE quantidade_por_per_capita::text LIKE '%.___';
```

## Rollback (Se Necessário)

```sql
-- Restaurar do backup
DELETE FROM public.ingrediente_preparacao;
INSERT INTO public.ingrediente_preparacao
SELECT * FROM ingrediente_preparacao_backup;

-- Reverter tipo da coluna
ALTER TABLE public.ingrediente_preparacao
ALTER COLUMN quantidade_por_per_capita TYPE DECIMAL(10,3);

-- Remover backup
DROP TABLE ingrediente_preparacao_backup;
```

## Benefícios

1. **Simplicidade**: Valores mais simples e fáceis de ler (100.5 ao invés de 100.567)
2. **Consistência**: Alinhado com outras medidas do sistema
3. **UX Melhorada**: Placeholder mais claro e validação mais intuitiva
4. **Precisão Adequada**: 1 casa decimal é suficiente para quantidades per capita

## Observações

- Esta alteração **não afeta** a coluna `kcal_por_100g_ou_100ml` que continua com 2 casas decimais
- Valores são arredondados usando regras padrão do PostgreSQL (0.5 arredonda para cima)
- A validação no frontend impede entrada de valores inválidos antes de salvar

## Status
✅ Script SQL criado
✅ database-setup.sql atualizado
✅ PreparacaoModal.tsx atualizado (placeholder e validação)
✅ Sem erros de compilação
⏳ Aguardando execução do script de migração no banco de dados

## Arquivos Modificados
- ✅ `database-migration-change-quantidade-precision.sql` (NOVO)
- ✅ `database-setup.sql`
- ✅ `src/components/PreparacaoModal.tsx`
