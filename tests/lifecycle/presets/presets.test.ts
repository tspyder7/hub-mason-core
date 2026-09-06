import { defaultLifecycleConfig } from '@/src/lifecycle/presets';

describe('presets', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('defaultLifecycleConfig', () => {
        it('has expected statuses and initial', () => {
            const config = defaultLifecycleConfig;

            expect(config.statuses).toEqual([
                'pending',
                'in_progress',
                'completed',
                'failed',
                'cancelled',
            ]);
            expect(config.initial).toBe('pending');
        });

        it('defines valid transitions without self transitions', () => {
            const { transitions } = defaultLifecycleConfig;

            expect(transitions['pending']).toEqual([
                'in_progress',
                'cancelled',
            ]);
            expect(transitions['in_progress']).toEqual([
                'completed',
                'failed',
                'cancelled',
            ]);
            expect(transitions['completed']).toEqual([]);
            for (const [from, allowed] of Object.entries(transitions)) {
                expect(allowed).not.toContain(from);
            }
        });

        it('defines terminal statuses and emoji', () => {
            const config = defaultLifecycleConfig;

            expect(config.terminal).toEqual([
                'completed',
                'failed',
                'cancelled',
            ]);
            expect(config.emoji).toMatchObject({
                pending: '⚪',
                in_progress: '🟡',
                completed: '🟢',
                failed: '🔴',
                cancelled: '⚫',
            });
            expect(config.version).toBe('1');
            expect(config.labelPrefix).toBe('status:');
        });
    });
});
