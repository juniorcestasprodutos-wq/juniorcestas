import React from 'react';
import { Sale, Client, Installment } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface ThermalReceiptProps {
  sale: Sale;
  client: Client;
  installment?: Installment;
  type: 'PAYMENT' | 'SALE';
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ sale, client, installment, type }) => {
  return (
    <div className="thermal-receipt-container hidden print:block w-[58mm] mx-auto p-2 font-mono text-[10px] leading-tight text-black bg-white">
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h1 className="text-sm font-bold uppercase">Credi Fácil</h1>
        <p>Gestão de Cobranças</p>
        <p>{new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div className="mb-2">
        <p className="font-bold uppercase">Cliente:</p>
        <p>{client.name}</p>
        <p>Tel: {client.phone}</p>
      </div>

      <div className="border-b border-dashed border-black pb-2 mb-2">
        <p className="font-bold uppercase">Ficha: #{sale.id}</p>
        <p>Data: {formatDate(sale.date)}</p>
      </div>

      {type === 'PAYMENT' && installment && (
        <div className="mb-2">
          <p className="font-bold uppercase text-center bg-black text-white p-1 mb-1">Recibo de Pagamento</p>
          <div className="flex justify-between">
            <span>Parcela:</span>
            <span>{installment.number}/{sale.installmentsCount}</span>
          </div>
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>Valor Pago:</span>
            <span>{formatCurrency(installment.paidAmount)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Saldo Restante:</span>
            <span>{formatCurrency(sale.totalAmount - (sale.downPayment + sale.installments.reduce((acc, i) => acc + i.paidAmount, 0)))}</span>
          </div>
        </div>
      )}

      {type === 'SALE' && (
        <div className="mb-2">
          <p className="font-bold uppercase text-center bg-black text-white p-1 mb-1">Comprovante de Venda</p>
          <div className="flex justify-between">
            <span>Valor Total:</span>
            <span>{formatCurrency(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Entrada:</span>
            <span>{formatCurrency(sale.downPayment)}</span>
          </div>
          <div className="flex justify-between">
            <span>Parcelas:</span>
            <span>{sale.installmentsCount}x</span>
          </div>
          <div className="mt-2">
            <p className="font-bold uppercase">Vencimentos:</p>
            {sale.installments.map(i => (
              <div key={i.id} className="flex justify-between text-[8px]">
                <span>P{i.number}: {formatDate(i.dueDate)}</span>
                <span>{formatCurrency(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mt-4 pt-2 border-t border-dashed border-black">
        <p className="mb-4 italic">Obrigado pela preferência!</p>
        <div className="border-t border-black mt-8 w-full mx-auto"></div>
        <p className="mt-1 uppercase text-[8px]">Assinatura</p>
      </div>
      
      <div className="h-8"></div> {/* Space for tearing */}
    </div>
  );
};

export default ThermalReceipt;
