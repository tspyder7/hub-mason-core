import type { LifecycleConfig } from './config';
import type { Reporter, StepDefinition, StepStore } from './step';

/**
 * Props for constructing a LifecycleManager.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export type LifecycleManagerProps<
    Status extends string,
    StepId extends string = string,
> = {
    definitions: readonly StepDefinition<StepId>[];
    config: LifecycleConfig<Status>;
    store: StepStore<Status, StepId>;
    reporter?: Reporter<Status, StepId>;
    clock?: () => string;
};

/**
 * Props for building a snapshot stamped with request metadata.
 */
export type GetSnapshotWithMetaProps = {
    requestId: string;
    requestType?: string;
    createdAt?: string;
    portalVersion?: string;
};

/**
 * Props for rehydrating a manager from a serialized snapshot.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export type FromSnapshotProps<
    Status extends string,
    StepId extends string = string,
> = {
    snapshot: unknown;
    definitions?: readonly StepDefinition<StepId>[];
    store?: StepStore<Status, StepId>;
    reporter?: Reporter<Status, StepId>;
    clock?: () => string;
};
