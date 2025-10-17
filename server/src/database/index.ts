/* eslint-disable no-undef */
import { createClient } from '@supabase/supabase-js';

export const supabaseConnection = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

export default supabaseConnection;
