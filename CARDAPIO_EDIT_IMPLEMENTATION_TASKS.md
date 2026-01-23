# PLANO DE TAREFAS: IMPLEMENTAÇÃO EDITAR CARDÁPIO

> ⚠️ **ATUALIZAÇÃO IMPORTANTE**: Foi identificado que o carregamento em cascata já está implementado, mas os dados não aparecem nas abas dos dias. A **FASE 0** foi adicionada para corrigir este problema ANTES de implementar o salvamento.

## 📋 VISÃO GERAL

Este documento define o plano de execução detalhado para implementar a funcionalidade de edição de cardápios, baseado nas especificações do documento `CARDAPIO_EDIT_SPECIFICATION.md`.

## 🎯 OBJETIVOS

- Implementar funcionalidade completa de edição de cardápios
- Manter compatibilidade com funcionalidade de criação existente
- Garantir integridade de dados e performance
- Seguir boas práticas de desenvolvimento

## 📊 STATUS ATUAL

### ✅ **JÁ IMPLEMENTADO**
- [x] Coluna `tipo` na tabela `refeicao_preparacoes`
- [x] Estrutura básica do modo edição no `CardapioModal`
- [x] Função `getCardapioCompleto()` no `DatabaseService` (carregamento em cascata completo)
- [x] Função `loadCardapioData()` no `CardapioModal` (transformação de dados)
- [x] Interface adaptada para modo edição (título, campos desabilitados)

### ⚠️ **PROBLEMA IDENTIFICADO - CRÍTICO**
- [ ] **Dados não aparecem nas abas dos dias** - Carregamento funciona mas exibição falha
  - Carregamento em cascata está implementado e funcional
  - Dados são buscados corretamente do banco (cardapios_semanais → cardapios_do_dia → refeicoes → refeicao_preparacoes)
  - Transformação de dados está implementada
  - **MAS**: Abas dos dias não exibem as informações carregadas
  - **Causa**: A investigar (possível problema de formato de data, mapeamento ou timing)

### 🚧 **PENDENTE DE IMPLEMENTAÇÃO**
- [ ] **FASE 0**: Debug e correção do carregamento/exibição (DEVE SER FEITO PRIMEIRO)
- [ ] Função `updateCardapioCompleto()` no DatabaseService
- [ ] Lógica de detecção de mudanças (diff)
- [ ] Execução inteligente de operações (UPDATE/INSERT/DELETE)
- [ ] Integração do salvamento no modal
- [ ] Validações específicas para edição
- [ ] Testes e refinamentos

---

## 🛠️ PLANO DE EXECUÇÃO

### **FASE 0: DEBUG E CORREÇÃO DO CARREGAMENTO** ⚠️ **CRÍTICO**
*Tempo estimado: 1-2 horas*

> **IMPORTANTE**: Esta fase foi adicionada após identificar que o carregamento em cascata já está implementado, mas os dados não aparecem nas abas dos dias. Deve ser executada ANTES de implementar o salvamento.

#### **Tarefa 0.1: Investigar Problema de Exibição nas Abas**
- **Objetivo**: Identificar por que os dados carregados não aparecem nas abas dos dias
- **Problema Reportado**: "O modal abre e carrega o cardapio semanal corretamente, as abas dos dias não apresenta as informações do cardapio do dia corretamente, aliás, não apresenta nada"
- **Ações**:
  - Adicionar console.logs detalhados na função `loadCardapioData()` do CardapioModal
  - Verificar se `cardapioCompleto.cardapios_do_dia` está sendo retornado corretamente
  - Verificar se o loop de transformação está processando todos os dias
  - Verificar se `setDaysConfig()` está sendo chamado com dados corretos
  - Inspecionar no console do navegador a estrutura de `daysConfig` após carregamento
  - Verificar se `generatedDays` está sincronizado com os dias carregados
  - Verificar formato de datas (ISO vs local) - possível incompatibilidade
- **Possíveis Causas**:
  - Formato de data incompatível entre banco e comparação (ex: "2025-01-15" vs "2025-01-15T00:00:00")
  - IDs de preparações não correspondendo aos disponíveis nos dropdowns
  - Estado `daysConfig` sendo sobrescrito ou não atualizado
  - Problema de timing (render acontece antes dos dados serem processados)
  - Mapeamento de tipo de refeição incorreto (colação vs colacao, almoço vs almoco)
- **Critérios de Sucesso**:
  - Identificar exatamente onde o fluxo de dados está falhando
  - Documentar a causa raiz do problema
  - Ter logs claros mostrando o estado dos dados em cada etapa

#### **Tarefa 0.2: Corrigir Mapeamento e Transformação de Dados**
- **Objetivo**: Garantir que dados do banco sejam corretamente mapeados para o formato do modal
- **Ações**:
  - Corrigir qualquer incompatibilidade de formato de data identificada
  - Ajustar lógica de comparação de datas se necessário (usar `.split('T')[0]` para normalizar)
  - Garantir que mapeamento de tipos de refeição está correto (acentuação)
  - Validar que IDs de preparações existem antes de mapear para dropdowns
  - Garantir que `setDaysConfig()` seja chamado após processamento completo de TODOS os dias
  - Adicionar tratamento de erro para preparações não encontradas
  - Verificar se a ordem dos dias está correta
- **Especificações Detalhadas**:
  - Normalizar formato de datas: `const dayString = day.toISOString().split('T')[0]`
  - Verificar mapeamento: `colação` → `colacao`, `almoço` → `almoco`
  - Validar preparações: verificar se `preparacao.id` existe em `preparacoes` carregadas
  - Garantir que estado seja atualizado atomicamente (não em múltiplas chamadas)
- **Critérios de Sucesso**:
  - Dados do banco são corretamente transformados para formato do modal
  - `daysConfig` contém todos os dias com dados corretos
  - Não há erros de console relacionados a dados faltantes

#### **Tarefa 0.3: Testar e Validar Carregamento Completo**
- **Objetivo**: Validar que dados aparecem corretamente nas abas após correções
- **Ações**:
  - Testar com cardápio real existente no banco de dados
  - Verificar se todas as abas dos dias aparecem
  - Verificar se checkboxes de refeições estão marcados corretamente
  - Verificar se preparações aparecem selecionadas nos dropdowns
  - Verificar se valores de comensais aparecem nos inputs
  - Confirmar que dias feriados são identificados e exibidos corretamente
  - Testar com diferentes configurações (dias com/sem refeições, diferentes tipos)
- **Cenários de Teste**:
  1. Cardápio com todos os dias tendo todas as refeições
  2. Cardápio com dias feriados (sem refeições)
  3. Cardápio com dias tendo apenas algumas refeições habilitadas
  4. Cardápio com preparações de todos os tipos
- **Critérios de Sucesso**:
  - Todas as abas dos dias exibem dados corretamente
  - Refeições habilitadas aparecem com checkboxes marcados
  - Preparações aparecem selecionadas nos dropdowns corretos
  - Valores de comensais aparecem nos inputs
  - Dias feriados são identificados visualmente
  - Não há erros no console
  - Modal está pronto para edição

---

### **FASE 1: PREPARAÇÃO E VALIDAÇÃO**
*Tempo estimado: 30 minutos*

> **NOTA**: Esta fase só deve ser executada APÓS a conclusão bem-sucedida da Fase 0

#### **Tarefa 1.1: Verificar Estado Atual**
- **Objetivo**: Confirmar que todas as dependências estão funcionando
- **Ações**:
  - Testar carregamento de cardápio existente no modal
  - Verificar se dados são exibidos corretamente
  - Confirmar que modo edição é detectado adequadamente
- **Critérios de Sucesso**:
  - Modal abre em modo edição quando `cardapioToEdit` é fornecido
  - Dados são carregados e exibidos corretamente
  - Interface mostra indicadores visuais de modo edição

#### **Tarefa 1.2: Revisar Estruturas de Dados**
- **Objetivo**: Confirmar interfaces TypeScript necessárias
- **Ações**:
  - Verificar interface `CardapioCompleto` no código
  - Confirmar estrutura de retorno de `getCardapioCompleto()`
  - Validar mapeamento de dados no `loadCardapioData()`
- **Critérios de Sucesso**:
  - Estruturas de dados estão bem definidas
  - Mapeamento funciona corretamente
  - Não há erros de TypeScript

---

### **FASE 2: IMPLEMENTAÇÃO DO CORE - SALVAMENTO INTELIGENTE**
*Tempo estimado: 3-4 horas*

#### **Tarefa 2.1: Criar Interfaces para Detecção de Mudanças**
- **Objetivo**: Definir estruturas para comparação de dados
- **Arquivo**: `src/services/DatabaseService.ts`
- **Ações**:
  ```typescript
  // Adicionar interfaces no topo do arquivo
  interface ChangeSet {
    cardapiosToDelete: string[];
    cardapiosToUpdate: Array<{ id: string; data: any }>;
    cardapiosToCreate: any[];
    refeicoesToDelete: string[];
    refeicoesToUpdate: Array<{ id: string; data: any }>;
    refeicoesToCreate: any[];
    preparacoesToDelete: string[];
    preparacoesToCreate: any[];
  }

  interface CardapioUpdateData {
    dateRange: { startDate: Date; endDate: Date };
    generatedDays: Date[];
    daysConfig: Record<number, DayConfig>;
    userId: string;
  }
  ```
- **Critérios de Sucesso**:
  - Interfaces definidas sem erros TypeScript
  - Estruturas cobrem todos os cenários de mudança

#### **Tarefa 2.2: Implementar Função de Detecção de Mudanças**
- **Objetivo**: Comparar estado original vs atual e identificar operações necessárias
- **Arquivo**: `src/services/DatabaseService.ts`
- **Ações**:
  ```typescript
  private static detectChanges(
    originalData: any,
    newData: CardapioUpdateData
  ): ChangeSet {
    // Implementar lógica de comparação
    // 1. Comparar dias (cardapios_do_dia)
    // 2. Comparar refeições por dia
    // 3. Comparar preparações por refeição
    // 4. Identificar operações necessárias
  }
  ```
- **Especificações Detalhadas**:
  - Comparar arrays de dias gerados vs existentes no banco
  - Para cada dia: verificar se existe, foi removido ou adicionado
  - Para cada refeição: comparar tipo, comensais e preparações
  - Para cada preparação: verificar se foi adicionada, removida ou alterada
- **Critérios de Sucesso**:
  - Função identifica corretamente todas as mudanças
  - Retorna ChangeSet completo e preciso
  - Trata casos edge (dias feriados, refeições removidas, etc.)

#### **Tarefa 2.3: Implementar Execução de Mudanças com Transações**
- **Objetivo**: Executar operações de banco de forma segura e atômica
- **Arquivo**: `src/services/DatabaseService.ts`
- **Ações**:
  ```typescript
  private static async executeChanges(
    changeSet: ChangeSet,
    cardapioSemanalId: string
  ): Promise<void> {
    // Usar transação Supabase
    // Executar na ordem: DELETE → UPDATE → INSERT
    // Implementar rollback em caso de erro
  }
  ```
- **Especificações Detalhadas**:
  - **Ordem de Execução**: DELETEs primeiro, depois UPDATEs, por último INSERTs
  - **Transação**: Usar transação do Supabase para garantir atomicidade
  - **Rollback**: Em caso de erro, reverter todas as operações
  - **Logging**: Registrar todas as operações para debug
- **Critérios de Sucesso**:
  - Operações executadas na ordem correta
  - Transação funciona adequadamente
  - Rollback automático em caso de erro
  - Logs detalhados para troubleshooting

#### **Tarefa 2.4: Implementar Função Principal updateCardapioCompleto**
- **Objetivo**: Função principal que orquestra todo o processo de atualização
- **Arquivo**: `src/services/DatabaseService.ts`
- **Ações**:
  ```typescript
  static async updateCardapioCompleto(
    cardapioSemanalId: string,
    newData: CardapioUpdateData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Buscar dados originais
      // 2. Detectar mudanças
      // 3. Executar mudanças
      // 4. Retornar resultado
    } catch (error) {
      // Tratamento de erro robusto
    }
  }
  ```
- **Especificações Detalhadas**:
  - Validar parâmetros de entrada
  - Buscar dados originais usando `getCardapioCompleto()`
  - Chamar `detectChanges()` para identificar operações
  - Chamar `executeChanges()` para aplicar mudanças
  - Retornar resultado estruturado
- **Critérios de Sucesso**:
  - Função completa e funcional
  - Tratamento robusto de erros
  - Retorno consistente com `createCardapioCompleto()`
  - Logging adequado para debug

---

### **FASE 3: INTEGRAÇÃO NO MODAL**
*Tempo estimado: 1-2 horas*

#### **Tarefa 3.1: Modificar handleSaveCardapio para Modo Dual**
- **Objetivo**: Adaptar função de salvamento para usar create ou update conforme o modo
- **Arquivo**: `src/components/CardapioModal.tsx`
- **Ações**:
  ```typescript
  const handleSaveCardapio = async () => {
    // Validações existentes...
    
    setIsLoading(true);
    try {
      let result;
      
      if (isEditMode && cardapioToEdit) {
        // Modo edição - usar updateCardapioCompleto
        result = await DatabaseService.updateCardapioCompleto(
          cardapioToEdit.id,
          { dateRange, generatedDays, daysConfig, userId: profile.id }
        );
      } else {
        // Modo criação - usar createCardapioCompleto (existente)
        result = await DatabaseService.createCardapioCompleto({
          dateRange, generatedDays, daysConfig, userId: profile.id
        });
      }
      
      // Tratamento de resultado...
    } catch (error) {
      // Tratamento de erro...
    } finally {
      setIsLoading(false);
    }
  };
  ```
- **Critérios de Sucesso**:
  - Função detecta modo corretamente
  - Chama função apropriada (create vs update)
  - Mantém compatibilidade com modo criação
  - Mensagens de sucesso/erro apropriadas para cada modo

#### **Tarefa 3.2: Ajustar Mensagens e Feedback Visual**
- **Objetivo**: Personalizar mensagens para modo edição
- **Arquivo**: `src/components/CardapioModal.tsx`
- **Ações**:
  - Ajustar mensagens de loading: "Salvando alterações..." vs "Salvando..."
  - Ajustar mensagens de sucesso: "Cardápio atualizado!" vs "Cardápio criado!"
  - Verificar se botão mostra texto correto: "Salvar Alterações" vs "Salvar Cardápio"
- **Critérios de Sucesso**:
  - Mensagens apropriadas para cada modo
  - Feedback visual consistente
  - UX clara e intuitiva

---

### **FASE 4: VALIDAÇÕES E REFINAMENTOS**
*Tempo estimado: 1-2 horas*

#### **Tarefa 4.1: Implementar Validações Específicas para Edição**
- **Objetivo**: Adicionar validações que só se aplicam ao modo edição
- **Arquivo**: `src/components/CardapioModal.tsx`
- **Ações**:
  - Validar se usuário é o criador do cardápio
  - Verificar se cardápio ainda existe no banco
  - Validar integridade das preparações selecionadas
- **Especificações**:
  ```typescript
  const validateEditMode = async (): Promise<boolean> => {
    if (!isEditMode || !cardapioToEdit) return true;
    
    // Verificar se usuário pode editar este cardápio
    if (cardapioToEdit.created_by !== profile.id) {
      showError('Você não tem permissão para editar este cardápio');
      return false;
    }
    
    // Outras validações...
    return true;
  };
  ```
- **Critérios de Sucesso**:
  - Validações impedem edições não autorizadas
  - Mensagens de erro claras e específicas
  - Não interfere com modo criação

#### **Tarefa 4.2: Implementar Tratamento de Casos Especiais**
- **Objetivo**: Tratar cenários edge cases específicos da edição
- **Ações**:
  - **Preparações Removidas**: Se uma preparação foi deletada, mostrar aviso
  - **Conflitos de Data**: Verificar se não há conflitos com outros cardápios
  - **Dados Corrompidos**: Fallback para estado seguro
- **Especificações**:
  - Verificar se preparações selecionadas ainda existem
  - Alertar usuário sobre preparações não encontradas
  - Oferecer opção de remover preparações inexistentes
- **Critérios de Sucesso**:
  - Sistema lida graciosamente com dados inconsistentes
  - Usuário é informado sobre problemas
  - Opções de recuperação são oferecidas

#### **Tarefa 4.3: Otimizações de Performance**
- **Objetivo**: Garantir que edição seja performática mesmo com cardápios grandes
- **Ações**:
  - Implementar cache para preparações já carregadas
  - Otimizar queries de detecção de mudanças
  - Usar debounce para validações em tempo real (se aplicável)
- **Critérios de Sucesso**:
  - Carregamento rápido mesmo com muitos dias/refeições
  - Salvamento eficiente (apenas mudanças reais)
  - Interface responsiva durante operações

---

### **FASE 5: TESTES E VALIDAÇÃO**
*Tempo estimado: 2-3 horas*

#### **Tarefa 5.1: Testes Funcionais Básicos**
- **Objetivo**: Validar cenários principais de uso
- **Cenários de Teste**:
  1. **Carregamento**: Abrir cardápio existente para edição
  2. **Edição Simples**: Alterar apenas uma preparação
  3. **Edição Complexa**: Adicionar/remover refeições e dias
  4. **Dias Feriados**: Converter dias normais ↔ feriados
  5. **Validações**: Tentar salvar dados inválidos
  6. **Permissões**: Tentar editar cardápio de outro usuário
- **Critérios de Sucesso**:
  - Todos os cenários funcionam conforme especificado
  - Não há regressões no modo criação
  - Performance aceitável em todos os casos

#### **Tarefa 5.2: Testes de Integridade de Dados**
- **Objetivo**: Garantir que dados são salvos corretamente
- **Ações**:
  - Verificar se mudanças são persistidas corretamente
  - Confirmar que relacionamentos são mantidos
  - Validar que não há registros órfãos
  - Testar rollback em cenários de erro
- **Critérios de Sucesso**:
  - Dados salvos correspondem exatamente às mudanças feitas
  - Integridade referencial mantida
  - Rollback funciona em casos de erro

#### **Tarefa 5.3: Testes de Casos Edge**
- **Objetivo**: Validar comportamento em situações extremas
- **Cenários**:
  - Cardápio com muitos dias (30+ dias)
  - Cardápio com todas as refeições habilitadas
  - Cardápio com apenas feriados
  - Preparações removidas do sistema
  - Falhas de rede durante salvamento
- **Critérios de Sucesso**:
  - Sistema se comporta adequadamente em todos os casos
  - Mensagens de erro são claras e úteis
  - Não há crashes ou estados inconsistentes

---

## 🔧 ORIENTAÇÕES TÉCNICAS

### **Padrões de Código**
- Manter consistência com código existente
- Usar TypeScript rigorosamente (sem `any`)
- Implementar logging adequado para debug
- Seguir padrões de nomenclatura existentes

### **Tratamento de Erros**
- Sempre usar try/catch em operações assíncronas
- Retornar objetos estruturados `{ success: boolean; error?: string }`
- Logar erros detalhados para troubleshooting
- Mostrar mensagens user-friendly para o usuário

### **Performance**
- Usar transações para operações múltiplas
- Implementar apenas mudanças necessárias (não recriar tudo)
- Otimizar queries com JOINs quando possível
- Considerar impacto em cardápios grandes

### **Segurança**
- Validar permissões antes de qualquer operação
- Usar RLS (Row Level Security) do Supabase
- Sanitizar dados de entrada
- Não confiar apenas em validações client-side

---

## 📋 CHECKLIST DE CONCLUSÃO

### **Fase 0 - Debug e Correção (CRÍTICO)**
- [ ] Problema de exibição nas abas identificado
- [ ] Causa raiz documentada
- [ ] Mapeamento de dados corrigido
- [ ] Dados aparecem corretamente nas abas
- [ ] Preparações aparecem nos dropdowns
- [ ] Comensais aparecem nos inputs
- [ ] Dias feriados identificados corretamente
- [ ] Sem erros no console

### **Funcionalidades Core**
- [ ] Modal detecta modo edição corretamente
- [ ] Dados são carregados e exibidos adequadamente
- [ ] Mudanças são detectadas com precisão
- [ ] Salvamento executa apenas operações necessárias
- [ ] Transações garantem integridade dos dados
- [ ] Rollback funciona em casos de erro

### **Interface e UX**
- [ ] Título e botões mostram modo correto
- [ ] Campos de data desabilitados em modo edição
- [ ] Loading states apropriados
- [ ] Mensagens de sucesso/erro específicas para cada modo
- [ ] Feedback visual durante operações

### **Validações e Segurança**
- [ ] Permissões verificadas antes de editar
- [ ] Validações específicas para modo edição
- [ ] Tratamento de preparações removidas
- [ ] Casos edge tratados adequadamente

### **Performance e Qualidade**
- [ ] Performance aceitável com cardápios grandes
- [ ] Código bem documentado e testado
- [ ] Não há regressões no modo criação
- [ ] Logging adequado para troubleshooting

### **Testes**
- [ ] Todos os cenários principais testados
- [ ] Casos edge validados
- [ ] Integridade de dados confirmada
- [ ] Performance verificada

---

## 🎯 CRITÉRIOS DE SUCESSO FINAL

1. **Carregamento Funcional**: Dados do cardápio aparecem corretamente nas abas dos dias (FASE 0)
2. **Funcionalidade Completa**: Modal funciona perfeitamente para criar E editar cardápios
3. **Integridade de Dados**: Todas as operações mantêm consistência do banco
4. **Performance**: Operações são rápidas mesmo com cardápios complexos
5. **UX Consistente**: Interface clara e intuitiva para ambos os modos
6. **Robustez**: Sistema lida graciosamente com erros e casos edge
7. **Compatibilidade**: Funcionalidade de criação continua funcionando normalmente

---

## 📝 NOTAS IMPORTANTES

### Ordem de Execução Obrigatória
1. **FASE 0** (Debug e Correção) - DEVE SER EXECUTADA PRIMEIRO
2. FASE 1 (Preparação e Validação)
3. FASE 2 (Implementação do Core)
4. FASE 3 (Integração no Modal)
5. FASE 4 (Validações e Refinamentos)
6. FASE 5 (Testes e Validação)

### Por que a Fase 0 é Crítica?
- O carregamento em cascata JÁ ESTÁ implementado (getCardapioCompleto + loadCardapioData)
- O problema é de EXIBIÇÃO/MAPEAMENTO, não de implementação
- Não adianta implementar salvamento se o carregamento não funciona
- Usuário reportou: "as abas dos dias não apresenta as informações"

---

**Documento criado em**: Janeiro 2025  
**Atualizado em**: Janeiro 2025 (Adicionada Fase 0)  
**Baseado em**: CARDAPIO_EDIT_SPECIFICATION.md  
**Status**: Pronto para execução - INICIAR PELA FASE 0