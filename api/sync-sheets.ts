import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { data: config, error: configError } = await supabase
            .from('config')
            .select('*')
            .eq('id', 'default')
            .single();

        if (configError || !config || !config.google_sheet_id || !config.google_api_key) {
            return res.status(400).json({ error: "Configuração do Google Sheets incompleta." });
        }

        const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${config.google_sheet_id}/values/A:Z?key=${config.google_api_key}`);
        const rows = response.data.values;

        if (!rows || rows.length < 2) {
            return res.json({ sales: [], clients: [] });
        }

        const headers = rows[0].map((h: string) => h.toLowerCase().trim());
        const dataRows = rows.slice(1);

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
            if (condition === 'crediario') {
                const clientName = row[idx.clientName] || `Cliente ${index}`;
                const clientId = `gs-${clientName.replace(/\s+/g, '-').toLowerCase()}`;

                if (!importedClients.find(c => c.id === clientId)) {
                    importedClients.push({
                        id: clientId, name: clientName, phone: row[idx.clientPhone] || '',
                        address: row[idx.clientAddress] || '',
                        city: '', state: '', cpf: '', rg: ''
                    });
                }

                importedSales.push({
                    id: row[idx.id] || `gs-${index + 1000}`,
                    clientId, collectorId: 'loja', date: row[idx.date] || new Date().toISOString().split('T')[0],
                    totalAmount: parseFloat(row[idx.totalAmount]?.replace(',', '.') || '0'),
                    downPayment: parseFloat(row[idx.downPayment]?.replace(',', '.') || '0'),
                    installmentsCount: parseInt(row[idx.installments] || '1'),
                    tokenType: 'PF', description: 'Importado do Google Sheets'
                });
            }
        });

        res.json({ sales: importedSales, clients: importedClients });
    } catch (error: any) {
        console.error("Sheets Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro ao sincronizar com Google Sheets." });
    }
}
