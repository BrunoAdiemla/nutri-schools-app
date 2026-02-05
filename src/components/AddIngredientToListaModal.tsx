import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { IngredienteTipo } from '../types';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface AddIngredientToListaModalProps {
  isOpen: boolean;
  onClose: () => void;
  listaComprasId: string;
  onSuccess: (novoItem: any) => void; // Modificado para passar o item criado
}

interface Ingrediente {
  id: string;
  nome: string;
  unidade_medida: string;
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

const AddIngredientToListaModal: React.FC<AddIngredientToListaModalProps> = ({
  isOpen,
  onClose,
  listaComprasId,
  onSuccess
}) => {
  const { profile } = useAuth();
  const { showError, showSuccess } = useToast();
  
  const [tipoSelecionado, setTipoSelecionado] = useState<IngredienteTipo | ''>('');
  const [ingredienteSelecionado, setIngredienteSelecionado] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>('');
  const [unidadeMedida, setUnidadeMedida] = useState<string>('');
  
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loadingIngredientes, setLoadingIngredientes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTipoSelecionado('');
      setIngredienteSelecionado('');
      setQuantidade('');
      setUnidadeMedida('');
      setIngredientes([]);
    }
  }, [isOpen]);

  // Load ingredientes when tipo is selected
  useEffect(() => {
    if (tipoSelecionado && profile) {
      loadIngredientes();
    } else {
      setIngredientes([]);
      setIngredienteSelecionado('');
      setUnidadeMedida('');
    }
  }, [tipoSelecionado, profile]);

  // Update unidade_medida when ingrediente is selected
  useEffect(() => {
    if (ingredienteSelecionado) {
      const ingrediente = ingredientes.find(i => i.id === ingredienteSelecionado);
      if (ingrediente) {
        setUnidadeMedida(ingrediente.unidade_medida);
      }
    } else {
      setUnidadeMedida('');
    }
  }, [ingredienteSelecionado, ingredientes]);

  const loadIngredientes = async () => {
    if (!tipoSelecionado || !profile) return;

    setLoadingIngredientes(true);
    try {
      // Buscar ingredientes: default_ingredient = true OU (default_ingredient = false E created_by = userId)
      const { data, error } = await supabase
        .from('ingredientes')
        .select('id, nome, unidade_medida')
        .eq('tipo', tipoSelecionado)
        .or(`default_ingredient.eq.true,and(default_ingredient.eq.false,created_by.eq.${profile.id})`)
        .order('nome');

      if (error) {
        logger.error('[AddIngredientToListaModal] Erro ao buscar ingredientes:', error);
        showError('Erro', 'Não foi possível carregar os ingredientes');
        return;
      }

      setIngredientes(data || []);
    } catch (error) {
      logger.error('[AddIngredientToListaModal] Erro inesperado:', error);
      showError('Erro', 'Erro inesperado ao carregar ingredientes');
    } finally {
      setLoadingIngredientes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ingredienteSelecionado || !quantidade || !profile) {
      showError('Erro', 'Preencha todos os campos');
      return;
    }

    const quantidadeNum = parseFloat(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      showError('Erro', 'Quantidade deve ser um número maior que zero');
      return;
    }

    setSubmitting(true);
    try {
      // Buscar informações completas do ingrediente
      const ingrediente = ingredientes.find(i => i.id === ingredienteSelecionado);
      if (!ingrediente) {
        throw new Error('Ingrediente não encontrado');
      }

      // Buscar fator de correção do ingrediente
      const { data: ingredienteCompleto, error: ingredienteError } = await supabase
        .from('ingredientes')
        .select('fator_de_correcao')
        .eq('id', ingredienteSelecionado)
        .single();

      if (ingredienteError) {
        throw new Error('Erro ao buscar dados do ingrediente');
      }

      const fatorCorrecao = ingredienteCompleto?.fator_de_correcao || 1.0;

      // Criar objeto do item (sem salvar no banco ainda)
      const novoItem = {
        id: `temp-${Date.now()}`, // ID temporário
        lista_compras_id: listaComprasId,
        ingrediente_id: ingredienteSelecionado,
        ingrediente_nome: ingrediente.nome,
        unidade_medida: ingrediente.unidade_medida,
        quantidade_calculada: quantidadeNum,
        quantidade_ajustada: null,
        fator_correcao_aplicado: fatorCorrecao,
        detalhes_calculo: {
          manual: true,
          adicionado_por: profile.id,
          data_adicao: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      showSuccess('Sucesso', 'Ingrediente adicionado (pendente de salvamento)');
      onSuccess(novoItem); // Passar o item criado para o componente pai
      onClose();
    } catch (error) {
      logger.error('[AddIngredientToListaModal] Erro ao adicionar ingrediente:', error);
      showError('Erro', error instanceof Error ? error.message : 'Erro ao adicionar ingrediente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Adicionar Ingrediente
              </h2>
              <p className="text-sm text-slate-500">
                Adicione um ingrediente manualmente à lista
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Ingrediente */}
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-slate-700 mb-1">
                Selecione o tipo de ingrediente <span className="text-red-500">*</span>
              </label>
              <select
                id="tipo"
                value={tipoSelecionado}
                onChange={(e) => setTipoSelecionado(e.target.value as IngredienteTipo | '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                disabled={submitting}
              >
                <option value="">Selecione o tipo</option>
                {INGREDIENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingrediente */}
            <div>
              <label htmlFor="ingrediente" className="block text-sm font-medium text-slate-700 mb-1">
                Selecione o ingrediente <span className="text-red-500">*</span>
              </label>
              <select
                id="ingrediente"
                value={ingredienteSelecionado}
                onChange={(e) => setIngredienteSelecionado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                disabled={!tipoSelecionado || loadingIngredientes || submitting}
              >
                <option value="">
                  {!tipoSelecionado 
                    ? 'Selecione um tipo primeiro' 
                    : loadingIngredientes 
                    ? 'Carregando...' 
                    : 'Selecione o ingrediente'}
                </option>
                {ingredientes.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.nome}
                  </option>
                ))}
              </select>
              {tipoSelecionado && !loadingIngredientes && ingredientes.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Nenhum ingrediente encontrado para este tipo
                </p>
              )}
            </div>

            {/* Quantidade */}
            <div>
              <label htmlFor="quantidade" className="block text-sm font-medium text-slate-700 mb-1">
                Quantidade <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="quantidade"
                  step="0.01"
                  min="0.01"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full px-3 py-2 pr-16 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                  placeholder="Ex: 100.00"
                  disabled={!ingredienteSelecionado || submitting}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-sm text-slate-500">
                    {unidadeMedida || ''}
                  </span>
                </div>
              </div>
              {!ingredienteSelecionado && (
                <p className="mt-1 text-xs text-slate-500">
                  Selecione um ingrediente primeiro
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!ingredienteSelecionado || !quantidade || submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adicionando...</span>
                  </div>
                ) : (
                  'Adicionar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddIngredientToListaModal;