import {
    createBoundSteps,
    failActiveStep,
} from '@/src/lifecycle/core/bound-steps';
import { ValidationError } from '@/src/lifecycle/core/errors';
import { LifecycleManager } from '@/src/lifecycle/core/manager';
import { MemoryStore } from '@/src/lifecycle/store/memory-store';
import { createConfig } from '@/tests/fixtures/lifecycle';

import type { TestStatus as Status } from '@/tests/fixtures/lifecycle';

const STEPS = [
    { id: 'step-1', name: 'Step 1' },
    { id: 'step-2', name: 'Step 2' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const createManager = (reporter?: {
    onTransition?: (...args: never[]) => Promise<void>;
}): LifecycleManager<Status, StepId> =>
    new LifecycleManager<Status, StepId>({
        definitions: [...STEPS],
        config: createConfig(),
        store: new MemoryStore<Status, StepId>(),
        reporter: reporter as never,
        clock: () => '2026-01-01T00:00:00.000Z',
    });

describe('BoundSteps', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('beginStep', () => {
        it('transitions known step to running', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.beginStep('step-1');

            expect(manager.steps[0]).toMatchObject({
                id: 'step-1',
                status: 'in_progress',
            });
        });

        it('renames step when name given', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.beginStep('step-1', 'Renamed');

            expect(manager.steps[0]).toMatchObject({ name: 'Renamed' });
        });

        it('rejects unknown step without touching manager', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            }) as unknown as {
                beginStep: (id: string, name?: string) => Promise<void>;
            };

            await expect(bound.beginStep('unknown')).rejects.toThrow(
                ValidationError,
            );
            await expect(bound.beginStep('unknown')).rejects.toThrow(
                'Unknown step: unknown',
            );
        });
    });

    describe('finishStep', () => {
        it('transitions running step to done', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.beginStep('step-1');
            await bound.finishStep('step-1');

            expect(manager.steps[0]?.status).toBe('completed');
        });

        it('rejects unknown step', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            }) as unknown as { finishStep: (id: string) => Promise<void> };

            await expect(bound.finishStep('unknown')).rejects.toThrow(
                'Unknown step: unknown',
            );
        });
    });

    describe('failStep', () => {
        it('fails with single notification and error', async () => {
            const onTransition = vi.fn();
            const manager = createManager({ onTransition });
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.beginStep('step-1');
            onTransition.mockClear();
            await bound.failStep('step-1', new Error('boom'));

            expect(manager.steps[0]).toMatchObject({
                status: 'failed',
                error: { message: 'boom' },
            });
            expect(onTransition).toHaveBeenCalledTimes(1);
        });

        it('rejects unknown step', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            }) as unknown as {
                failStep: (id: string, error: unknown) => Promise<void>;
            };

            await expect(
                bound.failStep('unknown', new Error('boom')),
            ).rejects.toThrow('Unknown step: unknown');
        });
    });

    describe('addStepDetails', () => {
        it('appends detail via manager', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.addStepDetails('step-1', 'note');

            expect(manager.steps[0]?.details).toEqual(['note']);
        });

        it('rejects unknown step', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            }) as unknown as {
                addStepDetails: (id: string, detail: string) => Promise<void>;
            };

            await expect(bound.addStepDetails('unknown', 'x')).rejects.toThrow(
                'Unknown step: unknown',
            );
        });
    });

    describe('failActive', () => {
        it('fails running step via bound helper', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.beginStep('step-1');
            await bound.failActive(new Error('boom'));

            expect(manager.steps[0]).toMatchObject({ status: 'failed' });
        });

        it('does nothing without running step', async () => {
            const onTransition = vi.fn();
            const manager = createManager({ onTransition });
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.failActive(new Error('boom'));

            expect(onTransition).not.toHaveBeenCalled();
        });

        it('fails standalone active step with override', async () => {
            const manager = createManager();

            await manager.transition('step-1', 'in_progress');
            await failActiveStep({
                manager,
                running: 'in_progress',
                failed: 'failed',
                error: new Error('boom'),
            });

            expect(manager.steps[0]?.status).toBe('failed');
        });

        it('returns early without active step', async () => {
            const manager = createManager();

            await failActiveStep({
                manager,
                running: 'in_progress',
                error: new Error('boom'),
            });

            expect(manager.steps[0]?.status).toBe('pending');
        });
    });

    describe('cancelPending', () => {
        it('cancels pending via bound helper', async () => {
            const manager = createManager();
            const bound = createBoundSteps({
                manager,
                definitions: STEPS,
                running: 'in_progress',
                done: 'completed',
                failed: 'failed',
            });

            await bound.beginStep('step-1');
            await bound.finishStep('step-1');
            bound.cancelPending();

            expect(manager.steps[0]?.status).toBe('completed');
            expect(manager.steps[1]?.status).toBe('cancelled');
        });
    });
});
