import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
    // Mercado Pago sends POST notifications
    if (req.method !== 'POST') {
        return res.status(200).send('OK'); // Always return OK to MP
    }

    const { type, data } = req.body;

    // We only care about payments
    if (type !== 'payment' || !data || !data.id) {
        return res.status(200).send('OK');
    }

    try {
        // 1. Get configuration for tokens
        const { data: config } = await supabase.from('config').select('*').eq('id', 'default').single();
        if (!config) throw new Error("Config not found");

        // Try both tokens (PF and PJ) to see which one works for this payment
        const tokens = [config.pj_token, config.pf_token].filter(Boolean);
        let paymentDetails = null;

        for (const token of tokens) {
            try {
                const mpRes = await axios.get(`https://api.mercadopago.com/v1/payments/${data.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                paymentDetails = mpRes.data;
                break; // Found it!
            } catch (e) {
                continue; // Try next token
            }
        }

        if (!paymentDetails) {
            console.error("Payment not found with any token");
            return res.status(200).send('OK');
        }

        const { status, external_reference, transaction_amount } = paymentDetails;

        // 2. If approved, update Supabase
        if (status === 'approved' && external_reference) {
            // Find and update installment
            const { error: updateError } = await supabase
                .from('installments')
                .update({
                    status: 'PAID',
                    paid_amount: transaction_amount
                })
                .eq('id', external_reference);

            if (updateError) {
                console.error("Update error:", updateError);
            } else {
                console.log(`Installment ${external_reference} marked as PAID`);
            }
        }

        return res.status(200).send('OK');
    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return res.status(200).send('OK'); // Always return 200 to prevent MP retries on non-retriable errors
    }
}
