import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqqoillzclrrfnadldaz.supabase.co';
const supabaseAnonKey = 'sb_publishable_sndmSiltP7sxj-aeKihwcg_DX6Z95qa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
