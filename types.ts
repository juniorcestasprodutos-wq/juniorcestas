
export enum Role {
  MASTER = 'MASTER',
  COLLECTOR = 'COLLECTOR',
  DELIVERY = 'DELIVERY',
  ASSEMBLER = 'ASSEMBLER'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  roles: Role[];
  username?: string;
  password?: string;
  active?: boolean;
  saleCommissionRate?: number; // % commission on new sales
  collectionCommissionRate?: number; // % commission on collections
}

export interface Client {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  phone: string;
  city: string;
  state: string;
  cpf: string;
  rg: string;
  rgImage?: string;
  cpfImage?: string;
  utilityBillImage?: string;
  housePhoto?: string;
  referralClientId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SaleItem {
  productId?: string;
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  stockControlEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'ENTRADA' | 'SAÍDA' | 'VENDA' | 'RETORNO';
  quantity: number;
  saleId?: string;
  notes?: string;
  createdAt?: string;
}

export interface Installment {
  id: string;
  saleId: string;
  number: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'RESCHEDULED';
  paymentDate?: string;
  pixSent?: boolean;
  manualAdjustment?: number;
  confirmedByMaster?: boolean;
  originalDueDate?: string;
  rescheduleCount?: number;
}

export interface PaymentProviderConfig {
  pfToken: string;
  pjToken: string;
  pjThreshold: number;
  infinityPayToken: string;
  infinityPayEnabled: boolean;
  allocationMode: 'MP_ONLY' | 'INFINITY_ONLY' | 'SPLIT_BY_THRESHOLD';
  n8nWebhookUrl: string;
  autoReassignDays: number;
  pixExpirationDays: number;
  googleSheetId: string;
  googleApiKey: string;
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string;
  appsScriptUrl?: string;
  creditLimitEnabled?: boolean;
  creditLimitValue?: number;
  whatsappAutoReplyEnabled?: boolean;
  whatsappAutoReplyMessage?: string;
  whatsappForwardingNumber?: string;
  whatsappNotificationEnabled?: boolean;
}

export interface Sale {
  id: string;
  clientId: string;
  collectorId: string;
  deliveryPersonId?: string;
  date: string;
  items: SaleItem[];
  totalAmount: number; // SR (Saldo Restante/Total)
  downPayment: number; // PGL (Pago/Entrada)
  installmentsCount: number;
  installments: Installment[];
  tokenType: 'PF' | 'PJ' | 'INFINITY';
  status: 'PENDING' | 'DELIVERED' | 'CANCELLED';
  isAssembly?: boolean;
  assemblerId?: string;
  assemblyValue?: number;
  observations?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  status: 'PENDING' | 'COMPLETED';
  relatedId?: string; // e.g., saleId
}
