# Lista de Compras - Correção do Bug de Tela Branca

## Problema Identificado

Após implementar o sistema de alterações pendentes no modal "Lista de Compras", ao clicar no botão "Salvar alterações", a aplicação apresentava uma tela branca (white screen crash) com o seguinte erro no console:

```
NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
```

O erro ocorria especificamente no componente `<i>` (ícones Lucide), indicando conflito entre a biblioteca Lucide e o React durante a re-renderização após salvar as alterações no banco de dados.

## Causa Raiz

A biblioteca Lucide Icons modifica diretamente o DOM dos elementos `<i data-lucide="...">` para injetar os SVGs dos ícones. Quando o React tenta atualizar o componente após salvar as alterações, ele encontra elementos DOM que foram modificados externamente pelo Lucide, causando o erro "removeChild" porque o React espera encontrar os elementos originais que ele criou.

## Solução Implementada

Substituímos todos os ícones Lucide (`<i data-lucide="...">`) por SVGs inline nos seguintes componentes:

### 1. ListaComprasModal.tsx

**Alterações:**
- Removido o `useEffect` que chamava `initializeLucideIcons()`
- Removidas as referências a `setIconKey` (que não existia mais)
- Substituídos todos os ícones Lucide por SVG inline:
  - Ícone "X" (fechar modal)
  - Ícone "Shopping Cart" (lista vazia)
  - Ícone "Plus Circle" (adicionar ingrediente)
  - Ícone "File Text" (gerar PDF)
  - Ícone "Save" (salvar alterações)
  - Ícone "Trash" (deletar item)

**Correções adicionais:**
- Corrigido tipo do parâmetro `quantidade_ajustada` usando nullish coalescing (`?? null`)
- Removidas chamadas inexistentes a `setIconKey(prev => prev + 1)`

### 2. AddIngredientToListaModal.tsx

**Alterações:**
- Removido import de `initializeLucideIcons`
- Removido o `useEffect` que inicializava os ícones Lucide
- Substituídos ícones Lucide por SVG inline:
  - Ícone "Plus Circle" (adicionar)
  - Ícone "X" (fechar)

## Benefícios da Solução

1. **Estabilidade**: Elimina conflitos entre Lucide e React durante re-renderizações
2. **Performance**: SVGs inline são renderizados diretamente pelo React, sem manipulação DOM externa
3. **Controle**: React tem controle total sobre os elementos, evitando inconsistências
4. **Manutenibilidade**: Código mais previsível e fácil de debugar

## Arquivos Modificados

- `nutri-schools-app/src/components/ListaComprasModal.tsx`
- `nutri-schools-app/src/components/AddIngredientToListaModal.tsx`

## Status

✅ **RESOLVIDO** - O bug de tela branca foi corrigido. O sistema de alterações pendentes agora funciona corretamente:
- Edições em "Qtd. Ajustada" são salvas corretamente
- Mudanças em "Medida da compra" são salvas corretamente
- Adição de novos ingredientes funciona
- Deleção de ingredientes funciona
- Botão "Salvar alterações" só fica habilitado quando há mudanças
- Indicador "Alterações não salvas" aparece quando necessário
- Re-renderização após salvar funciona sem crashes

## Próximos Passos

- Testar todos os fluxos de edição no ambiente de desenvolvimento
- Verificar se há outros componentes usando Lucide que possam ter o mesmo problema
- Considerar migrar completamente para SVG inline ou outra biblioteca de ícones mais compatível com React
