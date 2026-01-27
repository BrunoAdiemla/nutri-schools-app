# Especificação: Cálculo de Calorias no Modal "Criar Cardápio"

**Data de Criação:** 25/01/2026  
**Arquivo Principal:** `src/components/CardapioModal.tsx`  
**Status:** ✅ Implementado

---

## 1. Visão Geral

Esta funcionalidade permite calcular automaticamente as calorias de cada refeição do cardápio, baseando-se nos ingredientes das preparações selecionadas. Os valores são calculados separadamente para três faixas etárias: pequenos, adolescentes e adultos.

---

## 2. Requisitos Funcionais

### 2.1 Exibição de Informações Calóricas

**Localização:** Cards de refeições (Colação, Almoço, Lanche, Jantar) no modal "Criar Cardápio"

**Elementos visuais:**
- Linha separadora horizontal abaixo dos inputs de comensais
- Título "Informações calóricas" (fonte semibold, cor slate-700)
- Três labels com valores:
  - "Prato dos pequenos"
  - "Prato dos adolescentes"
  - "Prato dos adultos"
- Valores exibidos em cinza claro (text-slate-400)
- Botão "Calcular calorias" no canto superior direito da seção

### 2.2 Botão "Calcular Calorias"

**Características:**
- Posição: Canto superior direito da seção "Informações calóricas"
- Cor: Azul (bg-blue-600, hover:bg-blue-700)
- Ícone: Calculadora (lucide-react)
- Estados:
  - **Inativo:** Mostra ícone de calculadora + texto "Calcular calorias"
  - **Calculando:** Mostra spinner + texto "Calculando..."
  - **Desabilitado:** Quando o dia está marcado como feriado/recesso

### 2.3 Exibição de Valores

**Antes do cálculo:**
```
-- kcal
```

**Após o cálculo:**
```
[valor] kcal
```
Exemplo: `86.6 kcal`

---

## 3. Lógica de Cálculo

### 3.1 Fórmula Base por Ingrediente

Para cada ingrediente de uma preparação:

```
calorias_ingrediente = (quantidade_por_per_capita × 1000 ÷ 100) × kcal_por_100g_ou_100ml
```

**Exemplo prático:**
- Batata: `quantidade_por_per_capita = 0.008`
- Batata: `kcal_por_100g_ou_100ml = 52`
- Cálculo: `(0.008 × 1000 ÷ 100) × 52 = 0.8 × 52 = 41.6 kcal`

### 3.2 Soma por Preparação

Para cada preparação (ex: Purê de batatas):
```
calorias_preparacao = Σ calorias_ingrediente
```

**Exemplo:**
- Batata: 41.6 kcal
- Leite: 9.15 kcal
- Manteiga: 35.85 kcal
- **Total:** 86.6 kcal

### 3.3 Multiplicadores por Faixa Etária

Após calcular o total da preparação, aplicar multiplicadores:

| Faixa Etária | Multiplicador | Exemplo (base: 86.6 kcal) |
|--------------|---------------|---------------------------|
| Adultos      | 1.0 (100%)    | 86.6 kcal                |
| Adolescentes | 0.8 (80%)     | 69.3 kcal                |
| Pequenos     | 0.6 (60%)     | 51.9 kcal                |

### 3.4 Soma por Refeição

Para cada refeição (ex: Almoço):
```
calorias_refeicao = Σ calorias_preparacao (de todas as preparações da refeição)
```

**Exemplo Almoço:**
- Acompanhamento 1: 86.6 kcal
- Acompanhamento 2: 75.0 kcal
- Prato Principal: 150.0 kcal
- **Total Adultos:** 311.6 kcal
- **Total Adolescentes:** 249.3 kcal (311.6 × 0.8)
- **Total Pequenos:** 187.0 kcal (311.6 × 0.6)

### 3.5 Arredondamento

Todos os valores são arredondados para **1 casa decimal**:
```typescript
Math.round(valor * 10) / 10
```

---

## 4. Estrutura de Dados

### 4.1 Tabelas do Banco de Dados Utilizadas

**ingrediente_preparacao:**
```sql
- id: UUID
- ingrediente_id: UUID (FK → ingredientes)
- preparacao_id: UUID (FK → preparacoes)
- quantidade_por_per_capita: DECIMAL(10,3)
- unidade_medida: TEXT
```

**ingredientes:**
```sql
- id: UUID
- nome: TEXT
- kcal_por_100g_ou_100ml: DECIMAL(10,2)
- unidade_medida: TEXT
- tipo: TEXT
```

### 4.2 Estado React

```typescript
const [calculatedCalories, setCalculatedCalories] = useState<Record<number, {
  colacao?: { pequenos: number; adolescentes: number; adultos: number };
  almoco?: { pequenos: number; adolescentes: number; adultos: number };
  lanche?: { pequenos: number; adolescentes: number; adultos: number };
  jantar?: { pequenos: number; adolescentes: number; adultos: number };
}>>({});

const [calculatingCalories, setCalculatingCalories] = useState(false);
```

**Estrutura:**
- Chave: Índice do dia (activeTab)
- Valor: Objeto com calorias por refeição
  - Cada refeição contém: pequenos, adolescentes, adultos

---

## 5. Implementação Técnica

### 5.1 Função Principal: `handleCalculateCalories`

**Responsabilidades:**
1. Validar se o dia não é feriado
2. Iterar sobre todas as refeições habilitadas
3. Coletar IDs das preparações de cada refeição
4. Chamar `calculateMealCalories` para cada refeição
5. Atualizar o estado com os valores calculados
6. Exibir mensagem de sucesso/erro

**Fluxo:**
```
1. Verificar se dia é feriado → Erro se sim
2. Para cada refeição habilitada:
   a. Coletar IDs das preparações
   b. Calcular calorias
   c. Armazenar resultado
3. Atualizar estado
4. Mostrar feedback ao usuário
```

### 5.2 Função de Cálculo: `calculateMealCalories`

**Parâmetros:**
- `preparacaoIds: string[]` - Array de IDs das preparações da refeição

**Retorno:**
```typescript
{ 
  pequenos: number; 
  adolescentes: number; 
  adultos: number 
}
```

**Processo:**
```
1. Para cada preparação:
   a. Buscar ingredientes via Supabase
   b. Para cada ingrediente:
      - Aplicar fórmula: (qtd × 1000 ÷ 100) × kcal
      - Somar ao total
2. Aplicar multiplicadores por faixa etária
3. Arredondar valores
4. Retornar objeto com os três valores
```

**Query Supabase:**
```typescript
await DatabaseService.supabase
  .from('ingrediente_preparacao')
  .select(`
    quantidade_por_per_capita,
    ingredientes (
      kcal_por_100g_ou_100ml
    )
  `)
  .eq('preparacao_id', preparacaoId);
```

### 5.3 Preparações por Tipo de Refeição

**Colação e Lanche:**
- Sólido
- Líquido
- Frutas

**Almoço e Jantar:**
- Acompanhamento 1
- Acompanhamento 2
- Complemento
- Prato Principal
- Guarnição
- Salada
- Sobremesa
- Líquido

---

## 6. Interface do Usuário

### 6.1 Layout da Seção "Informações Calóricas"

```
┌─────────────────────────────────────────────────────────┐
│ Informações calóricas          [Calcular calorias] 🧮  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Prato dos pequenos    Prato dos adolescentes  Prato dos adultos │
│  86.6 kcal             69.3 kcal                86.6 kcal         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Classes Tailwind Utilizadas

**Container principal:**
```tsx
<div>
  <div className="flex items-center justify-between mb-3">
    <h6 className="text-sm font-semibold text-slate-700">
      Informações calóricas
    </h6>
    <button className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5">
      ...
    </button>
  </div>
  <div className="grid grid-cols-3 gap-4">
    ...
  </div>
</div>
```

**Valores:**
```tsx
<p className="text-sm text-slate-400">
  {calculatedCalories[activeTab]?.colacao?.pequenos 
    ? `${calculatedCalories[activeTab].colacao.pequenos} kcal` 
    : '-- kcal'}
</p>
```

---

## 7. Tratamento de Erros

### 7.1 Validações

1. **Dia marcado como feriado:**
   - Mensagem: "Não é possível calcular calorias para dias marcados como feriado/recesso"
   - Botão desabilitado

2. **Erro ao buscar ingredientes:**
   - Log no console
   - Continua para próxima preparação
   - Não interrompe o cálculo total

3. **Erro geral no cálculo:**
   - Mensagem: "Erro ao calcular calorias"
   - Estado de loading desativado

### 7.2 Casos Especiais

**Preparação sem ingredientes:**
- Log: "No ingredientes found for preparação: [id]"
- Contribui com 0 kcal para o total
- Não gera erro

**Ingrediente sem dados calóricos:**
- Ignorado no cálculo
- Não gera erro

---

## 8. Arquivos Modificados

### 8.1 CardapioModal.tsx

**Adições:**
1. Estado `calculatedCalories` (linha ~130)
2. Estado `calculatingCalories` (linha ~131)
3. Função `calculateMealCalories` (linha ~767)
4. Função `handleCalculateCalories` (linha ~820)
5. Seção UI "Informações calóricas" em cada refeição:
   - Colação (linha ~1440)
   - Almoço (linha ~1670)
   - Lanche (linha ~1850)
   - Jantar (linha ~2050)

### 8.2 DatabaseService.ts

**Adição:**
```typescript
export class DatabaseService {
  // Export supabase client for direct access when needed
  static supabase = supabase;
  ...
}
```

**Localização:** Linha ~100

**Motivo:** Permitir acesso direto ao cliente Supabase para queries customizadas no CardapioModal

---

## 9. Fluxo de Uso

### 9.1 Passo a Passo do Usuário

1. Abrir modal "Criar Cardápio"
2. Selecionar período de datas
3. Gerar dias do cardápio
4. Navegar para um dia específico
5. Selecionar preparações para as refeições
6. Clicar no botão "Calcular calorias" em qualquer card de refeição
7. Aguardar o cálculo (spinner visível)
8. Visualizar os valores calculados para cada faixa etária

### 9.2 Comportamento por Refeição

**Cada refeição calcula independentemente:**
- Colação: Soma de sólido + líquido + frutas
- Almoço: Soma de 8 preparações possíveis
- Lanche: Soma de sólido + líquido + frutas
- Jantar: Soma de 8 preparações possíveis

**Cálculo único por dia:**
- Ao clicar "Calcular calorias", todas as refeições habilitadas do dia são calculadas
- Os valores ficam armazenados no estado
- Permanecem visíveis ao navegar entre abas (dias)

---

## 10. Limitações e Considerações

### 10.1 Limitações Atuais

1. **Cálculo sob demanda:** Os valores não são calculados automaticamente ao selecionar preparações
2. **Não persistido:** Os valores calculados não são salvos no banco de dados (ainda)
3. **Recálculo necessário:** Ao mudar preparações, é necessário clicar novamente em "Calcular calorias"
4. **Valores por dia:** Cada dia mantém seus próprios valores calculados

### 10.2 Próximos Passos (Pendentes)

1. **Persistência no banco de dados:**
   - Salvar valores nas colunas `kcal_pequenos`, `kcal_adolescentes`, `kcal_adultos` da tabela `refeicoes`
   - Implementar ao salvar o cardápio

2. **Cálculo automático:**
   - Recalcular automaticamente ao mudar preparações
   - Debounce para evitar múltiplas chamadas

3. **Validações adicionais:**
   - Alertar se preparações não têm ingredientes cadastrados
   - Mostrar quais preparações contribuíram para o total

---

## 11. Exemplos de Uso

### 11.1 Exemplo Completo: Almoço

**Preparações selecionadas:**
1. Arroz branco (Acompanhamento 1)
2. Feijão preto (Acompanhamento 2)
3. Frango grelhado (Prato Principal)
4. Salada verde (Salada)

**Cálculo Arroz Branco:**
- Arroz cru: (0.025 × 1000 ÷ 100) × 130 = 32.5 kcal
- Óleo: (0.002 × 1000 ÷ 100) × 884 = 17.68 kcal
- **Total:** 50.18 kcal

**Cálculo Feijão Preto:**
- Feijão: (0.030 × 1000 ÷ 100) × 77 = 23.1 kcal
- Óleo: (0.001 × 1000 ÷ 100) × 884 = 8.84 kcal
- **Total:** 31.94 kcal

**Cálculo Frango Grelhado:**
- Peito de frango: (0.100 × 1000 ÷ 100) × 165 = 165 kcal
- **Total:** 165 kcal

**Cálculo Salada Verde:**
- Alface: (0.030 × 1000 ÷ 100) × 15 = 4.5 kcal
- Tomate: (0.020 × 1000 ÷ 100) × 18 = 3.6 kcal
- **Total:** 8.1 kcal

**Total Almoço (base):** 255.22 kcal

**Valores por faixa etária:**
- **Adultos:** 255.2 kcal (255.22 × 1.0, arredondado)
- **Adolescentes:** 204.2 kcal (255.22 × 0.8, arredondado)
- **Pequenos:** 153.1 kcal (255.22 × 0.6, arredondado)

---

## 12. Referências Técnicas

### 12.1 Dependências

- React 18+
- TypeScript
- Supabase Client
- Lucide React (ícones)
- Tailwind CSS

### 12.2 Hooks Utilizados

- `useState` - Gerenciamento de estado
- `useEffect` - Efeitos colaterais
- `useAuth` - Contexto de autenticação
- `useToast` - Notificações
- `useLucideIcons` - Inicialização de ícones

### 12.3 Serviços Utilizados

- `DatabaseService` - Acesso ao banco de dados
- `DatabaseService.supabase` - Cliente Supabase direto

---

## 13. Manutenção e Debugging

### 13.1 Logs de Debug

A função `calculateMealCalories` inclui logs para debugging:

```typescript
console.log('No ingredientes found for preparação:', preparacaoId);
console.error('Error fetching ingredientes for preparação:', preparacaoId, error);
console.error('Error calculating calories for preparação:', preparacaoId, error);
```

### 13.2 Testes Manuais Recomendados

1. **Teste básico:**
   - Selecionar 1 preparação
   - Calcular calorias
   - Verificar se valores aparecem

2. **Teste múltiplas preparações:**
   - Selecionar todas as preparações de uma refeição
   - Calcular calorias
   - Verificar soma correta

3. **Teste preparação sem ingredientes:**
   - Selecionar preparação vazia
   - Calcular calorias
   - Verificar se não gera erro

4. **Teste dia feriado:**
   - Marcar dia como feriado
   - Tentar calcular calorias
   - Verificar se botão está desabilitado

5. **Teste navegação entre dias:**
   - Calcular calorias para dia 1
   - Navegar para dia 2
   - Calcular calorias para dia 2
   - Voltar para dia 1
   - Verificar se valores persistem

---

## 14. Contato e Suporte

Para dúvidas ou ajustes nesta funcionalidade, consulte:
- Arquivo principal: `src/components/CardapioModal.tsx`
- Linhas relevantes: 130-131 (estado), 767-900 (funções), 1440+ (UI)
- Documentação do banco: `database-setup.sql`

---

**Última atualização:** 25/01/2026  
**Versão do documento:** 1.0
