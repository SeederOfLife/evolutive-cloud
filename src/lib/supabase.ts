import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[key]) return metaEnv[key];
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key] || '';
    }
  } catch {
    // Fallback to empty string if process is not defined
  }
  
  return '';
};

const supabaseUrl = (getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL')).trim();
const supabaseAnonKey = (getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')).trim();

const logStatus = (key: string, val: string) => {
  console.log(`Checking ${key}: ${val ? 'Present (length ' + val.length + ')' : 'Missing'}`);
};

if ((import.meta as any).env?.DEV) {
  logStatus('SUPABASE_URL', supabaseUrl);
  logStatus('SUPABASE_ANON_KEY', supabaseAnonKey);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Evolutive Cloud is running in local/mock mode.");
  console.info("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC alternatives) are set in your environment.");
} else {
  console.log("Supabase client initialized successfully.");
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
