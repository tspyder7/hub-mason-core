/**
 * Lifecycle state machine: allowed statuses, entry point, transitions, and options.
 *
 * @template S - String union of workflow statuses.
 */
export type LifecycleConfig<S extends string> = {
    statuses: readonly S[];
    initial: S;
    transitions: Record<S, readonly S[]>;
    emoji?: Partial<Record<S, string>>;
    terminal?: readonly S[];
    version?: string;
    labelPrefix?: string;
};
