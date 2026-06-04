
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

export const initializeSupabase = (url: string, key: string) => {
    if (!supabase) {
        // Create client with specific realtime settings for better stability
        supabase = createClient(url, key, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });
    }
    return supabase;
};

export const getSupabase = () => supabase;

export { supabase };
