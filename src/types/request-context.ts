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

/**
 * Props for creating a signed dispatch context.
 *
 * @template S - String union of workflow statuses.
 */
export type CreateDispatchContextProps<S extends string> = {
    snapshot: LifecycleSnapshot<S>;
    requestId: string;
    requestType: string;
    issuedAt: string;
    secret: string;
    actor?: string;
};

/**
 * Props for parsing and verifying a dispatch context.
 */
export type ParseDispatchContextProps = {
    inputs: { context?: string; request?: string };
    secret: string;
};
