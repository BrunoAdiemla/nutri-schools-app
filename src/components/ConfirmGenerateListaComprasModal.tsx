import React, { useEffect } from 'react';
import { useLucideIcons } from '../hooks/useLucideIcons';

interface ConfirmGenerateListaComprasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cardapioNome: string;
  loading?: boolean;
}

const ConfirmGenerateListaComprasModal: React.FC<ConfirmGenerateListaComprasModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cardapioNome,
  loading = false
}) => {
  // Initialize Lucide icons using custom hook
  useLucideIcons([isOpen]);

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
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i data-lucide="shopping-cart" className="w-5 h-5 text-blue-600"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Gerar Lista de Compras</h2>
              <p className="text-sm text-slate-500">Confirme para continuar</p>
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
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-3">
              Deseja gerar a lista de compras para este cardápio?
            </p>
            
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-900">Cardápio:</p>
              <p className="text-sm text-slate-600 mt-1">"{cardapioNome}"</p>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-2">
                <i data-lucide="info" className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"></i>
                <p className="text-xs text-blue-700">
                  A lista será gerada com base nos ingredientes das preparações do cardápio, 
                  considerando o número de comensais e fatores de correção.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Gerando...</span>
                </div>
              ) : (
                'Gerar Lista'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmGenerateListaComprasModal;
