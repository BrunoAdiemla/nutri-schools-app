import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { Ingrediente, IngredienteTipo, UnidadeMedida } from '../types';
import { useLucideIcons } from '../hooks/useLucideIcons';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ingredientData: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  ingredient?: Ingrediente | null; // Para edição
  loading: boolean;
}

interface FormData {
  nome: string;
  tipo: IngredienteTipo | '';
  unidade_medida: UnidadeMedida | '';
  kcal_por_100g_ou_100ml: string; // String para controle do input
}

interface FormErrors {
  nome?: string;
  tipo?: string;
  unidade_medida?: string;
  kcal_por_100g_ou_100ml?: string;
}

const INGREDIENT_TYPES: { value: IngredienteTipo; label: string }[] = [
  { value: 'carnes-e-ovos', label: 'Carnes e Ovos' },
  { value: 'leites-e-derivados', label: 'Leites e Derivados' },
  { value: 'leguminosas', label: 'Leguminosas' },
  { value: 'cereais-e-derivados', label: 'Cereais e Derivados' },
  { value: 'tuberculos-e-raizes', label: 'Tubérculos e Raízes' },
  { value: 'verduras-hortalicas-derivados', label: 'Verduras, Hortaliças e Derivados' },
  { value: 'oleos-gorduras-oleaginosas', label: 'Óleos, Gorduras e Oleaginosas' },
  { value: 'acucares-e-doces', label: 'Açúcares e Doces' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'condimentos-e-temperos', label: 'Condimentos e Temperos' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'paes-e-biscoitos', label: 'Pães e Biscoitos' },
  { value: 'pescados-frutos-do-mar', label: 'Pescados e Frutos do Mar' }
];

const MEASUREMENT_UNITS: { value: UnidadeMedida; label: string }[] = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'ml', label: 'Mililitros (ml)' }
];

const IngredientModal: React.FC<IngredientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ingredient,
  loading
}) => {
  const { user, profile } = useAuth();
  const { showError } = useToast();
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    tipo: '',
    unidade_medida: '',
    kcal_por_100g_ou_100ml: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = !!ingredient;

  // Initialize Lucide icons using custom hook
  useLucideIcons([isOpen, formData.tipo, formData.unidade_medida]);

  // Load ingredient data when editing
  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        // Editing mode
        setFormData({
          nome: ingredient.nome,
          tipo: ingredient.tipo || '',
          unidade_medida: ingredient.unidade_medida,
          kcal_por_100g_ou_100ml: ingredient.kcal_por_100g_ou_100ml.toString()
        });
      } else {
        // Adding mode
        setFormData({
          nome: '',
          tipo: '',
          unidade_medida: '',
          kcal_por_100g_ou_100ml: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, ingredient]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Nome validation
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Tipo validation
    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
    }

    // Unidade de medida validation
    if (!formData.unidade_medida) {
      newErrors.unidade_medida = 'Unidade de medida é obrigatória';
    }

    // Calorias validation
    if (!formData.unidade_medida) {
      // Don't validate calories if no unit is selected
    } else if (!formData.kcal_por_100g_ou_100ml.trim()) {
      newErrors.kcal_por_100g_ou_100ml = 'Calorias por unidade é obrigatório';
    } else {
      const calories = parseFloat(formData.kcal_por_100g_ou_100ml);
      if (isNaN(calories) || calories < 0) {
        newErrors.kcal_por_100g_ou_100ml = 'Deve ser um número válido maior ou igual a 0';
      } else if (calories > 9999.9) {
        newErrors.kcal_por_100g_ou_100ml = 'Valor muito alto (máximo: 9999.9)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for unit change - clear calories when unit changes
    if (name === 'unidade_medida') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value as UnidadeMedida | '',
        kcal_por_100g_ou_100ml: '' // Clear calories when unit changes
      }));
    }
    // Special handling for calories input
    else if (name === 'kcal_por_100g_ou_100ml') {
      // Allow only numbers and one decimal point
      const regex = /^\d*\.?\d{0,1}$/;
      if (value === '' || regex.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
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
      const ingredientData: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'> = {
        nome: formData.nome.trim(),
        tipo: formData.tipo as IngredienteTipo,
        unidade_medida: formData.unidade_medida as UnidadeMedida,
        kcal_por_100g_ou_100ml: parseFloat(formData.kcal_por_100g_ou_100ml),
        default_ingredient: false, // Sempre false para ingredientes criados pelo usuário
        created_by: profile.id // Usar o ID da tabela users, não o auth_user_id
      };

      await onSubmit(ingredientData);
    } catch (error) {
      console.error('Ingredient submission error:', error);
      // Error handling is done in the parent component
    }
  };

  const getCalorieLabel = (): string => {
    if (!formData.unidade_medida) {
      return 'Calorias';
    }
    
    switch (formData.unidade_medida) {
      case 'g':
        return 'Calorias por 100g';
      case 'ml':
        return 'Calorias por 100ml';
      default:
        return 'Calorias';
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i data-lucide="apple" className="w-5 h-5 text-green-600"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Editar Ingrediente' : 'Adicionar Ingrediente'}
              </h2>
              <p className="text-sm text-slate-500">
                {isEditing ? 'Modifique as informações do ingrediente' : 'Preencha os dados do novo ingrediente'}
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Ex: Arroz Integral"
                disabled={loading}
              />
              {errors.nome && (
                <p className="mt-1 text-xs text-red-600">{errors.nome}</p>
              )}
            </div>

            {/* Tipo Field */}
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-slate-700 mb-1">
                Tipo <span className="text-red-500">*</span>
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
                {INGREDIENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.tipo && (
                <p className="mt-1 text-xs text-red-600">{errors.tipo}</p>
              )}
            </div>

            {/* Unidade de Medida Field */}
            <div>
              <label htmlFor="unidade_medida" className="block text-sm font-medium text-slate-700 mb-1">
                Unidade de Medida <span className="text-red-500">*</span>
              </label>
              <select
                id="unidade_medida"
                name="unidade_medida"
                value={formData.unidade_medida}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
                  errors.unidade_medida
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                } focus:outline-none focus:ring-1`}
                disabled={loading}
              >
                <option value="">Selecione a unidade</option>
                {MEASUREMENT_UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              {errors.unidade_medida && (
                <p className="mt-1 text-xs text-red-600">{errors.unidade_medida}</p>
              )}
            </div>

            {/* Calorias por Unidade Field */}
            <div>
              <label htmlFor="kcal_por_100g_ou_100ml" className="block text-sm font-medium text-slate-700 mb-1">
                {getCalorieLabel()} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="kcal_por_100g_ou_100ml"
                  name="kcal_por_100g_ou_100ml"
                  value={formData.kcal_por_100g_ou_100ml}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-12 border rounded-md text-sm transition-colors ${
                    errors.kcal_por_100g_ou_100ml
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1 ${
                    !formData.unidade_medida ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="Ex: 130.5"
                  disabled={loading || !formData.unidade_medida}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-sm text-slate-400">kcal</span>
                </div>
              </div>
              {errors.kcal_por_100g_ou_100ml && (
                <p className="mt-1 text-xs text-red-600">{errors.kcal_por_100g_ou_100ml}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {!formData.unidade_medida 
                  ? 'Selecione uma unidade de medida primeiro'
                  : 'Use ponto (.) para casas decimais. Ex: 130.5'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
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
                disabled={loading || !formData.nome || !formData.tipo || !formData.unidade_medida || !formData.kcal_por_100g_ou_100ml}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isEditing ? 'Salvando...' : 'Adicionando...'}</span>
                  </div>
                ) : (
                  isEditing ? 'Salvar Alterações' : 'Adicionar Ingrediente'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IngredientModal;