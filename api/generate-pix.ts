import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, description, tokenType, clientName, clientPhone, installmentId } = req.body;

    if (amount < 1) {
        return res.status(400).json({ error: "O valor mínimo para pagamento via PIX no Mercado Pago é R$ 1,00" });
    }

    try {
        // Get config from Supabase
        const { data: config, error: configError } = await supabase
            .from('config')
            .select('*')
            .eq('id', 'default')
            .single();

        if (configError || !config) {
            throw new Error("Configuração não encontrada no banco de dados");
        }

        if (tokenType === 'INFINITY') {
            if (!config.infinity_pay_token) {
                return res.status(400).json({ error: "Token da InfinityPay não configurado" });
            }
            const response = await axios.post('https://api.infinitypay.io/v1/payments/pix', {
                amount: Math.round(amount * 100),
                description,
                external_id: installmentId,
                expires_in: (config.pix_expiration_days || 5) * 24 * 60 * 60
            }, {
                headers: { 'Authorization': `Bearer ${config.infinity_pay_token}` }
            });

            const pixCode = response.data.pix_code;
            return res.json({ pixCode });
        }

        const token = tokenType === 'PJ' ? config.pj_token : config.pf_token;
        if (!token) {
            return res.status(400).json({ error: "Token do Mercado Pago não configurado para " + tokenType });
        }

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + (config.pix_expiration_days || 5));

        const response = await axios.post('https://api.mercadopago.com/v1/payments', {
            transaction_amount: amount,
            description: description,
            payment_method_id: 'pix',
            date_of_expiration: expirationDate.toISOString(),
            payer: {
                email: 'test@test.com',
                first_name: clientName,
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Idempotency-Key': `pix-${installmentId}-${Date.now()}`
            }
        });

        const pixData = response.data.point_of_interaction.transaction_data;
        res.json({ pixCode: pixData.qr_code, qrCodeBase64: pixData.qr_code_base64 });

    } catch (error: any) {
        console.error("PIX Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro ao gerar PIX", details: error.response?.data });
    }
}
