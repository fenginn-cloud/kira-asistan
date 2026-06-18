/**
 * Supabase client (Phase 2).
 *
 * This file is wired and ready: it reads credentials from app config / env.
 * Until EXPO_PUBLIC_SUPABASE_URL is set, the mock repositories remain active
 * (see src/services/index.ts). To go live:
 *   1. Fill .env from .env.example
 *   2. Apply supabase/migrations
 *   3. Implement src/services/repositories/supabase/* against this client
 *   4. Point `repositories` in src/services/index.ts at the Supabase impl
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
