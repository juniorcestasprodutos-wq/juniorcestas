
import { Role, User, Client, Sale } from './types';

export const mockCollectors: User[] = [
  { id: 'loja', name: 'Loja (Cobrança Própria)', phone: '', role: Role.MASTER, active: true, saleCommissionRate: 0, collectionCommissionRate: 0 },
  { id: '1', name: 'João Silva', phone: '5511999999999', role: Role.COLLECTOR, username: 'joao', password: '123', active: true, saleCommissionRate: 5, collectionCommissionRate: 2 },
  { id: '2', name: 'Maria Souza', phone: '5511888888888', role: Role.COLLECTOR, username: 'maria', password: '123', active: true, saleCommissionRate: 5, collectionCommissionRate: 2 },
];

export const mockClients: Client[] = [
  { 
    id: 'c1', 
    name: 'Roberto Carlos', 
    address: 'Av. Paulista, 1000', 
    neighborhood: 'Bela Vista',
    phone: '5511777777777', 
    city: 'São Paulo', 
    state: 'SP', 
    cpf: '123.456.789-00', 
    rg: '12.345.678-9',
    coordinates: { lat: -23.56168, lng: -46.65598 }
  },
  { 
    id: 'c2', 
    name: 'Ana Maria', 
    address: 'Rua das Flores, 123', 
    neighborhood: 'Centro',
    phone: '5511666666666', 
    city: 'Campinas', 
    state: 'SP', 
    cpf: '987.654.321-11', 
    rg: '98.765.432-1',
    coordinates: { lat: -22.9071, lng: -47.0632 }
  },
];

// Helper to generate some sales with installments
export const initialSales: Sale[] = [
  {
    id: '1001',
    clientId: 'c1',
    collectorId: '1',
    date: new Date().toISOString().split('T')[0],
    totalAmount: 1000,
    downPayment: 0,
    installmentsCount: 10,
    items: [{ quantity: 1, description: 'Serviço de Manutenção', unitPrice: 1000, total: 1000 }],
    installments: Array.from({ length: 10 }, (_, i) => ({
      id: `inst-1-${i}`,
      saleId: '1001',
      number: i + 1,
      dueDate: new Date(new Date().setDate(new Date().getDate() + (i * 30))).toISOString().split('T')[0],
      amount: 100,
      paidAmount: 0,
      status: 'PENDING'
    })),
    tokenType: 'PF',
    status: 'DELIVERED'
  },
  {
    id: '1002',
    clientId: 'c2',
    collectorId: '2',
    date: new Date().toISOString().split('T')[0],
    totalAmount: 500,
    downPayment: 0,
    installmentsCount: 5,
    items: [{ quantity: 1, description: 'Peças Automotivas', unitPrice: 500, total: 500 }],
    installments: Array.from({ length: 5 }, (_, i) => ({
      id: `inst-2-${i}`,
      saleId: '1002',
      number: i + 1,
      dueDate: new Date(new Date().setDate(new Date().getDate() + (i * 30))).toISOString().split('T')[0],
      amount: 100,
      paidAmount: 0,
      status: 'PENDING'
    })),
    tokenType: 'PF',
    status: 'PENDING'
  }
];
