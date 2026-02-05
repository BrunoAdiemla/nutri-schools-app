# Lista de Compras - Sistema de Alterações Pendentes

## Resumo das Alterações

Este documento descreve a implementação do sistema de alterações pendentes no modal "Lista de Compras", onde todas as modificações são mantidas localmente até que o usuário clique em "Salvar alterações".

## Alterações Implementadas

### 1. Botão "Gerar PDF" Movido para o Topo
- **Localização**: Parte superior direita, alinhado com "Adicionar Ingrediente"
- **Layout**: Barra de ações horizontal no topo da lista
- **Comportamento**: Mantém funcionalidade de desenvolvimento

### 2. Botão "Salvar alterações"
- **Nome**: Alterado de "Salvar Rascunho" para "Salvar alterações"
- **Localização**: Footer do modal (parte inferior esquerda)
- **Comportamento**:
  - Desabilitado por padrão
  - Habilitado apenas quando há alterações pendentes
  - Mostra spinner durante salvamento
  - Exibe mensagem "Alterações não salvas" quando há mudanças pendentes

### 3. Sistema de Alterações Pendentes

#### Estados Rastreados:
- `itens`: Lista atual de itens (com modificações locais)
- `itensOriginais`: Cópia profunda do estado original (para comparação)
- `itensParaAdicionar`: Array de novos itens pendentes de adição
- `itensParaDeletar`: Array de IDs de itens pendentes de deleção
- `saving`: Flag indicando se está salvando

#### Detecção de Alterações:
A função `hasChanges()` verifica:
1. Se há itens na fila de adição (`itensParaAdicionar.length > 0`)
2. Se há itens na fila de deleção (`itensParaDeletar.length > 0`)
3. Se há mudanças em `quantidade_ajustada` de algum item
4. Se há mudanças em `unidade_medida_compra` de algum item

### 4. Fluxo de Adição de Ingredientes

**Antes (salvamento imediato)**:
1. Usuário preenche modal "Adicionar Ingrediente"
2. Clica em "Adicionar"
3. Item é salvo diretamente no banco de dados
4. Lista é recarregada

**Depois (salvamento pendente)**:
1. Usuário preenche modal "Adicionar Ingrediente"
2. Clica em "Adicionar"
3. Item é criado com ID temporário (`temp-${timestamp}`)
4. Item é adicionado a `itensParaAdicionar` e `itens`
5. Item aparece na lista com indicador de alterações pendentes
6. Ao clicar em "Salvar alterações", item é salvo no banco

### 5. Fluxo de Exclusão de Ingredientes

**Antes (salvamento imediato)**:
1. Usuário clica no ícone de lixeira
2. Modal de confirmação aparece
3. Usuário confirma
4. Item é deletado do banco de dados
5. Lista é recarregada

**Depois (salvamento pendente)**:
1. Usuário clica no ícone de lixeira
2. Item é removido visualmente da lista imediatamente
3. Se item é novo (pendente de adição): removido de `itensParaAdicionar`
4. Se item é existente: ID adicionado a `itensParaDeletar`
5. Ao clicar em "Salvar alterações", item é deletado do banco

### 6. Fluxo de Edição de Campos

**Campos editáveis**:
- Qtd. Ajustada (input numérico)
- Medida da compra (dropdown)

**Comportamento**:
1. Usuário edita campo
2. Mudança é aplicada apenas no estado local (`itens`)
3. Botão "Salvar alterações" é habilitado
4. Indicador "Alterações não salvas" aparece
5. Ao clicar em "Salvar alterações", mudanças são salvas no banco

### 7. Processo de Salvamento

Quando o usuário clica em "Salvar alterações":

1. **Deletar itens**:
   - Itera sobre `itensParaDeletar`
   - Chama `ListaComprasService.deletarItemListaCompras()` para cada ID
   - Se falhar, lança erro e interrompe

2. **Adicionar itens**:
   - Itera sobre `itensParaAdicionar`
   - Chama `ListaComprasService.adicionarItemListaCompras()` para cada item
   - Remove ID temporário antes de salvar
   - Se falhar, lança erro e interrompe

3. **Atualizar itens modificados**:
   - Compara cada item em `itens` com seu correspondente em `itensOriginais`
   - Se `quantidade_ajustada` mudou: chama `atualizarQuantidadeItem()`
   - Se `unidade_medida_compra` mudou: chama `atualizarUnidadeMedidaCompra()`
   - Se falhar, lança erro e interrompe

4. **Recarregar dados**:
   - Chama `loadListaCompras()` para buscar estado atualizado do banco
   - Reseta todos os arrays de alterações pendentes
   - Exibe mensagem de sucesso

## Arquivos Modificados

### 1. `src/components/ListaComprasModal.tsx`
**Mudanças principais**:
- Adicionados estados: `itensOriginais`, `itensParaAdicionar`, `itensParaDeletar`, `saving`
- Removido estado: `deleteModal`
- Removido import: `DeleteConfirmationModal`
- Modificado `loadListaCompras()`: inicializa `itensOriginais` e limpa pendências
- Modificado `handleDeleteItem()`: marca para deleção em vez de deletar imediatamente
- Modificado `handleAddIngredientSuccess()`: adiciona a pendências em vez de recarregar
- Adicionado `hasChanges()`: detecta alterações pendentes
- Adicionado `handleSaveChanges()`: salva todas as alterações de uma vez
- Modificado layout: botão "Gerar PDF" no topo, "Salvar alterações" no footer
- Adicionado indicador visual: "Alterações não salvas"

### 2. `src/components/AddIngredientToListaModal.tsx`
**Mudanças principais**:
- Modificado tipo de `onSuccess`: agora recebe o item criado como parâmetro
- Modificado `handleSubmit()`: cria item com ID temporário sem salvar no banco
- Item criado é passado para `onSuccess(novoItem)` em vez de recarregar lista

### 3. `src/services/ListaComprasService.ts`
**Mudanças principais**:
- Adicionado método `adicionarItemListaCompras()`: adiciona item manualmente ao banco
- Verifica permissões do usuário
- Remove ID temporário antes de inserir
- Retorna sucesso ou erro

## Estrutura Visual

```
┌─────────────────────────────────────────────────────────────┐
│ Lista de Compras - Cardápio Semanal                    [X] │
│ 📊 5 ingredientes • Rascunho                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [+ Adicionar Ingrediente]              [📄 Gerar PDF]      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Ingrediente │ Qtd. Calc. │ Qtd. Ajust. │ Medida │ Ações│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Arroz       │ 2 kg       │ [input]     │ [▼]    │ [🗑️] │ │
│ │ Feijão      │ 1.5 kg     │ [input]     │ [▼]    │ [🗑️] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Exibindo 5 ingredientes • Alterações não salvas            │
│                                                             │
│                    [💾 Salvar alterações]  [Fechar]        │
└─────────────────────────────────────────────────────────────┘
```

## Benefícios

1. **Melhor UX**: Usuário pode fazer múltiplas alterações antes de salvar
2. **Menos requisições**: Todas as alterações são salvas em lote
3. **Reversível**: Usuário pode fechar modal sem salvar (descarta alterações)
4. **Feedback claro**: Indicador visual de alterações pendentes
5. **Controle**: Botão "Salvar alterações" só habilitado quando necessário

## Notas Técnicas

- IDs temporários usam formato `temp-${timestamp}` para evitar conflitos
- Deep copy de `itensOriginais` usando `JSON.parse(JSON.stringify())`
- Comparação de alterações verifica cada campo individualmente
- Salvamento é transacional: se uma operação falha, processo é interrompido
- Após salvamento bem-sucedido, lista é recarregada do banco de dados
- Ícones Lucide são reinicializados após mudanças no estado
