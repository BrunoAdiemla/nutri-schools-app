# PLANO DE TAREFAS: IMPLEMENTAÇÃO EDITAR CARDÁPIO

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
- [x] Função `getCardapioCompleto()` no `DatabaseService`
- [x] Carregamento e transformação de dados para edição
- [x] Interface adaptada para modo edição (título, campos desabilitados)

### 🚧 **PENDENTE DE IMPLEMENTAÇÃO**
- [ ] Função `updateCardapioCompleto()` no DatabaseService
- [ ] Lógica de detecção de mudanças (diff)
- [ ] Execução inteligente de operações (UPDATE/INSERT/DELETE)
- [ ] Integração do salvamento no modal
- [ ] Validações específicas para edição
- [ ] Testes e refinamentos

---

## 🛠️ PLANO DE EXECUÇÃO

### **FASE 1: PREPARAÇÃO E VALIDAÇÃO**
*Tempo estimado: 30 minutos*

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

1. **Funcionalidade Completa**: Modal funciona perfeitamente para criar E editar cardápios
2. **Integridade de Dados**: Todas as operações mantêm consistência do banco
3. **Performance**: Operações são rápidas mesmo com cardápios complexos
4. **UX Consistente**: Interface clara e intuitiva para ambos os modos
5. **Robustez**: Sistema lida graciosamente com erros e casos edge
6. **Compatibilidade**: Funcionalidade de criação continua funcionando normalmente

---

**Documento criado em**: Janeiro 2025  
**Baseado em**: CARDAPIO_EDIT_SPECIFICATION.md  
**Status**: Pronto para execução