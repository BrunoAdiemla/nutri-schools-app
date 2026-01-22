import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { CardapioSemanal } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { useLucideIcons } from '../hooks/useLucideIcons';
import CardapioModal from '../components/CardapioModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { logger } from '../utils/logger';

const CardapiosPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [cardapios, setCardapios] = useState<CardapioSemanal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCardapioModal, setShowCardapioModal] = useState(false);
  const [cardapioToEdit, setCardapioToEdit] = useState<CardapioSemanal | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardapioToDelete, setCardapioToDelete] = useState<CardapioSemanal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Initialize Lucide icons using custom hook
  useLucideIcons([cardapios, showFilters, searchTerm]);

  // Load cardapios when user/profile are available
  useEffect(() => {
    if (user && profile) {
      // Only load if we don't have data yet and we're not already loading
      if (cardapios.length === 0 && !loading) {
        loadCardapios();
      }
    } else {
      // If user/profile becomes unavailable, clear data and stop loading
      setCardapios([]);
      setLoading(false);
    }
  }, [user, profile]);

  const loadCardapios = async (forceReload = false) => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    if (!forceReload && cardapios.length > 0) {
      return;
    }

    try {
      setLoading(true);
      logger.log(`[CardapiosPage] Loading cardapios for user: ${profile.id}`);
      
      const data = await DatabaseService.getCardapiosSemanais(profile.id);
      setCardapios(data || []);
      
    } catch (error) {
      logger.error('Error loading cardapios:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showError('Erro ao carregar cardápios', errorMessage);
      setCardapios([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh data (for external calls)
  const refreshCardapios = useCallback(() => {
    loadCardapios(true);
  }, []);

  const handleAddCardapio = () => {
    setCardapioToEdit(null);
    setShowCardapioModal(true);
  };

  const handleSaveCardapio = (data: any) => {
    logger.log('Cardapio data:', data);
    setShowCardapioModal(false);
    setCardapioToEdit(null);
    // Recarregar a lista de cardápios
    loadCardapios(true);
  };

  const handleEditCardapio = (cardapio: CardapioSemanal) => {
    setCardapioToEdit(cardapio);
    setShowCardapioModal(true);
  };

  const handleDeleteCardapio = (cardapio: CardapioSemanal) => {
    setCardapioToDelete(cardapio);
    setShowDeleteModal(true);
  };

  const handleDeleteModalClose = () => {
    if (!deleteLoading) {
      setShowDeleteModal(false);
      setCardapioToDelete(null);
    }
  };

  const handleCardapioModalClose = () => {
    setShowCardapioModal(false);
    setCardapioToEdit(null);
  };

  const confirmDeleteCardapio = async () => {
    if (!cardapioToDelete) return;

    setDeleteLoading(true);
    try {
      logger.log(`[CardapiosPage] Deleting cardapio: ${cardapioToDelete.id}`);
      
      const success = await DatabaseService.deleteCardapioSemanal(cardapioToDelete.id);
      
      if (success) {
        setCardapios(prev => prev.filter(c => c.id !== cardapioToDelete.id));
        showSuccess('Cardápio excluído!', 'O cardápio foi removido com sucesso.');
        setShowDeleteModal(false);
        setCardapioToDelete(null);
      }
    } catch (error) {
      logger.error('[CardapiosPage] Error deleting cardapio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showError('Erro ao excluir cardápio', errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Check if user can edit/delete cardapio
  const canEditCardapio = (cardapio: CardapioSemanal) => {
    return profile && cardapio.created_by === profile.id;
  };

  // Filter cardapios based on search
  const filteredCardapios = cardapios.filter(cardapio => {
    const matchesSearch = cardapio.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Cardápios Cadastrados</h3>
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
              <p className="text-sm font-medium">Carregando cardápios...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-2">
                Buscar por título
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 pl-10 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                  placeholder="Digite o título do cardápio..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i data-lucide="search" className="w-4 h-4 text-slate-400"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setSearchTerm('')}
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
          <h3 className="font-semibold text-slate-800">Cardápios Cadastrados</h3>
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
              onClick={refreshCardapios}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 font-medium transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar lista de cardápios"
            >
              <i data-lucide="refresh-cw" className={`w-3 h-3 inline mr-1 ${loading ? 'animate-spin' : ''}`}></i>
              Atualizar
            </button>
            <button 
              onClick={handleAddCardapio}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-sm transition-colors"
            >
              <i data-lucide="plus" className="w-3 h-3 inline mr-1"></i>
              Criar Cardápio
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Período</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCardapios.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <i data-lucide="search-x" className="w-8 h-8"></i>
                      <p className="text-sm font-medium">Nenhum cardápio encontrado</p>
                      <p className="text-xs">Tente ajustar os filtros ou criar um novo cardápio</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCardapios.map((cardapio) => (
                  <tr key={cardapio.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-sm">Cardápio semanal</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {cardapio.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditCardapio(cardapio) && (
                          <>
                            <button 
                              onClick={() => handleEditCardapio(cardapio)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                              title="Editar cardápio"
                            >
                              <i data-lucide="edit-2" className="w-4 h-4"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteCardapio(cardapio)}
                              className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                              title="Excluir cardápio"
                            >
                              <i data-lucide="trash-2" className="w-4 h-4"></i>
                            </button>
                          </>
                        )}
                        {!canEditCardapio(cardapio) && (
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
        {filteredCardapios.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Exibindo {filteredCardapios.length} de {cardapios.length} cardápios
              {searchTerm && ' (filtrados)'}
            </p>
          </div>
        )}
      </div>

      {/* Cardapio Modal */}
      <CardapioModal
        isOpen={showCardapioModal}
        onClose={handleCardapioModalClose}
        onSave={handleSaveCardapio}
        cardapioToEdit={cardapioToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDeleteCardapio}
        title="Excluir Cardápio"
        message="Tem certeza que deseja excluir este cardápio? Esta ação não pode ser desfeita e removerá todos os dados relacionados (dias, refeições e preparações)."
        itemName={cardapioToDelete ? cardapioToDelete.nome : ''}
        loading={deleteLoading}
      />
    </div>
  );
};

export default CardapiosPage;