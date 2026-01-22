import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import { ProfileSetupRoute } from './components/auth/ProfileSetupRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import MenusPage from './pages/MenusPage';
import IngredientsPage from './pages/IngredientsPage';
import PreparacoesPage from './pages/PreparacoesPage';
import CardapiosPage from './pages/CardapiosPage';
import UnderDevelopmentPage from './pages/UnderDevelopmentPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LucideIconWrapper from './components/LucideIconWrapper';
import { MenuStatus, MenuItem } from './types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLucideIcons } from './hooks/useLucideIcons';

// Mock Data - will be replaced with Supabase data later
const INITIAL_MENUS: MenuItem[] = [
  { id: '1', name: 'Almoço: Arroz, Feijão, Frango Grelhado, Brócolis', school: 'Escola Municipal Central', date: '2023-11-20', calories: 450, protein: 32, status: MenuStatus.APPROVED },
  { id: '2', name: 'Lanche: Maçã e Iogurte Natural', school: 'CMEI Cantinho Feliz', date: '2023-11-20', calories: 180, protein: 8, status: MenuStatus.PENDING },
  { id: '3', name: 'Almoço: Macarrão Integral à Bolonhesa', school: 'E.E. Padre Anchieta', date: '2023-11-21', calories: 520, protein: 28, status: MenuStatus.DRAFT },
  { id: '4', name: 'Lanche: Sanduíche de Queijo e Suco de Laranja', school: 'Escola Municipal Central', date: '2023-11-21', calories: 310, protein: 12, status: MenuStatus.APPROVED },
  { id: '5', name: 'Almoço: Peixe Assado com Purê de Mandioquinha', school: 'CMEI Cantinho Feliz', date: '2023-11-22', calories: 480, protein: 35, status: MenuStatus.PENDING },
];

const COMPLIANCE_DATA = [
  { name: 'Seg', rate: 94 },
  { name: 'Ter', rate: 88 },
  { name: 'Qua', rate: 92 },
  { name: 'Qui', rate: 95 },
  { name: 'Sex', rate: 91 },
];

// Dashboard Component (extracted from main App)
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [menus] = useState<MenuItem[]>(INITIAL_MENUS);

  // Get current active tab from URL
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/dashboard/') return 'home';
    if (path.startsWith('/dashboard/')) {
      return path.replace('/dashboard/', '');
    }
    return 'home';
  };

  const activeTab = getActiveTabFromPath();

  // Initialize Lucide icons using custom hook
  useLucideIcons([activeTab, menus, isSidebarCollapsed]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Navigation handler
  const handleNavigation = useCallback((page: string) => {
    if (page === 'home') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${page}`);
    }
  }, [navigate]);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'home': return 'Painel Executivo de Nutrição';
      case 'shopping-list': return 'Lista de Compras e Suprimentos';
      case 'menus': return 'Gestão de Cardápios Escolares';
      case 'preparations': return 'Fichas de Preparações Culinárias';
      case 'ingredients': return 'Banco de Ingredientes';
      case 'stock': return 'Controle de Estoques';
      case 'settings': return 'Configurações do Sistema';
      case 'profile': return 'Meu Perfil';
      default: return 'Nutri Schools';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        {[
          { label: 'Total Ingredientes', value: '0', sub: 'Cadastrados no sistema', icon: 'apple' },
          { label: 'Total Preparações', value: '0', sub: 'Receitas disponíveis', icon: 'chef-hat' },
          { label: 'Total Cardápios', value: '0', sub: 'Planejamentos criados', icon: 'utensils' },
          { label: 'Listas de Compras', value: '0', sub: 'Listas geradas', icon: 'shopping-cart' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
              <i data-lucide={kpi.icon} className="w-4 h-4 text-slate-400"></i>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="font-semibold text-slate-800">Conformidade Semanal (%)</h3>
            <button className="text-xs text-blue-600 font-medium hover:underline">Ver relatório completo</button>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
              <LineChart data={COMPLIANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-4 flex-shrink-0">Ações Recomendadas</h3>
          <div className="space-y-4 flex-1">
            {[
              { text: 'Cadastrar ingredientes básicos', type: 'info' },
              { text: 'Criar primeira preparação', type: 'info' },
              { text: 'Planejar cardápio da semana', type: 'info' },
            ].map((action, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-md bg-slate-50 border border-slate-100 items-start">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  action.type === 'urgent' ? 'bg-red-500' : action.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <p className="text-xs text-slate-700 leading-tight font-medium">{action.text}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-md transition-colors flex-shrink-0">
            Começar Configuração
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <LucideIconWrapper className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar 
        activeItem={activeTab} 
        onItemClick={handleNavigation} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={handleToggleSidebar} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header title={getHeaderTitle()} onNavigate={handleNavigation} />
        
        <div 
          key={isSidebarCollapsed ? 'content-collapsed' : 'content-expanded'}
          className="flex-1 p-8 overflow-y-auto h-full"
        >
          <Routes>
            <Route path="/" element={renderDashboard()} />
            <Route path="/menus" element={<CardapiosPage />} />
            <Route path="/preparations" element={<PreparacoesPage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/*" element={<UnderDevelopmentPage featureName={activeTab} />} />
          </Routes>
        </div>


      </main>
    </LucideIconWrapper>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            } />

            {/* Profile setup route */}
            <Route path="/profile-setup" element={
              <ProfileSetupRoute>
                <ProfileSetupPage />
              </ProfileSetupRoute>
            } />

            {/* Private routes */}
            <Route path="/dashboard/*" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;