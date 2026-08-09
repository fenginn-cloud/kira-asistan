import { useContracts } from '@/features/contracts/hooks';
import { useEntitlement } from './useEntitlement';
import type { PlanId } from '@/types';

export interface ContractGate {
  /** Whether a new contract may be created right now. */
  allowed: boolean;
  /** True when the plan limit has been reached. */
  atLimit: boolean;
  /** Contract limit for the plan; null = unlimited. */
  limit: number | null;
  /** Current contract count for the company. */
  count: number;
  plan: PlanId;
  isLegacy: boolean;
}

/**
 * Gate for creating new contracts. Enforcement is "block only new records":
 * existing contracts are never touched; once a Free company reaches its limit,
 * only *new* creation is blocked. Legacy/unlimited plans are never blocked.
 */
export function useContractGate(): ContractGate {
  const entitlement = useEntitlement();
  const { data: contracts } = useContracts();
  const count = contracts?.length ?? 0;
  const limit = entitlement.limits.maxContracts;
  const atLimit = limit !== null && count >= limit;
  return {
    allowed: !atLimit,
    atLimit,
    limit,
    count,
    plan: entitlement.plan,
    isLegacy: entitlement.isLegacy,
  };
}
