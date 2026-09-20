/**
 * Static step metadata (stable ID plus display name).
 *
 * @template StepId - String union of step IDs.
 */
export interface StepDefinition<StepId extends string = string> {
    id: StepId;
    name: string;
}

/**
 * Serializable step failure (message plus optional stack).
 */
export interface StepError {
    message: string;
    stack?: string;
}

/**
 * Runtime step with status, timestamps, details, and optional error.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export interface Step<Status extends string, StepId extends string = string> {
    id: StepId;
    name: string;
    status: Status;
    startedAt?: string;
    completedAt?: string;
    details: string[];
    error?: StepError;
}

/**
 * Storage contract for step lists.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export interface StepStore<
    Status extends string,
    StepId extends string = string,
> {
    /** Returns current steps. */
    get(): readonly Step<Status, StepId>[];
    /**
     * Replaces steps via updater.
     *
     * @param updater - Maps previous steps to next steps.
     */
    set(
        updater: (
            prev: readonly Step<Status, StepId>[],
        ) => readonly Step<Status, StepId>[],
    ): void;
    /**
     * Subscribes to step changes.
     *
     * @param callback - Invoked with latest steps.
     * @returns Unsubscribe function.
     */
    subscribe?(
        callback: (steps: readonly Step<Status, StepId>[]) => void,
    ): () => void;
}

/**
 * Observer notified on step transitions and detail changes.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export interface Reporter<
    Status extends string,
    StepId extends string = string,
> {
    /**
     * Handles a step transition.
     *
     * @param event - Changed step, from/to statuses, and full list.
     */
    onTransition?: (event: {
        step: Step<Status, StepId>;
        from: Status;
        to: Status;
        all: readonly Step<Status, StepId>[];
    }) => Promise<void> | void;
}

/**
 * Workflow run metadata used in rendered comments.
 */
export interface WorkflowMeta {
    requestId: string;
    requestType?: string;
    owner?: string;
    repo?: string;
    runId?: number;
    actor?: string;
}

/**
 * Type-safe step helpers bound to a definition list.
 *
 * @template Definitions - Readonly step definition tuple.
 */
export type BoundSteps<Definitions extends readonly StepDefinition<string>[]> =
    {
        beginStep: (
            id: Definitions[number]['id'],
            name?: string,
        ) => Promise<void>;
        finishStep: (id: Definitions[number]['id']) => Promise<void>;
        failStep: (
            id: Definitions[number]['id'],
            error: unknown,
        ) => Promise<void>;
        addStepDetails: (
            id: Definitions[number]['id'],
            detail: string,
        ) => Promise<void>;
        failActive: (error: unknown) => Promise<void>;
        cancelPending: () => void;
    };
