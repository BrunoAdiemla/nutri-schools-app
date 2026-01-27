import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { DatabaseService } from '../services/DatabaseService';
import { Preparacao, PreparacaoTipo, RefeicaoTipo, UnidadeMedida, Ingrediente } from '../types';
import { useLucideIcons } from '../hooks/useLucideIcons';

interface PreparacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preparacaoData: PreparacaoFormData) => Promise<void>;
  preparacao?: Preparacao | null; // Para edição
  loading: boolean;
}

interface PreparacaoFormData {
  nome: string;
  tipo: PreparacaoTipo | '';
  refeicoes_presente: RefeicaoTipo[];
  modo_preparo: string;
  ingredientes: IngredientePreparacao[];
}

interface IngredientePreparacao {
  ingrediente_id: string;
  nome: string;
  quantidade_por_per_capita: number;
  unidade_medida: UnidadeMedida;
  kcal_por_100g_ou_100ml?: number;
}

interface FormErrors {
  nome?: string;
  tipo?: string;
  refeicoes_presente?: string;
  modo_preparo?: string;
  ingredientes?: string;
}

const PREPARACAO_TYPES: { value: PreparacaoTipo; label: string }[] = [
  { value: 'sólido', label: 'Sólido' },
  { value: 'líquido', label: 'Líquido' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'acompanhamento', label: 'Acompanhamento' },
  { value: 'guarnição', label: 'Guarnição' },
  { value: 'complemento', label: 'Complemento' },
  { value: 'salada', label: 'Salada' },
  { value: 'prato principal', label: 'Prato Principal' },
  { value: 'sobremesa', label: 'Sobremesa' }
];

const MEAL_TYPES: { value: RefeicaoTipo; label: string }[] = [
  { value: 'colação', label: 'Colação' },
  { value: 'almoço', label: 'Almoço' },
  { value: 'lanche', label: 'Lanche' },
  { value: 'jantar', label: 'Jantar' }
];

const MEASUREMENT_UNITS: { value: UnidadeMedida; label: string }[] = [
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'l', label: 'Litros (l)' }
];

const PreparacaoModal: React.FC<PreparacaoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preparacao,
  loading
}) => {
  const { user, profile } = useAuth();
  const { showError } = useToast();
  const [formData, setFormData] = useState<PreparacaoFormData>({
    nome: '',
    tipo: '',
    refeicoes_presente: [],
    modo_preparo: '',
    ingredientes: []
  });
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Ingredients state for real Supabase data
  const [availableIngredients, setAvailableIngredients] = useState<Ingrediente[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [ingredientsError, setIngredientsError] = useState<string | null>(null);
  
  // Ingredient addition form
  const [selectedIngrediente, setSelectedIngrediente] = useState('');
  const [ingredienteQuantidade, setIngredienteQuantidade] = useState('');
  const [ingredienteUnidade, setIngredienteUnidade] = useState<UnidadeMedida | ''>('');

  // Multi-dropdown state for meal types
  const [showMealDropdown, setShowMealDropdown] = useState(false);

  const isEditing = !!preparacao;

  // Initialize Lucide icons using custom hook
  useLucideIcons([isOpen, formData.tipo, formData.refeicoes_presente, formData.ingredientes, selectedIngrediente]);

  // Load ingredients from Supabase
  const loadIngredients = async () => {
    if (!user || !profile) {
      console.log('[PreparacaoModal] User or profile not available, skipping ingredient load');
      return;
    }

    try {
      setIngredientsLoading(true);
      setIngredientsError(null);
      console.log(`[PreparacaoModal] Loading ingredients for user: ${profile.id}`);
      
      // Use DatabaseService to fetch ingredients (default + user-created)
      const data = await DatabaseService.getIngredients(profile.id);
      
      if (data) {
        console.log(`[PreparacaoModal] Loaded ${data.length} ingredients`);
        setAvailableIngredients(data);
      } else {
        console.log('[PreparacaoModal] No ingredients found');
        setAvailableIngredients([]);
      }
    } catch (error) {
      console.error('[PreparacaoModal] Error loading ingredients:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setIngredientsError(errorMessage);
      showError('Erro ao carregar ingredientes', errorMessage);
      setAvailableIngredients([]);
    } finally {
      setIngredientsLoading(false);
    }
  };

  // Load ingredients when modal opens and user is available
  useEffect(() => {
    if (isOpen && user && profile) {
      loadIngredients();
    }
  }, [isOpen, user, profile]);

  // Load existing preparation ingredients when editing
  useEffect(() => {
    const loadPreparacaoIngredientes = async () => {
      if (isOpen && preparacao && isEditing) {
        try {
          console.log(`[PreparacaoModal] Loading existing ingredients for preparation: ${preparacao.id}`);
          
          const ingredientesData = await DatabaseService.getPreparacaoIngredientes(preparacao.id);
          
          if (ingredientesData && ingredientesData.length > 0) {
            // Transformar os dados do banco para o formato do formulário
            const ingredientesFormatados = ingredientesData.map((item: any) => ({
              ingrediente_id: item.ingredientes.id,
              nome: item.ingredientes.nome,
              quantidade_por_per_capita: item.quantidade_por_per_capita,
              unidade_medida: item.unidade_medida,
              kcal_por_100g_ou_100ml: item.ingredientes.kcal_por_100g_ou_100ml // Incluir valor calórico
            }));

            console.log(`[PreparacaoModal] Loaded ${ingredientesFormatados.length} existing ingredients`);
            
            // Atualizar o formData com os ingredientes existentes
            setFormData(prev => ({
              ...prev,
              ingredientes: ingredientesFormatados
            }));
          }
        } catch (error) {
          console.error('[PreparacaoModal] Error loading existing ingredients:', error);
          // Não mostrar erro para o usuário, apenas log
        }
      }
    };

    loadPreparacaoIngredientes();
  }, [isOpen, preparacao, isEditing]);

  // Load preparation data when editing
  useEffect(() => {
    if (isOpen) {
      if (preparacao) {
        // Editing mode
        setFormData({
          nome: preparacao.nome,
          tipo: preparacao.tipo,
          refeicoes_presente: [...preparacao.refeicoes_presente],
          modo_preparo: preparacao.modo_preparo || '',
          ingredientes: [] // Will be loaded by separate useEffect
        });
      } else {
        // Adding mode
        setFormData({
          nome: '',
          tipo: '',
          refeicoes_presente: [],
          modo_preparo: '',
          ingredientes: []
        });
      }
      setErrors({});
      setSelectedIngrediente('');
      setIngredienteQuantidade('');
      setIngredienteUnidade('');
      setShowMealDropdown(false);
    }
  }, [isOpen, preparacao?.id]); // Usar preparacao?.id para evitar re-render desnecessário

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Close meal dropdown when clicking outside
      if (showMealDropdown && !(event.target as Element).closest('.meal-dropdown-container')) {
        setShowMealDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose, showMealDropdown]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Nome validation
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.nome.trim().length > 100) {
      newErrors.nome = 'Nome deve ter no máximo 100 caracteres';
    }

    // Tipo validation
    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
    }

    // Refeições validation
    if (formData.refeicoes_presente.length === 0) {
      newErrors.refeicoes_presente = 'Selecione pelo menos uma refeição';
    }

    // Modo de preparo validation (optional but with length limit)
    if (formData.modo_preparo.trim().length > 1000) {
      newErrors.modo_preparo = 'Modo de preparo deve ter no máximo 1000 caracteres';
    }

    // Ingredientes validation (optional but recommended)
    if (formData.ingredientes.length === 0) {
      newErrors.ingredientes = 'Recomenda-se adicionar pelo menos um ingrediente';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleMealTypeToggle = (mealType: RefeicaoTipo) => {
    setFormData(prev => ({
      ...prev,
      refeicoes_presente: prev.refeicoes_presente.includes(mealType)
        ? prev.refeicoes_presente.filter(type => type !== mealType)
        : [...prev.refeicoes_presente, mealType]
    }));

    // Clear meal types error when user makes selection
    if (errors.refeicoes_presente) {
      setErrors(prev => ({
        ...prev,
        refeicoes_presente: undefined
      }));
    }
  };

  const getMealTypeLabel = (mealType: RefeicaoTipo) => {
    const meal = MEAL_TYPES.find(m => m.value === mealType);
    return meal?.label || mealType;
  };

  const getMealTypeColor = (mealType: RefeicaoTipo) => {
    const colors = {
      'colação': 'bg-yellow-100 text-yellow-800',
      'almoço': 'bg-green-100 text-green-800',
      'lanche': 'bg-blue-100 text-blue-800',
      'jantar': 'bg-purple-100 text-purple-800'
    };
    return colors[mealType] || 'bg-slate-100 text-slate-800';
  };

  // Handle ingredient selection change
  const handleIngredienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ingredienteId = e.target.value;
    setSelectedIngrediente(ingredienteId);
    
    // Auto-set unit of measurement based on selected ingredient
    if (ingredienteId) {
      const selectedIngredienteData = availableIngredients.find(ing => ing.id === ingredienteId);
      if (selectedIngredienteData && selectedIngredienteData.unidade_medida) {
        setIngredienteUnidade(selectedIngredienteData.unidade_medida as UnidadeMedida);
      }
    } else {
      // Clear unit when no ingredient is selected
      setIngredienteUnidade('');
    }
  };

  const handleAddIngrediente = () => {
    // Validation for ingredient addition
    if (!selectedIngrediente || !ingredienteQuantidade || !ingredienteUnidade) {
      return;
    }

    const ingrediente = availableIngredients.find(ing => ing.id === selectedIngrediente);
    if (!ingrediente) return;

    const quantidade = parseFloat(ingredienteQuantidade);
    if (isNaN(quantidade) || quantidade <= 0) {
      return;
    }

    // Check if ingredient already exists
    if (formData.ingredientes.some(ing => ing.ingrediente_id === selectedIngrediente)) {
      return;
    }

    // Validate quantity limits
    if (quantidade > 9999) {
      return;
    }

    const novoIngrediente: IngredientePreparacao = {
      ingrediente_id: selectedIngrediente,
      nome: ingrediente.nome,
      quantidade_por_per_capita: quantidade,
      unidade_medida: ingredienteUnidade as UnidadeMedida,
      kcal_por_100g_ou_100ml: ingrediente.kcal_por_100g_ou_100ml // Capturar o valor calórico do ingrediente
    };

    setFormData(prev => ({
      ...prev,
      ingredientes: [...prev.ingredientes, novoIngrediente]
    }));

    // Clear ingredient errors when adding successfully
    if (errors.ingredientes) {
      setErrors(prev => ({
        ...prev,
        ingredientes: undefined
      }));
    }

    // Reset ingredient form
    setSelectedIngrediente('');
    setIngredienteQuantidade('');
    setIngredienteUnidade('');
  };

  const handleRemoveIngrediente = (ingredienteId: string) => {
    setFormData(prev => ({
      ...prev,
      ingredientes: prev.ingredientes.filter(ing => ing.ingrediente_id !== ingredienteId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user || !profile) {
      showError('Erro de autenticação', 'Usuário ou perfil não encontrado');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Preparation submission error:', error);
      // Error handling is done in the parent component
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <i data-lucide="chef-hat" className="w-5 h-5 text-orange-600"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Editar Preparação' : 'Adicionar Preparação'}
              </h2>
              <p className="text-sm text-slate-500">
                {isEditing ? 'Modifique as informações da preparação' : 'Preencha os dados da nova preparação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i data-lucide="x" className="w-5 h-5 text-slate-400"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Informações Básicas
              </h3>

              {/* Nome Field */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
                    errors.nome
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                  placeholder="Ex: Arroz Integral com Legumes"
                  disabled={loading}
                />
                {errors.nome && (
                  <p className="mt-1 text-xs text-red-600">{errors.nome}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {/* Tipo Field */}
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de Preparação <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="tipo"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
                      errors.tipo
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:outline-none focus:ring-1`}
                    disabled={loading}
                  >
                    <option value="">Selecione o tipo</option>
                    {PREPARACAO_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.tipo && (
                    <p className="mt-1 text-xs text-red-600">{errors.tipo}</p>
                  )}
                </div>
              </div>

              {/* Refeições Presente Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Refeições Presente <span className="text-red-500">*</span>
                </label>
                <div className="meal-dropdown-container relative">
                  <div
                    onClick={() => setShowMealDropdown(!showMealDropdown)}
                    className={`w-full min-h-[42px] px-3 py-2 border rounded-md text-sm cursor-pointer transition-colors ${
                      errors.refeicoes_presente
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-500'
                    } focus:outline-none focus:ring-1 bg-white`}
                    tabIndex={0}
                    onFocus={() => {}}
                    onBlur={() => {}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1 flex-1 min-h-[20px]">
                        {formData.refeicoes_presente.length === 0 ? (
                          <span className="text-slate-400">Selecione as refeições</span>
                        ) : (
                          formData.refeicoes_presente.map(mealType => (
                            <span
                              key={mealType}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMealTypeColor(mealType)}`}
                            >
                              {getMealTypeLabel(mealType)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMealTypeToggle(mealType);
                                }}
                                className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                                disabled={loading}
                              >
                                <i data-lucide="x" className="w-3 h-3"></i>
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex items-center ml-2">
                        <i 
                          data-lucide="chevron-down" 
                          className={`w-4 h-4 text-slate-400 transition-transform ${showMealDropdown ? 'rotate-180' : ''}`}
                        ></i>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Options - Only show unselected options */}
                  {showMealDropdown && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg animate-in fade-in duration-200">
                      <div className="py-1">
                        {MEAL_TYPES
                          .filter(mealType => !formData.refeicoes_presente.includes(mealType.value))
                          .map(mealType => (
                            <div
                              key={mealType.value}
                              onClick={() => {
                                handleMealTypeToggle(mealType.value);
                                // Keep dropdown open to allow multiple selections
                              }}
                              className="px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <span className="text-sm text-slate-700">{mealType.label}</span>
                            </div>
                          ))
                        }
                        {/* Show message when all options are selected */}
                        {MEAL_TYPES.filter(mealType => !formData.refeicoes_presente.includes(mealType.value)).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-400 italic">
                            Todas as refeições foram selecionadas
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.refeicoes_presente && (
                  <p className="mt-1 text-xs text-red-600">{errors.refeicoes_presente}</p>
                )}
              </div>

              {/* Modo de Preparo Field */}
              <div>
                <label htmlFor="modo_preparo" className="block text-sm font-medium text-slate-700 mb-1">
                  Modo de Preparo
                </label>
                <textarea
                  id="modo_preparo"
                  name="modo_preparo"
                  value={formData.modo_preparo}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 transition-colors ${
                    errors.modo_preparo
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Descreva o modo de preparo da receita..."
                  disabled={loading}
                />
                {errors.modo_preparo && (
                  <p className="mt-1 text-xs text-red-600">{errors.modo_preparo}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {formData.modo_preparo.length}/1000 caracteres
                </p>
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Lista de ingredientes
              </h3>

              {/* Ingredients loading error */}
              {ingredientsError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i data-lucide="alert-circle" className="w-4 h-4 text-red-600 mr-2"></i>
                      <div>
                        <p className="text-sm font-medium text-red-800">Erro ao carregar ingredientes</p>
                        <p className="text-xs text-red-600">{ingredientsError}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={loadIngredients}
                      disabled={ingredientsLoading}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 transition-colors"
                    >
                      {ingredientsLoading ? 'Carregando...' : 'Tentar novamente'}
                    </button>
                  </div>
                </div>
              )}

              {/* Add Ingredient Form */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Ingrediente Dropdown - 4 columns */}
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Ingrediente
                    </label>
                    <select
                      value={selectedIngrediente}
                      onChange={handleIngredienteChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                      disabled={loading || ingredientsLoading}
                    >
                      <option value="">
                        {ingredientsLoading ? 'Carregando ingredientes...' : 
                         ingredientsError ? 'Erro ao carregar ingredientes' :
                         availableIngredients.length === 0 ? 'Nenhum ingrediente disponível' :
                         'Selecione'}
                      </option>
                      {!ingredientsLoading && !ingredientsError && availableIngredients.map(ingrediente => (
                        <option key={ingrediente.id} value={ingrediente.id}>
                          {ingrediente.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unidade Dropdown - increased to 4 columns */}
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Unidade de medida
                    </label>
                    <select
                      value={ingredienteUnidade}
                      onChange={(e) => setIngredienteUnidade(e.target.value as UnidadeMedida | '')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      disabled={true}
                    >
                      <option value="">
                        {ingredienteUnidade ? 
                         MEASUREMENT_UNITS.find(unit => unit.value === ingredienteUnidade)?.label || ingredienteUnidade :
                         'Unidade de medida'}
                      </option>
                      {ingredienteUnidade && (
                        <option value={ingredienteUnidade}>
                          {MEASUREMENT_UNITS.find(unit => unit.value === ingredienteUnidade)?.label || ingredienteUnidade}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Quantidade Input - decreased to 3 columns */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Qtd. per capita
                    </label>
                    <input
                      type="text"
                      value={ingredienteQuantidade}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers with up to one decimal place
                        const regex = /^\d*\.?\d{0,1}$/;
                        if (value === '' || regex.test(value)) {
                          setIngredienteQuantidade(value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                      placeholder="0.0"
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Valor para um adulto
                    </p>
                  </div>

                  {/* Add Button - aligned with inputs (1 column) */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1 opacity-0">
                      Ação
                    </label>
                    <button
                      type="button"
                      onClick={handleAddIngrediente}
                      disabled={!selectedIngrediente || !ingredienteQuantidade || !ingredienteUnidade || loading}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center justify-center"
                      title="Adicionar ingrediente"
                    >
                      <i data-lucide="plus" className="w-4 h-4"></i>
                    </button>
                  </div>
                </div>

                {/* Ingredients List - Now inside the gray container */}
                {formData.ingredientes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <h4 className="text-xs font-medium text-slate-500">Ingredientes adicionados</h4>
                    <div className="space-y-2">
                      {formData.ingredientes.map((ingrediente) => (
                        <div key={ingrediente.ingrediente_id} className="flex items-center justify-between bg-white p-3 rounded-md border border-slate-200">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-900">{ingrediente.nome}</span>
                            <span className="text-sm text-slate-500 ml-2">
                              {ingrediente.quantidade_por_per_capita} {ingrediente.unidade_medida}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngrediente(ingrediente.ingrediente_id)}
                            className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                            title="Remover ingrediente"
                            disabled={loading}
                          >
                            <i data-lucide="trash-2" className="w-4 h-4"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients validation message */}
              {errors.ingredientes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <i data-lucide="alert-triangle" className="w-4 h-4 text-yellow-600 mr-2 mt-0.5"></i>
                    <p className="text-xs text-yellow-700">{errors.ingredientes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.nome || !formData.tipo || formData.refeicoes_presente.length === 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isEditing ? 'Salvando...' : 'Adicionando...'}</span>
                  </div>
                ) : (
                  isEditing ? 'Salvar Alterações' : 'Adicionar Preparação'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PreparacaoModal;