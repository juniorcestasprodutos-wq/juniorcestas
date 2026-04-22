
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Role, User, Client, Sale, Installment, SaleItem, Task, Product, StockMovement } from './types';
import { initialSales, mockCollectors, mockClients } from './mockData';
import Layout from './components/Layout';
import ReceiptForm from './components/ReceiptForm';
import { formatCurrency, formatDate, sendWhatsAppMessage, generateRescheduleMessage } from './utils';
import {
  Plus, Search, Calendar, UserCheck, DollarSign, Wallet,
  MapPin, Send, ReceiptText, FileText, CheckCircle, Info, Eye, X,
  Printer, AlertCircle, TrendingUp, UserPlus, Phone, Hash,
  CalendarClock, ArrowRight, Route as RouteIcon, Lock, User as UserIcon, Edit2, Power, Contact,
  History, CreditCard, ChevronRight, AlertTriangle, Filter, Settings, RefreshCw, QrCode,
  FileSpreadsheet, Truck, Check, Layers, Zap, Package, MessageCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import axios from 'axios';
import ClientPortal from './src/components/ClientPortal';
import ThermalReceipt from './src/components/ThermalReceipt';
import { dataService } from './src/dataService';
import { supabase } from './src/supabaseClient';
import Chat from './src/components/Chat';

const App: React.FC = () => {
  // Versão: 2026-04-01-v3 - Idioma EN para aviso_de_vencimento
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('credi_facil_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [role, setRole] = useState<Role>(currentUser?.role || Role.MASTER);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'sales' | 'route' | 'movements' | 'commissions' | 'reports' | 'config' | 'chat' | 'delivery' | 'products' | 'stock'>('dashboard');

  const [financialReportFilter, setFinancialReportFilter] = useState({
    period: 'MONTHLY' as 'WEEKLY' | 'MONTHLY' | 'DAILY',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });
  const [financialSearch, setFinancialSearch] = useState('');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [sales, setSales] = useState<Sale[]>([]);
  const [collectors, setCollectors] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, c, s, t, config] = await Promise.all([
          dataService.getUsers(),
          dataService.getClients(),
          dataService.getSales(),
          dataService.getTasks(),
          dataService.getConfig()
        ]);
        setCollectors(u);
        setClients(c);
        setSales(s);
        setTasks(t);
        setMpConfig(config);
        
        // Fetch products
        const p = await dataService.getProducts();
        setProducts(p);
      } catch (err) {
        console.error("Error loading data from Supabase", err);
      }
    };
    loadData();
  }, []);

  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCollectorModalOpen, setIsAddCollectorModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [editingCollectorId, setEditingCollectorId] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [newCollector, setNewCollector] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    role: Role.COLLECTOR as Role,
    active: true,
    saleCommissionRate: 0,
    collectionCommissionRate: 0
  });
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    cpf: '',
    rg: '',
    rgImage: '',
    cpfImage: '',
    utilityBillImage: '',
    housePhoto: '',
    referralClientId: '',
    coordinates: { lat: 0, lng: 0 }
  });
  const [newSale, setNewSale] = useState({
    clientId: clients[0]?.id || '',
    collectorId: collectors[0]?.id || '',
    deliveryPersonId: '',
    totalAmount: '',
    downPayment: '',
    installmentsCount: '10',
    description: '',
    productId: '',
    firstDueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    isAssembly: false,
    assemblerId: '',
    observations: ''
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);

  const [masterInstallmentsFilter, setMasterInstallmentsFilter] = useState({
    status: 'ALL' as 'ALL' | 'PENDING' | 'OVERDUE' | 'PAID' | 'TODAY',
    collectorId: 'ALL',
    search: ''
  });

  const [deliveryFilter, setDeliveryFilter] = useState({
    status: 'ALL' as 'ALL' | 'PENDING' | 'DELIVERED',
    deliveryPersonId: 'ALL'
  });

  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [nextVisitDate, setNextVisitDate] = useState<string>('');

  const [movementsFilter, setMovementsFilter] = useState({
    type: 'RECEIVED' as 'RECEIVED' | 'OVERDUE',
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    collectorId: 'ALL'
  });

  const [commissionFilter, setCommissionFilter] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    collectorId: 'ALL'
  });

  const [mpConfig, setMpConfig] = useState({
    pfToken: '',
    pjToken: '',
    pjThreshold: 20000,
    infinityPayToken: '',
    infinityPayEnabled: false,
    allocationMode: 'SPLIT_BY_THRESHOLD' as 'MP_ONLY' | 'INFINITY_ONLY' | 'SPLIT_BY_THRESHOLD',
    n8nWebhookUrl: '',
    autoReassignDays: 5,
    pixExpirationDays: 5,
    googleSheetId: '',
    googleApiKey: '',
    whatsappApiToken: '',
    whatsappPhoneNumberId: '',
    appsScriptUrl: '',
    creditLimitEnabled: false,
    creditLimitValue: 0,
    whatsappAutoReplyEnabled: false,
    whatsappAutoReplyMessage: '',
    whatsappForwardingNumber: '',
    whatsappNotificationEnabled: false
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedProductForMovements, setSelectedProductForMovements] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [printData, setPrintData] = useState<{ sale: Sale, client: Client, installment?: Installment, type: 'PAYMENT' | 'SALE' } | null>(null);

  const [isGeneratingPix, setIsGeneratingPix] = useState<string | null>(null);

  // Config is now loaded in the main useEffect

  // Automatic Collector Assignment Logic
  useEffect(() => {
    if (role !== Role.MASTER) return;

    const runAutoReassign = async () => {
      const today = new Date().toISOString().split('T')[0];
      const reassignDays = mpConfig.autoReassignDays || 5;

      let hasGlobalChanges = false;
      const updatedSales = await Promise.all(sales.map(async (sale) => {
        const overdueInstallment = sale.installments.find(inst => {
          if (inst.status === 'PAID') return false;
          const dueDate = new Date(inst.dueDate);
          const diffTime = Math.abs(new Date(today).getTime() - dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return inst.dueDate < today && diffDays >= reassignDays;
        });

        if (overdueInstallment && (sale.collectorId === 'loja' || !sale.collectorId)) {
          // Lógica de Reatribuição Automática Refinada
          // Preferência: Quem entregou (deliveryPersonId)
          let nextCollectorId = sale.deliveryPersonId;
          
          if (!nextCollectorId) {
            const activeCollectors = collectors.filter(c => c.active !== false && c.id !== 'loja');
            if (activeCollectors.length > 0) nextCollectorId = activeCollectors[0].id;
          }

          if (nextCollectorId && nextCollectorId !== sale.collectorId) {
            const updatedSale = { ...sale, collectorId: nextCollectorId };
            await dataService.saveSale(updatedSale);
            hasGlobalChanges = true;
            return updatedSale;
          }
        }
        return sale;
      }));

      if (hasGlobalChanges) {
        setSales(updatedSales);
      }
    };

    if (sales.length > 0 && collectors.length > 0) {
      runAutoReassign();
    }
  }, [sales.length, collectors.length, mpConfig.autoReassignDays, role]);

  useEffect(() => {
    if (currentUser) {
      setRole(currentUser.role);
      setActiveTab(currentUser.role === Role.MASTER ? 'dashboard' : 'route');
    }
  }, [currentUser]);

  const getClientScore = (clientId: string) => {
    const clientSales = sales.filter(s => s.clientId === clientId);
    if (clientSales.length === 0) return 100;

    let totalInstallments = 0;
    let onTimePayments = 0;

    const today = new Date().toISOString().split('T')[0];

    clientSales.forEach(sale => {
      sale.installments.forEach(inst => {
        totalInstallments++;
        if (inst.status === 'PAID') {
          onTimePayments++;
        } else if (inst.dueDate >= today) {
          onTimePayments++;
        }
      });
    });

    return totalInstallments === 0 ? 100 : Math.round((onTimePayments / totalInstallments) * 100);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const masterUser = collectors.find(c => c.username === 'master' && c.password === '@admin2026');
    if (loginForm.username === 'master' && loginForm.password === '@admin2026') {
      const user: User = masterUser || { id: 'master', name: 'Administrador', phone: '', role: Role.MASTER, active: true };
      setCurrentUser(user);
      localStorage.setItem('credi_facil_user', JSON.stringify(user));
      return;
    }
    const collector = collectors.find(c => c.username === loginForm.username && c.password === loginForm.password);
    if (collector) {
      if (collector.active === false) {
        setLoginError('Sua conta está desativada. Entre em contato com o administrador.');
        return;
      }
      setCurrentUser(collector);
      localStorage.setItem('credi_facil_user', JSON.stringify(collector));
      return;
    }
    setLoginError('Usuário ou senha inválidos.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('credi_facil_user');
    setLoginForm({ username: '', password: '' });
  };

  const stats = useMemo(() => {
    const totalReceivable = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalCollected = sales.reduce((acc, s) => {
      return acc + s.installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0) + (s.downPayment || 0);
    }, 0);
    const pendingCount = sales.reduce((acc, s) => acc + s.installments.filter(i => i.status === 'PENDING' || i.status === 'PARTIAL').length, 0);
    const dataByCollector = collectors.map(c => {
      const collSales = sales.filter(s => s.collectorId === c.id);
      const collected = collSales.reduce((sum, s) => sum + s.installments.reduce((instSum, inst) => instSum + inst.paidAmount, 0) + (s.downPayment || 0), 0);
      return { name: c.name, valor: collected };
    });
    return { totalReceivable, totalCollected, pendingCount, dataByCollector };
  }, [sales, collectors]);

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.cpf.includes(clientSearch) ||
      c.phone.includes(clientSearch)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientSearch]);

  const filteredSales = useMemo(() => {
    const activeCollectorId = currentUser?.role === Role.COLLECTOR ? currentUser.id : null;
    return sales.filter(s => {
      const client = clients.find(c => c.id === s.clientId);
      const matchesSearch = s.id.includes(saleSearch) || (client?.name.toLowerCase().includes(saleSearch.toLowerCase()));
      const matchesCollector = activeCollectorId ? s.collectorId === activeCollectorId : true;
      return matchesSearch && matchesCollector;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, clients, saleSearch, currentUser]);

  const todayRoute = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const items = [];
    const activeCollectorId = currentUser?.role === Role.COLLECTOR ? currentUser.id : null;
    for (const sale of sales) {
      if (role === Role.MASTER || sale.collectorId === activeCollectorId) {
        for (const inst of sale.installments) {
          if ((inst.dueDate <= todayStr) && (inst.status === 'PENDING' || inst.status === 'PARTIAL' || inst.status === 'RESCHEDULED')) {
            const client = clients.find(c => c.id === sale.clientId);
            items.push({ ...inst, client, sale });
          }
        }
      }
    }
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [sales, clients, role, currentUser]);

  const futureRoute = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const items = [];
    const activeCollectorId = currentUser?.role === Role.COLLECTOR ? currentUser.id : null;
    for (const sale of sales) {
      if (role === Role.MASTER || sale.collectorId === activeCollectorId) {
        for (const inst of sale.installments) {
          if ((inst.dueDate > todayStr) && (inst.status === 'PENDING' || inst.status === 'PARTIAL' || inst.status === 'RESCHEDULED')) {
            const client = clients.find(c => c.id === sale.clientId);
            items.push({ ...inst, client, sale });
          }
        }
      }
    }
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [sales, clients, role, currentUser]);

  const filteredMovements = useMemo(() => {
    const items: any[] = [];
    const today = new Date().toISOString().split('T')[0];
    const activeCollectorId = currentUser?.role === Role.COLLECTOR ? currentUser.id : null;
    sales.forEach(sale => {
      const isAllowedCollector = role === Role.MASTER
        ? (movementsFilter.collectorId === 'ALL' || sale.collectorId === movementsFilter.collectorId)
        : (sale.collectorId === activeCollectorId);
      if (!isAllowedCollector) return;
      const client = clients.find(c => c.id === sale.clientId);
      if (movementsFilter.type === 'RECEIVED') {
        const inDateRange = sale.date >= movementsFilter.fromDate && sale.date <= movementsFilter.toDate;
        if (sale.downPayment > 0 && inDateRange) {
          items.push({ dueDate: sale.date, client, sale, number: 0, displayValue: sale.downPayment, typeLabel: 'ENTRADA' });
        }
      }
      sale.installments.forEach(inst => {
        const inDateRange = inst.dueDate >= movementsFilter.fromDate && inst.dueDate <= movementsFilter.toDate;
        if (movementsFilter.type === 'RECEIVED') {
          if (inst.paidAmount > 0 && inDateRange) items.push({ ...inst, client, sale, displayValue: inst.paidAmount, typeLabel: `PARCELA ${inst.number}` });
        } else {
          const isOverdue = inst.dueDate < today && (inst.status === 'PENDING' || inst.status === 'PARTIAL' || inst.status === 'RESCHEDULED');
          if (isOverdue && inDateRange) items.push({ ...inst, client, sale, displayValue: inst.amount - inst.paidAmount, typeLabel: `ATRASO P${inst.number}` });
        }
      });
    });
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [sales, clients, movementsFilter, role, currentUser]);

  const handleSaveCollector = async () => {
    if (!newCollector.name || !newCollector.phone || !newCollector.username || !newCollector.password) return alert("Preencha todos os campos.");
    try {
      const collectorData: Partial<User> = {
        ...newCollector,
        active: newCollector.active,
        id: editingCollectorId || undefined
      };
      await dataService.saveUser(collectorData as User);
      const updatedCollectors = await dataService.getUsers();
      setCollectors(updatedCollectors);
      setNewCollector({
        name: '',
        phone: '',
        username: '',
        password: '',
        active: true,
        saleCommissionRate: 0,
        collectionCommissionRate: 0
      });
      setEditingCollectorId(null);
      setIsAddCollectorModalOpen(false);
    } catch (err) {
      console.error("Error saving collector", err);
      alert("Erro ao salvar cobrador.");
    }
  };

  const handleEditCollector = (c: User) => {
    setNewCollector({
      name: c.name,
      phone: c.phone,
      username: c.username || '',
      password: c.password || '',
      role: c.role || Role.COLLECTOR,
      active: c.active !== false,
      saleCommissionRate: c.saleCommissionRate || 0,
      collectionCommissionRate: c.collectionCommissionRate || 0
    });
    setEditingCollectorId(c.id);
    setIsAddCollectorModalOpen(true);
  };

  const handleToggleCollectorStatus = async (collectorId: string) => {
    try {
      const collector = collectors.find(c => c.id === collectorId);
      if (collector) {
        await dataService.saveUser({ ...collector, active: collector.active === false });
        const updated = await dataService.getUsers();
        setCollectors(updated);
      }
    } catch (err) {
      console.error("Error toggling collector status", err);
    }
  };

  const handleSaveClient = async () => {
    if (!newClient.name || !newClient.phone) return alert("Nome e Telefone são obrigatórios");
    try {
      const clientId = await dataService.saveClient(newClient);
      const updatedClients = await dataService.getClients();
      setClients(updatedClients);
      setNewSale(prev => ({ ...prev, clientId }));
      setNewClient({ name: '', phone: '', address: '', city: '', state: '', cpf: '', rg: '' });
      setIsAddClientModalOpen(false);
    } catch (err) {
      console.error("Error saving client", err);
      alert("Erro ao salvar cliente.");
    }
  };

  const filteredCommissions = useMemo(() => {
    const items: any[] = [];
    const activeCollectorId = currentUser?.role === Role.COLLECTOR ? currentUser.id : null;

    sales.forEach(sale => {
      const collector = collectors.find(c => c.id === sale.collectorId);
      if (!collector) return;

      const isAllowedCollector = role === Role.MASTER
        ? (commissionFilter.collectorId === 'ALL' || sale.collectorId === commissionFilter.collectorId)
        : (sale.collectorId === activeCollectorId);

      if (!isAllowedCollector) return;

      const client = clients.find(c => c.id === sale.clientId);

      // Sale Commission
      if (sale.date >= commissionFilter.fromDate && sale.date <= commissionFilter.toDate) {
        const rate = collector.saleCommissionRate || 0;
        const commission = (sale.totalAmount * rate) / 100;
        if (commission > 0) {
          items.push({
            date: sale.date,
            collectorName: collector.name,
            clientName: client?.name,
            type: 'VENDA',
            baseValue: sale.totalAmount,
            rate: rate,
            commission: commission
          });
        }
      }

      // Collection Commission (Down Payment)
      if (sale.date >= commissionFilter.fromDate && sale.date <= commissionFilter.toDate) {
        if (sale.downPayment > 0) {
          const rate = collector.collectionCommissionRate || 0;
          const commission = (sale.downPayment * rate) / 100;
          if (commission > 0) {
            items.push({
              date: sale.date,
              collectorName: collector.name,
              clientName: client?.name,
              type: 'COBRANÇA (ENTRADA)',
              baseValue: sale.downPayment,
              rate: rate,
              commission: commission
            });
          }
        }
      }

      // Collection Commission (Installments)
      sale.installments.forEach(inst => {
        if (inst.paidAmount > 0 && inst.dueDate >= commissionFilter.fromDate && inst.dueDate <= commissionFilter.toDate) {
          const rate = collector.collectionCommissionRate || 0;
          const commission = (inst.paidAmount * rate) / 100;
          if (commission > 0) {
            items.push({
              date: inst.dueDate,
              collectorName: collector.name,
              clientName: client?.name,
              type: `COBRANÇA (P${inst.number})`,
              baseValue: inst.paidAmount,
              rate: rate,
              commission: commission
            });
          }
        }
      });
    });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [sales, collectors, clients, commissionFilter, role, currentUser]);

  const financialReportData = useMemo(() => {
    const allInstallments = sales.flatMap(s => s.installments.map(i => ({ ...i, sale: s })));

    // Filter by date range
    const filtered = allInstallments.filter(inst => {
      return inst.dueDate >= financialReportFilter.startDate && inst.dueDate <= financialReportFilter.endDate;
    });

    // Group by period
    const grouped: Record<string, { date: string, received: number, projected: number, total: number }> = {};

    filtered.forEach(inst => {
      let key = inst.dueDate;
      if (financialReportFilter.period === 'MONTHLY') {
        key = inst.dueDate.substring(0, 7); // YYYY-MM
      } else if (financialReportFilter.period === 'WEEKLY') {
        const d = new Date(inst.dueDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));
        key = startOfWeek.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, received: 0, projected: 0, total: 0 };
      }

      const amount = (inst.amount + (inst.manualAdjustment || 0));
      grouped[key].received += inst.paidAmount;
      grouped[key].projected += amount - inst.paidAmount;
      grouped[key].total += amount;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales, financialReportFilter]);

  const filteredFinancialTransactions = useMemo(() => {
    const allInstallments = sales.flatMap(s => s.installments.map(i => ({
      ...i,
      sale: s,
      client: clients.find(c => c.id === s.clientId)
    })));

    return allInstallments.filter(inst => {
      const inDateRange = inst.dueDate >= financialReportFilter.startDate && inst.dueDate <= financialReportFilter.endDate;
      if (!inDateRange) return false;

      if (financialSearch) {
        const search = financialSearch.toLowerCase();
        return (
          inst.client?.name.toLowerCase().includes(search) ||
          inst.sale.id.toLowerCase().includes(search)
        );
      }
      return true;
    }).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [sales, clients, financialReportFilter, financialSearch]);

  const handlePayment = async () => {
    if (!selectedInstallment || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    const adjustment = parseFloat(adjustmentValue) || 0;

    try {
      let finalAdjustment = adjustment;
      if (adjustmentType === 'PERCENT') {
        finalAdjustment = (selectedInstallment.amount * adjustment) / 100;
      }

      const newPaidTotal = selectedInstallment.paidAmount + amount;
      const totalAmountWithAdjustment = selectedInstallment.amount + (selectedInstallment.manualAdjustment || 0) + finalAdjustment;
      const isFullPayment = newPaidTotal >= totalAmountWithAdjustment;

      const sale = sales.find(s => s.id === selectedInstallment.saleId);
      if (!sale) return;

      const updatedInstallments = sale.installments.map(inst => {
        if (inst.id === selectedInstallment.id) {
          return {
            ...inst,
            paidAmount: newPaidTotal,
            status: (isFullPayment ? 'PAID' : 'PARTIAL') as any,
            dueDate: (!isFullPayment && nextVisitDate) ? nextVisitDate : inst.dueDate,
            paymentDate: isFullPayment ? new Date().toISOString().split('T')[0] : inst.paymentDate,
            manualAdjustment: (inst.manualAdjustment || 0) + finalAdjustment
          };
        }
        if (isFullPayment && nextVisitDate) {
          const currentIdx = sale.installments.findIndex(i => i.id === selectedInstallment.id);
          const nextIdx = currentIdx + 1;
          if (sale.installments[nextIdx] && inst.id === sale.installments[nextIdx].id) return { ...inst, dueDate: nextVisitDate };
        }
        return inst;
      });

      const updatedSale = { ...sale, installments: updatedInstallments };
      await dataService.saveSale(updatedSale);

      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));

      const client = clients.find(c => c.id === sale.clientId);
      if (client) {
        // Envio do Template de Agradecimento (Oficial)
        if (isFullPayment && mpConfig.whatsappApiToken && mpConfig.whatsappPhoneNumberId) {
          axios.post('/api/send-whatsapp', {
            phone: client.phone,
            template: {
              name: "obrigadopagamentoo",
              language: { code: "pt_BR" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: client.name || "Cliente" },
                    { type: "text", text: amount.toFixed(2).replace('.', ',') }
                  ]
                }
              ]
            }
          }).catch(e => console.error("Erro ao enviar agradecimento:", e));
        }

        setPrintData({
          sale: updatedSale,
          client,
          installment: { ...selectedInstallment, paidAmount: newPaidTotal, manualAdjustment: (selectedInstallment.manualAdjustment || 0) + finalAdjustment },
          type: 'PAYMENT'
        });
        setTimeout(() => window.print(), 500);
      }

      setIsPaymentModalOpen(false);
      setSelectedInstallment(null);
      setPaymentAmount('');
      setAdjustmentValue('');
      setAdjustmentType('FIXED');
      setNextVisitDate('');
    } catch (err) {
      console.error("Error processing payment", err);
      alert("Erro ao processar pagamento.");
    }
  };

  const handleSendWhatsApp = async (phone: string, message: string) => {
    if (mpConfig.whatsappApiToken && mpConfig.whatsappPhoneNumberId) {
      try {
        await axios.post('/api/send-whatsapp', { phone, message });
        return;
      } catch (e) {
        console.error("Erro ao enviar via API, tentando link direto...", e);
      }
    }
    sendWhatsAppMessage(phone, message);
  };

  const handleSendCollectionTemplate = async (routeItem: any) => {
    if (!mpConfig.whatsappApiToken || !mpConfig.whatsappPhoneNumberId) {
      return alert("Configure a API do WhatsApp nas configurações primeiro.");
    }

    try {
      let pixCode = routeItem.qrCode;

      // 1. Se não tiver PIX, gera agora
      if (!pixCode) {
        setIsGeneratingPix(routeItem.id);
        const response = await axios.post('/api/generate-pix', {
          amount: routeItem.amount - routeItem.paidAmount,
          description: `Parcela ${routeItem.number} - Venda ${routeItem.sale.id}`,
          tokenType: routeItem.sale.tokenType,
          clientName: routeItem.client.name,
          clientPhone: routeItem.client.phone,
          clientCpf: routeItem.client.cpf,
          installmentId: routeItem.id
        });
        
        if (response.data.pixCode) {
          pixCode = response.data.pixCode;
          // Atualiza o estado global de vendas para refletir o PIX gerado na parcela
          setSales(prev => prev.map(s => {
            if (s.id !== routeItem.sale.id) return s;
            return {
              ...s,
              installments: s.installments.map(i => 
                i.id === routeItem.id ? { ...i, qrCode: response.data.pixCode, qrCodeBase64: response.data.qrCodeBase64, ticketUrl: response.data.ticketUrl, pixSent: true } : i
              )
            };
          }));
        } else {
          throw new Error("Falha ao gerar PIX");
        }
        setIsGeneratingPix(null);
      }

      // 2. Envia o Template e o código PIX para o backend (que cuida do segundo balão)
      await axios.post('/api/send-whatsapp', {
        phone: routeItem.client?.phone,
        pixCode: pixCode, // O backend enviará o segundo balão automaticamente
        template: {
          name: "aviso_de_vencimento",
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: routeItem.client?.name || "Cliente" },
                { type: "text", text: routeItem.sale.id.toString() },
                { type: "text", text: (routeItem.amount - routeItem.paidAmount).toFixed(2).replace('.', ',') },
                { type: "text", text: pixCode || "" }
              ]
            }
          ]
        }
      });

      alert(`Cobrança oficial enviada com sucesso para ${routeItem.client?.name}!`);
    } catch (error: any) {
      console.error("Erro no envio do template:", error);
      const serverError = error.response?.data?.error || error.message;
      const details = error.response?.data?.details ? JSON.stringify(error.response.data.details) : "";
      alert(`Erro ao enviar cobrança oficial: ${serverError} ${details}`);
      setIsGeneratingPix(null);
    }
  };

  const handleReschedule = async (inst: Installment, client: Client) => {
    const newDate = prompt("Escolha a nova data de vencimento (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!newDate) return;
    try {
      const sale = sales.find(s => s.id === inst.saleId);
      if (!sale) return;
      const updatedSale = {
        ...sale,
        installments: sale.installments.map(i => {
          if (i.id !== inst.id) return i;
          return { 
            ...i, 
            dueDate: newDate, 
            status: 'RESCHEDULED' as any,
            pixSent: false, // Reset cycle
            rescheduleCount: (i.rescheduleCount || 0) + 1,
            originalDueDate: i.originalDueDate || i.dueDate
          };
        })
      };
      await dataService.saveSale(updatedSale);
      setSales(prev => prev.map(s => s.id === sale.id ? updatedSale : s));
      handleSendWhatsApp(client.phone, generateRescheduleMessage(client.name, newDate));
    } catch (err) {
      console.error("Error rescheduling", err);
      alert("Erro ao reagendar.");
    }
  };

  const handleSaveSale = async () => {
    try {
      if (!newSale.clientId || !newSale.totalAmount || !newSale.installmentsCount) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
      }

      const total = parseFloat(newSale.totalAmount);
      const installmentsCount = parseInt(newSale.installmentsCount);
      const downPayment = parseFloat(newSale.downPayment || '0');

      // 1. Validar Estoque se houver produto selecionado
      if (newSale.productId) {
        const p = products.find(prod => prod.id === newSale.productId);
        if (p && p.stockControlEnabled && p.stockQuantity <= 0) {
          alert(`Produto ${p.name} está sem estoque!`);
          return;
        }
      }

      // 2. Lógica de Alocação (PF/PJ/INFINITY)
      let tokenType: 'PF' | 'PJ' | 'INFINITY' = 'PF';
      if (mpConfig.allocationMode === 'INFINITY_ONLY') {
        tokenType = 'INFINITY';
      } else if (mpConfig.allocationMode === 'MP_ONLY') {
        const currentPjVolume = sales.filter(s => s.tokenType === 'PJ').reduce((acc, s) => acc + s.totalAmount, 0);
        tokenType = (currentPjVolume + total) <= mpConfig.pjThreshold ? 'PJ' : 'PF';
      } else {
        const currentPjVolume = sales.filter(s => s.tokenType === 'PJ').reduce((acc, s) => acc + s.totalAmount, 0);
        if ((currentPjVolume + total) <= mpConfig.pjThreshold) {
          tokenType = 'PJ';
        } else if (mpConfig.infinityPayEnabled) {
          tokenType = 'INFINITY';
        } else {
          tokenType = 'PF';
        }
      }

      // 3. Gerar ID e Parcelas
      const nextId = sales.length > 0 ? Math.max(...sales.map(s => parseInt(s.id) || 0)) + 1 : 1001;
      const saleId = nextId.toString();
      const firstDue = new Date(newSale.firstDueDate);
      const installmentValue = (total - downPayment) / installmentsCount;
      const installments: Installment[] = Array.from({ length: installmentsCount }, (_, i) => {
        const d = new Date(firstDue);
        d.setMonth(d.getMonth() + i);
        return {
          id: `inst-${saleId}-${i + 1}`,
          saleId,
          number: i + 1,
          dueDate: d.toISOString().split('T')[0],
          amount: installmentValue,
          paidAmount: 0,
          status: 'PENDING',
          manualAdjustment: 0,
          pixSent: false
        };
      });

      // 4. Criar objeto de Venda
      const sale: Sale = {
        id: saleId,
        clientId: newSale.clientId,
        collectorId: newSale.collectorId || 'loja',
        deliveryPersonId: newSale.deliveryPersonId,
        date: new Date().toISOString().split('T')[0],
        totalAmount: total,
        downPayment,
        installmentsCount,
        description: newSale.description,
        firstDueDate: newSale.firstDueDate,
        isAssembly: newSale.isAssembly,
        assemblerId: newSale.assemblerId,
        observations: newSale.observations,
        items: [{
          description: newSale.description,
          quantity: 1,
          unitPrice: total,
          total: total,
          productId: newSale.productId || null
        }],
        installments,
        tokenType,
        status: 'PENDING'
      };

      await dataService.saveSale(sale);
      
      // 5. Registrar baixa de estoque se houver produto vinculado
      if (sale.items[0]?.productId) {
        const prod = products.find(p => p.id === sale.items[0].productId);
        if (prod?.stockControlEnabled) {
          await dataService.saveStockMovement({
            productId: prod.id,
            type: 'VENDA',
            quantity: 1,
            saleId: sale.id,
            notes: `Venda #${sale.id}`
          });
        }
      }

      // 6. Notificações
      if (sale.deliveryPersonId) {
        const worker = collectors.find(c => c.id === sale.deliveryPersonId);
        if (worker?.phone) {
          const client = clients.find(c => c.id === sale.clientId);
          handleSendWhatsApp(worker.phone, `Junior Cestas e Produto: Olá ${worker.name}, você recebeu uma nova entrega. Cliente: ${client?.name}`);
        }
      }

      setSales(await dataService.getSales());
      setProducts(await dataService.getProducts());
      setIsAddSaleModalOpen(false);
      setNewSale({ ...newSale, description: '', totalAmount: '', downPayment: '', observations: '', productId: '' });
      alert(`Venda #${saleId} lançada com sucesso!`);
    } catch (err) {
      console.error("Error saving sale", err);
      alert("Erro ao salvar venda.");
    }
  };

  const handleSaveConfig = async () => {
    try {
      await dataService.saveConfig(mpConfig);
      alert("Configurações salvas com sucesso!");
    } catch (e) {
      alert("Erro ao salvar configurações.");
    }
  };

  const handleUpdateSaleStatus = async (saleId: string, status: string) => {
    try {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;

      const updatedSale = { ...sale, status };
      await dataService.saveSale(updatedSale);
      
      // Se CANCELADO, devolve item ao estoque
      if (status === 'CANCELLED') {
        for (const item of (sale.items || [])) {
          if (item.productId) {
            const prod = products.find(p => p.id === item.productId);
            if (prod?.stockControlEnabled) {
              await dataService.saveStockMovement({
                productId: item.productId,
                type: 'RETORNO',
                quantity: item.quantity,
                saleId: sale.id,
                notes: `Cancelamento de Venda #${sale.id}`
              });
            }
          }
        }
      }

      setSales(await dataService.getSales());
      setProducts(await dataService.getProducts());
    } catch (err) {
      console.error("Error updating sale status", err);
    }
  };

  const handleReassignSale = async (saleId: string, newCollectorId: string) => {
    try {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;
      
      const updatedSale = { ...sale, collectorId: newCollectorId };
      await dataService.saveSale(updatedSale);
      setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));

      // Notifica o novo cobrador
      const worker = collectors.find(c => c.id === newCollectorId);
      if (worker?.phone) {
        const client = clients.find(c => c.id === sale.clientId);
        const msg = `Credi Fácil: Olá ${worker.name}, a venda #${sale.id} (${client?.name}) foi designada para sua carteira de cobrança.`;
        await handleSendWhatsApp(worker.phone, msg);
      }

      alert("Venda reatribuída e cobrador notificado!");
    } catch (err) {
      console.error("Error reassigning", err);
    }
  };

  const handleGeneratePix = async (routeItem: any) => {
    setIsGeneratingPix(routeItem.id);
    try {
      const res = await axios.post('/api/generate-pix', {
        amount: routeItem.amount - routeItem.paidAmount,
        description: `Parcela ${routeItem.number} - Venda ${routeItem.sale.id}`,
        tokenType: routeItem.sale.tokenType,
        clientName: routeItem.client.name,
        clientPhone: routeItem.client.phone,
        clientCpf: routeItem.client.cpf,
        installmentId: routeItem.id
      });

      const { pixCode } = res.data;

      const message = `Credi Fácil: Olá ${routeItem.client.name}, segue seu código PIX para pagamento da parcela ${routeItem.number}: \n\n${pixCode}\n\nValor: ${formatCurrency(routeItem.amount - routeItem.paidAmount)}`;
      handleSendWhatsApp(routeItem.client.phone, message);

      // Update installment to mark as pixSent
      setSales(prev => prev.map(s => {
        if (s.id !== routeItem.sale.id) return s;
        return {
          ...s,
          installments: s.installments.map(i => i.id === routeItem.id ? { ...i, pixSent: true } : i)
        };
      }));

      // Copy to clipboard
      await navigator.clipboard.writeText(pixCode);
      alert("Código PIX gerado e copiado para a área de transferência! Também enviado via WhatsApp.");

    } catch (e: any) {
      alert(e.response?.data?.error || "Erro ao gerar PIX");
    } finally {
      setIsGeneratingPix(null);
    }
  };

  const handleTriggerDailyAutomations = async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRouteItems = todayRoute.filter(item => !item.pixSent);
    
    const overdueItems = [];
    const reassignDays = mpConfig.autoReassignDays || 5;

    for (const sale of sales) {
      for (const inst of sale.installments) {
        if (inst.status !== 'PAID' && inst.dueDate < today) {
          const dueDateObj = new Date(inst.dueDate);
          const diffTime = Math.abs(new Date(today).getTime() - dueDateObj.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < reassignDays) {
            const client = clients.find(c => c.id === sale.clientId);
            overdueItems.push({ ...inst, client, sale });
          }
        }
      }
    }

    const allItems = [...todayRouteItems, ...overdueItems];

    if (allItems.length === 0) return alert("Nenhuma cobrança pendente de automação para hoje.");

    if (!confirm(`Deseja disparar cobranças OFICIAIS (Template) para ${allItems.length} clientes? (${todayRouteItems.length} de hoje e ${overdueItems.length} atrasados)`)) return;

    let successCount = 0;
    for (const item of allItems) {
      try {
        // Usamos o mesmo fluxo "Oficial" para cada item
        await handleSendCollectionTemplate(item);
        successCount++;
      } catch (e) {
        console.error("Error triggering official automation for", item.client?.name, e);
      }
    }
    alert(`Automação oficial concluída! ${successCount} notificações enviadas.`);
  };

  const handleSyncGoogleSheets = async () => {
    if (!mpConfig.googleSheetId || !mpConfig.googleApiKey) {
      return alert("Configure o ID da Planilha e a API Key nas Configurações primeiro.");
    }

    setIsSyncing(true);
    try {
      const res = await axios.post('/api/google-sheets/sync');
      const { sales: importedSales, clients: importedClients } = res.data;

      if (importedSales.length === 0) {
        alert("Nenhuma venda com condição 'crediario' encontrada na planilha.");
        return;
      }

      // Merge clients
      setClients(prev => {
        const newClients = [...prev];
        importedClients.forEach((ic: any) => {
          if (!newClients.find(c => c.id === ic.id)) {
            newClients.push(ic);
          }
        });
        return newClients;
      });

      // Merge sales (avoid duplicates by ID)
      setSales(prev => {
        const newSales = [...prev];
        importedSales.forEach((is: any) => {
          if (!newSales.find(s => s.id === is.id)) {
            // Generate installments for imported sale
            const installmentValue = (is.totalAmount - is.downPayment) / is.installmentsCount;
            const installments = Array.from({ length: is.installmentsCount }, (_, i) => {
              const dueDate = new Date(is.date);
              dueDate.setDate(dueDate.getDate() + (i + 1) * 30);
              return {
                id: `inst-${is.id}-${i + 1}`,
                saleId: is.id,
                number: i + 1,
                dueDate: dueDate.toISOString().split('T')[0],
                amount: installmentValue,
                paidAmount: 0,
                status: 'PENDING' as any
              };
            });
            newSales.push({ ...is, installments });
          }
        });
        return newSales;
      });

      alert(`${importedSales.length} vendas importadas com sucesso!`);
    } catch (e: any) {
      alert(e.response?.data?.error || "Erro ao sincronizar com Google Sheets");
    } finally {
      setIsSyncing(false);
    }
  };

  const getSaleOutstandingBalance = (sale: Sale) => {
    const totalPaid = (sale.downPayment || 0) + sale.installments.reduce((acc, inst) => acc + inst.paidAmount, 0);
    return sale.totalAmount - totalPaid;
  };

  const getClientFinancialSummary = (clientId: string) => {
    const clientSales = sales.filter(s => s.clientId === clientId);
    const today = new Date().toISOString().split('T')[0];
    let totalBalance = 0;
    let overdueAmount = 0;
    clientSales.forEach(s => {
      totalBalance += getSaleOutstandingBalance(s);
      s.installments.forEach(i => {
        if (i.dueDate < today && i.status !== 'PAID') {
          overdueAmount += (i.amount - i.paidAmount);
        }
      });
    });
    return { totalBalance, overdueAmount, saleCount: clientSales.length, isOverdue: overdueAmount > 0 };
  };

  const ClientDetailsModal = ({ client }: { client: Client }) => {
    const summary = getClientFinancialSummary(client.id);
    const score = getClientScore(client.id);
    const clientSales = sales.filter(s => s.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date));
    const referral = clients.find(c => c.id === client.referralClientId);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
        <div className="bg-slate-50 rounded-[40px] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl scale-in-center border border-slate-200">
          <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Contact size={24} /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{client.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1"><Phone size={12} /> {client.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score de Pontualidade</p>
                <p className={`text-xl font-black ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-orange-500' : 'text-red-600'}`}>{score}%</p>
              </div>
              <button onClick={() => setSelectedClientForDetails(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={28} className="text-slate-400" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><DollarSign size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dívida Total</p><p className="text-xl font-black text-slate-900">{formatCurrency(summary.totalBalance)}</p></div>
              </div>
              <div className={`p-6 rounded-3xl border shadow-sm flex items-center gap-4 ${summary.isOverdue ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <div className={`p-4 rounded-2xl ${summary.isOverdue ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{summary.isOverdue ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}</div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Atraso</p><p className={`text-xl font-black ${summary.isOverdue ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(summary.overdueAmount)}</p></div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl text-slate-400"><FileText size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fichas</p><p className="text-xl font-black text-slate-900">{summary.saleCount}</p></div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-orange-50 p-4 rounded-2xl text-orange-600"><MapPin size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bairro</p><p className="text-sm font-black text-slate-900 uppercase">{client.neighborhood || 'N/A'}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-4"><Info size={18} /> Dados Cadastrais</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF</p><p className="text-sm font-bold">{client.cpf}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RG</p><p className="text-sm font-bold">{client.rg}</p></div>
                  <div className="col-span-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</p><p className="text-sm font-bold">{client.address}, {client.city} - {client.state}</p></div>
                  {referral && <div className="col-span-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indicado por</p><p className="text-sm font-black text-blue-600 uppercase cursor-pointer" onClick={() => setSelectedClientForDetails(referral)}>{referral.name}</p></div>}
                  {client.coordinates && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização (Coordenadas)</p>
                      <a href={`https://www.google.com/maps?q=${client.coordinates.lat},${client.coordinates.lng}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline mt-1">
                        <MapPin size={12} /> Ver no Google Maps ({client.coordinates.lat}, {client.coordinates.lng})
                      </a>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  {client.rgImage && <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">RG</p><img src={client.rgImage} alt="RG" className="w-full h-24 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" /></div>}
                  {client.cpfImage && <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">CPF</p><img src={client.cpfImage} alt="CPF" className="w-full h-24 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" /></div>}
                  {client.utilityBillImage && <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Conta Luz</p><img src={client.utilityBillImage} alt="Conta Luz" className="w-full h-24 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" /></div>}
                  {client.housePhoto && <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Foto Casa</p><img src={client.housePhoto} alt="Foto Casa" className="w-full h-24 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" /></div>}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><History size={18} /> Histórico de Fichas</h4>
                <div className="space-y-12 pb-12">
                  {clientSales.length > 0 ? clientSales.map(sale => (
                    <div key={sale.id} className="relative group">
                      <div className="absolute -top-6 left-0 flex items-center gap-2">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-lg">FICHA Nº {sale.id}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(sale.date)}</span>
                      </div>
                      <div className="flex justify-center scale-95 origin-top group-hover:scale-100 transition-transform">
                        <ReceiptForm
                          saleId={sale.id}
                          clientName={client.name.toUpperCase()}
                          date={sale.date}
                          items={sale.items}
                          totalAmount={sale.totalAmount}
                          downPayment={sale.downPayment}
                          installments={sale.installments}
                        />
                      </div>
                    </div>
                  )) : <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest italic">Nenhuma ficha cadastrada</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  const MasterInstallments = () => {
    const allInstallments = sales.flatMap(s => s.installments.map(i => ({ ...i, sale: s, client: clients.find(c => c.id === s.clientId) })));
    const today = new Date().toISOString().split('T')[0];

    const filtered = allInstallments.filter(inst => {
      if (masterInstallmentsFilter.status === 'TODAY' && inst.dueDate !== today) return false;
      if (masterInstallmentsFilter.status === 'OVERDUE' && (inst.dueDate >= today || inst.status === 'PAID')) return false;
      if (masterInstallmentsFilter.status === 'PAID' && inst.status !== 'PAID') return false;
      if (masterInstallmentsFilter.status === 'PENDING' && inst.status !== 'PENDING') return false;
      if (masterInstallmentsFilter.collectorId !== 'ALL' && inst.sale.collectorId !== masterInstallmentsFilter.collectorId) return false;
      if (masterInstallmentsFilter.search) {
        const search = masterInstallmentsFilter.search.toLowerCase();
        return inst.client?.name.toLowerCase().includes(search) || inst.sale.id.toLowerCase().includes(search);
      }
      return true;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h2 className="text-xl font-black uppercase tracking-tight">Gestão de Parcelas</h2><p className="text-sm text-gray-400 font-bold">{filtered.length} parcelas encontradas</p></div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'TODAY', 'OVERDUE', 'PENDING', 'PAID'].map(status => (
                <button
                  key={status}
                  onClick={() => setMasterInstallmentsFilter({ ...masterInstallmentsFilter, status: status as any })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${masterInstallmentsFilter.status === status ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  {status === 'ALL' ? 'Todas' : status === 'TODAY' ? 'Hoje' : status === 'OVERDUE' ? 'Atrasadas' : status === 'PENDING' ? 'Pendentes' : 'Pagas'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar cliente ou venda..." value={masterInstallmentsFilter.search} onChange={e => setMasterInstallmentsFilter({ ...masterInstallmentsFilter, search: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <select value={masterInstallmentsFilter.collectorId} onChange={e => setMasterInstallmentsFilter({ ...masterInstallmentsFilter, collectorId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-600 uppercase">
              <option value="ALL">Todos os Cobradores</option>
              {collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Pagto</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venda</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobrador</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-50">{filtered.map((inst) => (<tr key={inst.id} className="hover:bg-slate-50/50"><td className="px-6 py-5 text-sm font-bold text-slate-600">{formatDate(inst.dueDate)}</td><td className="px-6 py-5 text-sm font-bold text-slate-600">{inst.status === 'PAID' && inst.paymentDate ? formatDate(inst.paymentDate) : '-'}</td><td className="px-6 py-5 text-sm font-black text-slate-800 uppercase">{inst.client?.name}</td><td className="px-6 py-5 text-sm font-bold text-slate-400">#{inst.sale.id} (P{inst.number})</td><td className="px-6 py-5 text-sm font-black text-blue-600">{formatCurrency(inst.amount)}</td><td className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">{collectors.find(c => c.id === inst.sale.collectorId)?.name}</td><td className="px-6 py-5"><span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${inst.status === 'PAID' ? 'bg-green-100 text-green-600' : inst.dueDate < today ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{inst.status === 'PAID' ? 'Pago' : inst.dueDate < today ? 'Atrasado' : 'Pendente'}</span></td><td className="px-6 py-5 text-right flex justify-end gap-2">{inst.status !== 'PAID' && (<button onClick={() => handleGeneratePix(inst)} disabled={isGeneratingPix === inst.id} className={`p-2 rounded-lg transition-all ${isGeneratingPix === inst.id ? 'text-slate-300 bg-slate-50' : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'}`} title="Copiar PIX e Enviar Whats">{isGeneratingPix === inst.id ? <RefreshCw size={18} className="animate-spin" /> : <QrCode size={18} />}</button>)}<button onClick={() => setSelectedSaleForView(inst.sale)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye size={18} /></button><button onClick={() => { setSelectedInstallment(inst); setIsPaymentModalOpen(true); }} className="p-2 text-slate-300 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"><DollarSign size={18} /></button></td></tr>))}</tbody></table></div>
        </div>
      </div>
    );
  };

  const DeliveryModule = () => {
    const deliverySales = sales.filter(s => {
      if (deliveryFilter.status !== 'ALL' && s.status !== deliveryFilter.status) return false;
      if (deliveryFilter.deliveryPersonId !== 'ALL' && s.deliveryPersonId !== deliveryFilter.deliveryPersonId) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
    const deliveryPeople = collectors.filter(c => c.role === Role.DELIVERY || c.role === Role.MASTER);
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h2 className="text-xl font-black uppercase tracking-tight">Módulo de Entregas</h2><p className="text-sm text-gray-400 font-bold">{deliverySales.length} entregas filtradas</p></div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'PENDING', 'DELIVERED', 'CANCELLED'].map(status => (
                <button key={status} onClick={() => setDeliveryFilter({ ...deliveryFilter, status: status as any })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryFilter.status === status ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{status === 'ALL' ? 'Todas' : status === 'PENDING' ? 'Pendentes' : status === 'DELIVERED' ? 'Entregues' : 'Canceladas'}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={deliveryFilter.deliveryPersonId} onChange={e => setDeliveryFilter({ ...deliveryFilter, deliveryPersonId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-600 uppercase">
              <option value="ALL">Todos os Entregadores</option>
              {deliveryPeople.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliverySales.map(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            return (
              <div key={sale.id} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all group">
                <div className="flex justify-between items-start mb-6"><div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Truck size={24} /></div><span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${sale.status === 'DELIVERED' ? 'bg-green-100 text-green-600' : sale.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>{sale.status === 'DELIVERED' ? 'Entregue' : sale.status === 'PENDING' ? 'Pendente' : 'Cancelada'}</span></div>
                <div className="space-y-4">
                  <div><h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter truncate">{client?.name}</h3><p className="text-sm text-slate-500 font-bold flex items-center gap-1"><MapPin size={12} /> {client?.address}</p><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{client?.neighborhood}</p></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens do Pedido</p><div className="space-y-1">{sale.items.map((item, idx) => (<p key={idx} className="text-xs font-bold text-slate-700">{item.quantity}x {item.description}</p>))}</div></div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entregador</p><p className="text-xs font-black text-slate-700 uppercase">{deliveryPeople.find(p => p.id === sale.deliveryPersonId)?.name || 'Não atribuído'}</p></div>
                    <div className="flex gap-2">
                      {sale.status === 'PENDING' && <button onClick={() => handleUpdateSaleStatus(sale.id, 'DELIVERED')} className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg transition-all active:scale-95"><Check size={20} /></button>}
                      <button onClick={() => setSelectedSaleForView(sale)} className="p-3 bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><Eye size={20} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const RouteList = ({ items, title }: { items: any[], title: string }) => {
    const groupedByNeighborhood = items.reduce((acc: any, item) => {
      const neighborhood = item.client?.neighborhood || 'Sem Bairro';
      if (!acc[neighborhood]) acc[neighborhood] = [];
      acc[neighborhood].push(item);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-lg ${title === 'Cobranças/Coletas' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
              {title === 'Cobranças/Coletas' ? <Contact size={24} /> : <RouteIcon size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h2>
              <p className="text-sm font-bold text-slate-400">{items.length} clientes na lista</p>
            </div>
          </div>
        </div>

        {Object.keys(groupedByNeighborhood).length > 0 ? Object.keys(groupedByNeighborhood).sort().map(neighborhood => (
          <div key={neighborhood} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-100 px-4 py-1 rounded-full">{neighborhood}</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {groupedByNeighborhood[neighborhood].map((routeItem: any) => (
                <div key={routeItem.id} className="bg-white rounded-3xl p-6 shadow-xl border-l-8 border-blue-600 flex flex-col md:flex-row gap-6 hover:shadow-2xl transition-all group">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div><h3 onClick={() => setSelectedClientForDetails(routeItem.client)} className="text-xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-blue-600 transition-colors cursor-pointer">{routeItem.client?.name}</h3><p className="text-sm text-slate-500 font-bold flex items-center gap-1"><MapPin size={12} /> {routeItem.client?.address}</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedSaleForView(routeItem.sale)} className="p-3 bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Eye size={20} /></button>
                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">#{routeItem.sale.id}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Parcela</p><p className="text-sm font-black text-slate-700">{routeItem.number}/{routeItem.sale.installmentsCount}</p></div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimento</p><p className="text-sm font-black text-slate-700">{formatDate(routeItem.dueDate)}</p></div>
                      <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-center"><p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Cobrar</p><p className="text-sm font-black text-blue-600">{formatCurrency(routeItem.amount - routeItem.paidAmount)}</p></div>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-3 justify-end shrink-0">
                    <button
                      onClick={() => handleGeneratePix(routeItem)}
                      disabled={isGeneratingPix === routeItem.id}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 ${isGeneratingPix === routeItem.id ? 'bg-slate-300' : 'bg-slate-900'} text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-800 shadow-xl transition-all`}
                    >
                      {isGeneratingPix === routeItem.id ? <RefreshCw size={20} className="animate-spin" /> : <QrCode size={20} />}
                      {routeItem.pixSent ? 'PIX ENVIADO' : 'PIX'}
                    </button>
                    <button onClick={() => { setSelectedInstallment(routeItem); setIsPaymentModalOpen(true); const nextDate = new Date(routeItem.dueDate); nextDate.setDate(nextDate.getDate() + 30); setNextVisitDate(nextDate.toISOString().split('T')[0]); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl transition-all"><DollarSign size={20} /> Receber</button>
                    <button onClick={() => handleReschedule(routeItem, routeItem.client!)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 border-2 border-orange-100 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-orange-50 transition-all"><Calendar size={20} /> Reagendar</button>
                    <div className="flex gap-2">
                      <button 
                        title="Enviar Cobrança Oficial (Template)"
                        onClick={() => handleSendCollectionTemplate(routeItem)} 
                        className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg flex items-center gap-2"
                      >
                        <Zap size={20} />
                        <span className="hidden md:inline font-black text-[10px] uppercase tracking-widest">Oficial</span>
                      </button>
                      <button 
                        title="Mensagem Manual (Texto Livre)"
                        onClick={() => handleSendWhatsApp(routeItem.client?.phone!, `Credi Fácil: Olá ${routeItem.client?.name}, estou chegando para sua parcela.`)} 
                        className="p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 shadow-lg"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-[40vh] text-slate-300">
            <UserCheck size={64} className="mb-4 opacity-10" />
            <h3 className="text-lg font-black uppercase tracking-widest">Lista Vazia</h3>
          </div>
        )}
      </div>
    );
  };

  const TaskPanel = () => {
    const handleToggleTask = async (task: Task) => {
      try {
        const updatedTask = { ...task, status: (task.status === 'PENDING' ? 'COMPLETED' : 'PENDING') as any };
        await dataService.saveTask(updatedTask);
        const updatedTasks = await dataService.getTasks();
        setTasks(updatedTasks);
      } catch (err) {
        console.error("Error toggling task", err);
      }
    };

    const handleDeleteTask = async (taskId: string) => {
      if (!confirm("Deseja excluir esta tarefa?")) return;
      try {
        await dataService.deleteTask(taskId);
        const updatedTasks = await dataService.getTasks();
        setTasks(updatedTasks);
      } catch (err) {
        console.error("Error deleting task", err);
      }
    };

    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Tarefas Ativas</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {tasks.length > 0 ? tasks.map(task => (
              <div key={task.id} className={`p-4 rounded-2xl border transition-all ${task.status === 'COMPLETED' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className={`text-sm font-black uppercase tracking-tight ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</h4>
                    <p className={`text-xs mt-1 ${task.status === 'COMPLETED' ? 'text-slate-400' : 'text-slate-500'}`}>{task.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-400 uppercase">{formatDate(task.createdAt)}</span>
                      {task.relatedId && <span className="text-[8px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">Venda #{task.relatedId}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleTask(task)} className={`p-2 rounded-xl transition-all ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                      <CheckCircle size={18} />
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-50">
                <Layers size={48} className="mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">Nenhuma tarefa ativa</p>
              </div>
            )}
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <button 
              onClick={() => {
                const title = prompt("Título da Tarefa:");
                const desc = prompt("Descrição:");
                if (title) {
                  const payload: Partial<Task> = { 
                    title, 
                    description: desc || '', 
                    userId: currentUser?.id, 
                    status: 'PENDING' 
                  };
                  dataService.saveTask(payload)
                    .then(() => dataService.getTasks())
                    .then(t => setTasks(t));
                }
              }}
              className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl"
            >
              Nova Tarefa Avulsa
            </button>
          </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-md p-10 shadow-2xl overflow-hidden relative border border-slate-100 scale-in-center">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Lock size={120} /></div>
          <div className="mb-10"><div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200"><ReceiptText size={32} className="text-white" /></div><h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Junior Cestas e Produto</h1><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Gestão de Cobranças v2.0</p></div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em] px-1">Usuário</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300"><UserIcon size={18} /></div><input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="Seu usuário" required /></div></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em] px-1">Senha</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300"><Lock size={18} /></div><input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="••••••••" required /></div></div>
            {loginError && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 flex items-center gap-3"><AlertCircle size={16} />{loginError}</div>}
            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-95 mt-4">Entrar no Sistema</button>
          </form>
          <div className="mt-12 pt-8 border-t border-slate-100 text-center"><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Acesso restrito a pessoal autorizado</p></div>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/cobranca') {
    return (
      <>
        <ClientPortal sales={sales} clients={clients} />
        {printData && (
          <ThermalReceipt
            sale={printData.sale}
            client={printData.client}
            installment={printData.installment}
            type={printData.type}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Layout activeRole={role} currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
        {role === Role.MASTER && activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="bg-blue-100 p-4 rounded-lg text-blue-600"><DollarSign size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Total Geral</p><p className="text-2xl font-bold">{formatCurrency(stats.totalReceivable)}</p></div></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="bg-green-100 p-4 rounded-lg text-green-600"><Wallet size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Saldo Recebido</p><p className="text-2xl font-bold">{formatCurrency(stats.totalCollected)}</p></div></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="bg-orange-100 p-4 rounded-lg text-orange-600"><Calendar size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Pendências Atuais</p><p className="text-2xl font-bold">{stats.pendingCount}</p></div></div>
            </div>

            {/* Alertas de Estoque Baixo */}
            {role === Role.MASTER && products.filter(p => p.stockControlEnabled && p.stockQuantity < 5).length > 0 && (
              <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex flex-col gap-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={20} />
                  <h3 className="font-black uppercase tracking-tight text-sm">Alerta: Estoque Baixo</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {products.filter(p => p.stockControlEnabled && p.stockQuantity < 5).map(p => (
                    <div key={p.id} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 text-xs font-bold text-red-700">
                      {p.name}: <span className="font-black">{p.stockQuantity}</span> un
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold mb-6">Receita por Cobrador</h3><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.dataByCollector}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="valor" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="text-lg font-bold mb-6 flex items-center gap-2"><FileText className="text-slate-400" />Fichas Ativas</h3><div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">{[...sales].reverse().map((sale) => { const client = clients.find(c => c.id === sale.clientId); return (<div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group"><div><p className="font-bold text-sm">{client?.name}</p><p className="text-[10px] text-gray-400">Nº {sale.id} • {sale.installmentsCount}x</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-sm font-bold">{formatCurrency(sale.totalAmount)}</p><p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest text-[8px]">Master</p></div><button onClick={() => setSelectedSaleForView(sale)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"><Eye size={20} /></button></div></div>); })}</div></div>
            </div>
          </div>
        )}

        {role === Role.MASTER && activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div><h2 className="text-xl font-black uppercase tracking-tight">Gestão de Clientes</h2><p className="text-sm text-gray-400 font-bold">Total de {clients.length} cadastrados</p></div>
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                <div className="relative flex-1 sm:w-64"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar por nome ou CPF..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" /></div>
                <button onClick={() => setIsAddClientModalOpen(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all active:scale-95"><Plus size={20} /> Novo Cliente</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map(c => {
                const clientSummary = getClientFinancialSummary(c.id);
                return (
                  <div key={c.id} onClick={() => setSelectedClientForDetails(c)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                    {clientSummary.isOverdue && <div className="absolute top-0 right-0 p-2 bg-red-600 text-white rounded-bl-xl shadow-lg animate-pulse"><AlertTriangle size={16} /></div>}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${clientSummary.isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><Contact size={24} /></div>
                      <div className="text-right"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fichas</span><span className="text-lg font-black text-slate-900">{clientSummary.saleCount}</span></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">{c.name}</h3>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><Phone size={14} className="text-slate-300" /> {c.phone}</p>
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><MapPin size={14} className="text-slate-300" /> {c.address}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-4">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${clientSummary.isOverdue ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{clientSummary.isOverdue ? 'Em Atraso' : 'Em Dia'}</span>
                          <span className="text-xs font-black text-slate-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">Detalhes <ChevronRight size={14} /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div><h2 className="text-xl font-black uppercase tracking-tight">Gestão de Vendas</h2><p className="text-sm text-gray-400 font-bold">{filteredSales.length} vendas registradas</p></div>
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                <div className="relative flex-1 sm:w-64"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar por cliente ou ID..." value={saleSearch} onChange={e => setSaleSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" /></div>
                <button
                  onClick={handleSyncGoogleSheets}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 bg-green-100 text-green-600 px-6 py-3 rounded-xl font-bold hover:bg-green-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                  Sincronizar Planilha
                </button>
                <button onClick={() => setIsAddSaleModalOpen(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all active:scale-95"><Plus size={20} /> Lançar Venda</button>
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobrador</th><th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredSales.length > 0 ? filteredSales.map((sale) => {
                const client = clients.find(c => c.id === sale.clientId);
                const collector = collectors.find(c => c.id === sale.collectorId);
                const balance = getSaleOutstandingBalance(sale);
                return (<tr key={sale.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-5 text-sm font-bold text-slate-600">#{sale.id}</td>
                  <td className="px-6 py-5 text-sm font-black text-slate-800 uppercase cursor-pointer hover:text-blue-600" onClick={() => setSelectedClientForDetails(client || null)}>{client?.name}</td>
                  <td className="px-6 py-5 text-sm font-bold">{formatCurrency(sale.totalAmount)} <span className="text-[8px] bg-slate-100 px-1 rounded">{sale.tokenType}</span></td>
                  <td className="px-6 py-5 text-sm font-black text-blue-600">{formatCurrency(balance)}</td>
                  <td className="px-6 py-5">
                    {role === Role.MASTER ? (
                      <select
                        value={sale.collectorId}
                        onChange={(e) => handleReassignSale(sale.id, e.target.value)}
                        className="text-[10px] font-bold text-slate-600 uppercase bg-transparent border-none outline-none cursor-pointer hover:text-blue-600"
                      >
                        {collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{collector?.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right"><button onClick={() => setSelectedSaleForView(sale)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Eye size={20} /></button></td>
                </tr>);
              }) : (<tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 italic">Nenhuma venda encontrada</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {activeTab === 'route' && <RouteList items={todayRoute} title="Rota de Hoje" />}
        {activeTab === 'future' && <RouteList items={futureRoute} title="Cobranças Futuras" />}
        {activeTab === 'master_installments' && <MasterInstallments />}
        {activeTab === 'delivery' && <DeliveryModule />}
        {activeTab === 'chat' && (
          <Chat 
            clients={clients} 
            whatsappConfig={{ 
              whatsappApiToken: mpConfig.whatsappApiToken, 
              whatsappPhoneNumberId: mpConfig.whatsappPhoneNumberId 
            }} 
          />
        )}

        {role === Role.MASTER && activeTab === 'collectors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div><h2 className="text-xl font-black uppercase tracking-tight">Gestão de Equipe</h2><p className="text-sm text-gray-400 font-bold">Gerencie sua equipe de campo (Cobradores, Entregadores e Montadores)</p></div>
              <button onClick={() => { setEditingCollectorId(null); setNewCollector({ name: '', phone: '', username: '', password: '', role: Role.COLLECTOR, active: true, saleCommissionRate: 0, collectionCommissionRate: 0 }); setIsAddCollectorModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all active:scale-95"><UserPlus size={20} /> Novo Colaborador</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{collectors.map(c => (
              <div key={c.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${c.active === false ? 'border-red-100 bg-red-50/10 opacity-75' : 'border-gray-100'} flex flex-col gap-4 relative group`}>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => handleEditCollector(c)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => handleToggleCollectorStatus(c.id)} className={`p-2 rounded-lg transition-all ${c.active === false ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-red-400 bg-red-50 hover:bg-red-100'}`}><Power size={16} /></button>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full transition-colors ${c.active === false ? 'bg-red-100 text-red-400' : 'bg-slate-100 text-slate-400'}`}>
                    {c.role === Role.DELIVERY ? <Truck size={24} /> : c.role === Role.ASSEMBLER ? <Zap size={24} /> : <UserCheck size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{c.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-widest">{c.role}</span>
                      <p className="text-xs font-bold text-slate-400">{c.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/50 p-3 rounded-xl border border-slate-100 flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span><span className={`transition-all ${c.active === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} text-[9px] font-black px-2 py-0.5 rounded-lg uppercase`}>{c.active === false ? 'Inativo' : 'Ativo'}</span></div>
              </div>
            ))}</div>
          </div>
        )}

        {role === Role.MASTER && activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Settings size={24} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Configurações do Sistema</h2><p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Integração Mercado Pago e Automação</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><CreditCard size={18} /> Mercado Pago (PF)</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Access Token Pessoa Física</label>
                    <input type="password" value={mpConfig.pfToken} onChange={e => setMpConfig({ ...mpConfig, pfToken: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="APP_USR-..." />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><CreditCard size={18} /> Mercado Pago (PJ)</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Access Token Pessoa Jurídica</label>
                    <input type="password" value={mpConfig.pjToken} onChange={e => setMpConfig({ ...mpConfig, pjToken: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="APP_USR-..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Limite para PJ (R$)</label>
                    <input type="number" value={mpConfig.pjThreshold} onChange={e => setMpConfig({ ...mpConfig, pjThreshold: parseInt(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[10px] text-slate-400 mt-1 italic">Vendas até este valor acumulado serão direcionadas para o token PJ.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><CreditCard size={18} /> InfinityPay (PJ)</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" id="inf-enabled" checked={mpConfig.infinityPayEnabled} onChange={e => setMpConfig({ ...mpConfig, infinityPayEnabled: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
                    <label htmlFor="inf-enabled" className="text-sm font-black text-slate-600 uppercase tracking-widest cursor-pointer">Ativar InfinityPay</label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Access Token InfinityPay</label>
                    <input type="password" value={mpConfig.infinityPayToken} onChange={e => setMpConfig({ ...mpConfig, infinityPayToken: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Bearer Token..." />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Settings size={18} /> Rateio de Recebimento</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Modo de Distribuição</label>
                    <select value={mpConfig.allocationMode} onChange={e => setMpConfig({ ...mpConfig, allocationMode: e.target.value as any })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                      <option value="MP_ONLY">Apenas Mercado Pago (PJ até limite, depois PF)</option>
                      <option value="INFINITY_ONLY">Apenas InfinityPay</option>
                      <option value="SPLIT_BY_THRESHOLD">Híbrido (PJ até limite, depois InfinityPay/PF)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Send size={18} /> WhatsApp Business API (Oficial)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">API Token (Permanente)</label>
                      <input type="password" value={mpConfig.whatsappApiToken} onChange={e => setMpConfig({ ...mpConfig, whatsappApiToken: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="EAAB..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">ID do Número de Telefone</label>
                      <input type="text" value={mpConfig.whatsappPhoneNumberId} onChange={e => setMpConfig({ ...mpConfig, whatsappPhoneNumberId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="109..." />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!mpConfig.whatsappApiToken || !mpConfig.whatsappPhoneNumberId) return alert("Configure os campos acima primeiro.");
                      const testPhone = prompt("Digite seu número com DDD (ex: 11988887777):");
                      if (!testPhone) return;
                      try {
                        // Tentar o template configurado no portal como Inglês (en)
                        // Alterado para pt_BR e melhorado tratamento de erro
                        await axios.post('/api/send-whatsapp', { 
                          phone: testPhone, 
                          template: { 
                            name: "aviso_de_vencimento", 
                            language: { code: "pt_BR" },
                            components: [
                              {
                                type: "body",
                                parameters: [
                                  { type: "text", text: "TESTE" },
                                  { type: "text", text: "0000" },
                                  { type: "text", text: "0,00" },
                                  { type: "text", text: "PIX_TESTE" }
                                ]
                              }
                            ]
                          } 
                        });
                        alert("Sucesso! Template oficial 'aviso_de_vencimento' enviado em Português.");
                      } catch (e: any) {
                        const errorData = e.response?.data;
                        const errorMsg = errorData?.message || errorData?.error || e.message;
                        alert("Falha no teste: " + errorMsg + "\n\nVerifique se o Template 'aviso_de_vencimento' está ativo no idioma Português (pt_BR) no seu painel da Meta.");
                        
                        // Fallback de diagnóstico: tentar o hello_world
                        if (confirm("O template principal falhou. Deseja tentar o 'hello_world' apenas para confirmar se o TOKEN e o ID estão corretos?")) {
                           try {
                             await axios.post('/api/send-whatsapp', { 
                               phone: testPhone, 
                               template: { name: "hello_world", language: { code: "en_US" } } 
                             });
                             alert("O Token e o ID do Telefone estão CORRETOS! O problema é apenas o nome ou idioma do template 'aviso_de_vencimento'. Verifique no painel da Meta.");
                           } catch (err: any) {
                             const errData = err.response?.data;
                             alert("O TOKEN ou ID também falharam: " + (errData?.message || err.message));
                           }
                        }
                      }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all"
                  >
                    Testar Conexão
                  </button>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Send size={18} /> Automação Externa (n8n/Webhook)</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">URL do Webhook N8N</label>
                    <input type="text" value={mpConfig.n8nWebhookUrl} onChange={e => setMpConfig({ ...mpConfig, n8nWebhookUrl: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://n8n.seu-servidor.com/webhook/..." />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Send size={18} /> Google Apps Script (Drive Bridge)</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">URL do Apps Script</label>
                    <input type="text" value={mpConfig.appsScriptUrl} onChange={e => setMpConfig({ ...mpConfig, appsScriptUrl: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://script.google.com/macros/s/..." />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><MessageCircle size={18} /> Automação WhatsApp</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="wa-auto-reply" checked={mpConfig.whatsappAutoReplyEnabled} onChange={e => setMpConfig({ ...mpConfig, whatsappAutoReplyEnabled: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
                      <label htmlFor="wa-auto-reply" className="text-sm font-black text-slate-600 uppercase tracking-widest cursor-pointer">Ativar Resposta Automática (24h)</label>
                    </div>
                    {mpConfig.whatsappAutoReplyEnabled && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Mensagem de Resposta</label>
                        <textarea value={mpConfig.whatsappAutoReplyMessage} onChange={e => setMpConfig({ ...mpConfig, whatsappAutoReplyMessage: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows={2} placeholder="Ex: Olá! Recebemos sua mensagem..." />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="wa-forward" checked={mpConfig.whatsappNotificationEnabled} onChange={e => setMpConfig({ ...mpConfig, whatsappNotificationEnabled: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
                      <label htmlFor="wa-forward" className="text-sm font-black text-slate-600 uppercase tracking-widest cursor-pointer">Encaminhar para Comercial</label>
                    </div>
                    {mpConfig.whatsappNotificationEnabled && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Número Comercial (DDD + Número)</label>
                        <input type="text" value={mpConfig.whatsappForwardingNumber} onChange={e => setMpConfig({ ...mpConfig, whatsappForwardingNumber: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="5521987530286" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><AlertTriangle size={18} /> Limite de Crédito</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" id="credit-limit-enabled" checked={mpConfig.creditLimitEnabled} onChange={e => setMpConfig({ ...mpConfig, creditLimitEnabled: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
                    <label htmlFor="credit-limit-enabled" className="text-sm font-black text-slate-600 uppercase tracking-widest cursor-pointer">Ativar Controle de Limite</label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Valor Limite (R$)</label>
                    <input type="number" value={mpConfig.creditLimitValue} onChange={e => setMpConfig({ ...mpConfig, creditLimitValue: parseFloat(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 5000" />
                    <p className="text-[10px] text-slate-400 mt-1 italic">Vendas acima deste valor gerarão uma tarefa de autorização para o Master.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><RefreshCw size={18} /> Automação de Cobrança</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Dias p/ Reatribuição</label>
                      <input type="number" value={mpConfig.autoReassignDays} onChange={e => setMpConfig({ ...mpConfig, autoReassignDays: parseInt(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Validade PIX (Dias)</label>
                      <input type="number" value={mpConfig.pixExpirationDays} onChange={e => setMpConfig({ ...mpConfig, pixExpirationDays: parseInt(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">O PIX gerado terá validade de X dias. Após X dias de atraso, a venda é reatribuída.</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><FileSpreadsheet size={18} /> Google Sheets (AppSheet)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">ID da Planilha</label>
                      <input type="text" value={mpConfig.googleSheetId} onChange={e => setMpConfig({ ...mpConfig, googleSheetId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="1abc123..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Google API Key</label>
                      <input type="password" value={mpConfig.googleApiKey} onChange={e => setMpConfig({ ...mpConfig, googleApiKey: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="AIza..." />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">O sistema importará linhas onde a coluna 'Condicao' seja 'crediario'.</p>
                </div>
              </div>

              <div className="mt-12 flex justify-between items-center">
                <button onClick={handleTriggerDailyAutomations} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95">
                  <Zap size={18} /> Disparar Automação Oficial (Templates)
                </button>
                <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95">Salvar Configurações</button>
              </div>
            </div>
          </div>
        )}

        {isAddSaleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"><div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl scale-in-center overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black uppercase tracking-tight">Nova Venda (Ficha)</h3><button onClick={() => setIsAddSaleModalOpen(false)}><X size={24} className="text-slate-400" /></button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><div className="md:col-span-2"><div className="flex items-end gap-2"><div className="flex-1"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cliente</label><select value={newSale.clientId} onChange={(e) => setNewSale({ ...newSale, clientId: e.target.value })} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-gray-50 outline-none"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button onClick={() => setIsAddClientModalOpen(true)} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95"><Plus size={24} /></button></div></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Entrada (PGL)</label><input type="number" value={newSale.downPayment} onChange={(e) => setNewSale({ ...newSale, downPayment: e.target.value })} placeholder="R$ 0,00" className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500" /></div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Produto (Opcional)</label>
              <select 
                value={newSale.productId} 
                onChange={(e) => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setNewSale(prev => ({ 
                    ...prev, 
                    productId: e.target.value,
                    description: p ? p.name : prev.description,
                    totalAmount: p ? p.price.toString() : prev.totalAmount
                  }));
                }} 
                className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500"
              >
                <option value="">Selecione um produto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Total da Venda</label>
              <input type="number" value={newSale.totalAmount} onChange={(e) => setNewSale({ ...newSale, totalAmount: e.target.value })} placeholder="R$ 0,00" className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição do Serviço/Objeto (Personalizada)</label>
              <input type="text" value={newSale.description} onChange={(e) => setNewSale({ ...newSale, description: e.target.value })} placeholder="Ex: Móveis" className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500" />
            </div>
            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data 1º Vencimento</label><input type="date" value={newSale.firstDueDate} onChange={(e) => setNewSale({ ...newSale, firstDueDate: e.target.value })} className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500 font-bold" /></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Parcelas</label><input type="number" value={newSale.installmentsCount} onChange={(e) => setNewSale({ ...newSale, installmentsCount: e.target.value })} className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500" /></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cobrador</label><select value={newSale.collectorId} onChange={(e) => setNewSale({ ...newSale, collectorId: e.target.value })} disabled={role === Role.COLLECTOR} className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500">{collectors.filter(c => c.active !== false).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Entregador</label>
                  <select 
                    value={newSale.deliveryPersonId} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSale(prev => ({ 
                        ...prev, 
                        deliveryPersonId: val,
                        // Preferência: Se selecionou entregador e o cobrador ainda é a loja, assume o entregador
                        collectorId: (prev.collectorId === 'loja' || !prev.collectorId) ? val : prev.collectorId 
                      }));
                    }} 
                    className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {collectors.filter(c => (c.role === Role.DELIVERY || c.role === Role.MASTER) && c.active !== false).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              <div className="md:col-span-1 flex items-center gap-2 pt-6">
                <input type="checkbox" id="is-assembly" checked={newSale.isAssembly} onChange={e => setNewSale({ ...newSale, isAssembly: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
                <label htmlFor="is-assembly" className="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer">Montagem?</label>
              </div>
              {newSale.isAssembly && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Montador</label>
                  <select value={newSale.assemblerId} onChange={(e) => setNewSale({ ...newSale, assemblerId: e.target.value })} className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {collectors.filter(c => (c.role === Role.ASSEMBLER || c.role === Role.MASTER) && c.active !== false).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Observações (Cria tarefa)</label>
                <textarea value={newSale.observations} onChange={e => setNewSale({ ...newSale, observations: e.target.value })} className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none shadow-sm focus:ring-blue-500 h-20" placeholder="Digite observações que serão convertidas em tarefas..."></textarea>
              </div>
            </div><button onClick={handleSaveSale} className="w-full py-4 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg">Confirmar Lançamento</button></div></div>
        )}

        {activeTab === 'tasks' && <TaskPanel />}

        {activeTab === 'assembler' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Minhas Montagens</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gerencie suas ordens de montagem</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {sales.filter(s => s.isAssembly && s.assemblerId === currentUser?.id).map(sale => (
                <div key={sale.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase mb-2 inline-block">Venda #{sale.id}</span>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{clients.find(c => c.id === sale.clientId)?.name || 'Cliente'}</h3>
                    <p className="text-sm text-slate-500">{sale.description}</p>
                    <p className="text-xs text-slate-400 mt-2 italic">{sale.observations}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Valor da Montagem:</span>
                      <input 
                        type="number" 
                        value={sale.assemblyValue || ''} 
                        onChange={async (e) => {
                          const val = Number(e.target.value);
                          const updatedSale = { ...sale, assemblyValue: val };
                          await dataService.saveSale(updatedSale);
                          setSales(await dataService.getSales());
                        }}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-right"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline px-2 py-1">Ver Detalhes</button>
                  </div>
                </div>
              ))}
              {sales.filter(s => s.isAssembly && s.assemblerId === currentUser?.id).length === 0 && (
                <div className="text-center py-20 text-slate-300 opacity-50 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Truck size={48} className="mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest">Nenhuma montagem pendente</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'movements' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6 print:hidden">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <div className="flex-1 space-y-6">
                  <div className="flex flex-col gap-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipo de Relatório</label><div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-md"><button onClick={() => setMovementsFilter({ ...movementsFilter, type: 'RECEIVED' })} className={`flex-1 px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${movementsFilter.type === 'RECEIVED' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400'}`}><TrendingUp size={18} /> RECEBIDOS</button><button onClick={() => setMovementsFilter({ ...movementsFilter, type: 'OVERDUE' })} className={`flex-1 px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${movementsFilter.type === 'OVERDUE' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400'}`}><AlertCircle size={18} /> ATRASADOS</button></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">De</label><input type="date" value={movementsFilter.fromDate} onChange={(e) => setMovementsFilter({ ...movementsFilter, fromDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Até</label><input type="date" value={movementsFilter.toDate} onChange={(e) => setMovementsFilter({ ...movementsFilter, toDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    {role === Role.MASTER && (<div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Filtrar Cobrador</label><select value={movementsFilter.collectorId} onChange={(e) => setMovementsFilter({ ...movementsFilter, collectorId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">{role === Role.MASTER && <option value="ALL">Todos os Cobradores</option>}{collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
                    <div className="flex items-end"><button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black text-sm uppercase py-3.5 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg"><Printer size={18} /> Gerar PDF / Imprimir</button></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Junior Cestas e Produto - Relatório Financeiro</h1>
              <div className="mt-4 grid grid-cols-2 gap-8 text-sm uppercase">
                <div>
                  <p><strong>Tipo:</strong> {movementsFilter.type === 'RECEIVED' ? 'Movimentações de Recebimento' : 'Relatório de Atrasados'}</p>
                  <p><strong>Período:</strong> {formatDate(movementsFilter.fromDate)} até {formatDate(movementsFilter.toDate)}</p>
                </div>
                <div className="text-right">
                  <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                  <p><strong>Gerado por:</strong> {currentUser?.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden print:shadow-none print:border-2 print:border-black print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 print:bg-slate-100 print:border-black">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Data</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Tipo</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Cliente</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black text-right">Valor</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:hidden">Visualizar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 print:divide-black">
                    {filteredMovements.length > 0 ? filteredMovements.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-5 text-sm font-bold text-slate-600 print:text-black">{formatDate(item.dueDate)}</td>
                        <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase print:text-black">{item.typeLabel}</td>
                        <td className="px-6 py-5 text-sm font-black text-slate-800 uppercase cursor-pointer hover:text-blue-600 transition-colors print:text-black" onClick={() => setSelectedClientForDetails(item.client)}>{item.client?.name}</td>
                        <td className="px-6 py-5 text-right font-black tracking-tighter text-lg print:text-black">{formatCurrency(item.displayValue)}</td>
                        <td className="px-6 py-5 text-right print:hidden">
                          <button onClick={() => setSelectedSaleForView(item.sale)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl"><Eye size={20} /></button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 italic uppercase font-black">Nenhum registro encontrado no período</td></tr>
                    )}
                  </tbody>
                  {filteredMovements.length > 0 && (
                    <tfoot className="bg-slate-900 text-white print:bg-black print:text-white">
                      <tr>
                        <td colSpan={3} className="px-6 py-6 text-sm font-black uppercase text-right opacity-70 print:opacity-100">Total Acumulado:</td>
                        <td className="px-6 py-6 text-right text-2xl font-black">{formatCurrency(filteredMovements.reduce((s, i) => s + i.displayValue, 0))}</td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            <div className="hidden print:block mt-12 pt-8 border-t border-slate-200 text-center text-[10px] uppercase font-bold text-slate-400">
              Relatório Gerencial • Junior Cestas e Produto • Sistema de Gestão de Cobranças
            </div>
          </div>
        )}

        {role === Role.MASTER && activeTab === 'commissions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6 print:hidden">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <div className="flex-1 space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Relatório de Comissões</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">De</label><input type="date" value={commissionFilter.fromDate} onChange={(e) => setCommissionFilter({ ...commissionFilter, fromDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Até</label><input type="date" value={commissionFilter.toDate} onChange={(e) => setCommissionFilter({ ...commissionFilter, toDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    {role === Role.MASTER && (<div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Filtrar Cobrador</label><select value={commissionFilter.collectorId} onChange={(e) => setCommissionFilter({ ...commissionFilter, collectorId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">{role === Role.MASTER && <option value="ALL">Todos os Cobradores</option>}{collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
                    <div className="flex items-end"><button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black text-sm uppercase py-3.5 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg"><Printer size={18} /> Gerar PDF / Imprimir</button></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Junior Cestas e Produto - Relatório de Comissões</h1>
              <div className="mt-4 grid grid-cols-2 gap-8 text-sm uppercase">
                <div>
                  <p><strong>Período:</strong> {formatDate(commissionFilter.fromDate)} até {formatDate(commissionFilter.toDate)}</p>
                </div>
                <div className="text-right">
                  <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                  <p><strong>Gerado por:</strong> {currentUser?.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden print:shadow-none print:border-2 print:border-black print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 print:bg-slate-100 print:border-black">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Data</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Cobrador</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Tipo</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Cliente</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black text-right">Base</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black text-right">Taxa</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black text-right">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 print:divide-black">
                    {filteredCommissions.length > 0 ? filteredCommissions.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-5 text-sm font-bold text-slate-600 print:text-black">{formatDate(item.date)}</td>
                        <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase print:text-black">{item.collectorName}</td>
                        <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase print:text-black">{item.type}</td>
                        <td className="px-6 py-5 text-sm font-black text-slate-800 uppercase print:text-black">{item.clientName}</td>
                        <td className="px-6 py-5 text-right font-bold print:text-black">{formatCurrency(item.baseValue)}</td>
                        <td className="px-6 py-5 text-right font-bold print:text-black">{item.rate}%</td>
                        <td className="px-6 py-5 text-right font-black tracking-tighter text-lg text-blue-600 print:text-black">{formatCurrency(item.commission)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-300 italic uppercase font-black">Nenhum registro encontrado no período</td></tr>
                    )}
                  </tbody>
                  {filteredCommissions.length > 0 && (
                    <tfoot className="bg-slate-900 text-white print:bg-black print:text-white">
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-sm font-black uppercase text-right opacity-70 print:opacity-100">Total Comissões:</td>
                        <td className="px-6 py-6 text-right text-2xl font-black">{formatCurrency(filteredCommissions.reduce((s, i) => s + i.commission, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {role === Role.MASTER && activeTab === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Relatórios Financeiros</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Previsibilidade e Fluxo de Caixa</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFinancialReportFilter({ ...financialReportFilter, period: p as any })}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financialReportFilter.period === p ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {p === 'DAILY' ? 'Diário' : p === 'WEEKLY' ? 'Semanal' : 'Mensal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
                  <input
                    type="date"
                    value={financialReportFilter.startDate}
                    onChange={e => setFinancialReportFilter({ ...financialReportFilter, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
                  <input
                    type="date"
                    value={financialReportFilter.endDate}
                    onChange={e => setFinancialReportFilter({ ...financialReportFilter, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200">
                    <Printer size={18} /> Exportar Relatório
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="bg-emerald-100 p-5 rounded-2xl text-emerald-600"><TrendingUp size={28} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fluxo Real (Recebido)</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(financialReportData.reduce((s, i) => s + i.received, 0))}</p>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-6">
                <div className="bg-blue-100 p-5 rounded-2xl text-blue-600"><CalendarClock size={28} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Previsibilidade (Pendente)</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(financialReportData.reduce((s, i) => s + i.projected, 0))}</p>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl flex items-center gap-6">
                <div className="bg-white/10 p-5 rounded-2xl text-white"><DollarSign size={28} /></div>
                <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Total Esperado</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(financialReportData.reduce((s, i) => s + i.total, 0))}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Fluxo de Caixa vs Previsão</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-black text-slate-400 uppercase">Real</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-[10px] font-black text-slate-400 uppercase">Previsto</span></div>
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialReportData}>
                      <defs>
                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                        tickFormatter={(v) => `R$ ${v}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                        formatter={(v: number) => [formatCurrency(v), '']}
                      />
                      <Area type="monotone" dataKey="received" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReceived)" />
                      <Area type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorProjected)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-8">Detalhamento por Período</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Real (Entrada)</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Previsto</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {financialReportData.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50 transition-all">
                          <td className="py-4 text-xs font-black text-slate-600 uppercase">{item.date}</td>
                          <td className="py-4 text-right text-sm font-black text-emerald-600">{formatCurrency(item.received)}</td>
                          <td className="py-4 text-right text-sm font-black text-blue-600">{formatCurrency(item.projected)}</td>
                          <td className="py-4 text-right text-sm font-black text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Listagem de Lançamentos</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Detalhamento individual das parcelas no período</p>
                </div>
                <div className="relative w-full md:w-96">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente ou ficha..."
                    value={financialSearch}
                    onChange={e => setFinancialSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Recebido</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredFinancialTransactions.map((inst, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-all">
                        <td className="py-4 text-xs font-bold text-slate-600">{formatDate(inst.dueDate)}</td>
                        <td className="py-4 text-sm font-black text-slate-800 uppercase">{inst.client?.name}</td>
                        <td className="py-4 text-xs font-bold text-slate-400">#{inst.sale.id} (P{inst.number})</td>
                        <td className="py-4 text-right text-sm font-black text-slate-900">{formatCurrency(inst.amount + (inst.manualAdjustment || 0))}</td>
                        <td className="py-4 text-right text-sm font-black text-emerald-600">{formatCurrency(inst.paidAmount)}</td>
                        <td className="py-4 text-center">
                          <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${inst.status === 'PAID' ? 'bg-green-100 text-green-600' : inst.status === 'PENDING' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {inst.status === 'PAID' ? 'Pago' : inst.status === 'PENDING' ? 'Pendente' : 'Reagendado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredFinancialTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-300 italic uppercase font-black">Nenhum lançamento encontrado para os filtros aplicados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isAddCollectorModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight">{editingCollectorId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                <button onClick={() => { setIsAddCollectorModalOpen(false); setEditingCollectorId(null); }}><X size={24} className="text-slate-400" /></button>
              </div>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Função</label>
                  <select 
                    value={newCollector.role} 
                    onChange={e => setNewCollector({ ...newCollector, role: e.target.value as Role })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value={Role.COLLECTOR}>COBRADOR</option>
                    <option value={Role.DELIVERY}>ENTREGADOR</option>
                    <option value={Role.ASSEMBLER}>MONTADOR</option>
                  </select>
                </div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Completo</label><input type="text" value={newCollector.name} onChange={e => setNewCollector({ ...newCollector, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">WhatsApp</label><input type="text" value={newCollector.phone} onChange={e => setNewCollector({ ...newCollector, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Usuário</label><input type="text" value={newCollector.username} onChange={e => setNewCollector({ ...newCollector, username: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Senha</label><input type="text" value={newCollector.password} onChange={e => setNewCollector({ ...newCollector, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                </div>
                
                {newCollector.role !== Role.DELIVERY && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Comissão Venda (%)</label>
                      <input type="number" value={newCollector.saleCommissionRate} onChange={e => setNewCollector({ ...newCollector, saleCommissionRate: parseFloat(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Comissão Cobrança (%)</label>
                      <input type="number" value={newCollector.collectionCommissionRate} onChange={e => setNewCollector({ ...newCollector, collectionCommissionRate: parseFloat(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <input type="checkbox" id="col-active" checked={newCollector.active} onChange={e => setNewCollector({ ...newCollector, active: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
                  <label htmlFor="col-active" className="text-sm font-black text-slate-600 uppercase tracking-widest cursor-pointer">Colaborador Ativo</label>
                </div>
              </div>
              <button onClick={handleSaveCollector} className="w-full py-4 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg">{editingCollectorId ? 'Salvar Alterações' : 'Salvar Colaborador'}</button>
            </div>
          </div>
        )}

        {isAddClientModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl scale-in-center overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight">Novo Cliente</h3>
                <button onClick={() => setIsAddClientModalOpen(false)}><X size={24} className="text-slate-400" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Completo</label>
                  <input type="text" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Telefone</label>
                  <input type="text" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CPF</label>
                  <input type="text" value={newClient.cpf} onChange={e => setNewClient({ ...newClient, cpf: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">RG</label>
                  <input type="text" value={newClient.rg} onChange={e => setNewClient({ ...newClient, rg: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Bairro</label>
                  <input type="text" value={newClient.neighborhood} onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Endereço</label>
                  <input type="text" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cidade</label>
                  <input type="text" value={newClient.city} onChange={e => setNewClient({ ...newClient, city: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Indicação (Cliente)</label>
                  <select value={newClient.referralClientId} onChange={e => setNewClient({ ...newClient, referralClientId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Nenhuma</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">RG (Imagem)</label>
                    <input type="text" placeholder="URL da Imagem" value={newClient.rgImage} onChange={e => setNewClient({ ...newClient, rgImage: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">CPF (Imagem)</label>
                    <input type="text" placeholder="URL da Imagem" value={newClient.cpfImage} onChange={e => setNewClient({ ...newClient, cpfImage: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">Conta de Luz</label>
                    <input type="text" placeholder="URL da Imagem" value={newClient.utilityBillImage} onChange={e => setNewClient({ ...newClient, utilityBillImage: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">Foto da Casa</label>
                    <input type="text" placeholder="URL da Imagem" value={newClient.housePhoto} onChange={e => setNewClient({ ...newClient, housePhoto: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs" />
                  </div>
                </div>
              </div>
              <button onClick={handleSaveClient} className="w-full py-4 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg">Cadastrar Cliente</button>
            </div>
          </div>
        )}

        {isPaymentModalOpen && selectedInstallment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 print:hidden">
            <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl scale-in-center overflow-hidden relative">
              <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Recebimento</h3>
              <p className="text-slate-500 mb-8 text-sm font-medium">Cliente: <span className="font-black text-blue-600">{selectedInstallment?.client?.name}</span></p>

              <div className="space-y-6 mb-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Parcela</span>
                    <p className="text-lg font-black text-slate-700">{formatCurrency(selectedInstallment.amount + (selectedInstallment.manualAdjustment || 0))}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-3xl border border-red-100 text-center">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Saldo Devedor</span>
                    <p className="text-lg font-black text-red-600">{formatCurrency(getSaleOutstandingBalance(selectedInstallment.sale))}</p>
                  </div>
                </div>

                <div className="bg-blue-600 p-8 rounded-[32px] shadow-2xl">
                  <label className="block text-[10px] font-black text-blue-200 uppercase mb-4 tracking-[0.2em]">Dinheiro (R$)</label>
                  <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full text-5xl font-black bg-transparent border-none outline-none text-white placeholder:text-blue-400" placeholder="0,00" autoFocus />
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Acréscimo Manual (Multa/Juros)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={adjustmentValue}
                        onChange={e => setAdjustmentValue(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Valor"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{adjustmentType === 'FIXED' ? 'R$' : '%'}</span>
                    </div>
                    <div className="flex bg-slate-200 p-1 rounded-xl">
                      <button onClick={() => setAdjustmentType('FIXED')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${adjustmentType === 'FIXED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>R$</button>
                      <button onClick={() => setAdjustmentType('PERCENT')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${adjustmentType === 'PERCENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>%</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><ArrowRight size={12} /> Próxima Cobrança (Data)</label>
                  <input type="date" value={nextVisitDate} onChange={e => setNextVisitDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setIsPaymentModalOpen(false); setSelectedInstallment(null); setPaymentAmount(''); setAdjustmentValue(''); setNextVisitDate(''); }} className="py-5 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl transition-all">Cancelar</button>
                <button onClick={handlePayment} className="py-5 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {selectedSaleForView && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 print:relative print:bg-white print:p-0">
            <div className="bg-slate-100 rounded-[40px] w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl scale-in-center print:shadow-none print:bg-white print:max-h-none">
              <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center print:hidden"><div><h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Ficha do Cliente</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Nº {selectedSaleForView.id}</p></div><button onClick={() => setSelectedSaleForView(null)}><X size={28} className="text-slate-400" /></button></div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-slate-200/30 print:bg-white print:p-0"><div className="flex justify-center print:block"><ReceiptForm saleId={selectedSaleForView.id} clientName={clients.find(c => c.id === selectedSaleForView.clientId)?.name.toUpperCase() || 'CLIENTE'} date={selectedSaleForView.date} items={selectedSaleForView.items} totalAmount={selectedSaleForView.totalAmount} downPayment={selectedSaleForView.downPayment} installments={selectedSaleForView.installments} /></div></div>
              <div className="bg-white px-8 py-6 border-t border-slate-200 flex justify-end gap-4 print:hidden shrink-0"><button onClick={() => window.print()} className="px-8 py-3.5 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl flex items-center gap-2"><Printer size={18} /> Imprimir</button><button onClick={() => setSelectedSaleForView(null)} className="px-8 py-3.5 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl border border-slate-200">Fechar</button></div>
            </div>
          </div>
        )}

        {selectedClientForDetails && <ClientDetailsModal client={selectedClientForDetails} />}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div><h2 className="text-xl font-black uppercase tracking-tight">Catálogo de Produtos</h2><p className="text-sm text-gray-400 font-bold">{products.length} itens cadastrados</p></div>
              <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all active:scale-95"><Plus size={20} /> Novo Produto</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Package size={24} /></div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={async () => { if(confirm("Excluir produto?")) { await dataService.deleteProduct(p.id); setProducts(await dataService.getProducts()); } }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={16} /></button>
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate">{p.name}</h3>
                  <p className="text-sm text-slate-500 font-bold mb-4">{formatCurrency(p.price)}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estoque</span>
                      <span className={`text-lg font-black ${p.stockQuantity <= 0 && p.stockControlEnabled ? 'text-red-600' : 'text-slate-900'}`}>{p.stockQuantity} un</span>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${p.stockControlEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      {p.stockControlEnabled ? 'Controlado' : 'S/ Controle'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isProductModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                <button onClick={() => setIsProductModalOpen(false)}><X size={24} className="text-slate-400" /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  id: editingProduct?.id,
                  name: formData.get('name') as string,
                  price: parseFloat(formData.get('price') as string),
                  stockControlEnabled: formData.get('stockControlEnabled') === 'on',
                  stockQuantity: editingProduct ? editingProduct.stockQuantity : parseFloat(formData.get('stockQuantity') as string || '0') || 0
                };
                await dataService.saveProduct(data);
                setProducts(await dataService.getProducts());
                setIsProductModalOpen(false);
              }} className="space-y-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome</label><input name="name" type="text" defaultValue={editingProduct?.name} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Preço Venda</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                {!editingProduct && <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Saldo Inicial</label><input name="stockQuantity" type="number" defaultValue="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>}
                <div className="flex items-center gap-3 pt-2">
                  <input name="stockControlEnabled" type="checkbox" defaultChecked={editingProduct?.stockControlEnabled} className="w-5 h-5 rounded accent-blue-600" />
                  <label className="text-sm font-black text-slate-600 uppercase tracking-widest">Ativar Controle de Estoque</label>
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl shadow-lg mt-4">Salvar Produto</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div><h2 className="text-xl font-black uppercase tracking-tight">Gestão de Estoque</h2><p className="text-sm text-gray-400 font-bold">Resumo de saldos e movimentações</p></div>
              <button 
                onClick={() => setIsStockMovementModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black shadow-lg transition-all active:scale-95"
              >
                <Plus size={20} /> Entrada / Saída Avulsa
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map(p => (
                      <tr key={p.id}>
                        <td className="px-6 py-5"><span className="text-sm font-black text-slate-800 uppercase">{p.name}</span></td>
                        <td className="px-6 py-5"><span className={`text-sm font-black ${p.stockQuantity < 5 && p.stockControlEnabled ? 'text-red-600' : 'text-slate-600'}`}>{p.stockQuantity} un</span></td>
                        <td className="px-6 py-5"><span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${p.stockControlEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{p.stockControlEnabled ? 'ATIVO' : 'DESATIVADO'}</span></td>
                        <td className="px-6 py-5 text-right"><button onClick={async () => { const movs = await dataService.getStockMovements(p.id); setStockMovements(movs); setSelectedProductForMovements(p.id); }} className="text-blue-600 font-bold text-xs uppercase hover:underline">Ver Histórico</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedProductForMovements && (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Histórico: {products.find(p => p.id === selectedProductForMovements)?.name}</h3>
                  <button onClick={() => setSelectedProductForMovements(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                  {stockMovements.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${m.type === 'ENTRADA' ? 'bg-green-100 text-green-600' : m.type === 'RETORNO' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{m.type}</div>
                        <div><p className="text-sm font-black text-slate-800 uppercase">{formatDate(m.createdAt!)}</p><p className="text-[10px] text-slate-400 font-bold">{m.notes || (m.saleId ? `Ficha #${m.saleId}` : '')}</p></div>
                      </div>
                      <span className={`text-lg font-black ${m.type === 'ENTRADA' || m.type === 'RETORNO' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'ENTRADA' || m.type === 'RETORNO' ? '+' : '-'}{m.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isStockMovementModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black uppercase tracking-tight">Movimentação Manual</h3><button onClick={() => setIsStockMovementModalOpen(false)}><X size={24} className="text-slate-400" /></button></div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const productId = formData.get('productId') as string;
                const type = formData.get('type') as any;
                const quantity = parseFloat(formData.get('quantity') as string);
                
                await dataService.saveStockMovement({ productId, type, quantity, notes: 'Ajuste Manual' });
                setProducts(await dataService.getProducts());
                setIsStockMovementModalOpen(false);
              }} className="space-y-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Produto</label>
                  <select name="productId" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm uppercase"><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo</label>
                    <select name="type" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm uppercase"><option value="ENTRADA">Entrada</option><option value="SAÍDA">Saída</option></select>
                  </div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Quantidade</label>
                    <input name="quantity" type="number" required defaultValue="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black uppercase text-sm tracking-widest rounded-2xl shadow-lg mt-4">Confirmar Movimentação</button>
              </form>
            </div>
          </div>
        )}
      </Layout>
      {printData && (
        <ThermalReceipt
          sale={printData.sale}
          client={printData.client}
          installment={printData.installment}
          type={printData.type}
        />
      )}
    </>
  );
};

export default App;
