import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ynesmbzptqwekcasikyg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_e_U0AMiySdKgZ4kh4_1zuw_yaCY_rip';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
