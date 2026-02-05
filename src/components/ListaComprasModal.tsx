import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { ListaComprasService } from '../services/ListaComprasService';
import { ListaCompras, ListaComprasItem } from '../types';
import { logger } from '../utils/logger';
import AddIngredientToListaModal from './AddIngredientToListaModal';
import { formatQuantityWithUnit } from '../utils/unitConverter';
import { PDFService } from '../services/PDFService';

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
  const [itensOriginais, setItensOriginais] = useState<ListaComprasItem[]>([]); // Estado original para comparação
  const [itensParaAdicionar, setItensParaAdicionar] = useState<ListaComprasItem[]>([]); // Itens pendentes de adição
  const [itensParaDeletar, setItensParaDeletar] = useState<string[]>([]); // IDs dos itens pendentes de deleção
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addIngredientModalOpen, setAddIngredientModalOpen] = useState(false);

  // Initialize Lucide icons - desabilitado para evitar conflitos com React
  // useEffect(() => {
  //   if (isOpen && !loading && !saving) {
  //     const timer = setTimeout(() => {
  //       initializeLucideIcons();
  //     }, 100);
  //     return () => {
  //       clearTimeout(timer);
  //     };
  //   }
  // }, [isOpen, loading, saving, iconKey]);

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
        setItensOriginais(JSON.parse(JSON.stringify(result.itens))); // Deep copy para comparação
        setItensParaAdicionar([]); // Limpar itens pendentes
        setItensParaDeletar([]); // Limpar deleções pendentes
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

  const handleUnidadeMedidaCompraChange = (itemId: string, novaUnidade: string) => {
    // Atualizar apenas localmente, sem salvar no banco de dados
    setItens(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, unidade_medida_compra: novaUnidade } 
          : item
      )
    );
  };

  const handleQuantidadeAjustadaChange = (itemId: string, novaQuantidade: string) => {
    // Atualizar apenas localmente, sem salvar no banco de dados
    const quantidade = novaQuantidade === '' ? null : parseFloat(novaQuantidade);
    setItens(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantidade_ajustada: quantidade } 
          : item
      )
    );
  };

  const handleDeleteItem = (item: ListaComprasItem) => {
    if (!item) return;
    
    // Verificar se é um item novo (pendente de adição) ou um item existente
    const isNewItem = itensParaAdicionar.some(i => i.id === item.id);
    
    if (isNewItem) {
      // Se é um item novo, apenas remover da lista de itens para adicionar
      setItensParaAdicionar(prev => prev.filter(i => i.id !== item.id));
      setItens(prev => prev.filter(i => i.id !== item.id));
    } else {
      // Se é um item existente, marcar para deleção
      setItensParaDeletar(prev => [...prev, item.id]);
      // Remover visualmente da lista
      setItens(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const handleAddIngredientSuccess = (novoItem: ListaComprasItem) => {
    // Adicionar item à lista de pendentes
    setItensParaAdicionar(prev => [...prev, novoItem]);
    setItens(prev => [...prev, novoItem]);
  };

  // Verificar se há alterações pendentes
  const hasChanges = () => {
    // Verificar se há itens para adicionar ou deletar
    if (itensParaAdicionar.length > 0 || itensParaDeletar.length > 0) {
      return true;
    }

    // Verificar se há mudanças nos campos editáveis
    for (const item of itens) {
      const original = itensOriginais.find(o => o.id === item.id);
      if (!original) continue;

      if (item.quantidade_ajustada !== original.quantidade_ajustada ||
          item.unidade_medida_compra !== original.unidade_medida_compra) {
        return true;
      }
    }

    return false;
  };

  // Salvar todas as alterações
  const handleSaveChanges = async () => {
    if (!profile || !lista) return;

    setSaving(true);
    try {
      // 1. Deletar itens marcados para deleção
      for (const itemId of itensParaDeletar) {
        const result = await ListaComprasService.deletarItemListaCompras(itemId, profile.id);
        if (!result.success) {
          throw new Error(`Erro ao deletar item: ${result.error}`);
        }
      }

      // 2. Adicionar novos itens
      for (const novoItem of itensParaAdicionar) {
        // Buscar o item atualizado do estado atual (pode ter sido editado)
        const itemAtualizado = itens.find(i => i.id === novoItem.id);
        
        if (itemAtualizado) {
          // Usar os valores atualizados do estado
          const itemParaSalvar = {
            ...novoItem,
            quantidade_ajustada: itemAtualizado.quantidade_ajustada,
            unidade_medida_compra: itemAtualizado.unidade_medida_compra
          };
          
          const result = await ListaComprasService.adicionarItemListaCompras(itemParaSalvar, profile.id);
          if (!result.success) {
            throw new Error(`Erro ao adicionar item: ${result.error}`);
          }
        }
      }

      // 3. Atualizar itens modificados
      for (const item of itens) {
        const original = itensOriginais.find(o => o.id === item.id);
        if (!original) continue;

        const quantidadeChanged = item.quantidade_ajustada !== original.quantidade_ajustada;
        const unidadeChanged = item.unidade_medida_compra !== original.unidade_medida_compra;

        if (quantidadeChanged) {
          const result = await ListaComprasService.atualizarQuantidadeItem(
            item.id,
            item.quantidade_ajustada ?? null,
            profile.id
          );
          if (!result.success) {
            throw new Error(`Erro ao atualizar quantidade: ${result.error}`);
          }
        }

        if (unidadeChanged) {
          const result = await ListaComprasService.atualizarUnidadeMedidaCompra(
            item.id,
            item.unidade_medida_compra || '',
            profile.id
          );
          if (!result.success) {
            throw new Error(`Erro ao atualizar unidade de medida: ${result.error}`);
          }
        }
      }

      // Recarregar dados após salvar
      await loadListaCompras();
      showSuccess('Sucesso', 'Alterações salvas com sucesso');
    } catch (error) {
      logger.error('[ListaComprasModal] Erro ao salvar alterações:', error);
      showError('Erro', error instanceof Error ? error.message : 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // Gerar PDF da lista de compras
  const handleGerarPDF = () => {
    if (!lista || !profile) {
      showError('Erro', 'Dados da lista não disponíveis');
      return;
    }

    try {
      PDFService.gerarListaComprasPDF(lista, itens, profile);
      showSuccess('Sucesso', 'PDF gerado com sucesso');
    } catch (error) {
      logger.error('[ListaComprasModal] Erro ao gerar PDF:', error);
      showError('Erro', 'Não foi possível gerar o PDF');
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
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <p className="text-lg font-medium">Nenhum item encontrado</p>
                <p className="text-sm">Esta lista de compras está vazia.</p>
              </div>
            ) : (
              <>
                {/* Barra de ações superior */}
                <div className="mb-4 flex justify-between items-center">
                  <button
                    onClick={() => setAddIngredientModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Adicionar Ingrediente
                  </button>
                  
                  <button
                    onClick={handleGerarPDF}
                    disabled={loading || itens.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Gerar PDF
                  </button>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Ingrediente
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Qtd. Calculada
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Qtd. Ajustada
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Medida da compra
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
                          {formatQuantityWithUnit(item.quantidade_calculada, item.unidade_medida)}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantidade_ajustada ?? ''}
                            onChange={(e) => handleQuantidadeAjustadaChange(item.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={item.unidade_medida_compra || ''}
                            onChange={(e) => handleUnidadeMedidaCompraChange(item.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="">-</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="l">l</option>
                            <option value="ml">ml</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remover item da lista"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 md:p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              {itens.length > 0 ? `Exibindo ${itens.length} ingredientes` : 'Nenhum item'}
              {hasChanges() && (
                <span className="ml-2 text-orange-600 font-medium">
                  • Alterações não salvas
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSaveChanges}
                disabled={loading || saving || !hasChanges()}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Salvar alterações
                  </>
                )}
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

      {/* Modal Adicionar Ingrediente */}
      {addIngredientModalOpen && lista && (
        <AddIngredientToListaModal
          isOpen={addIngredientModalOpen}
          onClose={() => setAddIngredientModalOpen(false)}
          listaComprasId={lista.id}
          onSuccess={handleAddIngredientSuccess}
        />
      )}
    </>
  );
};

export default ListaComprasModal;