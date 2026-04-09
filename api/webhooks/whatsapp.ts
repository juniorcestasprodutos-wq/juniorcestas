import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
  // 1. GET: Verification from Meta
  if (req.method === 'GET') {
    const verify_token = 'credi_facil_webhook_2024';
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === verify_token) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send('Forbidden');
      }
    }
  }

  // 2. POST: Event Notifications
  if (req.method === 'POST') {
    const body = req.body;
    
    // Log event to console for debugging
    console.log('WhatsApp Webhook Event:', JSON.stringify(body, null, 2));

    // Handle message status updates or incoming messages here
    try {
      if (body.object === 'whatsapp_business_account') {
        // You can extend this logic to update your database status
        // e.g., mark messages as DELIVERED or READ
      }
    } catch (err) {
      console.error('Error processing WhatsApp webhook:', err);
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
