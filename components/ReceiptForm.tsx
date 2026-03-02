
import React from 'react';
import { formatCurrency, formatDate } from '../utils';

interface ReceiptFormProps {
  saleId: string;
  clientName: string;
  date: string;
  items: Array<{ quantity: number; description: string; unitPrice: number; total: number }>;
  totalAmount: number;
  downPayment: number;
  installments: Array<{ dueDate: string; paidAmount: number; amount: number; status: string }>;
}

const ReceiptForm: React.FC<ReceiptFormProps> = ({
  saleId, clientName, date, items, totalAmount, downPayment, installments
}) => {
  // Calculate total paid via installments (excluding down payment)
  const totalPaidInInstallments = installments.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0);
  
  // Current Balance = Total - DownPayment - Payments Received
  const currentBalance = totalAmount - downPayment - totalPaidInInstallments;

  // Filter only installments that actually received a payment
  const paidEntries = installments.filter(inst => inst.paidAmount > 0);

  // Prepare grid data (combining both columns for a total of 30 slots)
  // We'll calculate a running balance for each paid row
  let runningBalance = totalAmount - downPayment;
  const gridRows = paidEntries.map((inst) => {
    runningBalance -= inst.paidAmount;
    return {
      date: inst.dueDate,
      amount: inst.paidAmount,
      balance: runningBalance
    };
  });

  return (
    <div className="bg-white border-2 border-black p-4 w-full max-w-[500px] mx-auto shadow-xl receipt-font text-[12px] uppercase leading-tight">
      {/* Header */}
      <div className="border-2 border-black mb-1 p-1 text-center font-black text-lg">
        FICHA DE PRESTAÇÃO
      </div>

      {/* Top Info */}
      <div className="flex gap-2 mb-2 border-b border-black pb-1">
        <div className="flex-none">DATA: <span className="underline">{formatDate(date)}</span></div>
        <div className="flex-1">CLI: <span className="underline">{clientName}</span></div>
        <div className="flex-none">Nº <span className="underline">{saleId.padStart(4, '0')}</span></div>
      </div>

      {/* Objects Table */}
      <table className="w-full border-collapse border-x border-t border-black mb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="border-r border-black p-1 text-left w-3/4">OBJETOS</th>
            <th className="p-1 text-right w-1/4">VALOR</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, idx) => (
            <tr key={idx} className="border-b border-black h-5">
              <td className="border-r border-black px-1">{items[idx]?.description || ''}</td>
              <td className="px-1 text-right">{items[idx] ? formatCurrency(items[idx].total) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="grid grid-cols-2 gap-x-4 mb-2">
        <div className="border-b border-black pb-1 flex justify-between">
          <span className="font-bold">TOTAL:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="border-b border-black pb-1 flex justify-between">
          <span className="font-bold">SALDO:</span>
          <span className="text-red-600 font-black">{formatCurrency(currentBalance)}</span>
        </div>
        <div className="border-b border-black pb-1 flex justify-between col-span-2 mt-1">
          <span className="font-bold">ENTRADA (PGL):</span>
          <span className="flex-1 ml-4 border-b border-gray-300 text-right">{formatCurrency(downPayment)}</span>
          <span className="font-bold ml-4">RESTANTE:</span>
          <span className="w-24 ml-2 border-b border-gray-300 text-right">{formatCurrency(totalAmount - downPayment)}</span>
        </div>
      </div>

      {/* Payment Grid */}
      <div className="grid grid-cols-2 gap-x-1">
        {/* Left Column of Grid (Rows 0-14) */}
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="border-b border-black text-[10px]">
              <th className="border-r border-black p-0.5">DATA</th>
              <th className="border-r border-black p-0.5">DINHEIRO</th>
              <th className="p-0.5">SALDO</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }).map((_, idx) => {
              const row = gridRows[idx];
              return (
                <tr key={idx} className="border-b border-black h-4 text-[9px]">
                  <td className="border-r border-black text-center">{row ? formatDate(row.date) : ''}</td>
                  <td className="border-r border-black text-right pr-1 font-bold">{row ? formatCurrency(row.amount) : ''}</td>
                  <td className="text-right pr-1">{row ? formatCurrency(row.balance) : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Right Column of Grid (Rows 15-29) */}
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="border-b border-black text-[10px]">
              <th className="border-r border-black p-0.5">DATA</th>
              <th className="border-r border-black p-0.5">DINHEIRO</th>
              <th className="p-0.5">SALDO</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }).map((_, idx) => {
              const row = gridRows[idx + 15];
              return (
                <tr key={idx} className="border-b border-black h-4 text-[9px]">
                  <td className="border-r border-black text-center">{row ? formatDate(row.date) : ''}</td>
                  <td className="border-r border-black text-right pr-1 font-bold">{row ? formatCurrency(row.amount) : ''}</td>
                  <td className="text-right pr-1">{row ? formatCurrency(row.balance) : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="text-[8px] text-right mt-1 opacity-50 italic">APENAS PAGAMENTOS EFETIVADOS SÃO LISTADOS ACIMA</div>
      <div className="text-[8px] text-left mt-0.5 opacity-30">SIDGRAPH - INDÚSTRIA GRÁFICA</div>
    </div>
  );
};

export default ReceiptForm;
