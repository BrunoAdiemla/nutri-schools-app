# Feature: Adicionar Ingrediente Manualmente à Lista de Compras

## Resumo
Implementação da funcionalidade de adicionar ingredientes manualmente à lista de compras existente.

## Arquivos Criados

### 1. `src/components/AddIngredientToListaModal.tsx`
Modal para adicionar ingredientes manualmente à lista de compras.

**Funcionalidades:**
- Dropdown "Selecione o tipo de ingrediente" com os mesmos tipos do modal de ingredientes
- Dropdown "Selecione o ingrediente" (condicional ao tipo selecionado)
  - Exibe apenas ingredientes do tipo selecionado
  - Filtra por: `default_ingredient = true` OU (`default_ingredient = false` E `created_by = userId`)
- Campo "Quantidade" com unidade de medida dinâmica
  - Unidade é automaticamente preenchida com base no ingrediente selecionado
  - Exibida ao lado do campo de quantidade
- Validações completas de formulário
- Feedback visual durante carregamento e submissão

**Comportamento:**
1. Usuário seleciona o tipo de ingrediente
2. Sistema carrega ingredientes disponíveis daquele tipo
3. Usuário seleciona o ingrediente específico
4. Sistema preenche automaticamente a unidade de medida
5. Usuário insere a quantidade
6. Sistema adiciona o item à tabela `lista_compras_itens` com:
   - `quantidade_calculada` = quantidade informada
   - `quantidade_ajustada` = quantidade informada
   - `fator_correcao_aplicado` = fator do ingrediente
   - `detalhes_calculo` = objeto indicando adição manual

## Arquivos Modificados

### 1. `src/components/ListaComprasModal.tsx`
**Alterações:**
- Importado `AddIngredientToListaModal`
- Adicionado estado `addIngredientModalOpen`
- Adicionado botão "Adicionar Ingrediente" acima da tabela (canto superior esquerdo)
- Adicionado handler `handleAddIngredientSuccess` para recarregar lista após adição
- Renderizado do modal `AddIngredientToListaModal` quando aberto

**Posicionamento do Botão:**
- Localizado acima da tabela de ingredientes
- Alinhado à esquerda
- Estilo: botão verde com ícone de plus-circle
- Visível apenas quando há itens na lista

## Fluxo de Uso

1. **Abrir Lista de Compras**
   - Usuário clica no ícone de lista de compras de um cardápio

2. **Adicionar Ingrediente**
   - Usuário clica no botão "Adicionar Ingrediente"
   - Modal é aberto

3. **Selecionar Tipo**
   - Usuário seleciona o tipo de ingrediente no primeiro dropdown
   - Sistema carrega ingredientes daquele tipo

4. **Selecionar Ingrediente**
   - Usuário seleciona o ingrediente específico no segundo dropdown
   - Sistema preenche automaticamente a unidade de medida

5. **Informar Quantidade**
   - Usuário digita a quantidade desejada
   - Unidade de medida é exibida ao lado do campo

6. **Confirmar**
   - Usuário clica em "Adicionar"
   - Sistema adiciona o item à lista
   - Modal fecha automaticamente
   - Lista é recarregada com o novo item

## Regras de Negócio

### Filtro de Ingredientes
```sql
WHERE tipo = :tipo_selecionado
AND (
  default_ingredient = true 
  OR (default_ingredient = false AND created_by = :user_id)
)
ORDER BY nome
```

### Estrutura do Item Adicionado
```typescript
{
  lista_compras_id: string,
  ingrediente_id: string,
  ingrediente_nome: string,
  unidade_medida: string,
  quantidade_calculada: number,
  quantidade_ajustada: null, // Deixar vazio para usuário editar
  fator_correcao_aplicado: number, // do ingrediente
  detalhes_calculo: {
    manual: true,
    adicionado_por: string, // user_id
    data_adicao: string // ISO timestamp
  }
}
```

## Validações

1. **Tipo de Ingrediente**: Obrigatório
2. **Ingrediente**: Obrigatório (habilitado apenas após selecionar tipo)
3. **Quantidade**: 
   - Obrigatória
   - Deve ser número > 0
   - Formato: decimal com até 2 casas

## Tratamento de Erros

- Erro ao carregar ingredientes: Toast de erro
- Erro ao adicionar item: Toast de erro com mensagem específica
- Validações de formulário: Mensagens inline
- Permissões: Verificação de usuário logado

## Melhorias Futuras

1. Busca/filtro de ingredientes por nome
2. Sugestão de quantidade baseada em histórico
3. Adicionar múltiplos ingredientes de uma vez
4. Validação de ingredientes duplicados
5. Edição inline de ingredientes adicionados manualmente

## Testes Sugeridos

1. ✅ Adicionar ingrediente default
2. ✅ Adicionar ingrediente criado pelo usuário
3. ✅ Validar filtro por tipo
4. ✅ Validar unidade de medida automática
5. ✅ Validar quantidade mínima
6. ✅ Validar recarregamento da lista
7. ✅ Validar permissões de usuário
8. ✅ Validar comportamento com lista vazia
9. ✅ Validar fechamento do modal (ESC, backdrop, botão)
10. ✅ Validar estado de loading

---

**Data de Implementação**: 2026-02-04
**Desenvolvedor**: Kiro AI Assistant
