import type { LifecycleConfig } from './config';
import type { Reporter, StepDefinition, StepStore } from './step';

/**
 * Props for constructing a LifecycleManager.
 *
 * @template S - String union of workflow statuses.
 */
export type LifecycleManagerProps<S extends string> = {
    definitions: readonly StepDefinition[];
    config: LifecycleConfig<S>;
    store: StepStore<S>;
    reporter?: Reporter<S>;
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
 * @template S - String union of workflow statuses.
 */
export type FromSnapshotProps<S extends string> = {
    snapshot: unknown;
    store?: StepStore<S>;
    reporter?: Reporter<S>;
    clock?: () => string;
};
