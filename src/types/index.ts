// Enums
export enum MenuStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  DRAFT = 'DRAFT',
  REJECTED = 'REJECTED'
}

export type PreparacaoTipo = 'sólido' | 'líquido' | 'frutas' | 'acompanhamento' | 'guarnição' | 'salada' | 'prato principal' | 'sobremesa' | 'complemento';
export type RefeicaoTipo = 'colação' | 'almoço' | 'lanche' | 'jantar';
export type UserFuncao = 'nutricionista' | 'gestor' | 'outro';
export type IngredienteTipo = 
  | 'carnes-e-ovos'
  | 'leites-e-derivados'
  | 'leguminosas'
  | 'cereais-e-derivados'
  | 'tuberculos-e-raizes'
  | 'hortalicas'
  | 'oleos-gorduras-oleaginosas'
  | 'acucares-e-doces'
  | 'bebidas'
  | 'condimentos-e-temperos'
  | 'frutas'
  | 'paes-e-biscoitos';

export type UnidadeMedida = 'g' | 'kg' | 'ml' | 'l' | 'unidade' | 'xícara' | 'colher';

// Legacy types (will be replaced with Supabase types)
export interface MenuItem {
  id: string;
  name: string;
  school: string;
  date: string;
  calories: number;
  protein: number;
  status: MenuStatus;
}

export interface DashboardStats {
  totalIngredientes: number;
  totalPreparacoes: number;
  totalListasCompras: number;
  totalCardapios: number;
}

// Supabase Database Types
export interface UserProfile {
  id: string;
  auth_user_id: string;
  nome: string;
  email: string;
  cidade?: string;
  estado?: string;
  rua?: string;
  bairro?: string;
  cep?: string;
  funcao: UserFuncao;
  nome_escola?: string;
  created_at: string;
  updated_at: string;
}

export interface Ingrediente {
  id: string;
  nome: string;
  tipo?: IngredienteTipo;
  unidade_medida: UnidadeMedida;
  kcal_por_100g_ou_100ml: number;
  default_ingredient: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Preparacao {
  id: string;
  nome: string;
  valor_per_capita?: number;
  unidade_de_medida?: UnidadeMedida;
  modo_preparo?: string;
  tipo: PreparacaoTipo;
  refeicoes_presente: RefeicaoTipo[];
  default_preparation: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CardapiosDoDia {
  id: string;
  data: string; // ISO date string
  cardapio_semanal_id?: string; // Reference to CardapioSemanal
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CardapioSemanal {
  id: string;
  nome: string;
  data_inicio: string; // ISO date string
  data_fim: string; // ISO date string
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Refeicao {
  id: string;
  tipo: RefeicaoTipo;
  comensais_adultos: number;
  comensais_adolescentes: number;
  comensais_pequenos: number;
  cardapio_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RefeicaoPreparacao {
  id: string;
  refeicao_id: string;
  preparacao_id: string;
  nome_exibicao?: string;
  created_at: string;
}

// Types for Cardapio Creation Process
export interface CardapioCreationData {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  generatedDays: Date[];
  daysConfig: Record<number, DayConfig>;
}

export interface DayConfig {
  isHoliday: boolean;
  enabledMeals: {
    colacao: boolean;
    almoco: boolean;
    lanche: boolean;
    jantar: boolean;
  };
  meals: MealData;
}

export interface MealData {
  colacao: MealConfig;
  almoco: MealConfig;
  lanche: MealConfig;
  jantar: MealConfig;
}

export interface MealConfig {
  // Preparações selecionadas (IDs das preparações)
  solido?: string;
  liquido?: string;
  frutas?: string;
  acompanhamento1?: string;
  acompanhamento2?: string;
  complemento?: string;
  pratoPrincipal?: string;
  guarnicao?: string;
  salada?: string;
  sobremesa?: string;
  // Comensais
  comensaisPequenos: number;
  comensaisAdolescentes: number;
  comensaisAdultos: number;
}

// Database creation payload types
export interface CreateCardapioSemanalPayload {
  nome: string;
  data_inicio: string; // ISO date string
  data_fim: string; // ISO date string
  created_by: string;
}

export interface CreateCardapiosDoDiaPayload {
  data: string; // ISO date string
  cardapio_semanal_id: string;
  created_by: string;
}

export interface CreateRefeicaoPayload {
  tipo: RefeicaoTipo;
  comensais_adultos: number;
  comensais_adolescentes: number;
  comensais_pequenos: number;
  cardapio_id: string;
  created_by: string;
}

export interface CreateRefeicaoPreparacaoPayload {
  refeicao_id: string;
  preparacao_id: string;
  nome_exibicao?: string;
}

export interface ListaCompras {
  id: string;
  data_inicial: string;
  data_final: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IngredienteEstoque {
  id: string;
  ingrediente_id: string;
  quantidade_atual: number;
  data_atualizacao: string;
  created_by: string;
  updated_at: string;
}

// Authentication Types
export interface AuthContextType {
  user: any | null; // Will be replaced with Supabase User type
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface SignUpData {
  nome: string;
  email: string;
  password: string;
  cidade?: string;
  estado?: string;
  nome_escola?: string;
}

// Error Types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  USER_NOT_FOUND = 'user_not_found',
  WEAK_PASSWORD = 'weak_password',
  EMAIL_ALREADY_EXISTS = 'email_already_exists'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  field?: string;
}

export enum DatabaseErrorType {
  CONNECTION_FAILED = 'connection_failed',
  QUERY_FAILED = 'query_failed',
  PERMISSION_DENIED = 'permission_denied',
  CONSTRAINT_VIOLATION = 'constraint_violation'
}

export interface DatabaseError {
  type: DatabaseErrorType;
  message: string;
  query?: string;
  table?: string;
}

export interface NetworkError {
  status: number;
  message: string;
  retryable: boolean;
}

// Global Application State
export interface AppState {
  auth: {
    user: any | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
  };
  dashboard: {
    stats: DashboardStats | null;
    loading: boolean;
    error: string | null;
  };
  ui: {
    sidebarCollapsed: boolean;
    activeRoute: string;
    theme: 'light' | 'dark';
  };
}

// Environment Configuration
export interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_APP_ENV: 'development' | 'staging' | 'production';
}