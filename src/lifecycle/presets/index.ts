import type { LifecycleConfig } from '../core/config';

/**
 * Default status union for simple pending → done lifecycles.
 */
export type DefaultStatus =
    'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Ready-to-use lifecycle config with pending/in-progress/completed/failed/cancelled.
 */
export const defaultLifecycleConfig: LifecycleConfig<DefaultStatus> = {
    statuses: [
        'pending',
        'in_progress',
        'completed',
        'failed',
        'cancelled',
    ] as const,
    initial: 'pending',
    transitions: {
        pending: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'failed', 'cancelled'],
        completed: [],
        failed: [],
        cancelled: [],
    },
    emoji: {
        pending: '⚪',
        in_progress: '🟡',
        completed: '🟢',
        failed: '🔴',
        cancelled: '⚫',
    },
    terminal: ['completed', 'failed', 'cancelled'],
    version: '1',
    labelPrefix: 'status:',
};
