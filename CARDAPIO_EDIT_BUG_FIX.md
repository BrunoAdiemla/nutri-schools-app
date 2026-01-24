# Correção de Bug: Preparações não salvas ao adicionar nova refeição em dias originais

## Data: 24/01/2026

## Problema Identificado

Ao editar um cardápio existente e adicionar uma **nova refeição** (como "Colação" ou "Almoço") em uma **aba/dia original** (que foi criado junto com o cardápio semanal), as preparações selecionadas nos dropdowns **não eram salvas** na tabela `refeicao_preparacoes`.

Porém, quando se adicionava uma nova refeição em um **dia extra** (recém-criado), as preparações **eram salvas corretamente**.

## Causa Raiz

O problema estava na função `createPreparacoesForRefeicao` no arquivo `DatabaseService.ts`.

### Fluxo do Bug

1. **Para dias originais (que já existem no banco):**
   - A função `detectMealChanges` detecta que uma nova refeição foi adicionada
   - Adiciona ao `changeSet.refeicoesToCreate` com o tipo convertido para formato do banco:
     ```typescript
     changeSet.refeicoesToCreate.push({
       tipo: this.convertMealTypeToDatabase(mealType), // ← 'colação', 'almoço'
       dayId: originalDay.id,
       mealData: newDayConfig.meals[mealType],
       userId: userId
     });
     ```
   - Na função `executeChanges`, ao criar a refeição, chama:
     ```typescript
     await this.createPreparacoesForRefeicao(
       newRefeicao.id, 
       refeicaoToCreate.mealData, 
       refeicaoToCreate.tipo  // ← 'colação', 'almoço' (formato do banco)
     );
     ```

2. **O problema:**
   - A função `createPreparacoesForRefeicao` recebia `mealType` no formato do banco (`colação`, `almoço`)
   - Mas chamava `getPreparacaoFieldsForMealType(mealType)` que espera formato interno (`colacao`, `almoco`)
   - Como o switch case não encontrava match, retornava array vazio `[]`
   - Resultado: nenhuma preparação era criada

3. **Por que funcionava para dias extras:**
   - Dias extras seguem outro fluxo através de `createRefeicoesForDay`
   - Essa função passa o `mealType` já no formato interno (`colacao`, `almoco`)
   - Por isso as preparações eram criadas corretamente

## Solução Implementada

Adicionada normalização do `mealType` no início da função `createPreparacoesForRefeicao`:

```typescript
private static async createPreparacoesForRefeicao(
  refeicaoId: string,
  mealData: any,
  mealType: string
): Promise<void> {
  // Convert meal type from database format to internal format if needed
  let normalizedMealType = mealType;
  if (mealType === 'colação') normalizedMealType = 'colacao';
  if (mealType === 'almoço') normalizedMealType = 'almoco';
  
  logger.log(`[DatabaseService] createPreparacoesForRefeicao - Original mealType: "${mealType}", Normalized: "${normalizedMealType}"`);
  
  const preparacaoFields = this.getPreparacaoFieldsForMealType(normalizedMealType);
  // ... resto do código
}
```

## Logs Adicionados

Para facilitar debugging futuro, foram adicionados logs detalhados:
- Log do mealType original e normalizado
- Log dos campos de preparação identificados
- Log dos dados da refeição
- Log de cada campo verificado
- Log de preparações duplicadas ignoradas
- Log de cada preparação criada com sucesso
- Log do total de preparações criadas

## Teste da Correção

Para testar a correção:

1. Criar um cardápio semanal com algumas refeições
2. Editar o cardápio
3. Em uma aba/dia original, adicionar uma nova refeição (ex: Colação)
4. Selecionar preparações nos dropdowns (sólido, líquido, frutas)
5. Salvar o cardápio
6. Verificar no banco de dados que os registros foram criados em `refeicao_preparacoes`

## Arquivos Modificados

- `nutri-schools-app/src/services/DatabaseService.ts`
  - Função `createPreparacoesForRefeicao` (linhas ~1540-1587)

## Impacto

- ✅ Correção não afeta funcionalidades existentes
- ✅ Dias extras continuam funcionando normalmente
- ✅ Agora dias originais também salvam preparações corretamente
- ✅ Logs adicionados facilitam debugging futuro
