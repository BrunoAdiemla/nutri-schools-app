# Especificação: Sistema de Lista de Compras

## Visão Geral

Este documento detalha o funcionamento completo do sistema de geração de listas de compras a partir dos cardápios criados no sistema Nutri Schools. O sistema calcula automaticamente as quantidades de ingredientes necessárias considerando o número de comensais por faixa etária e fatores de correção.

---

## Estrutura de Dados

### Hierarquia de Relacionamentos

```
cardapios_semanais (Cardápio da semana)
    ↓
cardapios_do_dia (Dias do cardápio)
    ↓
refeicoes (Refeições: colação, almoço, lanche, jantar)
    ↓
refeicao_preparacoes (Preparações de cada refeição)
    ↓
ingrediente_preparacao (Ingredientes de cada preparação)
    ↓
ingredientes (Dados do ingrediente)
```

### Tabelas Envolvidas

#### 1. `listas_compras` (Cabeçalho da lista)
```sql
- id: UUID
- cardapio_semanal_id: UUID (vínculo com o cardápio)
- nome: TEXT (ex: "Lista de Compras - 01/01/2024 a 07/01/2024")
- data_inicial: DATE
- data_final: DATE
- status: TEXT ('rascunho', 'finalizada', 'comprada')
- observacoes: TEXT
- created_by: UUID
- created_at, updated_at: TIMESTAMP
```

#### 2. `lista_compras_itens` (Itens da lista)
```sql
- id: UUID
- lista_compras_id: UUID
- ingrediente_id: UUID
- ingrediente_nome: TEXT (desnormalizado para histórico)
- unidade_medida: TEXT (desnormalizado para histórico)
- quantidade_calculada: DECIMAL(10,3) (resultado automático)
- quantidade_ajustada: DECIMAL(10,3) (ajuste manual opcional)
- fator_correcao_aplicado: DECIMAL(5,2)
- detalhes_calculo: JSONB (breakdown detalhado)
- comprado: BOOLEAN
- quantidade_comprada: DECIMAL(10,3)
- preco_unitario: DECIMAL(10,2)
- preco_total: DECIMAL(10,2)
- fornecedor: TEXT
- observacoes: TEXT
- created_at, updated_at: TIMESTAMP
```

#### 3. `fatores_faixa_etaria` (Configuração por usuário)
```sql
- id: UUID
- user_id: UUID
- fator_pequenos: DECIMAL(3,2) DEFAULT 0.70
- fator_adolescentes: DECIMAL(3,2) DEFAULT 1.00
- fator_adultos: DECIMAL(3,2) DEFAULT 1.20
- created_at, updated_at: TIMESTAMP
```

---

## Fórmula de Cálculo

### Cálculo de Quantidade por Ingrediente

Para cada ingrediente usado nas refeições do período selecionado:

```
Quantidade Total = Σ (para cada refeição que usa o ingrediente) {
    quantidade_por_per_capita × (
        (comensais_pequenos × fator_pequenos) +
        (comensais_adolescentes × fator_adolescentes) +
        (comensais_adultos × fator_adultos)
    ) × fator_correcao
}
```

### Componentes da Fórmula

**`quantidade_por_per_capita`**
- Origem: Tabela `ingrediente_preparacao`
- Descrição: Quantidade do ingrediente necessária por pessoa (per capita)
- Exemplo: 50g de arroz por pessoa

**`comensais_pequenos`, `comensais_adolescentes`, `comensais_adultos`**
- Origem: Tabela `refeicoes`
- Descrição: Número de pessoas de cada faixa etária que irão consumir a refeição
- Exemplo: 100 crianças, 50 adolescentes, 20 adultos

**`fator_pequenos`, `fator_adolescentes`, `fator_adultos`**
- Origem: Tabela `fatores_faixa_etaria` (configurável por usuário)
- Descrição: Fatores de ajuste por faixa etária
- Valores padrão:
  - Pequenos: 0.70 (crianças comem menos)
  - Adolescentes: 1.00 (referência)
  - Adultos: 1.20 (adultos comem mais)

**`fator_correcao`**
- Origem: Tabela `ingredientes`
- Descrição: Compensa perdas no preparo (cascas, aparas, evaporação)
- Exemplo: 1.15 = comprar 15% a mais para compensar perdas

### Exemplo Prático de Cálculo

**Cenário:**
- Ingrediente: Arroz branco
- Quantidade per capita: 50g
- Refeição: Almoço do dia 15/01
- Comensais: 100 pequenos, 50 adolescentes, 20 adultos
- Fatores: 0.70, 1.00, 1.20
- Fator de correção: 1.15

**Cálculo:**
```
Quantidade = 50g × (
    (100 × 0.70) +
    (50 × 1.00) +
    (20 × 1.20)
) × 1.15

Quantidade = 50g × (70 + 50 + 24) × 1.15
Quantidade = 50g × 144 × 1.15
Quantidade = 8,280g = 8.28 kg
```

---

## Query SQL para Geração da Lista

### Query Completa

```sql
WITH ingredientes_por_refeicao AS (
  SELECT 
    i.id as ingrediente_id,
    i.nome as ingrediente_nome,
    i.unidade_medida,
    i.fator_correcao,
    ip.quantidade_por_per_capita,
    r.comensais_pequenos,
    r.comensais_adolescentes,
    r.comensais_adultos,
    cd.data as data_refeicao,
    r.tipo as tipo_refeicao,
    p.nome as preparacao_nome,
    COALESCE(f.fator_pequenos, 0.70) as fator_pequenos,
    COALESCE(f.fator_adolescentes, 1.00) as fator_adolescentes,
    COALESCE(f.fator_adultos, 1.20) as fator_adultos
  FROM cardapios_semanais cs
  JOIN cardapios_do_dia cd ON cd.cardapio_semanal_id = cs.id
  JOIN refeicoes r ON r.cardapio_id = cd.id
  JOIN refeicao_preparacoes rp ON rp.refeicao_id = r.id
  JOIN preparacoes p ON p.id = rp.preparacao_id
  JOIN ingrediente_preparacao ip ON ip.preparacao_id = p.id
  JOIN ingredientes i ON i.id = ip.ingrediente_id
  LEFT JOIN fatores_faixa_etaria f ON f.user_id = cs.created_by
  WHERE cs.id = $1  -- ID do cardápio semanal
    AND cd.data BETWEEN $2 AND $3  -- Período da lista de compras
    AND cs.created_by = $4  -- Usuário logado
)
SELECT 
  ingrediente_id,
  ingrediente_nome,
  unidade_medida,
  SUM(
    quantidade_por_per_capita * (
      (comensais_pequenos * fator_pequenos) +
      (comensais_adolescentes * fator_adolescentes) +
      (comensais_adultos * fator_adultos)
    ) * fator_correcao
  ) as quantidade_total,
  -- Agregar detalhes para o campo JSONB
  jsonb_agg(
    jsonb_build_object(
      'data', data_refeicao,
      'tipo_refeicao', tipo_refeicao,
      'preparacao', preparacao_nome,
      'quantidade_per_capita', quantidade_por_per_capita,
      'comensais', jsonb_build_object(
        'pequenos', comensais_pequenos,
        'adolescentes', comensais_adolescentes,
        'adultos', comensais_adultos
      ),
      'fatores', jsonb_build_object(
        'pequenos', fator_pequenos,
        'adolescentes', fator_adolescentes,
        'adultos', fator_adultos
      ),
      'fator_correcao', fator_correcao,
      'quantidade_parcial', quantidade_por_per_capita * (
        (comensais_pequenos * fator_pequenos) +
        (comensais_adolescentes * fator_adolescentes) +
        (comensais_adultos * fator_adultos)
      ) * fator_correcao
    )
  ) as detalhes_calculo
FROM ingredientes_por_refeicao
GROUP BY ingrediente_id, ingrediente_nome, unidade_medida
ORDER BY ingrediente_nome;
```

---

## Estrutura do Campo `detalhes_calculo` (JSONB)

### Formato do JSON

```json
{
  "breakdown": [
    {
      "data": "2024-01-15",
      "tipo_refeicao": "almoço",
      "preparacao": "Arroz branco",
      "quantidade_per_capita": 50,
      "comensais": {
        "pequenos": 100,
        "adolescentes": 50,
        "adultos": 20
      },
      "fatores": {
        "pequenos": 0.70,
        "adolescentes": 1.00,
        "adultos": 1.20
      },
      "fator_correcao": 1.15,
      "quantidade_parcial": 8280,
      "calculo_detalhado": "50g × (100×0.7 + 50×1.0 + 20×1.2) × 1.15 = 8,280g"
    },
    {
      "data": "2024-01-16",
      "tipo_refeicao": "almoço",
      "preparacao": "Arroz branco",
      "quantidade_per_capita": 50,
      "comensais": {
        "pequenos": 120,
        "adolescentes": 40,
        "adultos": 15
      },
      "fatores": {
        "pequenos": 0.70,
        "adolescentes": 1.00,
        "adultos": 1.20
      },
      "fator_correcao": 1.15,
      "quantidade_parcial": 8625,
      "calculo_detalhado": "50g × (120×0.7 + 40×1.0 + 15×1.2) × 1.15 = 8,625g"
    }
  ],
  "total": 16905,
  "total_formatado": "16.91 kg"
}
```

### Finalidade do Campo JSONB

1. **Transparência**: Permite ao nutricionista entender de onde veio cada quantidade
2. **Auditoria**: Rastreabilidade completa do cálculo
3. **Validação**: Nutricionista pode verificar se os cálculos estão corretos
4. **Debugging**: Facilita identificar erros nos dados de entrada

---

## Fluxo de Geração da Lista

### Passo a Passo

#### 1. Usuário Seleciona Período
```
Input:
- Cardápio semanal (ou múltiplos cardápios)
- Data inicial
- Data final
```

#### 2. Sistema Busca Fatores do Usuário
```sql
SELECT fator_pequenos, fator_adolescentes, fator_adultos
FROM fatores_faixa_etaria
WHERE user_id = $1;

-- Se não existir, usar valores padrão: 0.70, 1.00, 1.20
```

#### 3. Sistema Executa Query de Cálculo
- Percorre todos os dias do período
- Para cada dia, busca todas as refeições
- Para cada refeição, busca todas as preparações
- Para cada preparação, busca todos os ingredientes
- Calcula quantidade considerando comensais e fatores
- Agrupa por ingrediente

#### 4. Sistema Cria Registros no Banco

**Criar cabeçalho da lista:**
```sql
INSERT INTO listas_compras (
    cardapio_semanal_id,
    nome,
    data_inicial,
    data_final,
    status,
    created_by
) VALUES (
    $1,  -- ID do cardápio
    'Lista de Compras - 01/01/2024 a 07/01/2024',
    '2024-01-01',
    '2024-01-07',
    'rascunho',
    $2   -- ID do usuário
) RETURNING id;
```

**Criar itens da lista:**
```sql
INSERT INTO lista_compras_itens (
    lista_compras_id,
    ingrediente_id,
    ingrediente_nome,
    unidade_medida,
    quantidade_calculada,
    fator_correcao_aplicado,
    detalhes_calculo
) VALUES (
    $1,  -- ID da lista criada acima
    $2,  -- ID do ingrediente
    $3,  -- Nome do ingrediente
    $4,  -- Unidade de medida
    $5,  -- Quantidade calculada
    $6,  -- Fator de correção aplicado
    $7   -- JSON com detalhes
);
```

#### 5. Sistema Retorna Lista Gerada
```typescript
interface ListaCompras {
  id: string;
  nome: string;
  data_inicial: string;
  data_final: string;
  status: 'rascunho' | 'finalizada' | 'comprada';
  itens: ListaComprasItem[];
}

interface ListaComprasItem {
  id: string;
  ingrediente_nome: string;
  unidade_medida: string;
  quantidade_calculada: number;
  quantidade_ajustada?: number;
  detalhes_calculo: {
    breakdown: Array<{
      data: string;
      tipo_refeicao: string;
      preparacao: string;
      quantidade_parcial: number;
    }>;
    total: number;
  };
}
```

---

## Interface do Usuário

### Tela de Geração

```
┌─────────────────────────────────────────────────┐
│ Gerar Lista de Compras                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Cardápio Semanal: [Dropdown]                    │
│ Data Inicial: [01/01/2024]                      │
│ Data Final:   [07/01/2024]                      │
│                                                 │
│ [Gerar Lista]                                   │
└─────────────────────────────────────────────────┘
```

### Tela da Lista Gerada

```
┌─────────────────────────────────────────────────┐
│ Lista de Compras - 01/01/2024 a 07/01/2024     │
│ Status: Rascunho                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ ☐ Arroz branco                                  │
│   Quantidade: 16.91 kg                          │
│   [Ver detalhes] [Ajustar quantidade]           │
│                                                 │
│ ☐ Feijão preto                                  │
│   Quantidade: 8.45 kg                           │
│   [Ver detalhes] [Ajustar quantidade]           │
│                                                 │
│ ☐ Tomate                                        │
│   Quantidade: 5.20 kg                           │
│   [Ver detalhes] [Ajustar quantidade]           │
│                                                 │
│ [Finalizar Lista] [Exportar PDF]                │
└─────────────────────────────────────────────────┘
```

### Modal de Detalhes

```
┌─────────────────────────────────────────────────┐
│ Detalhamento - Arroz branco                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ 15/01 - Almoço - Arroz branco                   │
│   100 pequenos + 50 adolesc. + 20 adultos       │
│   Subtotal: 8.28 kg                             │
│                                                 │
│ 16/01 - Almoço - Arroz branco                   │
│   120 pequenos + 40 adolesc. + 15 adultos       │
│   Subtotal: 8.63 kg                             │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Total: 16.91 kg                                 │
│ (Fator de correção 1.15 aplicado)              │
│                                                 │
│ [Fechar]                                        │
└─────────────────────────────────────────────────┘
```

---

## Funcionalidades Adicionais

### 1. Ajuste Manual de Quantidades

O nutricionista pode ajustar manualmente qualquer quantidade:

```typescript
async function ajustarQuantidade(
  itemId: string,
  novaQuantidade: number
): Promise<void> {
  await supabase
    .from('lista_compras_itens')
    .update({ quantidade_ajustada: novaQuantidade })
    .eq('id', itemId);
}
```

**Regra:** Se `quantidade_ajustada` existir, ela é usada no lugar de `quantidade_calculada`.

### 2. Controle de Compra

Marcar itens como comprados e registrar preços:

```typescript
async function marcarComoComprado(
  itemId: string,
  quantidadeComprada: number,
  precoUnitario: number,
  fornecedor: string
): Promise<void> {
  await supabase
    .from('lista_compras_itens')
    .update({
      comprado: true,
      quantidade_comprada: quantidadeComprada,
      preco_unitario: precoUnitario,
      preco_total: quantidadeComprada * precoUnitario,
      fornecedor: fornecedor
    })
    .eq('id', itemId);
}
```

### 3. Integração com Estoque

Subtrair quantidades disponíveis em estoque:

```sql
SELECT 
  lci.ingrediente_id,
  lci.ingrediente_nome,
  lci.quantidade_calculada,
  COALESCE(ie.quantidade_atual, 0) as quantidade_em_estoque,
  GREATEST(
    lci.quantidade_calculada - COALESCE(ie.quantidade_atual, 0),
    0
  ) as quantidade_a_comprar
FROM lista_compras_itens lci
LEFT JOIN ingredientes_estoque ie 
  ON ie.ingrediente_id = lci.ingrediente_id 
  AND ie.created_by = $1
WHERE lci.lista_compras_id = $2;
```

### 4. Exportação para PDF

Gerar PDF da lista para impressão:

```typescript
async function exportarPDF(listaId: string): Promise<Blob> {
  const lista = await buscarListaCompleta(listaId);
  
  // Usar biblioteca como jsPDF ou pdfmake
  const pdf = gerarPDF({
    titulo: lista.nome,
    periodo: `${lista.data_inicial} a ${lista.data_final}`,
    itens: lista.itens.map(item => ({
      nome: item.ingrediente_nome,
      quantidade: item.quantidade_ajustada || item.quantidade_calculada,
      unidade: item.unidade_medida
    }))
  });
  
  return pdf;
}
```

---

## Configuração de Fatores por Usuário

### Tela de Configuração

```
┌─────────────────────────────────────────────────┐
│ Configurações - Fatores de Faixa Etária        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Estes fatores ajustam as quantidades per capita│
│ de acordo com a faixa etária dos comensais.    │
│                                                 │
│ Fator para Crianças Pequenas:                   │
│ [0.70] (70% da porção padrão)                   │
│                                                 │
│ Fator para Adolescentes:                        │
│ [1.00] (100% da porção padrão)                  │
│                                                 │
│ Fator para Adultos:                             │
│ [1.20] (120% da porção padrão)                  │
│                                                 │
│ [Restaurar Padrões] [Salvar]                    │
└─────────────────────────────────────────────────┘
```

### Implementação

```typescript
async function salvarFatores(
  userId: string,
  fatores: {
    pequenos: number;
    adolescentes: number;
    adultos: number;
  }
): Promise<void> {
  await supabase
    .from('fatores_faixa_etaria')
    .upsert({
      user_id: userId,
      fator_pequenos: fatores.pequenos,
      fator_adolescentes: fatores.adolescentes,
      fator_adultos: fatores.adultos
    });
}
```

---

## Considerações Importantes

### 1. Unidades de Medida

**Regra:** Todos os ingredientes de uma preparação devem estar na mesma unidade base:
- Sólidos: gramas (g) ou quilogramas (kg)
- Líquidos: mililitros (ml) ou litros (l)

**Conversões necessárias antes do cálculo:**
- 1 kg = 1000 g
- 1 l = 1000 ml

### 2. Arredondamento

**Recomendação:** Arredondar para unidades práticas de compra:
- Menos de 1 kg: arredondar para 100g (ex: 850g → 900g)
- Mais de 1 kg: arredondar para 0.5 kg (ex: 3.2 kg → 3.5 kg)

### 3. Performance

**Otimizações:**
- Usar índices nas colunas de busca frequente
- Cachear listas geradas
- Executar cálculos em background para períodos longos

### 4. Validações

**Antes de gerar a lista:**
- ✅ Verificar se o cardápio tem refeições
- ✅ Verificar se as preparações têm ingredientes
- ✅ Verificar se os ingredientes têm quantidade per capita definida
- ✅ Verificar se as unidades de medida são compatíveis

---

## Exemplo Completo de Uso

### Cenário

**Cardápio:** Semana de 15/01 a 19/01 (5 dias)
**Refeições:** Almoço todos os dias
**Preparação:** Arroz branco (50g per capita)
**Comensais:** 100 pequenos, 50 adolescentes, 20 adultos (todos os dias)
**Fatores:** 0.70, 1.00, 1.20
**Fator de correção do arroz:** 1.15

### Cálculo

```
Dia 15/01:
50g × (100×0.7 + 50×1.0 + 20×1.2) × 1.15 = 8,280g

Dia 16/01:
50g × (100×0.7 + 50×1.0 + 20×1.2) × 1.15 = 8,280g

Dia 17/01:
50g × (100×0.7 + 50×1.0 + 20×1.2) × 1.15 = 8,280g

Dia 18/01:
50g × (100×0.7 + 50×1.0 + 20×1.2) × 1.15 = 8,280g

Dia 19/01:
50g × (100×0.7 + 50×1.0 + 20×1.2) × 1.15 = 8,280g

Total: 41,400g = 41.4 kg de arroz
```

### Resultado na Lista

```
Ingrediente: Arroz branco
Quantidade: 41.4 kg
Detalhes: 5 refeições × 8.28 kg cada
```

---

## Referências

- **Tabelas do banco:** `database-setup.sql`
- **Migration:** `database-migration-add-lista-compras-tables.sql`
- **Criação de cardápios:** `CARDAPIO_CREATION_SPECIFICATION.md`

---

**Última atualização:** Janeiro 2024
**Versão:** 1.0
