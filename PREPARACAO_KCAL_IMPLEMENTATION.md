# Implementação: Armazenamento de kcal_por_100g_ou_100ml em ingrediente_preparacao

## Resumo
Implementação da funcionalidade para capturar e armazenar o valor calórico (`kcal_por_100g_ou_100ml`) dos ingredientes no momento da criação/edição de preparações.

## Alterações Realizadas

### 1. Database Schema
**Arquivo:** `database-migration-add-kcal-ingrediente-preparacao.sql`
- Criado script de migração para adicionar coluna `kcal_por_100g_ou_100ml` na tabela `ingrediente_preparacao`
- Tipo: `DECIMAL(10,2)` com constraint para valores não negativos
- Comentário explicativo adicionado

**Arquivo:** `database-setup.sql`
- Atualizada definição da tabela `ingrediente_preparacao` para incluir a nova coluna

### 2. Frontend - PreparacaoModal.tsx

#### Interface IngredientePreparacao
```typescript
interface IngredientePreparacao {
  ingrediente_id: string;
  nome: string;
  quantidade_por_per_capita: number;
  unidade_medida: UnidadeMedida;
  kcal_por_100g_ou_100ml?: number; // ✅ NOVO CAMPO
}
```

#### Função handleAddIngrediente
- Modificada para capturar `kcal_por_100g_ou_100ml` do ingrediente selecionado
- O valor é obtido de `ingrediente.kcal_por_100g_ou_100ml` ao adicionar ingrediente à lista

#### useEffect - loadPreparacaoIngredientes
- Atualizado para incluir `kcal_por_100g_ou_100ml` ao carregar ingredientes existentes durante edição
- Garante que o valor calórico seja preservado ao editar preparações

### 3. Backend - DatabaseService.ts

#### Método createPreparacao
- Modificado para incluir `kcal_por_100g_ou_100ml` ao criar registros em `ingrediente_preparacao`
- O valor é mapeado de `ingrediente.kcal_por_100g_ou_100ml` para o banco de dados

#### Método updatePreparacao
- Modificado para incluir `kcal_por_100g_ou_100ml` ao atualizar registros em `ingrediente_preparacao`
- Garante consistência ao editar preparações existentes

#### Método getPreparacaoIngredientes
- Já estava buscando `kcal_por_100g_ou_100ml` da tabela `ingredientes`
- Nenhuma alteração necessária

## Fluxo de Dados

### Criação de Preparação
1. Usuário seleciona ingrediente no dropdown
2. Sistema captura `kcal_por_100g_ou_100ml` do ingrediente selecionado
3. Ao clicar "Adicionar", o valor é incluído no objeto `IngredientePreparacao`
4. Ao salvar a preparação, o valor é persistido na tabela `ingrediente_preparacao`

### Edição de Preparação
1. Sistema carrega ingredientes existentes da preparação
2. Para cada ingrediente, busca `kcal_por_100g_ou_100ml` da tabela `ingredientes`
3. Valores são exibidos no formulário
4. Ao salvar, valores atualizados são persistidos

## Benefícios

1. **Histórico Consistente**: Valor calórico é armazenado no momento da associação, preservando dados históricos mesmo se o ingrediente for alterado posteriormente

2. **Cálculos Precisos**: Permite cálculos calóricos precisos baseados nos valores no momento da criação da preparação

3. **Auditoria**: Facilita auditoria e rastreamento de mudanças nos valores nutricionais

## Próximos Passos

Para utilizar essa funcionalidade:

1. Execute o script de migração no Supabase:
   ```sql
   -- Execute: database-migration-add-kcal-ingrediente-preparacao.sql
   ```

2. Teste a funcionalidade:
   - Crie uma nova preparação com ingredientes
   - Verifique se `kcal_por_100g_ou_100ml` é salvo corretamente
   - Edite a preparação e verifique se os valores são preservados

3. Implemente cálculos calóricos usando os valores armazenados em `ingrediente_preparacao`

## Arquivos Modificados

- ✅ `database-migration-add-kcal-ingrediente-preparacao.sql` (NOVO)
- ✅ `database-setup.sql`
- ✅ `src/components/PreparacaoModal.tsx`
- ✅ `src/services/DatabaseService.ts`

## Status
✅ Implementação completa
✅ Sem erros de compilação
⏳ Aguardando execução do script de migração no banco de dados
