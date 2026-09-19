import type { LifecycleConfig } from './config';
import type { Step, StepDefinition } from './step';

/**
 * Serializable lifecycle state: config, definitions, steps, and request metadata.
 *
 * @template S - String union of workflow statuses.
 */
export interface LifecycleSnapshot<S extends string> {
    config: LifecycleConfig<S>;
    definitions: readonly StepDefinition[];
    steps: readonly Step<S>[];
    meta: {
        requestId: string;
        requestType?: string;
        createdAt: string;
        portalVersion?: string;
    };
}
