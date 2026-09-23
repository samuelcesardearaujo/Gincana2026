import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://SUO_PROJETO.supabase.co';
const supabaseAnonKey = 'SUA_CHAVE_ANON_PUBLIC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
