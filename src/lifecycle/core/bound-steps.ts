import { ValidationError } from './errors';
import { LifecycleManager } from './manager';

import type { BoundSteps, StepDefinition } from '../../types/step';

/**
 * Props for creating bound step helpers.
 *
 * @template Status - String union of workflow statuses.
 * @template Definitions - Readonly step definition tuple.
 * @template ManagerStepId - Manager step ID union.
 */
export type CreateBoundStepsProps<
    Status extends string,
    Definitions extends readonly StepDefinition<string>[],
    ManagerStepId extends string = string,
> = {
    manager: LifecycleManager<Status, ManagerStepId>;
    definitions: Definitions;
    running: Status;
    done: Status;
    failed: Status;
};

/**
 * Props for failing the active step without definitions.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export type FailActiveProps<
    Status extends string,
    StepId extends string = string,
> = {
    manager: LifecycleManager<Status, StepId>;
    running: Status;
    error: unknown;
    failed?: Status;
};

const assertKnownStep = <
    const Definitions extends readonly StepDefinition<string>[],
>(
    definitions: Definitions,
    id: string,
): void => {
    const known = definitions.some(({ id: defId }) => defId === id);

    if (!known) {
        throw new ValidationError(`Unknown step: ${id}`);
    }
};

/**
 * Fails the step currently in running status, if any.
 *
 * Encapsulated here so callers never query store directly.
 * Emits exactly one reporter notification via manager.fail.
 *
 * @param props - Manager, running status, and error cause.
 */
export const failActiveStep = async <
    Status extends string,
    StepId extends string = string,
>(
    props: FailActiveProps<Status, StepId>,
): Promise<void> => {
    const active = props.manager.findByStatus(props.running);

    if (!active) {
        return;
    }

    await props.manager.fail(active.id, props.error, props.failed);
};

/**
 * Creates type-safe step helpers bound to a definition list.
 *
 * Takes params as object, holds no singleton references.
 * All mutations flow via LifecycleManager methods.
 * failActive lives only here, not on manager.
 *
 * @param props - Manager, definitions, and running/done/failed mapping.
 * @returns Bound helpers with failActive and cancelPending.
 */
export const createBoundSteps = <
    Status extends string,
    const Definitions extends readonly StepDefinition<string>[],
    ManagerStepId extends string = string,
>(
    props: CreateBoundStepsProps<Status, Definitions, ManagerStepId>,
): BoundSteps<Definitions> => {
    const { manager, definitions, running, done, failed } = props;

    return {
        beginStep: async (id, name?: string) => {
            assertKnownStep(definitions, id as string);

            if (name !== undefined) {
                await manager.renameStep(id as string as ManagerStepId, name);
            }

            await manager.transition(id as string as ManagerStepId, running);
        },
        finishStep: async (id) => {
            assertKnownStep(definitions, id as string);
            await manager.transition(id as string as ManagerStepId, done);
        },
        failStep: async (id, error: unknown) => {
            assertKnownStep(definitions, id as string);
            await manager.fail(id as string as ManagerStepId, error, failed);
        },
        addStepDetails: async (id, detail: string) => {
            assertKnownStep(definitions, id as string);
            await manager.addDetail(id as string as ManagerStepId, detail);
        },
        failActive: async (error: unknown) => {
            await failActiveStep({ manager, running, failed, error });
        },
        cancelPending: () => {
            manager.cancelPending();
        },
    };
};
