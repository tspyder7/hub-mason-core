import { LifecycleManager } from '@/src/lifecycle/core/manager';
import { TransitionError, ValidationError } from '@/src/lifecycle/core/errors';
import { lifecycleConfigSchema } from '@/src/lifecycle/schemas/config.schema';
import { MemoryStore } from '@/src/lifecycle/store/memory-store';
import {
    CLOCK,
    createConfig,
    createDefinitions,
    createManager,
} from '@/tests/fixtures/lifecycle';

import type { LifecycleConfig } from '@/src/types/config';
import type { TestStatus as Status } from '@/tests/fixtures/lifecycle';

describe('LifecycleManager', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes store with initial status when empty', () => {
            const manager = createManager();

            expect(manager.steps).toHaveLength(2);
            expect(manager.steps[0]).toMatchObject({
                id: 'step-1',
                status: 'pending',
                details: [],
            });
        });

        it('throws when step definitions have duplicate ids', () => {
            const definitions = [
                { id: 'dup', name: 'A' },
                { id: 'dup', name: 'B' },
            ];

            expect(() => createManager({ definitions })).toThrow(
                ValidationError,
            );
            expect(() => createManager({ definitions })).toThrow('unique ids');
        });

        it('throws when config has self transition', () => {
            const config = createConfig({
                transitions: {
                    pending: ['pending'],
                    in_progress: ['completed'],
                    completed: [],
                    failed: [],
                    cancelled: [],
                },
            });

            expect(() => createManager({ config })).toThrow(ValidationError);
            expect(() => createManager({ config })).toThrow('self transition');
        });

        it('throws when config invalid', () => {
            const config = {
                statuses: ['pending'],
                initial: 'missing',
                transitions: {},
            } as unknown as LifecycleConfig<Status>;

            expect(() => createManager({ config })).toThrow();
        });

        it('keeps existing steps instead of overwriting', () => {
            const store = new MemoryStore<Status>([
                {
                    id: 'step-1',
                    name: 'Step 1',
                    status: 'in_progress',
                    details: ['x'],
                },
                {
                    id: 'step-2',
                    name: 'Step 2',
                    status: 'pending',
                    details: [],
                },
            ]);

            const manager = createManager({
                store,
                definitions: createDefinitions(),
            });

            expect(manager.steps[0]?.status).toBe('in_progress');
            expect(manager.steps[0]?.details).toEqual(['x']);
        });

        it('throws when existing step id not in definitions', () => {
            const store = new MemoryStore<Status>([
                {
                    id: 'unknown',
                    name: 'Unknown',
                    status: 'pending',
                    details: [],
                },
            ]);

            expect(() => createManager({ store })).toThrow(ValidationError);
        });

        it('throws when existing step status not in config', () => {
            const store = new MemoryStore<Status>([
                {
                    id: 'step-1',
                    name: 'Step 1',
                    status: 'bogus' as Status,
                    details: [],
                },
            ]);

            expect(() => createManager({ store })).toThrow(ValidationError);
        });
    });

    describe('getters', () => {
        it('returns definitions and config', () => {
            const definitions = createDefinitions();
            const config = createConfig();

            const manager = createManager({ definitions, config });

            expect(manager.getDefinitions()).toEqual(definitions);
            expect(manager.getConfig()).toEqual(config);
        });

        it('returns snapshot with empty requestId and clock time', () => {
            const manager = createManager();

            const snapshot = manager.getSnapshot();

            expect(snapshot.config).toEqual(createConfig());
            expect(snapshot.definitions).toEqual(createDefinitions());
            expect(snapshot.steps).toHaveLength(2);
            expect(snapshot.meta.requestId).toBe('');
            expect(snapshot.meta.createdAt).toBe(CLOCK);
        });

        it('returns snapshot with meta', () => {
            const manager = createManager();

            const snapshot = manager.getSnapshotWithMeta({
                requestId: 'req-1',
                requestType: 'type-a',
                portalVersion: 'v2',
            });

            expect(snapshot.meta.requestId).toBe('req-1');
            expect(snapshot.meta.requestType).toBe('type-a');
            expect(snapshot.meta.createdAt).toBe(CLOCK);
            expect(snapshot.meta.portalVersion).toBe('v2');
        });

        it('uses provided createdAt in snapshot with meta', () => {
            const manager = createManager();

            const snapshot = manager.getSnapshotWithMeta({
                requestId: 'req-1',
                createdAt: '2025-01-01T00:00:00.000Z',
            });

            expect(snapshot.meta.createdAt).toBe('2025-01-01T00:00:00.000Z');
        });
    });

    describe('fromSnapshot', () => {
        it('restores manager from valid snapshot', () => {
            const manager = createManager();
            const snapshot = manager.getSnapshotWithMeta({
                requestId: 'req-1',
                requestType: 't',
                createdAt: CLOCK,
            });
            const withId = {
                ...snapshot,
                meta: { ...snapshot.meta, requestId: 'req-1' },
            };

            // Need requestId min(1) for schema
            const valid = {
                ...withId,
                meta: { ...withId.meta, requestId: 'req-1' },
            };

            const restored = LifecycleManager.fromSnapshot<Status>({
                snapshot: valid,
            });

            expect(restored.steps).toHaveLength(2);
            expect(restored.getConfig().initial).toBe('pending');
        });

        it('uses provided store and overwrites with snapshot steps', () => {
            const manager = createManager();
            const snapshot = manager.getSnapshotWithMeta({
                requestId: 'req-1',
                createdAt: CLOCK,
            });
            const store = new MemoryStore<Status>();

            const restored = LifecycleManager.fromSnapshot<Status>({
                snapshot,
                store,
            });

            expect(restored.steps).toHaveLength(2);
            expect(store.get()).toHaveLength(2);
        });

        it('throws on invalid snapshot', () => {
            const bad = { foo: 'bar' };

            expect(() =>
                LifecycleManager.fromSnapshot({ snapshot: bad }),
            ).toThrow();
        });
    });

    describe('transition', () => {
        it('transitions step and sets timestamps for terminal', async () => {
            const onTransition = vi.fn();
            const manager = createManager({ reporter: { onTransition } });

            const first = await manager.transition('step-1', 'in_progress');

            expect(first.status).toBe('in_progress');
            expect(first.startedAt).toBe(CLOCK);
            expect(first.completedAt).toBeUndefined();
            expect(onTransition).toHaveBeenCalledWith(
                expect.objectContaining({ from: 'pending', to: 'in_progress' }),
            );

            // Act terminal
            const done = await manager.transition('step-1', 'completed');

            expect(done.status).toBe('completed');
            expect(done.completedAt).toBe(CLOCK);
            expect(done.startedAt).toBe(CLOCK);
        });

        it('preserves startedAt on second transition', async () => {
            let now = '2026-01-01T00:00:00.000Z';
            const manager = createManager({ clock: () => now });

            await manager.transition('step-1', 'in_progress');
            now = '2026-01-02T00:00:00.000Z';
            const done = await manager.transition('step-1', 'completed');

            expect(done.startedAt).toBe('2026-01-01T00:00:00.000Z');
            expect(done.completedAt).toBe('2026-01-02T00:00:00.000Z');
        });

        it('throws when step not found', async () => {
            const manager = createManager();

            await expect(
                manager.transition('missing', 'in_progress'),
            ).rejects.toThrow(ValidationError);
        });

        it('throws when status unknown', async () => {
            const manager = createManager();

            await expect(
                manager.transition('step-1', 'bogus' as Status),
            ).rejects.toThrow(ValidationError);
        });

        it('throws TransitionError for invalid transition', async () => {
            const manager = createManager();

            await expect(
                manager.transition('step-1', 'completed'),
            ).rejects.toThrow(TransitionError);
        });
    });

    describe('addDetail', () => {
        it('appends detail and notifies reporter', async () => {
            const onTransition = vi.fn();
            const manager = createManager({ reporter: { onTransition } });

            const updated = await manager.addDetail('step-1', 'hello');

            expect(updated.details).toEqual(['hello']);
            expect(onTransition).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'pending',
                    to: 'pending',
                }),
            );
        });

        it('accumulates multiple details', async () => {
            const manager = createManager();

            await manager.addDetail('step-1', 'a');
            const updated = await manager.addDetail('step-1', 'b');

            expect(updated.details).toEqual(['a', 'b']);
        });

        it('throws when step not found', async () => {
            const manager = createManager();

            await expect(manager.addDetail('missing', 'x')).rejects.toThrow(
                ValidationError,
            );
        });
    });

    describe('cancelPending', () => {
        it('moves non-terminal steps to cancelled', () => {
            const manager = createManager();

            manager.cancelPending();

            expect(manager.steps.every((s) => s.status === 'cancelled')).toBe(
                true,
            );
            expect(manager.steps[0]?.completedAt).toBe(CLOCK);
        });

        it('keeps terminal steps unchanged', async () => {
            const manager = createManager();

            await manager.transition('step-1', 'in_progress');
            await manager.transition('step-1', 'completed');

            manager.cancelPending();

            expect(manager.steps.find((s) => s.id === 'step-1')?.status).toBe(
                'completed',
            );
            expect(manager.steps.find((s) => s.id === 'step-2')?.status).toBe(
                'cancelled',
            );
        });

        it('falls back to first terminal when no cancel status', () => {
            const config = createConfig({
                statuses: ['pending', 'done'] as unknown as Status[],
                initial: 'pending' as Status,
                transitions: {
                    pending: ['done'],
                    done: [],
                } as unknown as LifecycleConfig<Status>['transitions'],
                terminal: ['done'] as unknown as Status[],
            });
            const manager = createManager({
                config,
                definitions: createDefinitions(),
                store: new MemoryStore<Status>(),
            });

            manager.cancelPending();

            expect(manager.steps[0]?.status).toBe('done');
        });

        it('falls back to last status when no terminal', () => {
            const config = createConfig({
                terminal: undefined,
            });
            const manager = createManager({ config });

            manager.cancelPending();

            expect(manager.steps[0]?.status).toBe('cancelled');
        });
    });

    describe('queries', () => {
        it('returns next pending step or null', async () => {
            const manager = createManager();

            expect(manager.getNextPending()?.id).toBe('step-1');

            // Act move all away from pending
            await manager.transition('step-1', 'in_progress');
            await manager.transition('step-1', 'completed');
            await manager.transition('step-2', 'in_progress');
            await manager.transition('step-2', 'completed');

            expect(manager.getNextPending()).toBeNull();
        });

        it('finds by status', async () => {
            const manager = createManager();

            expect(manager.findByStatus('pending')?.id).toBe('step-1');
            expect(manager.findByStatus('completed')).toBeUndefined();

            await manager.transition('step-1', 'in_progress');

            expect(manager.findByStatus('in_progress')?.id).toBe('step-1');
        });

        it('detects failure via terminal failed status', async () => {
            const manager = createManager();

            expect(manager.hasFailed()).toBe(false);

            await manager.transition('step-1', 'in_progress');
            await manager.transition('step-1', 'failed');

            expect(manager.hasFailed()).toBe(true);
        });

        it('falls back to substring match when no terminal failed', () => {
            const config = createConfig({ terminal: ['completed'] });
            const store = new MemoryStore<Status>([
                {
                    id: 'step-1',
                    name: 'Step 1',
                    status: 'failed',
                    details: [],
                },
                {
                    id: 'step-2',
                    name: 'Step 2',
                    status: 'pending',
                    details: [],
                },
            ]);
            const manager = createManager({
                config,
                store,
                definitions: createDefinitions(),
            });

            expect(manager.hasFailed()).toBe(true);
        });

        it('returns false when no failed substring', () => {
            const config = createConfig({ terminal: ['completed'] });
            const manager = createManager({ config });
            expect(manager.hasFailed()).toBe(false);
        });
    });

    describe('run', () => {
        it('runs fn with inferred transitions and returns result', async () => {
            const onTransition = vi.fn();
            const manager = createManager({ reporter: { onTransition } });
            const fn = vi.fn().mockResolvedValue('ok');

            const result = await manager.run('step-1', fn);

            expect(result).toBe('ok');
            expect(manager.steps.find((s) => s.id === 'step-1')?.status).toBe(
                'completed',
            );
            expect(onTransition).toHaveBeenCalledTimes(2);
        });

        it('uses explicit transitions when provided', async () => {
            const manager = createManager();
            const fn = vi.fn().mockResolvedValue(1);

            await manager.run('step-1', fn, {
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            expect(manager.steps.find((s) => s.id === 'step-1')?.status).toBe(
                'completed',
            );
        });

        it('captures error into step and rethrows', async () => {
            const onTransition = vi.fn();
            const manager = createManager({ reporter: { onTransition } });
            const fn = vi.fn().mockRejectedValue(new Error('boom'));

            await expect(manager.run('step-1', fn)).rejects.toThrow('boom');
            const step = manager.steps.find((s) => s.id === 'step-1');
            expect(step?.status).toBe('failed');
            expect(step?.error?.message).toBe('boom');
            expect(step?.completedAt).toBe(CLOCK);
            expect(onTransition).toHaveBeenCalledTimes(2);
        });

        it('takes over when already in running status', async () => {
            const manager = createManager();
            await manager.transition('step-1', 'in_progress');
            const fn = vi.fn().mockResolvedValue('ok');

            const result = await manager.run('step-1', fn);

            expect(result).toBe('ok');
            expect(manager.steps.find((s) => s.id === 'step-1')?.status).toBe(
                'completed',
            );
        });

        it('throws when step not found', async () => {
            const manager = createManager();
            const fn = vi.fn();

            await expect(manager.run('missing', fn)).rejects.toThrow(
                ValidationError,
            );
            expect(fn).not.toHaveBeenCalled();
        });

        it('transitions non-initial non-running step before running fn', async () => {
            const manager = createManager();
            await manager.transition('step-1', 'in_progress');
            await manager.transition('step-1', 'cancelled');
            const fn = vi.fn().mockResolvedValue('ok');

            // cancelled -> in_progress invalid, so run re-transition fails
            await expect(manager.run('step-1', fn)).rejects.toThrow();
            expect(fn).not.toHaveBeenCalled();
        });

        it('infers running via progress substring when no direct transition', async () => {
            type S2 = 'idle' | 'running' | 'done';
            const config: LifecycleConfig<S2> = {
                statuses: ['idle', 'running', 'done'],
                initial: 'idle',
                transitions: { idle: [], running: ['done'], done: [] },
                terminal: ['done'],
            };
            const m = new LifecycleManager<S2>({
                definitions: [{ id: 'a', name: 'A' }],
                config,
                store: new MemoryStore<S2>(),
                clock: () => CLOCK,
            });
            // idle has no outgoing, but statuses contain 'running'
            // run should infer running='running' but transition idle->running invalid
            // so it should throw TransitionError
            const fn = vi.fn().mockResolvedValue(1);

            await expect(m.run('a', fn)).rejects.toThrow(TransitionError);
        });

        it('infers done via terminal fallback and failed via last status', async () => {
            type S3 = 'start' | 'mid' | 'end';
            const config: LifecycleConfig<S3> = {
                statuses: ['start', 'mid', 'end'],
                initial: 'start',
                transitions: {
                    start: ['mid'],
                    mid: ['end'],
                    end: [],
                },
                terminal: ['end'],
            };
            const m = new LifecycleManager<S3>({
                definitions: [{ id: 'a', name: 'A' }],
                config,
                store: new MemoryStore<S3>(),
                clock: () => CLOCK,
            });

            // Act success uses inferred done='end'
            const result = await m.run('a', async () => 'ok');

            expect(result).toBe('ok');
            expect(m.steps[0]?.status).toBe('end');
        });
    });

    describe('edge coverage', () => {
        it('uses default clock when none provided', () => {
            const manager = new LifecycleManager<Status>({
                definitions: createDefinitions(),
                config: createConfig(),
                store: new MemoryStore<Status>(),
            });
            const snapshot = manager.getSnapshot();

            expect(manager.steps).toHaveLength(2);
            expect(snapshot.meta.createdAt).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
            );
        });

        it('tolerates undefined transitions entry when validator bypassed', () => {
            // Defensive `?? []` in constructor unreachable via schema,
            // so bypass validator to feed undefined entry.
            const parseSpy = vi
                .spyOn(lifecycleConfigSchema, 'parse')
                .mockReturnValue({} as never);
            const config = {
                statuses: ['pending'],
                initial: 'pending',
                transitions: { pending: undefined },
            } as unknown as LifecycleConfig<Status>;

            const manager = new LifecycleManager<Status>({
                definitions: [{ id: 'step-1', name: 'Step 1' }],
                config,
                store: new MemoryStore<Status>(),
                clock: () => CLOCK,
            });

            expect(parseSpy).toHaveBeenCalled();
            expect(manager.steps).toHaveLength(1);
        });

        it('throws TransitionError when from status has no transitions entry', async () => {
            type Archived = 'pending' | 'done' | 'archived';
            const config: LifecycleConfig<Archived> = {
                statuses: ['pending', 'done', 'archived'],
                initial: 'pending',
                transitions: {
                    pending: ['done'],
                    done: [],
                } as unknown as Record<Archived, readonly Archived[]>,
            };
            const store = new MemoryStore<Archived>([
                {
                    id: 'step-1',
                    name: 'Step 1',
                    status: 'archived',
                    details: [],
                },
                {
                    id: 'step-2',
                    name: 'Step 2',
                    status: 'pending',
                    details: [],
                },
            ]);
            const manager = new LifecycleManager<Archived>({
                definitions: createDefinitions(),
                config,
                store,
                clock: () => CLOCK,
            });

            await expect(manager.transition('step-1', 'done')).rejects.toThrow(
                TransitionError,
            );
        });

        it('returns false for hasFailed when terminal undefined', () => {
            const manager = createManager({
                config: createConfig({ terminal: undefined }),
            });

            expect(manager.hasFailed()).toBe(false);
        });

        it('records failure without reporter notification', async () => {
            const manager = createManager();

            await expect(
                manager.run('step-1', async () => {
                    throw new Error('boom');
                }),
            ).rejects.toThrow('boom');
            const step = manager.steps.find((s) => s.id === 'step-1');
            expect(step?.status).toBe('failed');
            expect(step?.error?.message).toBe('boom');
        });

        it('rethrows without recording when step removed during fn', async () => {
            const store = new MemoryStore<Status>();
            const manager = createManager({ store });
            const fn = vi.fn(async (): Promise<string> => {
                store.set(() => []);
                throw new Error('boom');
            });

            await expect(manager.run('step-1', fn)).rejects.toThrow('boom');
            expect(fn).toHaveBeenCalledOnce();
            expect(store.get()).toEqual([]);
        });

        it('infers fallbacks when transitions and terminal keys missing', async () => {
            // Covers inferRunning/inferDone/inferFailed last fallbacks plus
            // the `transitions[from] ?? []` miss in transition().
            type Tri = 'start' | 'mid' | 'end';
            const config: LifecycleConfig<Tri> = {
                statuses: ['start', 'mid', 'end'],
                initial: 'start',
                transitions: { mid: ['end'], end: [] } as unknown as Record<
                    Tri,
                    readonly Tri[]
                >,
            };
            const manager = new LifecycleManager<Tri>({
                definitions: [{ id: 'a', name: 'A' }],
                config,
                store: new MemoryStore<Tri>(),
                clock: () => CLOCK,
            });

            // Inferred running is statuses[1] but start has no outgoing entry.
            await expect(manager.run('a', async () => 'ok')).rejects.toThrow(
                TransitionError,
            );
        });

        it('infers done as first terminal when no completed/done terminal', async () => {
            const config = createConfig({ terminal: ['failed', 'cancelled'] });
            const manager = createManager({ config });

            const result = await manager.run('step-1', async () => 'ok');

            expect(result).toBe('ok');
            expect(manager.steps.find((s) => s.id === 'step-1')?.status).toBe(
                'failed',
            );
        });
    });
});
