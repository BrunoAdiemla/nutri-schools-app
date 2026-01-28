import React from 'react';
import { useLucideIcons } from '../hooks/useLucideIcons';

interface SecurityCardProps {
  onChangePasswordClick: () => void;
}

const SecurityCard: React.FC<SecurityCardProps> = ({ onChangePasswordClick }) => {
  // Initialize Lucide icons using custom hook
  useLucideIcons([]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <i data-lucide="shield" className="w-5 h-5 text-orange-600"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Segurança</h2>
            <p className="text-sm text-slate-500">Gerencie sua senha e configurações de segurança</p>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Password Section */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Senha</h3>
              <p className="text-xs text-slate-500">Última alteração: Nunca</p>
            </div>
            <button 
              onClick={onChangePasswordClick}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              Alterar
            </button>
          </div>

          {/* Security Tips Section */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Dicas de Segurança</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Use uma senha forte com pelo menos 8 caracteres</li>
              <li>• Inclua letras maiúsculas, minúsculas e números</li>
              <li>• Não compartilhe sua senha com outras pessoas</li>
              <li>• Altere sua senha regularmente</li>
            </ul>
          </div>

          {/* Account Security Status */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <i data-lucide="check-circle" className="w-4 h-4 text-green-600"></i>
              <h3 className="text-sm font-semibold text-green-800">Conta Segura</h3>
            </div>
            <p className="text-xs text-green-700">
              Sua conta está protegida e todas as configurações de segurança estão ativas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityCard;