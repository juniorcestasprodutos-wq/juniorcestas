
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const sendWhatsAppMessage = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const generateRescheduleMessage = (clientName: string, dueDate: string) => {
  return `Olá ${clientName}, notamos que sua parcela com vencimento hoje não foi paga. Reagendamos o pagamento para ${formatDate(dueDate)}. Favor confirmar o recebimento desta mensagem. Atenciosamente, Credi Fácil.`;
};
