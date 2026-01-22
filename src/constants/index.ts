export const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'Home' },
  { id: 'shopping-list', label: 'Lista de compras', icon: 'ShoppingCart' },
  { id: 'menus', label: 'Cardápios', icon: 'Utensils' },
  { id: 'preparations', label: 'Preparações', icon: 'ChefHat' },
  { id: 'ingredients', label: 'Ingredientes', icon: 'Apple' },
  { id: 'stock', label: 'Estoques', icon: 'Package' }, // NEW - Added as per requirements
];

export const COLORS = {
  primary: '#2563eb', // blue-600
  secondary: '#64748b', // slate-500
  success: '#22c55e', // green-500
  warning: '#eab308', // yellow-500
  danger: '#ef4444', // red-500
};

export const APP_CONFIG = {
  name: 'Nutri Schools',
  version: '1.0.0',
  description: 'Sistema para gestão de cardápios e recursos alimentares escolares',
};

export const SUPABASE_TABLES = {
  USERS: 'users',
  INGREDIENTES: 'ingredientes',
  PREPARACOES: 'preparacoes',
  INGREDIENTE_PREPARACAO: 'ingrediente_preparacao',
  CARDAPIOS_SEMANAIS: 'cardapios_semanais',
  CARDAPIOS_DO_DIA: 'cardapios_do_dia',
  REFEICOES: 'refeicoes',
  REFEICAO_PREPARACOES: 'refeicao_preparacoes',
  LISTAS_COMPRAS: 'listas_compras',
  INGREDIENTES_ESTOQUE: 'ingredientes_estoque',
} as const;