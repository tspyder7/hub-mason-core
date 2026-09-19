import { lifecycleSnapshotSchema } from '@/src/lifecycle/schemas/snapshot.schema';
import { createValidSnapshot } from '@/tests/fixtures/lifecycle';

describe('lifecycleSnapshotSchema', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('parses valid snapshot', () => {
            const input = createValidSnapshot();
            const result = lifecycleSnapshotSchema.parse(input);
            expect(result).toMatchObject(input);
        });

        it('parses snapshot with optional meta fields', () => {
            const input = {
                ...createValidSnapshot(),
                meta: {
                    requestId: 'req-1',
                    requestType: 'demo',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    portalVersion: 'v1',
                },
            };

            const result = lifecycleSnapshotSchema.parse(input);

            expect(result.meta).toMatchObject({ requestType: 'demo' });
        });
    });

    describe('failure', () => {
        it('rejects duplicate definition ids', () => {
            const input = {
                ...createValidSnapshot(),
                definitions: [
                    { id: 'a', name: 'A' },
                    { id: 'a', name: 'B' },
                ],
            };

            expect(() => lifecycleSnapshotSchema.parse(input)).toThrow(
                'unique ids',
            );
        });

        it('rejects step id not in definitions', () => {
            const input = {
                ...createValidSnapshot(),
                steps: [
                    {
                        id: 'missing',
                        name: 'M',
                        status: 'pending',
                        details: [],
                    },
                ],
            };

            expect(() => lifecycleSnapshotSchema.parse(input)).toThrow(
                'not in definitions',
            );
        });

        it('rejects step status not in config', () => {
            const input = {
                ...createValidSnapshot(),
                steps: [{ id: 'a', name: 'A', status: 'bogus', details: [] }],
            };

            expect(() => lifecycleSnapshotSchema.parse(input)).toThrow();
        });

        it('rejects when initial not in statuses', () => {
            const input = {
                ...createValidSnapshot(),
                config: {
                    statuses: ['pending'],
                    initial: 'missing',
                    transitions: {},
                },
            };

            expect(() => lifecycleSnapshotSchema.parse(input)).toThrow();
        });

        it('rejects when definitions empty', () => {
            const input = { ...createValidSnapshot(), definitions: [] };
            expect(() => lifecycleSnapshotSchema.parse(input)).toThrow();
        });
    });
});
