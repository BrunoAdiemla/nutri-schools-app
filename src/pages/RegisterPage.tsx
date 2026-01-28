import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const RegisterPage: React.FC = () => {
  const { signUp, loading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Initialize Lucide icons
  useEffect(() => {
    const timer = setTimeout(() => {
      // @ts-ignore
      if (window.lucide) {
        // @ts-ignore
        window.lucide.createIcons();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is already authenticated');
    }
  }, [isAuthenticated]);

  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific error when user starts typing
    if (errors[name as keyof RegisterFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await signUp({
        email: formData.email.trim(),
        password: formData.password
      });

      if (!result.success) {
        setErrors({
          general: result.error || 'Erro ao criar conta. Tente novamente.'
        });
      } else {
        // Show success message instead of trying to redirect
        setRegistrationSuccess(true);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        general: 'Erro inesperado. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(prev => !prev);
    } else {
      setShowConfirmPassword(prev => !prev);
    }
  };

  // Show success message after registration (priority over loading)
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <i data-lucide="leaf" className="w-6 h-6 text-white"></i>
              </div>
              <span className="font-bold text-2xl tracking-tight text-slate-900">
                Nutri<span className="text-blue-600">Schools</span>
              </span>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i data-lucide="mail-check" className="w-8 h-8 text-green-600"></i>
              </div>
              
              <h1 className="text-xl font-semibold text-slate-900 mb-2">
                Verifique seu email
              </h1>
              
              <p className="text-sm text-slate-600 mb-6">
                Enviamos um link de confirmação para <strong>{formData.email}</strong>. 
                Clique no link para ativar sua conta e completar seu cadastro.
              </p>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-6">
                <div className="flex items-start gap-3">
                  <i data-lucide="info" className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"></i>
                  <div className="text-left">
                    <p className="text-sm text-blue-800 font-medium mb-1">Próximos passos:</p>
                    <ol className="text-xs text-blue-700 space-y-1">
                      <li>1. Verifique sua caixa de entrada (e spam)</li>
                      <li>2. Clique no link de confirmação</li>
                      <li>3. Complete seu perfil</li>
                      <li>4. Acesse o sistema</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                <i data-lucide="arrow-left" className="w-4 h-4"></i>
                Voltar para login
              </Link>
            </div>
          </div>

          {/* System Info */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Sistema Online</span>
              <span>•</span>
              <span>Versão 1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-sm text-slate-600">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <i data-lucide="leaf" className="w-6 h-6 text-white"></i>
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900">
              Nutri<span className="text-blue-600">Schools</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Criar nova conta
          </h1>
          <p className="text-sm text-slate-600">
            Preencha os dados abaixo para se cadastrar no sistema
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <i data-lucide="alert-circle" className="w-4 h-4 text-red-600"></i>
                  <span className="text-sm text-red-700">
                    {errors.general}
                  </span>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i data-lucide="mail" className="w-4 h-4 text-slate-400"></i>
                </div>
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-md text-sm transition-colors ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                  placeholder="Mínimo 8 caracteres"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  disabled={isSubmitting}
                >
                  <i data-lucide={showPassword ? 'eye-off' : 'eye'} className="w-4 h-4"></i>
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar Senha *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-md text-sm transition-colors ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                  placeholder="Repita a senha"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  disabled={isSubmitting}
                >
                  <i data-lucide={showConfirmPassword ? 'eye-off' : 'eye'} className="w-4 h-4"></i>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Criando conta...</span>
                </div>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-center">
              <div className="text-xs text-slate-500">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Faça login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Sistema Online</span>
            <span>•</span>
            <span>Versão 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;