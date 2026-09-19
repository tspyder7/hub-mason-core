import type { Step, StepStore } from '../../types/step';

/**
 * In-memory step store with subscription support.
 *
 * @template S - String union of workflow statuses.
 */
export class MemoryStore<S extends string> implements StepStore<S> {
    private steps: Step<S>[];

    private listeners: Set<(steps: readonly Step<S>[]) => void> = new Set();

    /**
     * Seeds the store with an initial step list.
     *
     * @param initial - Initial steps, copied defensively.
     */
    constructor(initial: Step<S>[] = []) {
        this.steps = [...initial];
    }

    /**
     * Returns current steps.
     *
     * @returns Readonly step list.
     */
    get(): readonly Step<S>[] {
        return this.steps;
    }

    /**
     * Replaces steps via updater and notifies subscribers.
     *
     * @param updater - Maps previous steps to next steps.
     */
    set(updater: (prev: readonly Step<S>[]) => readonly Step<S>[]): void {
        this.steps = [...updater(this.steps)];
        this.listeners.forEach((cb) => cb(this.steps));
    }

    /**
     * Subscribes to step changes.
     *
     * @param callback - Invoked with latest steps on each set.
     * @returns Unsubscribe function.
     */
    subscribe(callback: (steps: readonly Step<S>[]) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
}
