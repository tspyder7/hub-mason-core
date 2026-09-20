import { toStepError, TransitionError, ValidationError } from './errors';
import { lifecycleConfigSchema } from '../schemas/config.schema';
import { lifecycleSnapshotSchema } from '../schemas/snapshot.schema';
import { MemoryStore } from '../store/memory-store';

import type { LifecycleConfig } from '../../types/config';
import type {
    FromSnapshotProps,
    GetSnapshotWithMetaProps,
    LifecycleManagerProps,
} from '../../types/manager';
import type { LifecycleSnapshot } from '../../types/snapshot';
import type {
    Reporter,
    Step,
    StepDefinition,
    StepStore,
} from '../../types/step';

/**
 * Orchestrates step state, transitions, snapshots, and reporter notifications.
 *
 * @template Status - String union of workflow statuses.
 * @template StepId - String union of step IDs.
 */
export class LifecycleManager<
    Status extends string,
    StepId extends string = string,
> {
    private readonly definitions: readonly StepDefinition<StepId>[];

    private readonly config: LifecycleConfig<Status>;

    private readonly store: StepStore<Status, StepId>;

    private readonly reporter?: Reporter<Status, StepId>;

    private readonly clock: () => string;

    /**
     * Validates config/definitions and seeds the store when empty.
     *
     * @param props - Step definitions, config, store, reporter, and clock.
     * @throws When config is invalid, ids collide, or self-transitions exist.
     */
    constructor(props: LifecycleManagerProps<Status, StepId>) {
        lifecycleConfigSchema.parse(props.config);

        const defIds = props.definitions.map(({ id }) => id);
        const uniqueIds = new Set(defIds);

        if (uniqueIds.size !== defIds.length) {
            throw new ValidationError('Step definitions must have unique ids');
        }

        for (const from of Object.keys(props.config.transitions) as Status[]) {
            const allowed = props.config.transitions[from] ?? [];

            if (allowed.includes(from)) {
                throw new ValidationError(
                    `self transition not allowed for "${from}"`,
                );
            }
        }

        this.definitions = props.definitions;
        this.config = props.config;
        this.store = props.store;
        this.reporter = props.reporter;
        this.clock = props.clock ?? (() => new Date().toISOString());

        const existing = this.store.get();

        !existing.length
            ? this.store.set(() =>
                  this.definitions.map((def) => ({
                      id: def.id,
                      name: def.name,
                      status: this.config.initial,
                      details: [],
                  })),
              )
            : this.validateSteps(existing);
    }

    /**
     * Current steps from the store.
     *
     * @returns Readonly step list.
     */
    get steps(): readonly Step<Status, StepId>[] {
        return this.store.get();
    }

    /**
     * Returns the configured step definitions.
     *
     * @returns Readonly step definitions.
     */
    getDefinitions(): readonly StepDefinition<StepId>[] {
        return this.definitions;
    }

    /**
     * Returns the active lifecycle configuration.
     *
     * @returns Lifecycle config.
     */
    getConfig(): LifecycleConfig<Status> {
        return this.config;
    }

    /**
     * Builds a snapshot of config, definitions, steps, and fresh metadata.
     *
     * @returns Lifecycle snapshot with generated timestamp.
     */
    getSnapshot(): LifecycleSnapshot<Status, StepId> {
        const steps = this.store.get();

        return {
            config: this.config,
            definitions: this.definitions,
            steps,
            meta: {
                requestId: '',
                createdAt: this.clock(),
            },
        } as LifecycleSnapshot<Status, StepId>;
    }

    /**
     * Builds a snapshot stamped with the given request metadata.
     *
     * @param props - Request ID plus optional type, timestamp, and portal version.
     * @returns Lifecycle snapshot with supplied metadata.
     */
    getSnapshotWithMeta(
        props: GetSnapshotWithMetaProps,
    ): LifecycleSnapshot<Status, StepId> {
        const steps = this.store.get();

        return {
            config: this.config,
            definitions: this.definitions,
            steps,
            meta: {
                requestId: props.requestId,
                requestType: props.requestType,
                createdAt: props.createdAt ?? this.clock(),
                portalVersion: props.portalVersion,
            },
        } as LifecycleSnapshot<Status, StepId>;
    }

    /**
     * Rehydrates a manager from a serialized snapshot.
     *
     * Preserves literal status and ID types via explicit generics.
     * Pass definitions to retain tuple literals lost in JSON round-trip.
     *
     * @param props - Raw snapshot plus optional definitions, store, reporter, and clock.
     * @returns New manager bound to the parsed snapshot.
     * @throws When the snapshot fails schema validation.
     */
    static fromSnapshot<Status extends string, StepId extends string = string>(
        props: FromSnapshotProps<Status, StepId>,
    ): LifecycleManager<Status, StepId> {
        const parsed = lifecycleSnapshotSchema.parse(
            props.snapshot,
        ) as unknown as LifecycleSnapshot<Status, StepId>;

        const definitions =
            props.definitions ??
            (parsed.definitions as StepDefinition<StepId>[]);

        const store: StepStore<Status, StepId> =
            props.store ??
            new MemoryStore<Status, StepId>(
                parsed.steps as Step<Status, StepId>[],
            );

        if (props.store) {
            store.set(() => parsed.steps as Step<Status, StepId>[]);
        }

        return new LifecycleManager<Status, StepId>({
            definitions,
            config: parsed.config as LifecycleConfig<Status>,
            store,
            reporter: props.reporter,
            clock: props.clock,
        });
    }

    /**
     * Moves a step to a new status after validating the transition.
     *
     * @param id - Step ID.
     * @param to - Target status.
     * @returns Updated step.
     * @throws When the step is unknown, the status is unknown, or the transition is illegal.
     */
    async transition(id: StepId, to: Status): Promise<Step<Status, StepId>> {
        const steps = this.store.get();
        const step = steps.find((s) => s.id === id);

        if (!step) {
            throw new ValidationError(`Step not found: ${id}`);
        }

        if (!this.config.statuses.includes(to)) {
            throw new ValidationError(`Unknown status: ${to}`);
        }

        const from = step.status;
        const allowed = this.config.transitions[from] ?? [];

        if (!allowed.includes(to as never)) {
            throw new TransitionError(
                `Invalid transition ${from} -> ${to} for step ${id}`,
            );
        }

        const now = this.clock();
        const nextStep: Step<Status, StepId> = {
            ...step,
            status: to,
            startedAt: step.startedAt ?? now,
            completedAt: this.isTerminal(to) ? now : step.completedAt,
        };

        const nextSteps = steps.map((s) => (s.id === id ? nextStep : s));

        this.store.set(() => nextSteps);

        if (this.reporter?.onTransition) {
            await this.reporter.onTransition({
                step: nextStep,
                from,
                to,
                all: nextSteps,
            });
        }

        return nextStep;
    }

    /**
     * Appends a detail string to a step and notifies the reporter.
     *
     * @param id - Step ID.
     * @param detail - Detail to append.
     * @returns Updated step.
     * @throws When the step is unknown.
     */
    async addDetail(id: StepId, detail: string): Promise<Step<Status, StepId>> {
        const steps = this.store.get();
        const step = steps.find((s) => s.id === id);

        if (!step) {
            throw new ValidationError(`Step not found: ${id}`);
        }

        const nextStep: Step<Status, StepId> = {
            ...step,
            details: [...step.details, detail],
        };

        const nextSteps = steps.map((s) => (s.id === id ? nextStep : s));

        this.store.set(() => nextSteps);

        // Details change is not a status transition but notify reporter if present
        if (this.reporter?.onTransition) {
            await this.reporter.onTransition({
                step: nextStep,
                from: step.status,
                to: step.status,
                all: nextSteps,
            });
        }

        return nextStep;
    }

    /**
     * Renames a step without emitting a reporter notification.
     *
     * @param id - Step ID.
     * @param name - New display name.
     * @returns Updated step.
     * @throws When the step is unknown.
     */
    async renameStep(id: StepId, name: string): Promise<Step<Status, StepId>> {
        const step = this.store.get().find((s) => s.id === id);

        if (!step) {
            throw new ValidationError(`Step not found: ${id}`);
        }

        const nextStep: Step<Status, StepId> = { ...step, name };

        this.store.set((prev) => prev.map((s) => (s.id === id ? nextStep : s)));

        return nextStep;
    }

    /**
     * Forces a step into the failed status with attached error.
     *
     * Bypasses transition validation like run() failure path.
     * Emits exactly one reporter notification.
     *
     * @param id - Step ID.
     * @param error - Failure cause, serialized via toStepError.
     * @param status - Optional failed status override, defaults to inferred.
     * @returns Updated failed step.
     * @throws When the step is unknown.
     */
    async fail(
        id: StepId,
        error: unknown,
        status?: Status,
    ): Promise<Step<Status, StepId>> {
        const current = this.store.get().find((s) => s.id === id);

        if (!current) {
            throw new ValidationError(`Step not found: ${id}`);
        }

        const failed = status ?? this.inferFailedStatus();
        const failedStep: Step<Status, StepId> = {
            ...current,
            status: failed,
            completedAt: this.clock(),
            error: toStepError(error),
        };

        this.store.set((prev) =>
            prev.map((s) => (s.id === id ? failedStep : s)),
        );

        if (this.reporter?.onTransition) {
            await this.reporter.onTransition({
                step: failedStep,
                from: current.status,
                to: failed,
                all: this.store.get(),
            });
        }

        return failedStep;
    }

    /**
     * Marks every non-terminal step with the cancel/terminal status.
     */
    cancelPending(): void {
        const terminal = this.config.terminal ?? [];
        const cancelStatus = (terminal.find((s: string) =>
            s.toLowerCase().includes('cancel'),
        ) ??
            terminal[0] ??
            this.config.statuses[this.config.statuses.length - 1]) as Status;

        const now = this.clock();

        this.store.set((prev) =>
            prev.map((step) =>
                this.isTerminal(step.status)
                    ? step
                    : {
                          ...step,
                          status: cancelStatus,
                          completedAt: step.completedAt ?? now,
                      },
            ),
        );
    }

    /**
     * Finds the first step still in the initial status.
     *
     * @returns Next pending step, or null when none remains.
     */
    getNextPending(): Step<Status, StepId> | null {
        const pending = this.store
            .get()
            .find(
                (s: Step<Status, StepId>) => s.status === this.config.initial,
            );

        return pending ?? null;
    }

    /**
     * Finds the first step in the given status.
     *
     * @param status - Status to search for.
     * @returns Matching step, if any.
     */
    findByStatus(status: Status): Step<Status, StepId> | undefined {
        return this.store
            .get()
            .find((s: Step<Status, StepId>) => s.status === status);
    }

    /**
     * Reports whether any step reached a failed status.
     *
     * @returns True when a failed status is present.
     */
    hasFailed(): boolean {
        const terminalFailed =
            this.config.terminal?.filter((s: string) =>
                s.toLowerCase().includes('fail'),
            ) ?? [];

        if (terminalFailed.length > 0) {
            return this.store
                .get()
                .some((s: Step<Status, StepId>) =>
                    (terminalFailed as Status[]).includes(s.status),
                );
        }

        // fallback: any step status contains 'fail' is considered failed
        return this.store
            .get()
            .some((s: Step<Status, StepId>) =>
                s.status.toLowerCase().includes('fail'),
            );
    }

    /**
     * Runs a callback with automatic running/done/failed transitions.
     *
     * @param id - Step ID to run.
     * @param fn - Work to execute.
     * @param transitions - Optional status overrides.
     * @returns Whatever the callback returns.
     * @throws Rethrows callback errors after marking the step failed.
     */
    async run<R>(
        id: StepId,
        fn: () => Promise<R>,
        transitions?: {
            running?: Status;
            done?: Status;
            failed?: Status;
        },
    ): Promise<R> {
        const running = transitions?.running ?? this.inferRunningStatus();
        const done = transitions?.done ?? this.inferDoneStatus();
        const failed = transitions?.failed ?? this.inferFailedStatus();

        const step = this.store.get().find((s) => s.id === id);

        if (!step) {
            throw new ValidationError(`Step not found: ${id}`);
        }

        if (step.status !== this.config.initial) {
            // if already in progress, take over without re-transition
            if (step.status !== running) {
                await this.transition(id, running);
            }
        } else {
            await this.transition(id, running);
        }

        try {
            const result = await fn();
            await this.transition(id, done);
            return result;
        } catch (error) {
            const stepError = toStepError(error);
            const steps = this.store.get();
            const current = steps.find((s) => s.id === id);

            if (current) {
                const failedStep: Step<Status, StepId> = {
                    ...current,
                    status: failed,
                    completedAt: this.clock(),
                    error: stepError,
                };

                this.store.set((prev) =>
                    prev.map((s) => (s.id === id ? failedStep : s)),
                );

                if (this.reporter?.onTransition) {
                    await this.reporter.onTransition({
                        step: failedStep,
                        from: current.status,
                        to: failed,
                        all: this.store.get(),
                    });
                }
            }

            throw error;
        }
    }

    private isTerminal(status: Status): boolean {
        const terminal = this.config.terminal ?? [];
        return terminal.includes(status);
    }

    private inferRunningStatus(): Status {
        const fromInitial = this.config.transitions[this.config.initial] ?? [];
        return (fromInitial[0] ??
            this.config.statuses.find(
                (s: string) =>
                    s.toLowerCase().includes('progress') ||
                    s.toLowerCase().includes('running'),
            ) ??
            this.config.statuses[1]) as Status;
    }

    private inferDoneStatus(): Status {
        const terminal = this.config.terminal ?? [];
        return (terminal.find(
            (s: string) =>
                s.toLowerCase().includes('completed') ||
                s.toLowerCase().includes('done'),
        ) ??
            terminal[0] ??
            this.config.statuses[this.config.statuses.length - 2]) as Status;
    }

    private inferFailedStatus(): Status {
        const terminal = this.config.terminal ?? [];
        return (terminal.find((s: string) =>
            s.toLowerCase().includes('fail'),
        ) ??
            this.config.statuses.find((s: string) =>
                s.toLowerCase().includes('fail'),
            ) ??
            this.config.statuses[this.config.statuses.length - 1]) as Status;
    }

    private validateSteps(steps: readonly Step<Status, StepId>[]): void {
        const defIds = new Set(this.definitions.map((d) => d.id));

        for (const step of steps) {
            if (!defIds.has(step.id)) {
                throw new ValidationError(
                    `Step id "${step.id}" not in definitions`,
                );
            }

            if (!this.config.statuses.includes(step.status)) {
                throw new ValidationError(
                    `Step status "${step.status}" not in config.statuses`,
                );
            }
        }
    }
}
