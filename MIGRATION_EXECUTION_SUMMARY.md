# Resumo Executivo: Migração de Unidades de Medida

## 🎯 Objetivo
Converter todas as unidades de medida de kg/l para g/ml nas tabelas `ingredientes` e `ingrediente_preparacao`.

## 📋 Checklist Rápido

### Antes de Começar
- [ ] Ler o guia completo: `UNIT_CONVERSION_MIGRATION_GUIDE.md`
- [ ] Fazer backup das duas tabelas
- [ ] Verificar impacto com queries de contagem

### Execução
- [ ] Executar Script 1: `database-migration-convert-units-ingredientes.sql`
- [ ] Verificar resultados do Script 1
- [ ] Executar Script 2: `database-migration-convert-units-ingrediente-preparacao.sql`
- [ ] Verificar resultados do Script 2

### Após Execução
- [ ] Testar frontend (criar/editar ingredientes e preparações)
- [ ] Confirmar que tudo funciona corretamente
- [ ] Remover backups (opcional, após confirmação)

## 🚀 Execução Rápida

### 1. Criar Backups
```sql
CREATE TABLE ingredientes_backup AS 
SELECT * FROM public.ingredientes;

CREATE TABLE ingrediente_preparacao_backup AS 
SELECT * FROM public.ingrediente_preparacao;
```

### 2. Verificar Impacto
```sql
-- Ingredientes
SELECT unidade_medida, COUNT(*) FROM public.ingredientes GROUP BY unidade_medida;

-- Ingrediente_Preparacao
SELECT unidade_medida, COUNT(*) FROM public.ingrediente_preparacao GROUP BY unidade_medida;
```

### 3. Executar Migrações (NESTA ORDEM!)

#### Script 1: ingredientes
```sql
UPDATE public.ingredientes SET unidade_medida = 'g', updated_at = NOW() WHERE unidade_medida = 'kg';
UPDATE public.ingredientes SET unidade_medida = 'ml', updated_at = NOW() WHERE unidade_medida = 'l';
```

#### Script 2: ingrediente_preparacao
```sql
UPDATE public.ingrediente_preparacao SET unidade_medida = 'g' WHERE unidade_medida = 'kg';
UPDATE public.ingrediente_preparacao SET unidade_medida = 'ml' WHERE unidade_medida = 'l';
```

### 4. Verificar Resultados
```sql
-- Não deve retornar 'kg' ou 'l'
SELECT unidade_medida, COUNT(*) FROM public.ingredientes GROUP BY unidade_medida;
SELECT unidade_medida, COUNT(*) FROM public.ingrediente_preparacao GROUP BY unidade_medida;
```

## ⚠️ Avisos Importantes

1. **Execute os scripts NESTA ORDEM**: primeiro ingredientes, depois ingrediente_preparacao
2. **Execute apenas UMA vez** cada script
3. **Faça backup** antes de executar
4. **Valores numéricos NÃO mudam** - apenas as unidades de medida
5. **Valores de calorias NÃO mudam** - já estão por 100g/100ml

## 🔄 Rollback (Se Necessário)
```sql
DELETE FROM public.ingredientes;
INSERT INTO public.ingredientes SELECT * FROM ingredientes_backup;

DELETE FROM public.ingrediente_preparacao;
INSERT INTO public.ingrediente_preparacao SELECT * FROM ingrediente_preparacao_backup;
```

## 📁 Arquivos
- `database-migration-convert-units-ingredientes.sql` - Script completo para ingredientes
- `database-migration-convert-units-ingrediente-preparacao.sql` - Script completo para ingrediente_preparacao
- `UNIT_CONVERSION_MIGRATION_GUIDE.md` - Guia detalhado completo

## ✅ Resultado Esperado

### Antes
- Ingredientes com unidade_medida: `kg`, `l`
- Ingrediente_preparacao com unidade_medida: `kg`, `l`

### Depois
- Ingredientes com unidade_medida: `g`, `ml`
- Ingrediente_preparacao com unidade_medida: `g`, `ml`
- Todos os valores numéricos permanecem iguais
- Sistema funcionando normalmente
