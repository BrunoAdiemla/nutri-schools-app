# Guia de Migração: Conversão de Unidades de Medida

## Objetivo
Converter as unidades de medida nas tabelas `ingredientes` e `ingrediente_preparacao` de quilogramas/litros para gramas/mililitros.

## Conversões
- `kg` (quilogramas) → `g` (gramas)
- `l` (litros) → `ml` (mililitros)

## Scripts de Migração

### 1. `database-migration-convert-units-ingredientes.sql`
Converte unidades na tabela **ingredientes** (ingredientes cadastrados)

### 2. `database-migration-convert-units-ingrediente-preparacao.sql`
Converte unidades na tabela **ingrediente_preparacao** (ingredientes associados a preparações)

## ⚠️ IMPORTANTE - Leia Antes de Executar

### Ordem de Execução
**SEMPRE execute os scripts nesta ordem:**
1. Primeiro: `database-migration-convert-units-ingredientes.sql`
2. Depois: `database-migration-convert-units-ingrediente-preparacao.sql`

### 1. Backup dos Dados
**SEMPRE faça backup antes de executar qualquer migração!**

```sql
-- Criar backup da tabela ingredientes
CREATE TABLE ingredientes_backup AS 
SELECT * FROM public.ingredientes;

-- Criar backup da tabela ingrediente_preparacao
CREATE TABLE ingrediente_preparacao_backup AS 
SELECT * FROM public.ingrediente_preparacao;
```

### 2. Verificar Impacto

#### Tabela ingredientes:
```sql
-- Ver quantos ingredientes usam 'kg'
SELECT COUNT(*) as total_kg 
FROM public.ingredientes 
WHERE unidade_medida = 'kg';

-- Ver quantos ingredientes usam 'l'
SELECT COUNT(*) as total_l 
FROM public.ingredientes 
WHERE unidade_medida = 'l';

-- Ver distribuição atual de unidades
SELECT unidade_medida, COUNT(*) as total
FROM public.ingredientes
GROUP BY unidade_medida
ORDER BY unidade_medida;
```

#### Tabela ingrediente_preparacao:
```sql
-- Ver quantos registros usam 'kg'
SELECT COUNT(*) as total_kg 
FROM public.ingrediente_preparacao 
WHERE unidade_medida = 'kg';

-- Ver quantos registros usam 'l'
SELECT COUNT(*) as total_l 
FROM public.ingrediente_preparacao 
WHERE unidade_medida = 'l';

-- Ver distribuição atual de unidades
SELECT unidade_medida, COUNT(*) as total
FROM public.ingrediente_preparacao
GROUP BY unidade_medida
ORDER BY unidade_medida;
```

## Executando a Migração

### Passo 1: Abrir SQL Editor no Supabase
1. Acesse o Supabase Dashboard
2. Vá para "SQL Editor"
3. Clique em "New Query"

### Passo 2: Executar Script 1 (ingredientes)
1. Copie e cole o conteúdo de `database-migration-convert-units-ingredientes.sql`
2. Execute o script
3. Verifique os resultados (veja seção "Verificar Resultados" abaixo)

### Passo 3: Executar Script 2 (ingrediente_preparacao)
1. Copie e cole o conteúdo de `database-migration-convert-units-ingrediente-preparacao.sql`
2. Execute o script
3. Verifique os resultados (veja seção "Verificar Resultados" abaixo)

### Passo 4: Verificar Resultados

#### Tabela ingredientes:
```sql
-- Verificar se não há mais 'kg' ou 'l'
SELECT unidade_medida, COUNT(*) as total
FROM public.ingredientes
GROUP BY unidade_medida
ORDER BY unidade_medida;

-- Resultado esperado:
-- unidade_medida | total
-- ---------------+-------
-- g              | X
-- ml             | Y
-- (outras unidades se houver)
```

#### Tabela ingrediente_preparacao:
```sql
-- Verificar se não há mais 'kg' ou 'l'
SELECT unidade_medida, COUNT(*) as total
FROM public.ingrediente_preparacao
GROUP BY unidade_medida
ORDER BY unidade_medida;

-- Resultado esperado:
-- unidade_medida | total
-- ---------------+-------
-- g              | X
-- ml             | Y
```

## O Que NÃO é Alterado

### ✅ Valores de Calorias Permanecem Iguais
Os valores na coluna `kcal_por_100g_ou_100ml` **NÃO são alterados** porque:
- Já estão normalizados por 100g ou 100ml
- A conversão de unidade não afeta o valor calórico por 100g/100ml
- Exemplo: 130 kcal/100g continua sendo 130 kcal/100g

### ✅ Valores de Quantidade Permanecem Iguais
Os valores na coluna `quantidade_por_per_capita` **NÃO são alterados** porque:
- Representam quantidades específicas já definidas
- A conversão é apenas da unidade de medida, não do valor
- Exemplo: 0.150 kg vira 0.150 g (o número permanece, apenas a unidade muda)

## Impacto no Sistema

### Frontend
- Modal "Adicionar Ingrediente" já foi atualizado para usar 'g' e 'ml'
- Modal "Adicionar Preparação" já usa as unidades dos ingredientes selecionados
- Ingredientes existentes serão exibidos com as novas unidades após a migração

### Backend
- Nenhuma alteração necessária no código
- O tipo `UnidadeMedida` já suporta 'g' e 'ml'

## Rollback (Reverter Migração)

Se precisar reverter a migração:

```sql
-- Restaurar ingredientes do backup
DELETE FROM public.ingredientes;
INSERT INTO public.ingredientes
SELECT * FROM ingredientes_backup;

-- Restaurar ingrediente_preparacao do backup
DELETE FROM public.ingrediente_preparacao;
INSERT INTO public.ingrediente_preparacao
SELECT * FROM ingrediente_preparacao_backup;

-- Remover backups após confirmar (OPCIONAL)
DROP TABLE ingredientes_backup;
DROP TABLE ingrediente_preparacao_backup;
```

## Checklist de Execução

- [ ] Backup da tabela `ingredientes` criado
- [ ] Backup da tabela `ingrediente_preparacao` criado
- [ ] Queries de verificação executadas para ambas as tabelas
- [ ] Impacto analisado e aprovado
- [ ] Script 1 (ingredientes) executado
- [ ] Resultados do Script 1 verificados
- [ ] Script 2 (ingrediente_preparacao) executado
- [ ] Resultados do Script 2 verificados
- [ ] Testes no frontend realizados
- [ ] Backups removidos (após confirmação completa)

## Exemplo Prático

### Tabela ingredientes

#### Antes da Migração
```
id | nome          | unidade_medida | kcal_por_100g_ou_100ml
---+---------------+----------------+-----------------------
1  | Arroz Integral| kg             | 130.00
2  | Leite Integral| l              | 61.00
```

#### Depois da Migração
```
id | nome          | unidade_medida | kcal_por_100g_ou_100ml
---+---------------+----------------+-----------------------
1  | Arroz Integral| g              | 130.00
2  | Leite Integral| ml             | 61.00
```

### Tabela ingrediente_preparacao

#### Antes da Migração
```
id | ingrediente_id | preparacao_id | quantidade_por_per_capita | unidade_medida
---+----------------+---------------+---------------------------+----------------
1  | uuid-1         | uuid-a        | 0.150                     | kg
2  | uuid-2         | uuid-b        | 0.200                     | l
```

#### Depois da Migração
```
id | ingrediente_id | preparacao_id | quantidade_por_per_capita | unidade_medida
---+----------------+---------------+---------------------------+----------------
1  | uuid-1         | uuid-a        | 0.150                     | g
2  | uuid-2         | uuid-b        | 0.200                     | ml
```

**Observe:** Apenas a coluna `unidade_medida` mudou. Os valores numéricos permanecem os mesmos!

## Suporte

Se encontrar problemas durante a migração:
1. NÃO execute os scripts novamente
2. Verifique os logs de erro no Supabase
3. Restaure dos backups se necessário
4. Revise os scripts antes de tentar novamente

## Arquivos Relacionados
- `database-migration-convert-units-ingredientes.sql` - Script para tabela ingredientes
- `database-migration-convert-units-ingrediente-preparacao.sql` - Script para tabela ingrediente_preparacao
- `src/components/IngredientModal.tsx` - Modal de ingredientes atualizado
- `src/components/PreparacaoModal.tsx` - Modal de preparações atualizado
- `INGREDIENT_MODAL_UNIT_UPDATE.md` - Documentação das alterações no frontend
