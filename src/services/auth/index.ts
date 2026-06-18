import { isSupabaseConfigured } from '@/lib/supabase/client';
import { mockAuthProvider } from './mock';
import { supabaseAuthProvider } from './supabase';
import type { AuthProvider } from './types';

export const authProvider: AuthProvider = isSupabaseConfigured
  ? supabaseAuthProvider
  : mockAuthProvider;

export type { AuthProvider } from './types';
