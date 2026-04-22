
import React, { useState } from 'react';
import { Role, User } from '../types';
import { 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  Route, 
  Users, 
  BarChart3, 
  ReceiptText,
  DollarSign,
  Menu,
  X,
  FileSearch,
  CalendarClock,
  Contact,
  Settings,
  Truck,
  Zap,
  Box,
  BarChart3 as StockIcon,
  Package,
  MessageCircle,
  Layers
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeRole: Role;
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeRole, currentUser, activeTab, setActiveTab, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const navItems = activeRole === Role.MASTER ? [
    { id: 'dashboard', label: 'Painel Master', icon: <LayoutDashboard size={20} /> },
    { id: 'chat', label: 'Chat WhatsApp', icon: <MessageCircle size={20} /> },
    { id: 'master_installments', label: 'Parcelas', icon: <Layers size={20} /> },
    { id: 'collectors', label: 'Equipe', icon: <Users size={20} /> },
    { id: 'clients', label: 'Clientes', icon: <Contact size={20} /> },
    { id: 'sales', label: 'Vendas', icon: <ReceiptText size={20} /> },
    { id: 'delivery', label: 'Entregas', icon: <Truck size={20} /> },
    { id: 'movements', label: 'Movimentações', icon: <FileSearch size={20} /> },
    { id: 'commissions', label: 'Comissões', icon: <DollarSign size={20} /> },
    {id: 'future', label: 'Futuras', icon: <CalendarClock size={20} />},
    {id: 'reports', label: 'Financeiro', icon: <BarChart3 size={20} />},
    {id: 'products', label: 'Produtos', icon: <Package size={20} />},
    {id: 'stock', label: 'Estoque', icon: <Box size={20} />},
    {id: 'tasks', label: 'Painel de Tarefas', icon: <Layers size={20} />},
    { id: 'config', label: 'Configurações', icon: <Settings size={20} /> },
  ] : activeRole === Role.DELIVERY ? [
    { id: 'delivery', label: 'Minhas Entregas', icon: <Truck size={20} /> },
    { id: 'tasks', label: 'Minhas Tarefas', icon: <Layers size={20} /> },
  ] : activeRole === Role.ASSEMBLER ? [
    { id: 'assembler', label: 'Minhas Montagens', icon: <Truck size={20} /> },
    { id: 'tasks', label: 'Minhas Tarefas', icon: <Layers size={20} /> },
  ] : [
    { id: 'route', label: 'Rota de Hoje', icon: <Route size={20} /> },
    { id: 'chat', label: 'Chat WhatsApp', icon: <MessageCircle size={20} /> },
    { id: 'tasks', label: 'Minhas Tarefas', icon: <Layers size={20} /> },
    { id: 'future', label: 'Futuras', icon: <CalendarClock size={20} /> },
    { id: 'sales', label: 'Vendas', icon: <ReceiptText size={20} /> },
    { id: 'movements', label: 'Movimentações', icon: <FileSearch size={20} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden print:bg-white">
      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 transform print:hidden
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ReceiptText size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Junior Cestas e Produto</span>
          </div>
          <button 
            className="md:hidden p-1 hover:bg-slate-800 rounded"
            onClick={() => setIsMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-4 py-2">
            <div className="bg-slate-700 p-2 rounded-full">
              {activeRole === Role.MASTER ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{currentUser?.name || (activeRole === Role.MASTER ? 'Administrador' : 'Cobrador')}</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest">{activeRole}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 rounded-lg text-sm transition-colors border border-red-900/30 text-red-400"
          >
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-bold text-gray-800 truncate">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'master_installments' && 'Gestão de Parcelas'}
              {activeTab === 'collectors' && 'Gestão de Equipe'}
              {activeTab === 'clients' && 'Gestão de Clientes'}
              {activeTab === 'sales' && 'Gestão de Vendas'}
              {activeTab === 'delivery' && 'Gestão de Entregas'}
              {activeTab === 'reports' && 'Relatórios Financeiros'}
              {activeTab === 'commissions' && 'Relatório de Comissões'}
              {activeTab === 'route' && 'Rota de Hoje'}
              {activeTab === 'tasks' && 'Painel de Tarefas'}
              {activeTab === 'assembler' && 'Minhas Montagens'}
              {activeTab === 'future' && 'Cobranças Futuras'}
              {activeTab === 'movements' && 'Extrato de Movimentações'}
              {activeTab === 'chat' && 'Central de Atendimento WhatsApp'}
              {activeTab === 'products' && 'Catálogo de Produtos'}
              {activeTab === 'stock' && 'Gestão de Estoque'}
              {activeTab === 'config' && 'Configurações do Sistema'}
            </h1>
          </div>
          <div className="hidden sm:block text-xs text-gray-400 font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/50 print:bg-white print:overflow-visible">
          <div className="p-4 md:p-8 print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
