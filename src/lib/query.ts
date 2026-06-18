import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralized query keys to keep cache invalidation consistent. */
export const queryKeys = {
  contracts: ['contracts'] as const,
  contract: (id: string) => ['contracts', id] as const,
  paymentsByContract: (id: string) => ['payments', 'contract', id] as const,
  paymentsAll: ['payments', 'all'] as const,
  transactions: (paymentId: string) => ['transactions', paymentId] as const,
  users: ['users'] as const,
  company: ['company'] as const,
};
