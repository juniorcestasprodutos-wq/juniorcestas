import React, { useState } from 'react';
import { Sale, Client, Installment } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { Search, ReceiptText, QrCode, Phone, Hash, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

interface ClientPortalProps {
  sales: Sale[];
  clients: Client[];
}

const ClientPortal: React.FC<ClientPortalProps> = ({ sales, clients }) => {
  const [phone, setPhone] = useState('');
  const [saleId, setSaleId] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPix, setGeneratedPix] = useState<{ id: string, code: string } | null>(null);

  const handleSearch = () => {
    setError('');
    setFoundSale(null);
    setFoundClient(null);
    setGeneratedPix(null);

    if (!phone || !saleId) {
      setError('Por favor, preencha o telefone e o número da ficha.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const client = clients.find(c => c.phone.replace(/\D/g, '').endsWith(cleanPhone) || c.phone.replace(/\D/g, '') === cleanPhone);
    
    if (!client) {
      setError('Cliente não encontrado com este telefone.');
      return;
    }

    const sale = sales.find(s => s.id === saleId && s.clientId === client.id);
    
    if (!sale) {
      setError('Ficha não encontrada para este cliente.');
      return;
    }

    setFoundClient(client);
    setFoundSale(sale);
  };

  const handleGeneratePix = async (inst: Installment) => {
    if (!foundClient || !foundSale) return;
    
    setLoading(true);
    try {
      const res = await axios.post('/api/generate-pix', {
        amount: inst.amount - inst.paidAmount,
        description: `Auto-atendimento P${inst.number} - Ficha ${foundSale.id}`,
        tokenType: foundSale.tokenType,
        clientName: foundClient.name,
        clientPhone: foundClient.phone,
        installmentId: inst.id
      });
      setGeneratedPix({ id: inst.id, code: res.data.pixCode });
    } catch (e) {
      alert('Erro ao gerar PIX. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-[32px] shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-blue-600 p-8 text-white text-center">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ReceiptText size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Portal do Cliente</h1>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-2">Auto-atendimento Credi Fácil</p>
          </div>

          <div className="p-8">
            {!foundSale ? (
              <div className="space-y-6">
                <p className="text-slate-500 text-sm font-medium text-center">Informe seus dados para consultar suas parcelas e gerar o código PIX para pagamento.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Seu WhatsApp</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Número da Ficha</label>
                    <div className="relative">
                      <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text" 
                        value={saleId} 
                        onChange={e => setSaleId(e.target.value)}
                        placeholder="Ex: 1001"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 flex items-center gap-3">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <button 
                    onClick={handleSearch}
                    className="w-full py-5 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Search size={18} />
                    Consultar Ficha
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{foundClient?.name}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha #{foundSale.id}</p>
                  </div>
                  <button 
                    onClick={() => setFoundSale(null)}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Sair
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suas Parcelas</h3>
                  {foundSale.installments.map((inst) => (
                    <div key={inst.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Parcela {inst.number}</span>
                          <span className="text-sm font-black text-slate-800">{formatCurrency(inst.amount)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Vencimento</span>
                          <span className={`text-xs font-black ${new Date(inst.dueDate) < new Date() && inst.status !== 'PAID' ? 'text-red-600' : 'text-slate-600'}`}>
                            {formatDate(inst.dueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/50">
                        <div className="flex items-center gap-2">
                          {inst.status === 'PAID' ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase bg-green-100 px-2 py-1 rounded-lg">
                              <CheckCircle size={12} /> Pago
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase bg-orange-100 px-2 py-1 rounded-lg">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </div>

                        {inst.status !== 'PAID' && (
                          <button 
                            onClick={() => handleGeneratePix(inst)}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <QrCode size={14} /> 
                            {loading && generatedPix?.id === inst.id ? 'Gerando...' : 'Pagar com PIX'}
                          </button>
                        )}
                      </div>

                      {generatedPix && generatedPix.id === inst.id && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-2 text-center">Código PIX Gerado</p>
                          <textarea 
                            readOnly 
                            value={generatedPix.code}
                            className="w-full bg-white border border-blue-200 rounded-lg p-2 text-[10px] font-mono mb-3 h-20 outline-none"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPix.code);
                              alert('Código PIX copiado!');
                            }}
                            className="w-full py-2 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg"
                          >
                            Copiar Código
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-center mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} Credi Fácil • Sistema de Cobrança
        </p>
      </div>
    </div>
  );
};

export default ClientPortal;
