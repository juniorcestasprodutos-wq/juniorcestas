import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ynesmbzptqwekcasikyg.supabase.co';
const supabaseAnonKey = 'sb_publishable_e_U0AMiySdKgZ4kh4_1zuw_yaCY_rip';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data } = await supabase.from('whatsapp_messages').select('phone').order('created_at', { ascending: false }).limit(1);
    console.log('Latest sender:', data?.[0]?.phone);
}

check();
