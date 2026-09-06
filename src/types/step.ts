/**
 * Static step metadata (stable ID plus display name).
 */
export interface StepDefinition {
    id: string;
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
 * @template S - String union of workflow statuses.
 */
export interface Step<S extends string> {
    id: string;
    name: string;
    status: S;
    startedAt?: string;
    completedAt?: string;
    details: string[];
    error?: StepError;
}

/**
 * Storage contract for step lists.
 *
 * @template S - String union of workflow statuses.
 */
export interface StepStore<S extends string> {
    /** Returns current steps. */
    get(): readonly Step<S>[];
    /**
     * Replaces steps via updater.
     *
     * @param updater - Maps previous steps to next steps.
     */
    set(updater: (prev: readonly Step<S>[]) => readonly Step<S>[]): void;
    /**
     * Subscribes to step changes.
     *
     * @param callback - Invoked with latest steps.
     * @returns Unsubscribe function.
     */
    subscribe?(callback: (steps: readonly Step<S>[]) => void): () => void;
}

/**
 * Observer notified on step transitions and detail changes.
 *
 * @template S - String union of workflow statuses.
 */
export interface Reporter<S extends string> {
    /**
     * Handles a step transition.
     *
     * @param event - Changed step, from/to statuses, and full list.
     */
    onTransition?: (event: {
        step: Step<S>;
        from: S;
        to: S;
        all: readonly Step<S>[];
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
 * @template T - Readonly step definition tuple.
 */
export type BoundSteps<T extends readonly StepDefinition[]> = {
    beginStep: (id: T[number]['id'], name?: string) => Promise<void>;
    finishStep: (id: T[number]['id']) => Promise<void>;
    failStep: (id: T[number]['id'], error: unknown) => Promise<void>;
    addStepDetails: (id: T[number]['id'], detail: string) => Promise<void>;
};
