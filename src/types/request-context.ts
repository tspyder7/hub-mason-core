import type { LifecycleSnapshot } from './snapshot';

/**
 * Signed handoff payload between portal and engine.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export interface RequestContext<
    Status extends string,
    StepId extends string = string,
> {
    requestId: string;
    requestType: string;
    lifecycleSnapshot: LifecycleSnapshot<Status, StepId>;
    signature: string;
    issuedAt: string;
    actor?: string;
}

/**
 * Props for creating a signed dispatch context.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export type CreateDispatchContextProps<
    Status extends string,
    StepId extends string = string,
> = {
    snapshot: LifecycleSnapshot<Status, StepId>;
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
