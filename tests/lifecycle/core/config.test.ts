import { createLifecycleConfig } from '@/src/lifecycle/core/config';

import type { LifecycleConfig } from '@/src/types/config';

type Status = 'pending' | 'done';

const createConfig = (
    overrides: Partial<LifecycleConfig<Status>> = {},
): LifecycleConfig<Status> => ({
    statuses: ['pending', 'done'],
    initial: 'pending',
    transitions: {
        pending: ['done'],
        done: [],
    },
    ...overrides,
});

describe('createLifecycleConfig', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('returns config when valid', () => {
            const config = createConfig();
            const result = createLifecycleConfig(config);
            expect(result).toEqual(config);
        });

        it('returns config with optional terminal and emoji', () => {
            const config = createConfig({
                terminal: ['done'],
                emoji: { pending: '⚪' },
                version: '1',
                labelPrefix: 'status:',
            });

            const result = createLifecycleConfig(config);

            expect(result).toEqual(config);
        });
    });

    describe('failure', () => {
        it('throws when initial not in statuses', () => {
            const config = {
                statuses: ['pending', 'done'],
                initial: 'unknown',
                transitions: { pending: ['done'] },
            } as unknown as LifecycleConfig<Status>;

            expect(() => createLifecycleConfig(config)).toThrow();
        });

        it('throws when transition from unknown status', () => {
            const config = createConfig({
                transitions: {
                    pending: ['done'],
                    done: [],
                    // @ts-expect-error testing invalid shape
                    unknown: ['done'],
                },
            });

            expect(() => createLifecycleConfig(config)).toThrow();
        });

        it('throws when transition to unknown status', () => {
            const config = {
                statuses: ['pending', 'done'],
                initial: 'pending',
                transitions: { pending: ['missing'], done: [] },
            } as unknown as LifecycleConfig<Status>;

            expect(() => createLifecycleConfig(config)).toThrow();
        });

        it('throws when terminal contains unknown status', () => {
            const config = createConfig({
                terminal: ['missing' as Status],
            });

            expect(() => createLifecycleConfig(config)).toThrow();
        });

        it('throws when emoji key not in statuses', () => {
            const config = createConfig({
                emoji: { missing: '❓' } as Partial<Record<Status, string>>,
            });

            expect(() => createLifecycleConfig(config)).toThrow();
        });

        it('throws when statuses empty', () => {
            const config = {
                statuses: [],
                initial: 'pending',
                transitions: {},
            } as unknown as LifecycleConfig<Status>;

            expect(() => createLifecycleConfig(config)).toThrow();
        });
    });
});
