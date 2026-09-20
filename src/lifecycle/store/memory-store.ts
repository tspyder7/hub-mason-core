import type { Step, StepStore } from '../../types/step';

/**
 * In-memory step store with subscription support.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export class MemoryStore<
    Status extends string,
    StepId extends string = string,
> implements StepStore<Status, StepId> {
    private steps: Step<Status, StepId>[];

    private listeners: Set<(steps: readonly Step<Status, StepId>[]) => void> =
        new Set();

    /**
     * Seeds the store with an initial step list.
     *
     * @param initial - Initial steps, copied defensively.
     */
    constructor(initial: Step<Status, StepId>[] = []) {
        this.steps = [...initial];
    }

    /**
     * Returns current steps.
     *
     * @returns Readonly step list.
     */
    get(): readonly Step<Status, StepId>[] {
        return this.steps;
    }

    /**
     * Replaces steps via updater and notifies subscribers.
     *
     * @param updater - Maps previous steps to next steps.
     */
    set(
        updater: (
            prev: readonly Step<Status, StepId>[],
        ) => readonly Step<Status, StepId>[],
    ): void {
        this.steps = [...updater(this.steps)];
        this.listeners.forEach((cb) => cb(this.steps));
    }

    /**
     * Subscribes to step changes.
     *
     * @param callback - Invoked with latest steps on each set.
     * @returns Unsubscribe function.
     */
    subscribe(
        callback: (steps: readonly Step<Status, StepId>[]) => void,
    ): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
}
