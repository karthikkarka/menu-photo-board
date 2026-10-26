import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  missingSettings: string[];
  supabaseUrl?: string;
  hasKey: boolean;
}

export function checkSupabaseConfig(): SupabaseConfigStatus {
  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseKey || supabaseKey.trim() === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  return {
    isConfigured: missing.length === 0,
    missingSettings: missing,
    supabaseUrl,
    hasKey: !!supabaseKey,
  };
}

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { isConfigured } = checkSupabaseConfig();
  if (!isConfigured || !supabaseUrl || !supabaseKey) {
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}
