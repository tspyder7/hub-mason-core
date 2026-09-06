import { LifecycleManager } from '@/src/lifecycle/core/manager';
import { defaultLifecycleConfig } from '@/src/lifecycle/presets';
import { createSignature } from '@/src/lifecycle/security/sign';
import { MemoryStore } from '@/src/lifecycle/store/memory-store';

import type { DefaultStatus } from '@/src/lifecycle/presets';
import type { LifecycleConfig } from '@/src/types/config';
import type { LifecycleSnapshot } from '@/src/types/snapshot';
import type { StepDefinition } from '@/src/types/step';

export const CLOCK = '2026-01-01T00:00:00.000Z';

export type TestStatus =
    'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export const createDefinitions = (): StepDefinition[] => [
    { id: 'step-1', name: 'Step 1' },
    { id: 'step-2', name: 'Step 2' },
];

export const createConfig = (
    overrides: Partial<LifecycleConfig<TestStatus>> = {},
): LifecycleConfig<TestStatus> => ({
    statuses: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    initial: 'pending',
    transitions: {
        pending: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'failed', 'cancelled'],
        completed: [],
        failed: [],
        cancelled: [],
    },
    terminal: ['completed', 'failed', 'cancelled'],
    ...overrides,
});

export const createManager = (
    overrides: {
        definitions?: StepDefinition[];
        config?: LifecycleConfig<TestStatus>;
        store?: MemoryStore<TestStatus>;
        reporter?: { onTransition?: (...args: never[]) => Promise<void> };
        clock?: () => string;
    } = {},
): LifecycleManager<TestStatus> =>
    new LifecycleManager<TestStatus>({
        definitions: overrides.definitions ?? createDefinitions(),
        config: overrides.config ?? createConfig(),
        store: overrides.store ?? new MemoryStore<TestStatus>(),
        reporter: overrides.reporter as never,
        clock: overrides.clock ?? (() => CLOCK),
    });

export const createSnapshot = (): LifecycleSnapshot<DefaultStatus> => {
    const manager = new LifecycleManager<DefaultStatus>({
        definitions: [{ id: 'step-1', name: 'Step 1' }],
        config: defaultLifecycleConfig,
        store: new MemoryStore<DefaultStatus>(),
        clock: () => CLOCK,
    });
    return manager.getSnapshotWithMeta({
        requestId: 'req-1',
        requestType: 'demo',
        createdAt: new Date().toISOString(),
    });
};

export const createValidSnapshot = () => ({
    config: {
        statuses: ['pending', 'done'],
        initial: 'pending',
        transitions: { pending: ['done'], done: [] },
    },
    definitions: [{ id: 'a', name: 'A' }],
    steps: [{ id: 'a', name: 'A', status: 'pending', details: [] }],
    meta: {
        requestId: 'req-1',
        createdAt: '2026-01-01T00:00:00.000Z',
    },
});

export const createValidContext = () => {
    const issuedAt = new Date().toISOString();
    return {
        requestId: 'req-1',
        requestType: 'demo',
        lifecycleSnapshot: createValidSnapshot(),
        signature: createSignature({
            requestId: 'req-1',
            issuedAt,
            secret: 's',
        }),
        issuedAt,
        actor: 'alice',
    };
};
