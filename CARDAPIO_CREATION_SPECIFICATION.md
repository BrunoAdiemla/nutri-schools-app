# Especificação: Criação de Cardápios no Banco de Dados

## Visão Geral

Este documento detalha o processo de criação de cardápios no banco de dados quando o usuário clica em "Salvar Cardápio" no modal "Criar Cardápio".

## Fluxo de Criação

Quando o usuário clica em "Salvar Cardápio", serão criados registros em **4 tabelas** com relacionamentos hierárquicos:

```
cardapios_semanais (1 item)
    ↓
cardapios_do_dia (N itens - apenas dias não marcados como feriado/recesso)
    ↓
refeicoes (N itens - uma para cada refeição habilitada por dia)
    ↓
refeicao_preparacoes (N itens - uma para cada preparação selecionada)
```

---

## 1. Tabela: `cardapios_semanais`

### Descrição
Representa o cardápio semanal como um todo, contendo o período de datas.

### Campos a serem preenchidos:
- **`nome`**: `"[data inicial] até [data final]"` (formato: "01/01/2024 até 07/01/2024")
- **`data_inicio`**: Valor do input "Data inicial"
- **`data_fim`**: Valor do input "Data final"  
- **`created_by`**: UUID do usuário logado (tabela `public.users`)

### Schema da tabela:
```sql
create table public.cardapios_semanais (
  id uuid not null default gen_random_uuid(),
  nome character varying(255) not null,
  data_inicio date not null,
  data_fim date not null,
  created_by uuid null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint cardapios_semanais_pkey primary key (id),
  constraint cardapios_semanais_created_by_fkey foreign key (created_by) references users (id)
);
```

---

## 2. Tabela: `cardapios_do_dia`

### Descrição
Representa cada dia individual do cardápio. **Apenas dias NÃO marcados como "Feriado/Recesso"** serão criados.

### Campos a serem preenchidos:
- **`data`**: Data do dia específico (Date)
- **`created_by`**: UUID do usuário logado
- **`cardapio_semanal_id`**: ID do item criado em `cardapios_semanais`

### Schema da tabela:
```sql
create table public.cardapios_do_dia (
  id uuid not null default gen_random_uuid(),
  data date not null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  cardapio_semanal_id uuid null,
  constraint cardapios_do_dia_pkey primary key (id),
  constraint cardapios_do_dia_data_created_by_key unique (data, created_by),
  constraint cardapios_do_dia_cardapio_semanal_id_fkey foreign key (cardapio_semanal_id) references cardapios_semanais (id),
  constraint cardapios_do_dia_created_by_fkey foreign key (created_by) references users (id) on delete cascade
);
```

---

## 3. Tabela: `refeicoes`

### Descrição
Representa cada refeição individual dentro de um dia. Uma refeição é criada para cada card de refeição habilitado (Colação, Almoço, Lanche, Jantar).

### Campos a serem preenchidos:
- **`tipo`**: Tipo da refeição (`"colação"`, `"almoço"`, `"lanche"`, `"jantar"`)
- **`comensais_pequenos`**: Valor do campo "Comensais pequenos"
- **`comensais_adolescentes`**: Valor do campo "Comensais adolescentes"  
- **`comensais_adultos`**: Valor do campo "Comensais adultos"
- **`cardapio_id`**: ID do item `cardapios_do_dia` correspondente
- **`created_by`**: UUID do usuário logado

### Schema da tabela:
```sql
create table public.refeicoes (
  id uuid not null default gen_random_uuid(),
  tipo text not null,
  comensais_adultos integer null default 0,
  comensais_adolescentes integer null default 0,
  comensais_pequenos integer null default 0,
  cardapio_id uuid not null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint refeicoes_pkey primary key (id),
  constraint refeicoes_tipo_cardapio_id_key unique (tipo, cardapio_id),
  constraint refeicoes_cardapio_id_fkey foreign key (cardapio_id) references cardapios_do_dia (id) on delete cascade,
  constraint refeicoes_created_by_fkey foreign key (created_by) references users (id) on delete cascade,
  constraint refeicoes_tipo_check check ((tipo = any (array['colação'::text,'almoço'::text,'lanche'::text,'jantar'::text]))),
  constraint refeicoes_comensais_adultos_check check ((comensais_adultos >= 0)),
  constraint refeicoes_comensais_adolescentes_check check ((comensais_adolescentes >= 0)),
  constraint refeicoes_comensais_pequenos_check check ((comensais_pequenos >= 0))
);
```

---

## 4. Tabela: `refeicao_preparacoes`

### Descrição
Representa a relação entre refeições e preparações. Uma entrada é criada para cada preparação selecionada nos dropdowns de cada refeição.

### Campos a serem preenchidos:
- **`refeicao_id`**: ID do item `refeicoes` correspondente
- **`preparacao_id`**: ID da preparação selecionada (tabela `preparacoes`)
- **`nome_exibicao`**: Nome/texto da preparação (valor exibido no dropdown)

### Schema da tabela:
```sql
create table public.refeicao_preparacoes (
  id uuid not null default gen_random_uuid(),
  refeicao_id uuid not null,
  preparacao_id uuid not null,
  nome_exibicao text null,
  created_at timestamp with time zone null default now(),
  constraint refeicao_preparacoes_pkey primary key (id),
  constraint refeicao_preparacoes_refeicao_id_preparacao_id_key unique (refeicao_id, preparacao_id),
  constraint refeicao_preparacoes_preparacao_id_fkey foreign key (preparacao_id) references preparacoes (id) on delete cascade,
  constraint refeicao_preparacoes_refeicao_id_fkey foreign key (refeicao_id) references refeicoes (id) on delete cascade
);
```

---

## Mapeamento de Campos do Modal

### Dados do Modal → Banco de Dados

#### Período (Inputs de Data):
- `dateRange.startDate` → `cardapios_semanais.data_inicio`
- `dateRange.endDate` → `cardapios_semanais.data_fim`
- `"${startDate} até ${endDate}"` → `cardapios_semanais.nome`

#### Dias Gerados:
- `generatedDays[index]` → `cardapios_do_dia.data` (apenas se `!daysConfig[index].isHoliday`)

#### Refeições Habilitadas:
- `daysConfig[index].enabledMeals.colacao` → Criar `refeicoes` com `tipo: "colação"`
- `daysConfig[index].enabledMeals.almoco` → Criar `refeicoes` com `tipo: "almoço"`
- `daysConfig[index].enabledMeals.lanche` → Criar `refeicoes` com `tipo: "lanche"`
- `daysConfig[index].enabledMeals.jantar` → Criar `refeicoes` com `tipo: "jantar"`

#### Comensais por Refeição:
- `daysConfig[index].meals.colacao.comensaisPequenos` → `refeicoes.comensais_pequenos`
- `daysConfig[index].meals.colacao.comensaisAdolescentes` → `refeicoes.comensais_adolescentes`
- `daysConfig[index].meals.colacao.comensaisAdultos` → `refeicoes.comensais_adultos`

#### Preparações Selecionadas:
- `daysConfig[index].meals.colacao.solido` → `refeicao_preparacoes.preparacao_id`
- `daysConfig[index].meals.colacao.liquido` → `refeicao_preparacoes.preparacao_id`
- `daysConfig[index].meals.colacao.frutas` → `refeicao_preparacoes.preparacao_id`
- (E assim por diante para todas as preparações de todas as refeições)

---

## Algoritmo de Criação

### Pseudocódigo:
```
1. Criar cardapio_semanal
   - Obter cardapio_semanal_id

2. Para cada dia em generatedDays:
   - Se NÃO é feriado:
     a. Criar cardapio_do_dia
        - Obter cardapio_do_dia_id
     
     b. Para cada refeição habilitada (colacao, almoco, lanche, jantar):
        - Criar refeicao
        - Obter refeicao_id
        
        c. Para cada preparação selecionada na refeição:
           - Criar refeicao_preparacao
```

### Ordem de Execução:
1. **cardapios_semanais** (1 registro)
2. **cardapios_do_dia** (N registros - apenas dias não feriados)
3. **refeicoes** (N registros - por refeição habilitada por dia)
4. **refeicao_preparacoes** (N registros - por preparação selecionada)

---

## Validações Necessárias

### Antes da Criação:
- [ ] Verificar se `dateRange.startDate` e `dateRange.endDate` estão preenchidos
- [ ] Verificar se há pelo menos 1 dia não marcado como feriado
- [ ] Verificar se há pelo menos 1 refeição habilitada em algum dia
- [ ] Verificar se usuário está autenticado (`profile.id` disponível)

### Durante a Criação:
- [ ] Usar transações para garantir consistência
- [ ] Verificar se preparações selecionadas existem na tabela `preparacoes`
- [ ] Tratar erros de constraint (ex: unique violations)

---

## Próximos Passos

1. **Criar tipos TypeScript** para as estruturas de dados
2. **Implementar função no DatabaseService** para criação do cardápio
3. **Atualizar o CardapioModal** para chamar a função de criação
4. **Implementar tratamento de erros** e feedback para o usuário
5. **Adicionar validações** antes do envio
6. **Testar cenários** diversos (feriados, refeições vazias, etc.)