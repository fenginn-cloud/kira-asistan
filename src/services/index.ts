import { isSupabaseConfigured } from '@/lib/supabase/client';
import { mockRepositories } from './repositories/mock';
import { supabaseRepositories } from './repositories/supabase';
import type { Repositories } from './repositories/types';

/**
 * Single composition root for data access.
 *
 * When EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are set, the app talks to Supabase;
 * otherwise it falls back to the in-memory mock. No feature code changes either
 * way — both satisfy the same `Repositories` interface.
 */
export const repositories: Repositories = isSupabaseConfigured
  ? supabaseRepositories
  : mockRepositories;

export const usingSupabase = isSupabaseConfigured;

export type { Repositories } from './repositories/types';
