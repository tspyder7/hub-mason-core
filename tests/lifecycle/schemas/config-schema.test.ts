import { lifecycleConfigSchema } from '@/src/lifecycle/schemas/config.schema';

describe('lifecycleConfigSchema', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('parses minimal valid config', () => {
            const input = {
                statuses: ['a', 'b'],
                initial: 'a',
                transitions: { a: ['b'], b: [] },
            };

            const result = lifecycleConfigSchema.parse(input);

            expect(result).toMatchObject(input);
        });

        it('parses full config with optional fields', () => {
            const input = {
                statuses: ['pending', 'done'],
                initial: 'pending',
                transitions: { pending: ['done'], done: [] },
                emoji: { pending: '⚪' },
                terminal: ['done'],
                version: '1',
                labelPrefix: 'status:',
            };

            const result = lifecycleConfigSchema.parse(input);

            expect(result).toMatchObject(input);
        });
    });

    describe('failure', () => {
        it('rejects when initial not in statuses', () => {
            const input = {
                statuses: ['a'],
                initial: 'missing',
                transitions: {},
            };

            expect(() => lifecycleConfigSchema.parse(input)).toThrow();
        });

        it('rejects when transition from unknown status', () => {
            const input = {
                statuses: ['a'],
                initial: 'a',
                transitions: { unknown: [] },
            };

            expect(() => lifecycleConfigSchema.parse(input)).toThrow(
                'not in statuses',
            );
        });

        it('rejects when transition to unknown status', () => {
            const input = {
                statuses: ['a'],
                initial: 'a',
                transitions: { a: ['missing'] },
            };

            expect(() => lifecycleConfigSchema.parse(input)).toThrow();
        });

        it('rejects when terminal has unknown status', () => {
            const input = {
                statuses: ['a'],
                initial: 'a',
                transitions: { a: [] },
                terminal: ['missing'],
            };

            expect(() => lifecycleConfigSchema.parse(input)).toThrow();
        });

        it('rejects when emoji key unknown', () => {
            const input = {
                statuses: ['a'],
                initial: 'a',
                transitions: { a: [] },
                emoji: { missing: '❓' },
            };

            expect(() => lifecycleConfigSchema.parse(input)).toThrow();
        });

        it('rejects when statuses empty', () => {
            const input = {
                statuses: [],
                initial: 'a',
                transitions: {},
            };

            expect(() => lifecycleConfigSchema.parse(input)).toThrow();
        });
    });
});
