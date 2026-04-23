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

let supabaseInstance = null;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized successfully.");
  } else {
    console.warn("Supabase credentials missing. Evolutive Cloud is running in local/mock mode.");
  }
} catch (err) {
  console.error("Critical error during Supabase initialization:", err);
}

export const supabase = supabaseInstance;
