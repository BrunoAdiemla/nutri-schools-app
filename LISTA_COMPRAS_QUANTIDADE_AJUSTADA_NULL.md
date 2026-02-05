# Alteração: quantidade_ajustada Inicializada como NULL

## Resumo
Modificação no processo de geração de lista de compras para deixar o campo `quantidade_ajustada` vazio (NULL) inicialmente, permitindo que o usuário edite posteriormente.

## Motivação
- Usuário deve ter controle total sobre as quantidades ajustadas
- Campo calculado serve apenas como referência
- Evita confusão entre quantidade calculada e ajustada

## Arquivos Modificados

### 1. `src/services/ListaComprasService.ts`
**Método**: `gerarListaCompras()`

**Antes:**
```typescript
quantidade_ajustada: item.quantidade_total, // Inicializar com o mesmo valor
```

**Depois:**
```typescript
quantidade_ajustada: null, // Deixar vazio para o usuário editar posteriormente
```

### 2. `src/components/AddIngredientToListaModal.tsx`
**Método**: `handleSubmit()`

**Antes:**
```typescript
quantidade_ajustada: quantidadeNum,
```

**Depois:**
```typescript
quantidade_ajustada: null, // Deixar vazio para o usuário editar posteriormente
```

### 3. `LISTA_COMPRAS_ADD_INGREDIENT_FEATURE.md`
Atualizada documentação para refletir que `quantidade_ajustada` é NULL na criação.

## Comportamento Atual

### Geração Automática de Lista
Quando o usuário clica em "Gerar lista de compras":
1. Sistema calcula `quantidade_calculada` baseado no cardápio
2. Campo `quantidade_ajustada` é criado como NULL
3. Usuário pode editar `quantidade_ajustada` posteriormente no modal

### Adição Manual de Ingrediente
Quando o usuário adiciona ingrediente manualmente:
1. Usuário informa a quantidade desejada
2. Sistema salva em `quantidade_calculada`
3. Campo `quantidade_ajustada` é criado como NULL
4. Usuário pode editar `quantidade_ajustada` posteriormente

## Impacto na UI

### Modal Lista de Compras
- Coluna "Qtd. Calculada": Sempre exibe o valor calculado
- Coluna "Qtd. Ajustada": 
  - Inicia vazia (placeholder "0.00")
  - Usuário pode preencher com valor desejado
  - Aceita valores decimais

### Fluxo de Edição
1. Usuário abre lista de compras
2. Vê quantidade calculada como referência
3. Preenche quantidade ajustada conforme necessidade
4. Sistema salva automaticamente ao alterar

## Vantagens

1. **Clareza**: Usuário sabe que precisa revisar as quantidades
2. **Flexibilidade**: Não força uso da quantidade calculada
3. **Controle**: Usuário decide quais quantidades ajustar
4. **Rastreabilidade**: Mantém quantidade calculada original para referência

## Considerações Técnicas

### Banco de Dados
- Campo `quantidade_ajustada` é nullable por design
- Não requer migração (já era nullable)
- Queries devem tratar NULL adequadamente

### Validações
- Input aceita valores vazios (NULL)
- Validação de tipo numérico ao preencher
- Mínimo: 0.01 (quando preenchido)

### Compatibilidade
- ✅ Registros existentes não são afetados
- ✅ Funcionalidade de edição continua igual
- ✅ Queries existentes tratam NULL corretamente

## Testes Sugeridos

1. ✅ Gerar lista de compras nova
2. ✅ Verificar que quantidade_ajustada é NULL
3. ✅ Editar quantidade_ajustada
4. ✅ Salvar e recarregar lista
5. ✅ Adicionar ingrediente manualmente
6. ✅ Verificar que quantidade_ajustada é NULL
7. ✅ Editar quantidade do ingrediente adicionado

---

**Data de Implementação**: 2026-02-04
**Desenvolvedor**: Kiro AI Assistant
