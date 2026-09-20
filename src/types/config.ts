/**
 * Lifecycle state machine: allowed statuses, entry point, transitions, and options.
 *
 * @template Status - String union of workflow statuses.
 */
export type LifecycleConfig<Status extends string> = {
    statuses: readonly Status[];
    initial: Status;
    transitions: Record<Status, readonly Status[]>;
    emoji?: Partial<Record<Status, string>>;
    terminal?: readonly Status[];
    version?: string;
    labelPrefix?: string;
};
