# Especificação: Fluxo de Interface para Geração de Lista de Compras

## Visão Geral

Este documento detalha o fluxo completo de interface do usuário para geração de listas de compras a partir de cardápios no sistema Nutri Schools. O fluxo é baseado em modais sequenciais que proporcionam uma experiência intuitiva e eficiente para o nutricionista.

---

## Fluxo Principal

### 1. Ponto de Entrada - CardapiosPage

**Localização:** Página de listagem de cardápios (`/cardapios`)

**Interface:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Cardápio: Semana 15/01 a 19/01                                 │
│ Status: Ativo • 5 dias • 15 refeições                          │
│ [Editar] [Duplicar] [🛒 Gerar Lista de Compras]                │
└─────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Botão "Gerar Lista de Compras" aparece à direita de cada cardápio
- Ícone de carrinho de compras (🛒) para identificação visual
- Disponível apenas para cardápios com status "Ativo" ou "Finalizado"

---

## 2. Modal de Configuração

### 2.1 Layout do Modal

```
┌─────────────────────────────────────────────────┐
│ Gerar Lista de Compras                    [×]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📋 Cardápio: Semana 15/01 a 19/01               │
│ 📅 Período: 5 dias                              │
│ 🍽️  Refeições: 15 refeições encontradas         │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ 📅 Período da Lista de Compras:                 │
│                                                 │
│ ○ Semana completa (15/01 a 19/01)               │
│ ● Período personalizado:                        │
│   De: [📅 15/01/2024] Até: [📅 17/01/2024]      │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ ⚠️  Esta operação pode demorar alguns segundos   │
│                                                 │
│ [Cancelar] [Gerar Lista]                        │
└─────────────────────────────────────────────────┘
```

### 2.2 Validações Pré-Geração

**Verificações automáticas:**
- ✅ Cardápio possui refeições
- ✅ Refeições possuem preparações
- ✅ Preparações possuem ingredientes
- ✅ Ingredientes possuem fatores de correção
- ✅ Quantidades per capita estão definidas

**Mensagens de Erro:**
```
┌─────────────────────────────────────────────────┐
│ ❌ Não é possível gerar a lista                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Problemas encontrados:                          │
│ • 3 preparações sem ingredientes definidos      │
│ • 2 ingredientes sem fator de correção          │
│                                                 │
│ [Ver Detalhes] [Fechar]                         │
└─────────────────────────────────────────────────┘
```

### 2.3 Funcionalidades

**Período Personalizado:**
- Permite selecionar apenas alguns dias do cardápio
- Validação: data inicial ≤ data final
- Validação: datas dentro do período do cardápio

**Histórico de Listas:**
```
┌─────────────────────────────────────────────────┐
│ 📋 Listas anteriores para este cardápio:        │
│                                                 │
│ • Lista 20/01/2024 - Status: Finalizada        │
│ • Lista 18/01/2024 - Status: Rascunho          │
│                                                 │
│ [Ver Lista] [Duplicar]                          │
└─────────────────────────────────────────────────┘
```

---

## 3. Modal de Carregamento

### 3.1 Layout com Progresso

```
┌─────────────────────────────────────────────────┐
│ Gerando Lista de Compras...                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ ⏳ Analisando refeições...                       │
│ ████████████████████████████████████████ 100%   │
│                                                 │
│ ⏳ Calculando quantidades...                     │
│ ████████████████████████████████████████ 100%   │
│                                                 │
│ ⏳ Aplicando fatores de correção...              │
│ ████████████████████████████████████████ 100%   │
│                                                 │
│ ⏳ Salvando lista no banco de dados...           │
│ ████████████████████████████████████████ 100%   │
│                                                 │
│ [Cancelar]                                      │
└─────────────────────────────────────────────────┘
```

### 3.2 Etapas do Progresso

1. **Analisando refeições** (20%)
   - Busca todas as refeições do período
   - Valida estrutura de dados

2. **Calculando quantidades** (40%)
   - Executa query de cálculo
   - Aplica fatores de faixa etária

3. **Aplicando fatores de correção** (20%)
   - Multiplica pelas perdas de preparo
   - Arredonda para unidades práticas

4. **Salvando lista no banco de dados** (20%)
   - Cria registro na tabela `listas_compras`
   - Insere itens na tabela `lista_compras_itens`

### 3.3 Tratamento de Erros

```
┌─────────────────────────────────────────────────┐
│ ❌ Erro ao gerar lista                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Ocorreu um erro durante o cálculo das           │
│ quantidades. Verifique se todos os ingredientes │
│ possuem fatores de correção definidos.          │
│                                                 │
│ Erro técnico: Division by zero in calculation   │
│                                                 │
│ [Tentar Novamente] [Fechar]                     │
└─────────────────────────────────────────────────┘
```

---

## 4. Modal de Lista Gerada

### 4.1 Layout Principal

```
┌─────────────────────────────────────────────────┐
│ Lista de Compras - Semana 15/01 a 19/01  [×]   │
│ 📊 23 ingredientes • Total estimado: R$ 0,00    │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔍 [Buscar ingrediente...]            [⚙️ Opções] │
│                                                 │
│ ☐ Arroz branco                    16.91 kg      │
│   [📝 Ajustar] [📊 Detalhes] [❌ Remover]       │
│                                                 │
│ ☐ Feijão preto                     8.45 kg      │
│   [📝 Ajustar] [📊 Detalhes] [❌ Remover]       │
│                                                 │
│ ☐ Tomate                           5.20 kg      │
│   [📝 Ajustar] [📊 Detalhes] [❌ Remover]       │
│                                                 │
│ ☐ Cebola                           3.15 kg      │
│   [📝 Ajustar] [📊 Detalhes] [❌ Remover]       │
│                                                 │
│ ☐ Óleo de soja                     2.80 l       │
│   [📝 Ajustar] [📊 Detalhes] [❌ Remover]       │
│                                                 │
│ ─────────────────────────────────────────────── │
│ [💾 Salvar Rascunho] [📄 Gerar PDF] [❌ Fechar] │
└─────────────────────────────────────────────────┘
```

### 4.2 Funcionalidades dos Itens

#### A) Busca de Ingredientes
```
🔍 [arr_______________] → Filtra por "Arroz branco"
```

#### B) Menu de Opções
```
┌─────────────────────────────────────────────────┐
│ ⚙️ Opções da Lista                               │
├─────────────────────────────────────────────────┤
│ • Ordenar por nome (A-Z)                        │
│ • Ordenar por quantidade (maior primeiro)       │
│ • Mostrar apenas itens editados                 │
│ • Ocultar itens removidos                       │
│ • Exportar para Excel                           │
└─────────────────────────────────────────────────┘
```

#### C) Ajustar Quantidade
```
┌─────────────────────────────────────────────────┐
│ Ajustar Quantidade - Arroz branco               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Quantidade calculada: 16.91 kg                  │
│ Nova quantidade: [18.00] kg                     │
│                                                 │
│ Motivo do ajuste:                               │
│ [Estoque disponível_________________]           │
│                                                 │
│ [Cancelar] [Salvar]                             │
└─────────────────────────────────────────────────┘
```

#### D) Ver Detalhes do Cálculo
```
┌─────────────────────────────────────────────────┐
│ Detalhamento - Arroz branco                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📅 15/01 - Almoço - Arroz branco                │
│   👥 100 pequenos + 50 adolesc. + 20 adultos    │
│   📊 Subtotal: 8.28 kg                          │
│                                                 │
│ 📅 16/01 - Almoço - Arroz branco                │
│   👥 120 pequenos + 40 adolesc. + 15 adultos    │
│   📊 Subtotal: 8.63 kg                          │
│                                                 │
│ ─────────────────────────────────────────────── │
│ 📊 Total: 16.91 kg                              │
│ ⚖️  Fator de correção 1.15 aplicado             │
│                                                 │
│ [Fechar]                                        │
└─────────────────────────────────────────────────┘
```

### 4.3 Estados dos Itens

#### Item Normal
```
☐ Arroz branco                    16.91 kg
  [📝 Ajustar] [📊 Detalhes] [❌ Remover]
```

#### Item Ajustado
```
☐ Arroz branco                    18.00 kg ✏️
  Original: 16.91 kg • Motivo: Estoque disponível
  [📝 Ajustar] [📊 Detalhes] [❌ Remover]
```

#### Item Removido
```
☐ Tomate                          5.20 kg ❌
  Item removido da lista
  [🔄 Restaurar]
```

#### Item Marcado como Comprado
```
☑️ Arroz branco                    18.00 kg ✅
  Comprado em 20/01/2024
  [📝 Editar] [📊 Detalhes]
```

---

## 5. Geração de PDF

### 5.1 Modal de Configuração do PDF

```
┌─────────────────────────────────────────────────┐
│ Gerar PDF da Lista de Compras                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📄 Formato:                                     │
│ ○ Lista simples (apenas ingredientes)           │
│ ● Lista detalhada (com cálculos)                │
│ ○ Lista para fornecedor (com preços)            │
│                                                 │
│ 📊 Incluir:                                     │
│ ☑️ Cabeçalho com dados da escola                │
│ ☑️ Período do cardápio                          │
│ ☑️ Data de geração                              │
│ ☐ Detalhes dos cálculos                        │
│ ☐ Observações                                   │
│                                                 │
│ 📝 Observações adicionais:                      │
│ [_________________________________]            │
│                                                 │
│ [Cancelar] [Gerar PDF]                          │
└─────────────────────────────────────────────────┘
```

### 5.2 Formatos de PDF

#### A) Lista Simples
```
ESCOLA MUNICIPAL EXEMPLO
Lista de Compras - Semana 15/01 a 19/01/2024

□ Arroz branco ........................ 18.00 kg
□ Feijão preto ........................  8.45 kg
□ Tomate ..............................  5.20 kg
□ Cebola ..............................  3.15 kg
□ Óleo de soja ........................  2.80 l

Total de itens: 5
Gerado em: 20/01/2024 às 14:30
```

#### B) Lista Detalhada
```
ESCOLA MUNICIPAL EXEMPLO
Lista de Compras Detalhada - Semana 15/01 a 19/01/2024

ARROZ BRANCO
Quantidade: 18.00 kg (ajustado de 16.91 kg)
Motivo: Estoque disponível
Usado em: 2 refeições
Fator de correção: 1.15

FEIJÃO PRETO
Quantidade: 8.45 kg
Usado em: 2 refeições
Fator de correção: 1.10
```

#### C) Lista para Fornecedor
```
ESCOLA MUNICIPAL EXEMPLO
Lista de Compras - Semana 15/01 a 19/01/2024

Item                    Qtd      Preço Unit.  Total
Arroz branco           18.00 kg   R$ 0,00    R$ 0,00
Feijão preto            8.45 kg   R$ 0,00    R$ 0,00
Tomate                  5.20 kg   R$ 0,00    R$ 0,00

TOTAL GERAL: R$ 0,00

Fornecedor: ________________________
Data: ______________________________
Assinatura: ________________________
```

---

## 6. Persistência e Estados

### 6.1 Salvamento Automático

**Comportamento:**
- Lista é salva automaticamente como "rascunho" após geração
- Ajustes são salvos em tempo real
- Status muda para "finalizada" quando usuário confirma

**Estados da Lista:**
- `rascunho`: Lista gerada mas ainda em edição
- `finalizada`: Lista aprovada pelo nutricionista
- `comprada`: Compras foram realizadas

### 6.2 Recuperação de Sessão

```
┌─────────────────────────────────────────────────┐
│ Lista em Andamento                              │
├─────────────────────────────────────────────────┤
│                                                 │
│ Você possui uma lista de compras não finalizada │
│ para este cardápio.                             │
│                                                 │
│ Lista: Semana 15/01 a 19/01                     │
│ Criada em: 20/01/2024 às 10:30                  │
│ Status: Rascunho                                │
│                                                 │
│ [Continuar Editando] [Nova Lista] [Descartar]   │
└─────────────────────────────────────────────────┘
```

---

## 7. Responsividade e Acessibilidade

### 7.1 Adaptação Mobile

**Tela Pequena (< 768px):**
```
┌─────────────────────────────────┐
│ Lista de Compras          [×]   │
│ 23 itens                        │
├─────────────────────────────────┤
│                                 │
│ 🔍 [Buscar...]                  │
│                                 │
│ ☐ Arroz branco                  │
│   16.91 kg                      │
│   [Ajustar] [Detalhes]          │
│                                 │
│ ☐ Feijão preto                  │
│   8.45 kg                       │
│   [Ajustar] [Detalhes]          │
│                                 │
│ [Salvar] [PDF] [Fechar]         │
└─────────────────────────────────┘
```

### 7.2 Acessibilidade

**Recursos implementados:**
- ✅ Navegação por teclado (Tab, Enter, Esc)
- ✅ Leitores de tela (aria-labels)
- ✅ Alto contraste
- ✅ Textos alternativos para ícones
- ✅ Foco visível em elementos interativos

**Atalhos de Teclado:**
- `Ctrl + G`: Gerar nova lista
- `Ctrl + S`: Salvar rascunho
- `Ctrl + P`: Gerar PDF
- `Esc`: Fechar modal
- `F3`: Buscar ingrediente

---

## 8. Tratamento de Erros

### 8.1 Erros de Validação

```
┌─────────────────────────────────────────────────┐
│ ⚠️  Atenção                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Não é possível gerar a lista de compras:        │
│                                                 │
│ • O cardápio não possui refeições               │
│ • 3 preparações estão sem ingredientes          │
│ • 2 ingredientes não têm fator de correção      │
│                                                 │
│ [Corrigir Problemas] [Fechar]                   │
└─────────────────────────────────────────────────┘
```

### 8.2 Erros de Sistema

```
┌─────────────────────────────────────────────────┐
│ ❌ Erro do Sistema                               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Ocorreu um erro inesperado ao gerar a lista.    │
│                                                 │
│ Código do erro: LST_001                         │
│ Tente novamente em alguns instantes.            │
│                                                 │
│ [Tentar Novamente] [Reportar Erro] [Fechar]     │
└─────────────────────────────────────────────────┘
```

### 8.3 Timeout de Operação

```
┌─────────────────────────────────────────────────┐
│ ⏱️  Operação Demorada                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ A geração da lista está demorando mais que      │
│ o esperado. Isso pode acontecer com cardápios   │
│ muito grandes.                                  │
│                                                 │
│ Deseja continuar aguardando?                    │
│                                                 │
│ [Continuar] [Cancelar]                          │
└─────────────────────────────────────────────────┘
```

---

## 9. Métricas e Analytics

### 9.1 Eventos Rastreados

**Geração de Listas:**
- `lista_compras_iniciada`
- `lista_compras_gerada_sucesso`
- `lista_compras_erro`
- `lista_compras_cancelada`

**Edições:**
- `item_quantidade_ajustada`
- `item_removido`
- `item_restaurado`

**Exportação:**
- `pdf_gerado`
- `pdf_formato_selecionado`

### 9.2 Métricas de Performance

**Tempos medidos:**
- Tempo de geração da lista
- Tempo de cálculo das quantidades
- Tempo de salvamento no banco
- Tempo de geração do PDF

---

## 10. Testes de Interface

### 10.1 Cenários de Teste

**Fluxo Completo:**
1. ✅ Gerar lista de cardápio válido
2. ✅ Ajustar quantidades de ingredientes
3. ✅ Remover e restaurar itens
4. ✅ Gerar PDF em diferentes formatos
5. ✅ Salvar como rascunho e finalizar

**Cenários de Erro:**
1. ✅ Cardápio sem refeições
2. ✅ Preparações sem ingredientes
3. ✅ Ingredientes sem fator de correção
4. ✅ Erro de conexão durante geração
5. ✅ Timeout de operação

**Responsividade:**
1. ✅ Funcionamento em mobile
2. ✅ Adaptação de modais
3. ✅ Navegação por teclado
4. ✅ Leitores de tela

---

## Referências

- **Especificação técnica:** `LISTA_COMPRAS_SPECIFICATION.md`
- **Estrutura do banco:** `database-setup.sql`
- **Migration:** `database-migration-add-lista-compras-tables.sql`
- **Criação de cardápios:** `CARDAPIO_CREATION_SPECIFICATION.md`

---

**Última atualização:** Janeiro 2024  
**Versão:** 1.0