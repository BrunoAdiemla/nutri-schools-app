import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { DatabaseService } from '../services/DatabaseService';
import { Preparacao, PreparacaoTipo, RefeicaoTipo } from '../types';
import { useLucideIcons } from '../hooks/useLucideIcons';
import PreparacaoModal from '../components/PreparacaoModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

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

const MEAL_TYPES: { value: RefeicaoTipo; label: string; color: string }[] = [
  { value: 'colação', label: 'Colação', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'almoço', label: 'Almoço', color: 'bg-green-100 text-green-800' },
  { value: 'lanche', label: 'Lanche', color: 'bg-blue-100 text-blue-800' },
  { value: 'jantar', label: 'Jantar', color: 'bg-purple-100 text-purple-800' }
];

const PreparacoesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [preparacoes, setPreparacoes] = useState<Preparacao[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, will be set to true when loading starts
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<PreparacaoTipo | ''>('');
  const [selectedMealTypes, setSelectedMealTypes] = useState<RefeicaoTipo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPreparacao, setEditingPreparacao] = useState<Preparacao | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [preparacaoToDelete, setPreparacaoToDelete] = useState<Preparacao | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showMealDropdown, setShowMealDropdown] = useState(false);

  // Initialize Lucide icons using custom hook
  useLucideIcons([preparacoes, showFilters, debouncedSearchTerm, selectedType, selectedMealTypes, showModal, showDeleteModal, error]);

  // Handle click outside to close meal dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMealDropdown && !(event.target as Element).closest('.meal-dropdown-container')) {
        setShowMealDropdown(false);
      }
    };

    if (showMealDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMealDropdown]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load preparations when user/profile are available
  useEffect(() => {
    if (user && profile) {
      // Only load if we don't have data yet and we're not already loading
      if (preparacoes.length === 0 && !loading) {
        loadPreparacoes();
      }
    } else {
      // If user/profile becomes unavailable, clear data and stop loading
      setPreparacoes([]);
      setLoading(false);
      setError(null);
    }
  }, [user, profile]);

  const loadPreparacoes = async (forceReload = false) => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    if (!forceReload && preparacoes.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await DatabaseService.getPreparacoes(profile.id);
      
      if (data) {
        setPreparacoes(data);
      } else {
        setPreparacoes([]);
      }
    } catch (error) {
      console.error('[PreparacoesPage] Error loading preparations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      showError('Erro ao carregar preparações', errorMessage);
      setPreparacoes([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh data (for external calls)
  const refreshPreparacoes = useCallback(() => {
    loadPreparacoes(true);
  }, []);

  // Memoized functions for better performance
  const getTypeLabel = useCallback((type: PreparacaoTipo) => {
    const typeConfig = PREPARACAO_TYPES.find(t => t.value === type);
    return typeConfig?.label || type;
  }, []);

  const getMealBadges = useCallback((refeicoes: RefeicaoTipo[]) => {
    return refeicoes.map(refeicao => {
      const mealConfig = MEAL_TYPES.find(m => m.value === refeicao);
      if (!mealConfig) return null;
      
      return (
        <span 
          key={refeicao}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mealConfig.color} mr-1 mb-1`}
        >
          {mealConfig.label}
        </span>
      );
    }).filter(Boolean);
  }, []);

  const getMealTypeLabel = useCallback((mealType: RefeicaoTipo) => {
    const meal = MEAL_TYPES.find(m => m.value === mealType);
    return meal?.label || mealType;
  }, []);

  const getMealTypeColor = useCallback((mealType: RefeicaoTipo) => {
    const colors = {
      'colação': 'bg-yellow-100 text-yellow-800',
      'almoço': 'bg-green-100 text-green-800',
      'lanche': 'bg-blue-100 text-blue-800',
      'jantar': 'bg-purple-100 text-purple-800'
    };
    return colors[mealType] || 'bg-slate-100 text-slate-800';
  }, []);

  const getOriginBadge = useCallback((preparacao: Preparacao) => {
    if (preparacao.default_preparation) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <i data-lucide="shield-check" className="w-3 h-3 mr-1"></i>
          Padrão
        </span>
      );
    }
    
    // Use currentUser email for user-created preparations
    const userEmail = user?.email || 'Usuário';
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <i data-lucide="user" className="w-3 h-3 mr-1"></i>
        <span className="truncate max-w-[120px]" title={userEmail}>
          {userEmail}
        </span>
      </span>
    );
  }, [user?.email]);

  // Check if user can edit/delete preparation
  const canEditPreparacao = (preparacao: Preparacao) => {
    // Only allow editing if:
    // 1. It's not a default preparation
    // 2. User is logged in with profile
    // 3. User created this preparation
    return !preparacao.default_preparation && user && profile && preparacao.created_by === profile.id;
  };

  // Filter preparations based on search, type, and meal types (memoized for performance)
  const filteredPreparacoes = useMemo(() => {
    return preparacoes.filter(preparacao => {
      const matchesSearch = preparacao.nome.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesType = !selectedType || preparacao.tipo === selectedType;
      const matchesMealTypes = selectedMealTypes.length === 0 || 
        selectedMealTypes.some(mealType => preparacao.refeicoes_presente.includes(mealType));
      
      return matchesSearch && matchesType && matchesMealTypes;
    });
  }, [preparacoes, debouncedSearchTerm, selectedType, selectedMealTypes]);

  const handleMealTypeToggle = (mealType: RefeicaoTipo) => {
    setSelectedMealTypes(prev => 
      prev.includes(mealType) 
        ? prev.filter(type => type !== mealType)
        : [...prev, mealType]
    );
  };

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedMealTypes([]);
  }, []);

  const handleAddPreparacao = () => {
    setEditingPreparacao(null);
    setShowModal(true);
  };

  const handleEditPreparacao = (preparacao: Preparacao) => {
    setEditingPreparacao(preparacao);
    setShowModal(true);
  };

  const handleModalClose = () => {
    if (!modalLoading) {
      setShowModal(false);
      setEditingPreparacao(null);
    }
  };

  const handleModalSubmit = async (preparacaoData: any) => {
    if (!user || !profile) {
      showError('Erro de autenticação', 'Usuário não está logado.');
      return;
    }

    setModalLoading(true);

    try {
      if (editingPreparacao) {
        // Editing existing preparation - use DatabaseService
        console.log(`[PreparacoesPage] Updating preparation: ${editingPreparacao.id}`);
        
        const updatedData = {
          nome: preparacaoData.nome,
          tipo: preparacaoData.tipo,
          refeicoes_presente: preparacaoData.refeicoes_presente,
          modo_preparo: preparacaoData.modo_preparo
        };
        
        const updatedPreparacao = await DatabaseService.updatePreparacao(editingPreparacao.id, updatedData, preparacaoData.ingredientes);
        
        if (updatedPreparacao) {
          setPreparacoes(prev => 
            prev.map(prep => prep.id === editingPreparacao.id ? updatedPreparacao : prep)
          );
          showSuccess('Preparação atualizada!', 'As alterações foram salvas com sucesso.');
        }
      } else {
        // Adding new preparation - use DatabaseService
        console.log(`[PreparacoesPage] Creating new preparation: ${preparacaoData.nome}`);
        
        const newPreparacaoData = {
          nome: preparacaoData.nome,
          tipo: preparacaoData.tipo,
          refeicoes_presente: preparacaoData.refeicoes_presente,
          modo_preparo: preparacaoData.modo_preparo,
          default_preparation: false,
          created_by: profile.id
        };
        
        const newPreparacao = await DatabaseService.createPreparacao(newPreparacaoData, preparacaoData.ingredientes);
        
        if (newPreparacao) {
          setPreparacoes(prev => [...prev, newPreparacao]);
          showSuccess('Preparação adicionada!', 'A nova preparação foi cadastrada com sucesso.');
        }
      }

      setShowModal(false);
      setEditingPreparacao(null);
    } catch (error) {
      console.error('[PreparacoesPage] Error saving preparation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showError(
        editingPreparacao ? 'Erro ao atualizar preparação' : 'Erro ao adicionar preparação',
        errorMessage
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeletePreparacao = async (preparacao: Preparacao) => {
    if (preparacao.default_preparation) {
      showError('Não é possível excluir', 'Preparações padrão não podem ser removidas.');
      return;
    }

    setPreparacaoToDelete(preparacao);
    setShowDeleteModal(true);
  };

  const confirmDeletePreparacao = async () => {
    if (!preparacaoToDelete) return;

    setDeleteLoading(true);

    try {
      console.log(`[PreparacoesPage] Deleting preparation: ${preparacaoToDelete.id}`);
      
      // Use DatabaseService to delete from Supabase
      const success = await DatabaseService.deletePreparacao(preparacaoToDelete.id);
      
      if (success) {
        setPreparacoes(prev => prev.filter(prep => prep.id !== preparacaoToDelete.id));
        showSuccess('Preparação excluída!', 'A preparação foi removida com sucesso.');
        setShowDeleteModal(false);
        setPreparacaoToDelete(null);
      }
    } catch (error) {
      console.error('[PreparacoesPage] Error deleting preparation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showError('Erro ao excluir preparação', errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteModalClose = () => {
    if (!deleteLoading) {
      setShowDeleteModal(false);
      setPreparacaoToDelete(null);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Preparações Cadastradas</h3>
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
              <p className="text-sm font-medium">Carregando preparações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user || !profile) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <i data-lucide="user-x" className="w-8 h-8"></i>
              <p className="text-sm font-medium">Usuário não autenticado</p>
              <p className="text-xs">Faça login para visualizar suas preparações</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error && !loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <i data-lucide="alert-circle" className="w-8 h-8 text-red-500"></i>
              <p className="text-sm font-medium text-red-600">Erro ao carregar preparações</p>
              <p className="text-xs text-slate-600">{error}</p>
              <button
                onClick={() => loadPreparacoes(true)}
                className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <i data-lucide="refresh-cw" className="w-4 h-4 inline mr-2"></i>
                Tentar novamente
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="Digite o nome da preparação..."
                  aria-describedby="search-help"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i data-lucide="search" className="w-4 h-4 text-slate-400" aria-hidden="true"></i>
                </div>
              </div>
              <p id="search-help" className="sr-only">
                Digite para filtrar preparações por nome
              </p>
            </div>

            {/* Type Dropdown */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
                Tipo
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as PreparacaoTipo | '')}
                className="w-full h-[42px] px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                aria-describedby="type-help"
              >
                <option value="">Todos os tipos</option>
                {PREPARACAO_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p id="type-help" className="sr-only">
                Selecione um tipo para filtrar as preparações
              </p>
            </div>

            {/* Meal Types Multi-Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Refeições
              </label>
              <div className="meal-dropdown-container relative">
                <div
                  onClick={() => setShowMealDropdown(!showMealDropdown)}
                  className="w-full h-[42px] px-3 py-2 border border-slate-300 rounded-md text-sm cursor-pointer transition-colors hover:border-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 bg-white"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                      {selectedMealTypes.length === 0 ? (
                        <span className="text-slate-400 leading-5">Selecione as refeições</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {selectedMealTypes.map(mealType => (
                            <span
                              key={mealType}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMealTypeColor(mealType)} flex-shrink-0`}
                            >
                              {getMealTypeLabel(mealType)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMealTypeToggle(mealType);
                                }}
                                className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                              >
                                <i data-lucide="x" className="w-3 h-3"></i>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center ml-2 flex-shrink-0">
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
                        .filter(mealType => !selectedMealTypes.includes(mealType.value))
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
                      {MEAL_TYPES.filter(mealType => !selectedMealTypes.includes(mealType.value)).length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-400 italic">
                          Todas as refeições foram selecionadas
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedType || selectedMealTypes.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-md border border-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Limpar todos os filtros aplicados"
              >
                <i data-lucide="x" className="w-4 h-4 mr-2" aria-hidden="true"></i>
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Preparações Cadastradas</h3>
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
              onClick={refreshPreparacoes}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 font-medium transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar lista de preparações"
            >
              <i data-lucide="refresh-cw" className={`w-3 h-3 inline mr-1 ${loading ? 'animate-spin' : ''}`}></i>
              Atualizar
            </button>
            <button 
              onClick={handleAddPreparacao}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-sm transition-colors"
            >
              <i data-lucide="plus" className="w-3 h-3 inline mr-1"></i>
              Adicionar Preparação
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]" role="table" aria-label="Lista de preparações cadastradas">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider" scope="col">Nome</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider" scope="col">Tipo</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider" scope="col">Refeições Presente</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider" scope="col">Origem</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider" scope="col">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPreparacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <i data-lucide="search-x" className="w-8 h-8"></i>
                      <p className="text-sm font-medium">Nenhuma preparação encontrada</p>
                      <p className="text-xs">Tente ajustar os filtros ou adicionar uma nova preparação</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPreparacoes.map((preparacao) => (
                  <tr key={preparacao.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-sm">{preparacao.nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{getTypeLabel(preparacao.tipo)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-start max-w-[180px] gap-1">
                        {getMealBadges(preparacao.refeicoes_presente)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getOriginBadge(preparacao)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditPreparacao(preparacao) && (
                          <>
                            <button 
                              onClick={() => handleEditPreparacao(preparacao)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                              title="Editar preparação"
                            >
                              <i data-lucide="edit-2" className="w-4 h-4"></i>
                            </button>
                            <button 
                              onClick={() => handleDeletePreparacao(preparacao)}
                              className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                              title="Excluir preparação"
                            >
                              <i data-lucide="trash-2" className="w-4 h-4"></i>
                            </button>
                          </>
                        )}
                        {!canEditPreparacao(preparacao) && (
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
        {filteredPreparacoes.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Exibindo {filteredPreparacoes.length} de {preparacoes.length} preparações
              {(searchTerm || selectedType || selectedMealTypes.length > 0) && ' (filtradas)'}
            </p>
          </div>
        )}
      </div>

      {/* Preparation Modal */}
      <PreparacaoModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        preparacao={editingPreparacao}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDeletePreparacao}
        title="Excluir Preparação"
        message="Tem certeza que deseja excluir esta preparação? Esta ação não pode ser desfeita."
        itemName={preparacaoToDelete?.nome}
        loading={deleteLoading}
      />
    </div>
  );
};

export default PreparacoesPage;