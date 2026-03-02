import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Simple storage for config
const CONFIG_FILE = path.resolve('./mp_config.json');
let paymentConfig = {
  pfToken: '',
  pjToken: '',
  pjThreshold: 20000,
  infinityPayToken: '',
  infinityPayEnabled: false,
  allocationMode: 'SPLIT_BY_THRESHOLD',
  n8nWebhookUrl: '',
  autoReassignDays: 5,
  pixExpirationDays: 5,
  googleSheetId: '',
  googleApiKey: '',
  whatsappApiToken: '',
  whatsappPhoneNumberId: ''
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    paymentConfig = JSON.parse(data);
  } catch (e) {
    console.error("Error reading config file", e);
  }
}

app.get("/api/config", (req, res) => {
  res.json(paymentConfig);
});

app.post("/api/config", (req, res) => {
  paymentConfig = { ...paymentConfig, ...req.body };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(paymentConfig, null, 2));
  res.json({ status: "ok", config: paymentConfig });
});

app.post("/api/generate-pix", async (req, res) => {
  const { amount, description, tokenType, clientName, clientPhone, installmentId } = req.body;
  
  if (tokenType === 'INFINITY') {
    if (!paymentConfig.infinityPayToken) {
      return res.status(400).json({ error: "Token da InfinityPay não configurado" });
    }
    try {
      // Generic InfinityPay PIX implementation
      const response = await axios.post('https://api.infinitypay.io/v1/payments/pix', {
        amount: Math.round(amount * 100), // InfinityPay usually uses cents
        description,
        external_id: installmentId,
        expires_in: paymentConfig.pixExpirationDays * 24 * 60 * 60 // seconds
      }, {
        headers: { 'Authorization': `Bearer ${paymentConfig.infinityPayToken}` }
      });
      
      const pixCode = response.data.pix_code;
      
      if (paymentConfig.n8nWebhookUrl) {
        await axios.post(paymentConfig.n8nWebhookUrl, {
          type: 'PIX_GENERATED',
          provider: 'INFINITY',
          clientName, clientPhone, amount, pixCode, description
        }).catch(console.error);
      }
      
      return res.json({ pixCode });
    } catch (error: any) {
      console.error("InfinityPay Error:", error.response?.data || error.message);
      return res.status(500).json({ error: "Erro ao gerar PIX na InfinityPay" });
    }
  }

  const token = tokenType === 'PJ' ? paymentConfig.pjToken : paymentConfig.pfToken;
  
  if (!token) {
    return res.status(400).json({ error: "Token do Mercado Pago não configurado para " + tokenType });
  }

  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + (paymentConfig.pixExpirationDays || 5));

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
    const pixCode = pixData.qr_code;
    
    if (paymentConfig.n8nWebhookUrl) {
      await axios.post(paymentConfig.n8nWebhookUrl, {
        type: 'PIX_GENERATED',
        provider: 'MERCADO_PAGO',
        clientName, clientPhone, amount, pixCode, description
      }).catch(console.error);
    }

    res.json({ pixCode, qrCodeBase64: pixData.qr_code_base64 });
  } catch (error: any) {
    console.error("Mercado Pago Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao gerar PIX", details: error.response?.data });
  }
});

// Endpoint for N8N to trigger daily reminders
app.post("/api/automation/daily-reminders", async (req, res) => {
  res.json({ message: "Endpoint ready for N8N integration. Use this to fetch pending collections." });
});

app.post("/api/google-sheets/sync", async (req, res) => {
  const { googleSheetId, googleApiKey } = paymentConfig;
  
  if (!googleSheetId || !googleApiKey) {
    return res.status(400).json({ error: "Configuração do Google Sheets incompleta (ID ou API Key ausente)." });
  }

  try {
    // Fetch values from the first sheet (Sheet1!A:Z)
    const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/A:Z?key=${googleApiKey}`);
    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return res.json({ sales: [], clients: [] });
    }

    const headers = rows[0].map((h: string) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Map columns to indices
    const idx = {
      id: headers.indexOf('id'),
      clientName: headers.indexOf('cliente'),
      clientPhone: headers.indexOf('telefone'),
      clientAddress: headers.indexOf('endereco'),
      totalAmount: headers.indexOf('valor'),
      date: headers.indexOf('data'),
      condition: headers.indexOf('condicao'),
      installments: headers.indexOf('parcelas'),
      downPayment: headers.indexOf('entrada')
    };

    const importedSales: any[] = [];
    const importedClients: any[] = [];

    dataRows.forEach((row: any, index: number) => {
      const condition = row[idx.condition]?.toLowerCase().trim();
      
      // Filter by condition "crediario"
      if (condition === 'crediario') {
        const clientName = row[idx.clientName] || `Cliente ${index}`;
        const clientId = `gs-${clientName.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Add client if not exists
        if (!importedClients.find(c => c.id === clientId)) {
          importedClients.push({
            id: clientId,
            name: clientName,
            phone: row[idx.clientPhone] || '',
            address: row[idx.clientAddress] || '',
            city: '', state: '', cpf: '', rg: ''
          });
        }

        const totalAmount = parseFloat(row[idx.totalAmount]?.replace(',', '.') || '0');
        const downPayment = parseFloat(row[idx.downPayment]?.replace(',', '.') || '0');
        const installmentsCount = parseInt(row[idx.installments] || '1');
        const date = row[idx.date] || new Date().toISOString().split('T')[0];

        importedSales.push({
          id: row[idx.id] || `gs-${index + 1000}`,
          clientId,
          collectorId: 'loja', // Default to store
          date,
          totalAmount,
          downPayment,
          installmentsCount,
          tokenType: 'PF',
          description: 'Importado do Google Sheets'
        });
      }
    });

    res.json({ sales: importedSales, clients: importedClients });
  } catch (error: any) {
    console.error("Google Sheets Sync Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao sincronizar com Google Sheets. Verifique o ID e a API Key." });
  }
});

app.post("/api/whatsapp/send", async (req, res) => {
  const { phone, message } = req.body;
  const { whatsappApiToken, whatsappPhoneNumberId } = paymentConfig;

  if (!whatsappApiToken || !whatsappPhoneNumberId) {
    return res.status(400).json({ error: "WhatsApp API não configurada." });
  }

  try {
    const cleanedPhone = phone.replace(/\D/g, '');
    // Ensure phone has country code (default to 55 for Brazil if not present)
    const formattedPhone = cleanedPhone.length <= 11 ? `55${cleanedPhone}` : cleanedPhone;

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${whatsappApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ status: "ok", data: response.data });
  } catch (error: any) {
    console.error("WhatsApp API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao enviar mensagem via WhatsApp API", details: error.response?.data });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('./dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('./dist/index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
