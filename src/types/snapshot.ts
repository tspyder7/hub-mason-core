import type { LifecycleConfig } from './config';
import type { Step, StepDefinition } from './step';

/**
 * Serializable lifecycle state: config, definitions, steps, and request metadata.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export interface LifecycleSnapshot<
    Status extends string,
    StepId extends string = string,
> {
    config: LifecycleConfig<Status>;
    definitions: readonly StepDefinition<StepId>[];
    steps: readonly Step<Status, StepId>[];
    meta: {
        requestId: string;
        requestType?: string;
        createdAt: string;
        portalVersion?: string;
    };
}
