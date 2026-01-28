import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { UserFuncao } from '../types';
import PersonalInfoCardSimple from '../components/PersonalInfoCardSimple';
import SecurityCard from '../components/SecurityCard';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { DatabaseService } from '../services/DatabaseService';
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

const ProfilePage: React.FC = () => {
  const { profile, user, loading: authLoading, refreshProfile, updatePassword } = useAuth();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    nome: '',
    email: '',
    cidade: '',
    estado: '',
    bairro: '',
    rua: '',
    nome_escola: '',
    funcao: '' as UserFuncao,
    avatar_url: ''
  });
  const [originalData, setOriginalData] = useState<ProfileFormData>({
    nome: '',
    email: '',
    cidade: '',
    estado: '',
    bairro: '',
    rua: '',
    nome_escola: '',
    funcao: '' as UserFuncao,
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Initialize Lucide icons using custom hook
  useLucideIcons([loading, showPasswordModal]);

  // Load profile data when available
  useEffect(() => {
    if (profile && user) {
      const profileData: ProfileFormData = {
        nome: profile.nome || '',
        email: user.email || '',
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        bairro: profile.bairro || '',
        rua: profile.rua || '',
        nome_escola: profile.nome_escola || '',
        funcao: (profile.funcao as UserFuncao) || 'nutricionista',
        avatar_url: profile.avatar_url || ''
      };
      setFormData(profileData);
      setOriginalData(profileData);
    }
  }, [profile, user]);

  const handleFormDataChange = (data: Partial<ProfileFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Prepare update data (exclude email and avatar_url for now)
      const updateData = {
        nome: formData.nome,
        cidade: formData.cidade,
        estado: formData.estado,
        bairro: formData.bairro,
        rua: formData.rua,
        nome_escola: formData.nome_escola,
        funcao: formData.funcao
      };

      // Update profile in database
      const updatedProfile = await DatabaseService.updateUserProfile(user.id, updateData);
      
      if (!updatedProfile) {
        throw new Error('Falha ao atualizar perfil no banco de dados');
      }

      // Update original data to reflect saved state
      setOriginalData(formData);
      
      // Show success toast
      showSuccess('Perfil atualizado com sucesso!');

      // Refresh profile in AuthContext to sync the data
      await refreshProfile();
      
    } catch (error) {
      console.error('Profile update error:', error);
      showError(
        'Erro ao atualizar perfil',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };



  const handleChangePasswordClick = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordModalClose = () => {
    if (!passwordLoading) {
      setShowPasswordModal(false);
    }
  };

  const handlePasswordSubmit = async (newPassword: string, _confirmPassword: string) => {
    setPasswordLoading(true);

    try {
      const result = await updatePassword(newPassword);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao alterar senha');
      }

      // Close modal and show success toast
      setShowPasswordModal(false);
      showSuccess('Senha alterada com sucesso!');
      
    } catch (error) {
      console.error('Password change error:', error);
      showError(
        'Erro ao alterar senha',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // Check if form has changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Carregando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <div className="lg:col-span-1">
          <PersonalInfoCardSimple
            formData={formData}
            onFormDataChange={handleFormDataChange}
            onSubmit={handleSubmit}
            loading={loading}
            hasChanges={hasChanges}
          />
        </div>

        {/* Security Card */}
        <div className="lg:col-span-1">
          <SecurityCard onChangePasswordClick={handleChangePasswordClick} />
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        onSubmit={handlePasswordSubmit}
        loading={passwordLoading}
      />
    </div>
  );
};

export default ProfilePage;