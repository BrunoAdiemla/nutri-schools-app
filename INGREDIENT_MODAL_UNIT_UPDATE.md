# Atualização: Unidades de Medida no Modal de Ingredientes

## Resumo
Alteração das opções de unidade de medida no modal "Adicionar Ingrediente" para usar gramas (g) e mililitros (ml) ao invés de quilogramas (kg) e litros (l).

## Alterações Realizadas

### Arquivo: `src/components/IngredientModal.tsx`

#### 1. Constante MEASUREMENT_UNITS
**Antes:**
```typescript
const MEASUREMENT_UNITS: { value: UnidadeMedida; label: string }[] = [
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'l', label: 'Litros (l)' }
];
```

**Depois:**
```typescript
const MEASUREMENT_UNITS: { value: UnidadeMedida; label: string }[] = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'ml', label: 'Mililitros (ml)' }
];
```

#### 2. Função getCalorieLabel()
**Antes:**
```typescript
switch (formData.unidade_medida) {
  case 'kg':
    return 'Calorias por 100g';
  case 'l':
    return 'Calorias por 100ml';
  default:
    return 'Calorias';
}
```

**Depois:**
```typescript
switch (formData.unidade_medida) {
  case 'g':
    return 'Calorias por 100g';
  case 'ml':
    return 'Calorias por 100ml';
  default:
    return 'Calorias';
}
```

## Impacto

### Interface do Usuário
- O dropdown "Unidade de Medida" agora exibe:
  - ✅ Gramas (g)
  - ✅ Mililitros (ml)
  - ❌ Quilogramas (kg) - removido
  - ❌ Litros (l) - removido

### Labels Dinâmicos
- Ao selecionar "Gramas (g)": label muda para "Calorias por 100g"
- Ao selecionar "Mililitros (ml)": label muda para "Calorias por 100ml"

### Compatibilidade
- O tipo `UnidadeMedida` já suporta 'g' e 'ml' (além de 'kg', 'l', 'unidade', 'xícara', 'colher')
- Ingredientes existentes com 'kg' ou 'l' continuam funcionando normalmente
- Novos ingredientes só poderão ser criados com 'g' ou 'ml'

## Observações

### Dados Existentes
- Ingredientes já cadastrados com 'kg' ou 'l' **não serão afetados**
- Esses ingredientes continuarão funcionando normalmente
- Apenas novos ingredientes terão as opções limitadas a 'g' e 'ml'

### Conversão de Unidades
- Se houver necessidade de converter ingredientes existentes de kg→g ou l→ml, será necessário:
  1. Script de migração de dados
  2. Atualização dos valores de `kcal_por_100g_ou_100ml` (se necessário)

## Status
✅ Implementação completa
✅ Sem erros de compilação
✅ Pronto para uso

## Arquivos Modificados
- ✅ `src/components/IngredientModal.tsx`
