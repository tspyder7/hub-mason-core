import type { LifecycleSnapshot } from './snapshot';

/**
 * Signed handoff payload between portal and engine.
 *
 * @template S - String union of workflow statuses.
 */
export interface RequestContext<S extends string> {
    requestId: string;
    requestType: string;
    lifecycleSnapshot: LifecycleSnapshot<S>;
    signature: string;
    issuedAt: string;
    actor?: string;
}
