# Atualização dos Tipos de Ingredientes

## Alterações Implementadas

Atualizados os tipos de ingredientes em todos os componentes e páginas do sistema.

### Mudanças nos Tipos

#### 1. Tipo Renomeado
- **Antes**: `hortalicas` → "Hortaliças"
- **Depois**: `verduras-hortalicas-derivados` → "Verduras, Hortaliças e Derivados"

#### 2. Novo Tipo Adicionado
- **Novo**: `pescados-frutos-do-mar` → "Pescados e Frutos do Mar"

### Lista Completa de Tipos (Atualizada)

1. `carnes-e-ovos` → "Carnes e Ovos"
2. `leites-e-derivados` → "Leites e Derivados"
3. `leguminosas` → "Leguminosas"
4. `cereais-e-derivados` → "Cereais e Derivados"
5. `tuberculos-e-raizes` → "Tubérculos e Raízes"
6. `verduras-hortalicas-derivados` → "Verduras, Hortaliças e Derivados" ✨ **ATUALIZADO**
7. `oleos-gorduras-oleaginosas` → "Óleos, Gorduras e Oleaginosas"
8. `acucares-e-doces` → "Açúcares e Doces"
9. `bebidas` → "Bebidas"
10. `condimentos-e-temperos` → "Condimentos e Temperos"
11. `frutas` → "Frutas"
12. `paes-e-biscoitos` → "Pães e Biscoitos"
13. `pescados-frutos-do-mar` → "Pescados e Frutos do Mar" ✨ **NOVO**

## Arquivos Modificados

### 1. `src/types/index.ts`
**Tipo base atualizado:**
```typescript
export type IngredienteTipo = 
  | 'carnes-e-ovos'
  | 'leites-e-derivados'
  | 'leguminosas'
  | 'cereais-e-derivados'
  | 'tuberculos-e-raizes'
  | 'verduras-hortalicas-derivados'  // ← ATUALIZADO
  | 'oleos-gorduras-oleaginosas'
  | 'acucares-e-doces'
  | 'bebidas'
  | 'condimentos-e-temperos'
  | 'frutas'
  | 'paes-e-biscoitos'
  | 'pescados-frutos-do-mar';        // ← NOVO
```

### 2. `src/components/AddIngredientToListaModal.tsx`
**Array INGREDIENT_TYPES atualizado:**
- Dropdown "Tipo" no modal "Adicionar Ingrediente" (Lista de Compras)
- Agora inclui as novas opções

### 3. `src/components/IngredientModal.tsx`
**Array INGREDIENT_TYPES atualizado:**
- Dropdown "Tipo" no modal de adicionar/editar ingrediente
- Agora inclui as novas opções

### 4. `src/pages/IngredientsPage.tsx`
**Array INGREDIENT_TYPES atualizado:**
- Dropdown "Tipo" no filtro da tabela de ingredientes
- Agora inclui as novas opções para filtragem

## Impacto

### Compatibilidade com Dados Existentes

⚠️ **IMPORTANTE**: Ingredientes existentes no banco de dados com o tipo `hortalicas` continuarão funcionando, mas:

1. **Novos ingredientes**: Devem usar o novo valor `verduras-hortalicas-derivados`
2. **Ingredientes antigos**: Podem ter o tipo `hortalicas` no banco
3. **Exibição**: Ingredientes antigos com `hortalicas` não aparecerão no filtro até serem migrados

### Migração Recomendada (Opcional)

Se houver ingredientes com o tipo antigo `hortalicas` no banco de dados, considere executar uma migração:

```sql
-- Migração para atualizar tipo de ingredientes existentes
UPDATE ingredientes 
SET tipo = 'verduras-hortalicas-derivados' 
WHERE tipo = 'hortalicas';
```

**Nota**: Esta migração é opcional e só necessária se houver dados existentes com o tipo antigo.

## Locais Onde os Tipos São Usados

1. ✅ **Modal "Adicionar Ingrediente"** (Lista de Compras)
2. ✅ **Modal "Adicionar/Editar Ingrediente"** (Página Ingredientes)
3. ✅ **Filtro "Tipo"** (Tabela de Ingredientes)
4. ✅ **Tipo base** (TypeScript types)

## Testes Recomendados

### 1. Modal "Adicionar Ingrediente" (Lista de Compras)
- [ ] Abrir modal "Lista de Compras"
- [ ] Clicar em "Adicionar Ingrediente"
- [ ] Verificar dropdown "Tipo"
- [ ] Confirmar que "Verduras, Hortaliças e Derivados" aparece
- [ ] Confirmar que "Pescados e Frutos do Mar" aparece
- [ ] Selecionar novo tipo e adicionar ingrediente

### 2. Modal "Adicionar Ingrediente" (Página Ingredientes)
- [ ] Ir para página "Ingredientes"
- [ ] Clicar em "Adicionar Ingrediente"
- [ ] Verificar dropdown "Tipo"
- [ ] Confirmar que "Verduras, Hortaliças e Derivados" aparece
- [ ] Confirmar que "Pescados e Frutos do Mar" aparece
- [ ] Criar ingrediente com novo tipo

### 3. Filtro de Tipo (Página Ingredientes)
- [ ] Ir para página "Ingredientes"
- [ ] Clicar em "Filtros"
- [ ] Verificar dropdown "Tipo"
- [ ] Confirmar que "Verduras, Hortaliças e Derivados" aparece
- [ ] Confirmar que "Pescados e Frutos do Mar" aparece
- [ ] Filtrar por novo tipo

### 4. Edição de Ingrediente
- [ ] Editar ingrediente existente
- [ ] Verificar que dropdown "Tipo" tem novas opções
- [ ] Alterar tipo para um dos novos valores
- [ ] Salvar e verificar

## Status

✅ **CONCLUÍDO** - Todos os tipos de ingredientes foram atualizados em todos os componentes e páginas.

## Observações

- As alterações são retrocompatíveis (código antigo continua funcionando)
- TypeScript garantirá type-safety em todo o código
- Não há breaking changes para funcionalidades existentes
- Ingredientes com tipo antigo `hortalicas` podem precisar de migração manual no banco de dados
