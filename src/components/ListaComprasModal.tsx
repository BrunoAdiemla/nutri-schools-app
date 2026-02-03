import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { ListaComprasService } from '../services/ListaComprasService';
import { ListaCompras, ListaComprasItem } from '../types';
import { logger } from '../utils/logger';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { initializeLucideIcons } from '../utils/lucideManager';

interface ListaComprasModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardapioNome: string;
  cardapioId?: string; // ID do cardápio semanal
}

const ListaComprasModal: React.FC<ListaComprasModalProps> = ({
  isOpen,
  onClose,
  cardapioNome,
  cardapioId
}) => {
  const { profile } = useAuth();
  const { showError, showSuccess } = useToast();
  const [lista, setLista] = useState<ListaCompras | null>(null);
  const [itens, setItens] = useState<ListaComprasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: ListaComprasItem | null;
    loading: boolean;
  }>({
    isOpen: false,
    item: null,
    loading: false
  });

  // Initialize Lucide icons
  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        initializeLucideIcons();
      }, 100);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, itens.length, loading]);

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen && cardapioId && profile) {
      loadListaCompras();
    }
  }, [isOpen, cardapioId, profile]);

  const loadListaCompras = async () => {
    if (!cardapioId || !profile) return;

    setLoading(true);
    try {
      const result = await ListaComprasService.buscarListaComprasPorCardapio(cardapioId, profile.id);
      
      if (result.success && result.lista && result.itens) {
        setLista(result.lista);
        setItens(result.itens);
        
        // Re-inicializar ícones após carregar dados
        setTimeout(() => {
          initializeLucideIcons();
        }, 150);
      } else {
        showError('Erro', result.error || 'Não foi possível carregar a lista de compras');
      }
    } catch (error) {
      logger.error('[ListaComprasModal] Erro ao carregar lista:', error);
      showError('Erro', 'Erro inesperado ao carregar lista de compras');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantidadeChange = async (itemId: string, novaQuantidade: string) => {
    if (!profile) return;

    const quantidade = novaQuantidade === '' ? null : parseFloat(novaQuantidade);
    
    // Atualizar localmente primeiro para responsividade
    setItens(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantidade_ajustada: quantidade } 
          : item
      )
    );

    // Atualizar no servidor
    setUpdating(itemId);
    try {
      const result = await ListaComprasService.atualizarQuantidadeItem(itemId, quantidade, profile.id);
      
      if (!result.success) {
        // Reverter mudança local se falhou no servidor
        setItens(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, quantidade_ajustada: item.quantidade_ajustada } 
              : item
          )
        );
        showError('Erro', result.error || 'Não foi possível atualizar a quantidade');
      }
    } catch (error) {
      logger.error('[ListaComprasModal] Erro ao atualizar quantidade:', error);
      showError('Erro', 'Erro inesperado ao atualizar quantidade');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteItem = (item: ListaComprasItem) => {
    if (!item) return;
    setDeleteModal({
      isOpen: true,
      item,
      loading: false
    });
  };

  const confirmDeleteItem = async () => {
    if (!deleteModal.item || !profile) return;

    setDeleteModal(prev => ({ ...prev, loading: true }));

    try {
      const result = await ListaComprasService.deletarItemListaCompras(deleteModal.item.id, profile.id);
      
      if (result.success) {
        // Remover item da lista local
        setItens(prev => prev.filter(item => item.id !== deleteModal.item!.id));
        showSuccess('Sucesso', 'Item removido da lista de compras');
        setDeleteModal({ isOpen: false, item: null, loading: false });
      } else {
        showError('Erro', result.error || 'Não foi possível remover o item');
        setDeleteModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      logger.error('[ListaComprasModal] Erro ao deletar item:', error);
      showError('Erro', 'Erro inesperado ao remover item');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const closeDeleteModal = () => {
    if (!deleteModal.loading) {
      setDeleteModal({ isOpen: false, item: null, loading: false });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                {lista?.nome || `Lista de Compras - ${cardapioNome}`}
              </h2>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                📊 {itens.length} ingredientes
                {lista?.status && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    lista.status === 'rascunho' ? 'bg-yellow-100 text-yellow-800' :
                    lista.status === 'finalizada' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {lista.status === 'rascunho' ? 'Rascunho' :
                     lista.status === 'finalizada' ? 'Finalizada' : 'Comprada'}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <i data-lucide="x" className="w-5 h-5"></i>
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Carregando lista de compras...</span>
              </div>
            ) : itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <i data-lucide="shopping-cart" className="w-12 h-12 mb-4"></i>
                <p className="text-lg font-medium">Nenhum item encontrado</p>
                <p className="text-sm">Esta lista de compras está vazia.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Ingrediente
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Unidade
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Qtd. Calculada
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Qtd. Ajustada
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{item.ingrediente_nome || 'Ingrediente sem nome'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.unidade_medida}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.quantidade_calculada?.toFixed(2) || '0.00'}{item.unidade_medida || ''}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantidade_ajustada ?? ''}
                            onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                            disabled={updating === item.id}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                            placeholder="0.00"
                          />
                          {updating === item.id && (
                            <div className="inline-block ml-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remover item da lista"
                            >
                              <i data-lucide="trash-2" className="w-4 h-4"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 md:p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              {itens.length > 0 ? `Exibindo ${itens.length} ingredientes` : 'Nenhum item'}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => showSuccess('Funcionalidade em desenvolvimento', 'Salvar rascunho será implementado em breve')}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i data-lucide="save" className="w-4 h-4"></i>
                Salvar Rascunho
              </button>
              <button
                onClick={() => showSuccess('Funcionalidade em desenvolvimento', 'Gerar PDF será implementado em breve')}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i data-lucide="file-text" className="w-4 h-4"></i>
                Gerar PDF
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDeleteItem}
          title="Remover Item da Lista"
          message="Tem certeza que deseja remover este ingrediente da lista de compras?"
          itemName={deleteModal.item?.ingrediente_nome}
          loading={deleteModal.loading}
        />
      )}
    </>
  );
};

export default ListaComprasModal;