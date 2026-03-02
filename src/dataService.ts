import { supabase } from './supabaseClient';
import { User, Client, Sale, Installment, Role, PaymentProviderConfig } from '../types';

export const dataService = {
    // Users
    async getUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name');
        if (error) throw error;
        return data.map(u => ({
            id: u.id,
            name: u.name,
            phone: u.phone,
            role: u.role as Role,
            username: u.username,
            password: u.password,
            active: u.active,
            saleCommissionRate: Number(u.sale_commission_rate),
            collectionCommissionRate: Number(u.collection_commission_rate)
        }));
    },

    async saveUser(user: Partial<User>): Promise<void> {
        const payload = {
            name: user.name,
            phone: user.phone,
            role: user.role,
            username: user.username,
            password: user.password,
            active: user.active,
            sale_commission_rate: user.saleCommissionRate,
            collection_commission_rate: user.collectionCommissionRate
        };

        if (user.id) {
            const { error } = await supabase.from('users').update(payload).eq('id', user.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('users').insert(payload);
            if (error) throw error;
        }
    },

    // Clients
    async getClients(): Promise<Client[]> {
        const { data, error } = await supabase.from('clients').select('*').order('name');
        if (error) throw error;
        return data.map(c => ({
            id: c.id,
            name: c.name,
            address: c.address,
            neighborhood: c.neighborhood,
            phone: c.phone,
            city: c.city,
            state: c.state,
            cpf: c.cpf,
            rg: c.rg,
            rgImage: c.rg_image,
            cpfImage: c.cpf_image,
            utilityBillImage: c.utility_bill_image,
            housePhoto: c.house_photo,
            referralClientId: c.referral_client_id,
            coordinates: { lat: Number(c.lat), lng: Number(c.lng) }
        }));
    },

    async saveClient(client: Partial<Client>): Promise<string> {
        const payload = {
            name: client.name,
            address: client.address,
            neighborhood: client.neighborhood,
            phone: client.phone,
            city: client.city,
            state: client.state,
            cpf: client.cpf,
            rg: client.rg,
            rg_image: client.rgImage,
            cpf_image: client.cpfImage,
            utility_bill_image: client.utilityBillImage,
            house_photo: client.housePhoto,
            referral_client_id: client.referralClientId || null,
            lat: client.coordinates?.lat,
            lng: client.coordinates?.lng
        };

        if (client.id) {
            const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
            if (error) throw error;
            return client.id;
        } else {
            const { data, error } = await supabase.from('clients').insert(payload).select().single();
            if (error) throw error;
            return data.id;
        }
    },

    // Sales
    async getSales(): Promise<Sale[]> {
        const { data, error } = await supabase
            .from('sales')
            .select('*, installments(*), sale_items(*)');
        if (error) throw error;

        return data.map(s => ({
            id: s.id,
            clientId: s.client_id,
            collectorId: s.collector_id || 'loja',
            deliveryPersonId: s.delivery_person_id,
            date: s.date,
            totalAmount: Number(s.total_amount),
            downPayment: Number(s.down_payment),
            installmentsCount: s.installments_count,
            tokenType: s.token_type as any,
            status: s.status as any,
            items: s.sale_items.map((si: any) => ({
                quantity: si.quantity,
                description: si.description,
                unitPrice: Number(si.unit_price),
                total: Number(si.total)
            })),
            installments: s.installments.map((inst: any) => ({
                id: inst.id,
                saleId: inst.sale_id,
                number: inst.number,
                dueDate: inst.due_date,
                amount: Number(inst.amount),
                paidAmount: Number(inst.paid_amount),
                status: inst.status as any,
                pixSent: inst.pix_sent,
                manualAdjustment: Number(inst.manual_adjustment)
            }))
        }));
    },

    async saveSale(sale: Sale): Promise<void> {
        const { error: saleError } = await supabase.from('sales').upsert({
            id: sale.id,
            client_id: sale.clientId,
            collector_id: (sale.collectorId === 'loja' || !sale.collectorId) ? null : sale.collectorId,
            delivery_person_id: sale.deliveryPersonId || null,
            date: sale.date,
            total_amount: sale.totalAmount,
            down_payment: sale.downPayment,
            installments_count: sale.installmentsCount,
            token_type: sale.tokenType,
            status: sale.status
        });
        if (saleError) throw saleError;

        // Save items
        const itemsPayload = sale.items.map(item => ({
            sale_id: sale.id,
            quantity: item.quantity,
            description: item.description,
            unit_price: item.unitPrice,
            total: item.total
        }));
        const { error: itemsError } = await supabase.from('sale_items').insert(itemsPayload);
        if (itemsError) throw itemsError;

        // Save installments
        const instPayload = sale.installments.map(inst => ({
            id: inst.id,
            sale_id: sale.id,
            number: inst.number,
            due_date: inst.dueDate,
            amount: inst.amount,
            paid_amount: inst.paidAmount,
            status: inst.status,
            pix_sent: inst.pixSent,
            manual_adjustment: inst.manualAdjustment
        }));
        const { error: instError } = await supabase.from('installments').upsert(instPayload);
        if (instError) throw instError;
    },

    // Config
    async getConfig(): Promise<PaymentProviderConfig> {
        const { data, error } = await supabase.from('config').select('*').eq('id', 'default').single();
        if (error) throw error;
        return {
            pfToken: data.pf_token,
            pjToken: data.pj_token,
            pjThreshold: Number(data.pj_threshold),
            infinityPayToken: data.infinity_pay_token,
            infinityPayEnabled: data.infinity_pay_enabled,
            allocationMode: data.allocation_mode as any,
            n8nWebhookUrl: data.n8n_webhook_url,
            autoReassignDays: data.auto_reassign_days,
            pixExpirationDays: data.pix_expiration_days,
            googleSheetId: data.google_sheet_id,
            googleApiKey: data.google_api_key,
            whatsappApiToken: data.whatsapp_api_token,
            whatsappPhoneNumberId: data.whatsapp_phone_number_id
        };
    },

    async saveConfig(config: PaymentProviderConfig): Promise<void> {
        const { error } = await supabase.from('config').update({
            pf_token: config.pfToken,
            pj_token: config.pjToken,
            pj_threshold: config.pjThreshold,
            infinity_pay_token: config.infinityPayToken,
            infinity_pay_enabled: config.infinityPayEnabled,
            allocation_mode: config.allocationMode,
            n8n_webhook_url: config.n8nWebhookUrl,
            auto_reassign_days: config.autoReassignDays,
            pix_expiration_days: config.pixExpirationDays,
            google_sheet_id: config.googleSheetId,
            google_api_key: config.googleApiKey,
            whatsapp_api_token: config.whatsappApiToken,
            whatsapp_phone_number_id: config.whatsappPhoneNumberId
        }).eq('id', 'default');
        if (error) throw error;
    }
};
