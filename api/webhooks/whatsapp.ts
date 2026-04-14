import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send('Forbidden');
      }
    }
  }

  // 2. POST: Event Notifications
  if (req.method === 'POST') {
    const body = req.body;
    console.log('WhatsApp Webhook Event Received');

    try {
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages[0]) {
          const msg = messages[0];
          const from = msg.from; // Phone number
          const type = msg.type;
          let content = '';
          let mediaUrl = null;
          let mediaType = null;

          if (type === 'text') {
            content = msg.text?.body;
          } else if (['image', 'video', 'audio', 'document'].includes(type)) {
            const mediaId = msg[type]?.id;
            mediaType = type;
            
            // Buscar configurações para API e Apps Script
            const { data: config } = await supabase.from('config').select('*').eq('id', 'default').single();
            
            if (config && config.whatsapp_api_token) {
              try {
                // 1. Pegar URL da mídia na Meta
                const mediaRes = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, {
                  headers: { Authorization: `Bearer ${config.whatsapp_api_token}` }
                });
                
                const metaMediaUrl = mediaRes.data.url;

                // 2. Se tiver Apps Script, baixa e envia pra lá
                if (config.apps_script_url) {
                  const fileRes = await axios.get(metaMediaUrl, {
                    headers: { Authorization: `Bearer ${config.whatsapp_api_token}` },
                    responseType: 'arraybuffer'
                  });
                  
                  const base64 = Buffer.from(fileRes.data).toString('base64');
                  const uploadRes = await axios.post(config.apps_script_url, {
                    base64: base64,
                    mimeType: msg[type]?.mime_type,
                    fileName: `${from}_${mediaId}`
                  });

                  if (uploadRes.data.status === 'success') {
                    mediaUrl = uploadRes.data.url;
                  }
                } else {
                  // Se não tiver Apps Script, salvamos o link da Meta (expira em 30 dias)
                  mediaUrl = metaMediaUrl;
                }
              } catch (e) {
                console.error('Error handling media:', e);
              }
            }
          }

          if (content || mediaUrl) {
            // Tenta achar o cliente pelo telefone
            const { data: client } = await supabase
              .from('clients')
              .select('id, name')
              .ilike('phone', `%${from.slice(-8)}%`) // Busca aproximada pelos últimos 8 dígitos
              .single();

            await supabase.from('whatsapp_messages').insert({
              phone: from,
              message: content,
              direction: 'inbound',
              media_url: mediaUrl,
              media_type: mediaType,
              client_id: client?.id || null
            });

            // --- NOVO: Encaminhamento e Resposta Automática ---
            const { data: config } = await supabase.from('config').select('*').eq('id', 'default').single();
            
            if (config) {
              // 1. Encaminhamento para o Comercial
              if (config.whatsapp_notification_enabled && config.whatsapp_forwarding_number) {
                const notificationText = `*Aviso de Mensagem:* \nCliente: ${client?.name || from}\n\n${content || '[Arquivo de Mídia]'}`;
                await axios.post(`https://graph.facebook.com/v21.0/${config.whatsapp_phone_number_id}/messages`, {
                  messaging_product: "whatsapp",
                  to: config.whatsapp_forwarding_number.replace(/\D/g, ''),
                  type: "text",
                  text: { body: notificationText }
                }, { headers: { Authorization: `Bearer ${config.whatsapp_api_token}` } }).catch(e => console.error("Erro encaminhamento:", e));
              }

              // 2. Resposta Automática (1x a cada 24h)
              if (config.whatsapp_auto_reply_enabled) {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data: recentMsgs } = await supabase
                  .from('whatsapp_messages')
                  .select('id')
                  .eq('phone', from)
                  .eq('direction', 'outbound')
                  .gt('created_at', twentyFourHoursAgo)
                  .limit(1);

                if (!recentMsgs || recentMsgs.length === 0) {
                  const replyText = config.whatsapp_auto_reply_message || "Olá! Recebemos sua mensagem.";
                  
                  await axios.post(`https://graph.facebook.com/v21.0/${config.whatsapp_phone_number_id}/messages`, {
                    messaging_product: "whatsapp",
                    to: from,
                    type: "text",
                    text: { body: replyText }
                  }, { headers: { Authorization: `Bearer ${config.whatsapp_api_token}` } });

                  // Registrar a resposta no chat
                  await supabase.from('whatsapp_messages').insert({
                    phone: from,
                    message: replyText,
                    direction: 'outbound',
                    client_id: client?.id || null
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing WhatsApp webhook:', err);
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
