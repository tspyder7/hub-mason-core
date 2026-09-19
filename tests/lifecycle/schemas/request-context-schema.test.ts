import { requestContextSchema } from '@/src/lifecycle/schemas/request-context.schema';
import { createValidContext } from '@/tests/fixtures/lifecycle';

describe('requestContextSchema', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('parses valid context', () => {
            const input = createValidContext();

            const result = requestContextSchema.parse(input);

            expect(result).toMatchObject({
                requestId: 'req-1',
                requestType: 'demo',
            });
        });

        it('parses context without actor', () => {
            const input = createValidContext();
            const { actor: _actor, ...withoutActor } = input;
            expect(_actor).toBe('alice');

            const result = requestContextSchema.parse(withoutActor);

            expect(result).not.toHaveProperty('actor');
        });
    });

    describe('failure', () => {
        it('rejects when requestId missing', () => {
            const input = { ...createValidContext(), requestId: '' };
            expect(() => requestContextSchema.parse(input)).toThrow();
        });

        it('rejects when requestType missing', () => {
            const input = { ...createValidContext(), requestType: '' };
            expect(() => requestContextSchema.parse(input)).toThrow();
        });

        it('rejects when signature missing', () => {
            const input = { ...createValidContext(), signature: '' };
            expect(() => requestContextSchema.parse(input)).toThrow();
        });

        it('rejects when snapshot invalid', () => {
            const input = {
                ...createValidContext(),
                lifecycleSnapshot: { foo: 'bar' },
            };

            expect(() => requestContextSchema.parse(input)).toThrow();
        });
    });
});
