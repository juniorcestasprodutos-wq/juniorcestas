import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phone, message } = req.body;

    try {
        const { data: config, error: configError } = await supabase
            .from('config')
            .select('*')
            .eq('id', 'default')
            .single();

        if (configError || !config || !config.whatsapp_api_token || !config.whatsapp_phone_number_id) {
            return res.status(400).json({ error: "WhatsApp API não configurada." });
        }

        const cleanedPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanedPhone.length <= 11 ? `55${cleanedPhone}` : cleanedPhone;

        const response = await axios.post(
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

        res.json({ status: "ok", data: response.data });
    } catch (error: any) {
        console.error("WhatsApp Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro ao enviar via WhatsApp API", details: error.response?.data });
    }
}
