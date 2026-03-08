import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString: string) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { data: config, error: configError } = await supabase.from('config').select('*').eq('id', 'default').single();
        if (configError || !config) throw new Error("Config error");

        if (!config.whatsapp_api_token || !config.whatsapp_phone_number_id) {
            return res.status(400).json({ error: "WhatsApp API not configured" });
        }

        const { data: rawSales, error: salesError } = await supabase.from('sales').select('*, installments(*)');
        if (salesError) throw salesError;

        const { data: clients, error: clientsError } = await supabase.from('clients').select('*');
        if (clientsError) throw clientsError;

        const today = new Date().toISOString().split('T')[0];
        const reassignDays = config.auto_reassign_days || 5;

        const itemsToProcess: any[] = [];

        for (const sale of rawSales) {
            const client = clients.find(c => c.id === sale.client_id);
            if (!client) continue;

            for (const inst of sale.installments) {
                if (inst.status !== 'PAID') {
                    if (inst.due_date === today && !inst.pix_sent) {
                        itemsToProcess.push({ inst, sale, client });
                    } else if (inst.due_date < today) {
                        const dueDateObj = new Date(inst.due_date);
                        const diffTime = Math.abs(new Date(today).getTime() - dueDateObj.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < reassignDays) {
                            itemsToProcess.push({ inst, sale, client });
                        }
                    }
                }
            }
        }

        let successCount = 0;

        for (const item of itemsToProcess) {
            try {
                const amountDue = Number(item.inst.amount) - Number(item.inst.paid_amount);
                if (amountDue < 1) continue;

                let pixCode = "";
                const description = `Cobrança ${item.inst.due_date < today ? 'ATRASADA' : ''} P${item.inst.number} - Venda ${item.sale.id}`;
                const externalRef = item.inst.id;

                if (item.sale.token_type === 'INFINITY') {
                    if (config.infinity_pay_token) {
                        const r = await axios.post('https://api.infinitypay.io/v1/payments/pix', {
                            amount: Math.round(amountDue * 100),
                            description,
                            external_id: externalRef,
                            expires_in: (config.pix_expiration_days || 5) * 24 * 60 * 60
                        }, { headers: { 'Authorization': `Bearer ${config.infinity_pay_token}` } });
                        pixCode = r.data.pix_code;
                    }
                } else {
                    const token = item.sale.token_type === 'PJ' ? config.pj_token : config.pf_token;
                    if (token) {
                        const expirationDate = new Date();
                        expirationDate.setDate(expirationDate.getDate() + (config.pix_expiration_days || 5));

                        const r = await axios.post('https://api.mercadopago.com/v1/payments', {
                            transaction_amount: amountDue,
                            description: description,
                            payment_method_id: 'pix',
                            date_of_expiration: expirationDate.toISOString(),
                            external_reference: externalRef,
                            payer: {
                                email: `${item.client.phone.replace(/\D/g, '') || 'venda'}@cliente.com`,
                                first_name: item.client.name,
                            }
                        }, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'X-Idempotency-Key': `pix-cron-${externalRef}-${Date.now()}`
                            }
                        });
                        pixCode = r.data.point_of_interaction.transaction_data.qr_code;
                    }
                }

                if (pixCode) {
                    const message = `Credi Fácil: Olá ${item.client.name}, lembrete de sua parcela ${item.inst.due_date < today ? 'ATRASADA ' : ''}vencendo ${item.inst.due_date === today ? 'HOJE' : formatDate(item.inst.due_date)}. \n\nCódigo PIX: ${pixCode}\n\nValor: ${formatCurrency(amountDue)}`;

                    const cleanedPhone = item.client.phone.replace(/\D/g, '');
                    const formattedPhone = cleanedPhone.length <= 11 ? `55${cleanedPhone}` : cleanedPhone;

                    await axios.post(
                        `https://graph.facebook.com/v18.0/${config.whatsapp_phone_number_id}/messages`,
                        {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: formattedPhone,
                            type: "text",
                            text: { body: message }
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${config.whatsapp_api_token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    await supabase.from('installments').update({ pix_sent: true }).eq('id', item.inst.id);
                    successCount++;
                }

            } catch (err: any) {
                console.error(`Error processing installment ${item.inst.id}:`, err.response?.data || err.message);
            }
        }

        res.json({ status: 'ok', processed: itemsToProcess.length, successes: successCount });
    } catch (e: any) {
        console.error("Cron err:", e);
        res.status(500).json({ error: e.message });
    }
}
