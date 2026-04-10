import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phone, message, template, pixCode } = req.body;
    const cleanedPhone = phone.replace(/\D/g, '');
    const formattedPhone = (cleanedPhone.length <= 11 && !cleanedPhone.startsWith('55')) ? `55${cleanedPhone}` : cleanedPhone;

    try {
        const { data: config, error: configError } = await supabase
            .from('config')
            .select('*')
            .eq('id', 'default')
            .single();

        if (configError || !config || !config.whatsapp_api_token || !config.whatsapp_phone_number_id) {
            return res.status(400).json({ error: "WhatsApp API não configurada." });
        }

        const payload: any = {
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: template ? "template" : "text",
        };

        if (template) {
            payload.template = template;
        } else {
            payload.text = { body: message };
        }

        const response = await axios.post(
            `https://graph.facebook.com/v22.0/${config.whatsapp_phone_number_id}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${config.whatsapp_api_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Envio do segundo balão (Código PIX) se solicitado
        if (pixCode) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await axios.post(
                `https://graph.facebook.com/v22.0/${config.whatsapp_phone_number_id}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: formattedPhone,
                    type: "text",
                    text: { body: `*Copia e Cola PIX:* \n\n\`${pixCode}\`` }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.whatsapp_api_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).catch(err => console.error("Erro no follow-up:", err.response?.data || err.message));
        }

        res.json({ status: "ok", data: response.data });
    } catch (error: any) {
        const metaError = error.response?.data?.error || { message: error.message };
        console.error("WhatsApp Error Log:", JSON.stringify(metaError, null, 2));
        res.status(500).json({ 
            error: "Erro na API do WhatsApp", 
            message: metaError.message,
            details: metaError
        });
    }
}
