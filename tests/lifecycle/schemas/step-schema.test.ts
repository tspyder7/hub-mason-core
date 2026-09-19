import {
    stepDefinitionSchema,
    stepErrorSchema,
    stepSchema,
} from '@/src/lifecycle/schemas/step.schema';

describe('step schemas', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('stepDefinitionSchema', () => {
        it('parses valid definition', () => {
            const input = { id: 'a', name: 'A' };
            const result = stepDefinitionSchema.parse(input);
            expect(result).toEqual(input);
        });

        it('rejects empty id', () => {
            const input = { id: '', name: 'A' };
            expect(() => stepDefinitionSchema.parse(input)).toThrow();
        });

        it('rejects empty name', () => {
            const input = { id: 'a', name: '' };
            expect(() => stepDefinitionSchema.parse(input)).toThrow();
        });
    });

    describe('stepErrorSchema', () => {
        it('parses message only', () => {
            const input = { message: 'boom' };
            const result = stepErrorSchema.parse(input);
            expect(result).toEqual(input);
        });

        it('parses message with stack', () => {
            const input = { message: 'boom', stack: 'at foo' };
            const result = stepErrorSchema.parse(input);
            expect(result).toEqual(input);
        });
    });

    describe('stepSchema', () => {
        it('parses minimal valid step', () => {
            const input = {
                id: 'a',
                name: 'A',
                status: 'pending',
                details: [],
            };

            const result = stepSchema.parse(input);

            expect(result).toMatchObject(input);
        });

        it('parses full step with timestamps and error', () => {
            const input = {
                id: 'a',
                name: 'A',
                status: 'failed',
                startedAt: '2026-01-01T00:00:00.000Z',
                completedAt: '2026-01-02T00:00:00.000Z',
                details: ['x'],
                error: { message: 'boom' },
            };

            const result = stepSchema.parse(input);

            expect(result).toEqual(input);
        });

        it('rejects when details missing', () => {
            const input = { id: 'a', name: 'A', status: 'pending' };
            expect(() => stepSchema.parse(input)).toThrow();
        });
    });
});
