import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { Ingrediente, IngredienteTipo } from '../types';
import { useLucideIcons } from '../hooks/useLucideIcons';
import { DatabaseService } from '../services/DatabaseService';
import IngredientModal from '../components/IngredientModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const INGREDIENT_TYPES: { value: IngredienteTipo; label: string }[] = [
  { value: 'carnes-e-ovos', label: 'Carnes e Ovos' },
  { value: 'leites-e-derivados', label: 'Leites e Derivados' },
  { value: 'leguminosas', label: 'Leguminosas' },
  { value: 'cereais-e-derivados', label: 'Cereais e Derivados' },
  { value: 'tuberculos-e-raizes', label: 'Tubérculos e Raízes' },
  { value: 'hortalicas', label: 'Hortaliças' },
  { value: 'oleos-gorduras-oleaginosas', label: 'Óleos, Gorduras e Oleaginosas' },
  { value: 'acucares-e-doces', label: 'Açúcares e Doces' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'condimentos-e-temperos', label: 'Condimentos e Temperos' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'paes-e-biscoitos', label: 'Pães e Biscoitos' }
];

const IngredientsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [ingredients, setIngredients] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, will be set to true when loading starts
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<IngredienteTipo | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingrediente | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingrediente | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Initialize Lucide icons using custom hook
  useLucideIcons([ingredients, showFilters, showModal, showDeleteModal, searchTerm, selectedType]);

  // Load ingredients when user/profile are available
  useEffect(() => {
    if (user && profile) {
      // Only load if we don't have data yet and we're not already loading
      if (ingredients.length === 0 && !loading) {
        loadIngredients();
      }
    } else {
      // If user/profile becomes unavailable, clear data and stop loading
      setIngredients([]);
      setLoading(false);
    }
  }, [user, profile]);

  const loadIngredients = async (forceReload = false) => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    if (!forceReload && ingredients.length > 0) {
      return;
    }

    try {
      setLoading(true);
      const data = await DatabaseService.getIngredients(profile.id);
      
      if (data) {
        setIngredients(data);
      } else {
        showError('Erro ao carregar ingredientes', 'Tente recarregar a página.');
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
      showError('Erro ao carregar ingredientes', 'Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh data (for external calls)
  const refreshIngredients = useCallback(() => {
    loadIngredients(true);
  }, []);

  const handleAddIngredient = () => {
    setEditingIngredient(null);
    setShowModal(true);
  };

  const handleEditIngredient = (ingredient: Ingrediente) => {
    setEditingIngredient(ingredient);
    setShowModal(true);
  };

  const handleModalClose = () => {
    if (!modalLoading) {
      setShowModal(false);
      setEditingIngredient(null);
    }
  };

  const handleModalSubmit = async (ingredientData: Omit<Ingrediente, 'id' | 'created_at' | 'updated_at'>) => {
    setModalLoading(true);

    try {
      if (editingIngredient) {
        // Editing existing ingredient
        const updatedIngredient = await DatabaseService.updateIngredient(editingIngredient.id, ingredientData);
        
        if (updatedIngredient) {
          setIngredients(prev => 
            prev.map(ing => ing.id === editingIngredient.id ? updatedIngredient : ing)
          );
          showSuccess('Ingrediente atualizado!', 'As alterações foram salvas com sucesso.');
        } else {
          throw new Error('Failed to update ingredient');
        }
      } else {
        // Adding new ingredient
        const newIngredient = await DatabaseService.createIngredient(ingredientData);
        
        if (newIngredient) {
          setIngredients(prev => [...prev, newIngredient]);
          showSuccess('Ingrediente adicionado!', 'O novo ingrediente foi cadastrado com sucesso.');
        } else {
          throw new Error('Failed to create ingredient');
        }
      }

      setShowModal(false);
      setEditingIngredient(null);
    } catch (error) {
      console.error('Error saving ingredient:', error);
      showError(
        editingIngredient ? 'Erro ao atualizar ingrediente' : 'Erro ao adicionar ingrediente',
        'Tente novamente.'
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteIngredient = async (ingredient: Ingrediente) => {
    if (ingredient.default_ingredient) {
      showError('Não é possível excluir', 'Ingredientes padrão não podem ser removidos.');
      return;
    }

    setIngredientToDelete(ingredient);
    setShowDeleteModal(true);
  };

  const confirmDeleteIngredient = async () => {
    if (!ingredientToDelete) return;

    setDeleteLoading(true);

    try {
      const success = await DatabaseService.deleteIngredient(ingredientToDelete.id);
      
      if (success) {
        setIngredients(prev => prev.filter(ing => ing.id !== ingredientToDelete.id));
        showSuccess('Ingrediente excluído!', 'O ingrediente foi removido com sucesso.');
        setShowDeleteModal(false);
        setIngredientToDelete(null);
      } else {
        throw new Error('Failed to delete ingredient');
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      showError('Erro ao excluir ingrediente', 'Tente novamente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteModalClose = () => {
    if (!deleteLoading) {
      setShowDeleteModal(false);
      setIngredientToDelete(null);
    }
  };

  const getTypeLabel = (type?: IngredienteTipo) => {
    if (!type) return '-';
    const typeConfig = INGREDIENT_TYPES.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const getOriginBadge = (ingredient: Ingrediente) => {
    if (ingredient.default_ingredient) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <i data-lucide="shield-check" className="w-3 h-3 mr-1"></i>
          Padrão
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <i data-lucide="user" className="w-3 h-3 mr-1"></i>
        {user?.email || 'Usuário'}
      </span>
    );
  };

  // Check if user can edit/delete ingredient
  const canEditIngredient = (ingredient: Ingrediente) => {
    return !ingredient.default_ingredient && profile && ingredient.created_by === profile.id;
  };

  // Filter ingredients based on search and type
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || ingredient.tipo === selectedType;
    return matchesSearch && matchesType;
  });

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Ingredientes Cadastrados</h3>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-100 animate-pulse">
                <div className="w-12 h-3 bg-slate-300 rounded"></div>
              </div>
              <div className="px-3 py-1.5 text-xs bg-slate-100 rounded-md animate-pulse">
                <div className="w-20 h-3 bg-slate-300 rounded"></div>
              </div>
            </div>
          </div>
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm font-medium">Carregando ingredientes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-2">
                Buscar por nome
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 pl-10 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                  placeholder="Digite o nome do ingrediente..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i data-lucide="search" className="w-4 h-4 text-slate-400"></i>
                </div>
              </div>
            </div>

            {/* Type Dropdown */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
                Tipo
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as IngredienteTipo | '')}
                className="w-full h-[42px] px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
              >
                <option value="">Todos os tipos</option>
                {INGREDIENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedType) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('');
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-md border border-red-200 transition-colors"
              >
                <i data-lucide="x" className="w-4 h-4 mr-2"></i>
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Ingredientes Cadastrados</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 font-medium transition-colors ${
                showFilters ? 'bg-slate-100 text-slate-700' : 'text-slate-600'
              }`}
            >
              <i data-lucide="filter" className="w-3 h-3 inline mr-1"></i>
              Filtros
            </button>
            <button 
              onClick={refreshIngredients}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 font-medium transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar lista de ingredientes"
            >
              <i data-lucide="refresh-cw" className={`w-3 h-3 inline mr-1 ${loading ? 'animate-spin' : ''}`}></i>
              Atualizar
            </button>
            <button 
              onClick={handleAddIngredient}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-sm transition-colors"
            >
              <i data-lucide="plus" className="w-3 h-3 inline mr-1"></i>
              Adicionar Ingrediente
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unidade de Medida</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calorias por Unidade</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Origem</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <i data-lucide="search-x" className="w-8 h-8"></i>
                      <p className="text-sm font-medium">Nenhum ingrediente encontrado</p>
                      <p className="text-xs">Tente ajustar os filtros ou adicionar um novo ingrediente</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-sm">{ingredient.nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{getTypeLabel(ingredient.tipo)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{ingredient.unidade_medida}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {ingredient.kcal_por_100g_ou_100ml} kcal
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getOriginBadge(ingredient)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditIngredient(ingredient) && (
                          <>
                            <button 
                              onClick={() => handleEditIngredient(ingredient)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                              title="Editar ingrediente"
                            >
                              <i data-lucide="edit-2" className="w-4 h-4"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteIngredient(ingredient)}
                              className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                              title="Excluir ingrediente"
                            >
                              <i data-lucide="trash-2" className="w-4 h-4"></i>
                            </button>
                          </>
                        )}
                        {!canEditIngredient(ingredient) && (
                          <span className="text-xs text-slate-400 italic">Somente leitura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {filteredIngredients.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Exibindo {filteredIngredients.length} de {ingredients.length} ingredientes
              {(searchTerm || selectedType) && ' (filtrados)'}
            </p>
          </div>
        )}
      </div>

      {/* Ingredient Modal */}
      <IngredientModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        ingredient={editingIngredient}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDeleteIngredient}
        title="Excluir Ingrediente"
        message="Tem certeza que deseja excluir este ingrediente? Esta ação não pode ser desfeita."
        itemName={ingredientToDelete?.nome}
        loading={deleteLoading}
      />
    </div>
  );
};

export default IngredientsPage;