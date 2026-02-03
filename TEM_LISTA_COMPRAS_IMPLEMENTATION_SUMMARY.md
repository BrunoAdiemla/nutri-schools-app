# Implementação do Campo tem_lista_compras

## Resumo das Alterações

Implementação completa do campo `tem_lista_compras` na tabela `cardapios_semanais` para otimizar a performance ao verificar se um cardápio possui lista de compras associada.

## Arquivos Modificados

### 1. **ListaComprasService.ts**
- ✅ **Função `gerarListaCompras`**: Atualiza `tem_lista_compras = TRUE` quando uma lista é criada
- ✅ **Nova função `deletarListaCompras`**: Atualiza `tem_lista_compras = FALSE` quando uma lista é deletada

### 2. **DatabaseService.ts**
- ✅ **Função de criação de cardápio**: Define `tem_lista_compras = FALSE` por padrão ao criar novos cardápios

### 3. **types/index.ts**
- ✅ **Interface CardapioSemanal**: Adicionado campo `tem_lista_compras?: boolean`

### 4. **Migração SQL**
- ✅ **database-migration-add-tem-lista-compras-column.sql**: Criado e executado

## Como Funciona

### 🔄 **Fluxo Automático**

1. **Criar Cardápio**: `tem_lista_compras = FALSE` (padrão)
2. **Gerar Lista**: `tem_lista_compras = TRUE` (automático)
3. **Deletar Lista**: `tem_lista_compras = FALSE` (automático)

### 📊 **Performance**

**Antes (N+1 Problem):**
```sql
-- Para cada cardápio na lista (20 cardápios = 21 queries)
SELECT * FROM cardapios_semanais WHERE user_id = ?;
SELECT COUNT(*) FROM listas_compras WHERE cardapio_semanal_id = ?; -- x20
```

**Depois (1 Query):**
```sql
-- Uma única query para todos os cardápios
SELECT *, tem_lista_compras FROM cardapios_semanais WHERE user_id = ?;
```

### 🎯 **Uso no Frontend**

```tsx
// CardapiosPage.tsx - Exemplo de uso
{cardapio.tem_lista_compras ? (
  <button onClick={() => openEditListaModal(cardapio.id)}>
    <i data-lucide="list-checks" className="w-4 h-4" />
  </button>
) : (
  <button onClick={() => openGenerateListaModal(cardapio.id)}>
    Gerar lista de compras
  </button>
)}
```

## Próximos Passos

1. **Atualizar CardapiosPage.tsx** para usar o campo `tem_lista_compras`
2. **Implementar ícone** no lugar do texto "Gerar lista de compras"
3. **Testar** a funcionalidade completa

## Benefícios

- ✅ **Performance**: Elimina N+1 queries
- ✅ **Escalabilidade**: Funciona com milhares de cardápios
- ✅ **Simplicidade**: Lógica direta no frontend
- ✅ **Manutenção**: Sincronização automática
- ✅ **Índice**: Queries otimizadas com índice no campo