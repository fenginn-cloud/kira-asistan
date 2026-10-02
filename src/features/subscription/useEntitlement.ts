import { useMemo } from 'react';
import { useCompany } from '@/features/users/hooks';
import { resolveEntitlement, type Entitlement } from './entitlement';

/**
 * Resolves the current company's entitlement (company-level plan + limits).
 * Read-only: reports the plan; does not enforce limits.
 */
export function useEntitlement(): Entitlement {
  const { data: company } = useCompany();
  return useMemo(() => resolveEntitlement(company), [company]);
}
