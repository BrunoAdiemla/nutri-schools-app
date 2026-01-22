import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ 
  isOpen, 
  message = "Gerando cardápio...", 
  subMessage = "Por favor, aguarde" 
}) => {
  console.log('[LoadingModal] isOpen:', isOpen);
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
    >
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
        </div>
        <h3 id="loading-title" className="text-lg font-semibold text-slate-800 mb-2">
          {message}
        </h3>
        <p id="loading-description" className="text-sm text-slate-600">
          {subMessage}
        </p>
      </div>
    </div>
  );
};

export default LoadingModal;