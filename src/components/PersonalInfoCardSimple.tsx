import React, { useState } from 'react';
import { UserFuncao } from '../types';
import { useLucideIcons } from '../hooks/useLucideIcons';

interface ProfileFormData {
  nome: string;
  email: string;
  cidade: string;
  estado: string;
  bairro: string;
  rua: string;
  nome_escola: string;
  funcao: UserFuncao;
  avatar_url?: string;
}

interface PersonalInfoCardSimpleProps {
  formData: ProfileFormData;
  onFormDataChange: (data: Partial<ProfileFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  hasChanges: boolean;
}

const PersonalInfoCardSimple: React.FC<PersonalInfoCardSimpleProps> = ({
  formData,
  onFormDataChange,
  onSubmit,
  loading,
  hasChanges
}) => {
  const [errors, setErrors] = useState<{ nome?: string; funcao?: string }>({});

  // Initialize Lucide icons using custom hook
  useLucideIcons([errors, loading, formData.nome]);

  const validateForm = (): boolean => {
    const newErrors: { nome?: string; funcao?: string } = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.funcao || !['nutricionista', 'gestor', 'outro'].includes(formData.funcao)) {
      newErrors.funcao = 'Função deve ser nutricionista, gestor ou outro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFormDataChange({ [name]: value });

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(e);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <i data-lucide="user" className="w-5 h-5 text-blue-600"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Dados Pessoais</h2>
            <p className="text-sm text-slate-500">Gerencie suas informações pessoais</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Placeholder */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-semibold">
              {formData.nome ? formData.nome.charAt(0).toUpperCase() : 'U'}
            </div>
            <p className="text-sm text-slate-500">Upload de imagem em desenvolvimento</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Informações Pessoais
            </h3>

            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1">
                Nome Completo *
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
                placeholder="Seu nome completo"
                disabled={loading}
              />
              {errors.nome && (
                <p className="mt-1 text-xs text-red-600">{errors.nome}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                disabled={true}
              />
              <p className="mt-1 text-xs text-slate-400">
                O email não pode ser alterado
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Informações Profissionais
            </h3>

            <div>
              <label htmlFor="nome_escola" className="block text-sm font-medium text-slate-700 mb-1">
                Nome da Escola
              </label>
              <input
                type="text"
                id="nome_escola"
                name="nome_escola"
                value={formData.nome_escola}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                placeholder="Nome da instituição de ensino"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="funcao" className="block text-sm font-medium text-slate-700 mb-1">
                Função *
              </label>
              <select
                id="funcao"
                name="funcao"
                value={formData.funcao}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
                  errors.funcao
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                } focus:outline-none focus:ring-1`}
                disabled={loading}
              >
                <option value="" disabled>Selecione sua função</option>
                <option value="nutricionista">Nutricionista</option>
                <option value="gestor">Gestor</option>
                <option value="outro">Outro</option>
              </select>
              {errors.funcao && (
                <p className="mt-1 text-xs text-red-600">{errors.funcao}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Localização
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cidade" className="block text-sm font-medium text-slate-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                  placeholder="Sua cidade"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-slate-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                  placeholder="Seu estado"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rua" className="block text-sm font-medium text-slate-700 mb-1">
                  Rua
                </label>
                <input
                  type="text"
                  id="rua"
                  name="rua"
                  value={formData.rua}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                  placeholder="Nome da rua"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="bairro" className="block text-sm font-medium text-slate-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  id="bairro"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
                  placeholder="Nome do bairro"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Salvando...</span>
                </div>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalInfoCardSimple;