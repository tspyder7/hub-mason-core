import {
    ExpiredError,
    SignatureError,
    TransitionError,
    ValidationError,
    toStepError,
} from '@/src/lifecycle/core/errors';

describe('lifecycle errors', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('error classes', () => {
        it('creates TransitionError with correct name', () => {
            const error = new TransitionError('bad transition');

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('TransitionError');
            expect(error.message).toBe('bad transition');
        });

        it('creates ValidationError with correct name', () => {
            const error = new ValidationError('bad input');
            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('bad input');
        });

        it('creates SignatureError with correct name', () => {
            const error = new SignatureError('invalid signature');
            expect(error.name).toBe('SignatureError');
            expect(error.message).toBe('invalid signature');
        });

        it('creates ExpiredError with correct name', () => {
            const error = new ExpiredError('expired');
            expect(error.name).toBe('ExpiredError');
            expect(error.message).toBe('expired');
        });
    });

    describe('toStepError', () => {
        it('converts Error with message and stack', () => {
            const error = new Error('boom');

            const result = toStepError(error);

            expect(result.message).toBe('boom');
            expect(result.stack).toContain('Error: boom');
        });

        it('returns Unknown error for non-error values without message', () => {
            const value = { code: 42 };

            const result = toStepError(value);

            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe('string');
        });

        it('handles string thrown values', () => {
            const value = 'plain failure';
            const result = toStepError(value);
            expect(typeof result.message).toBe('string');
        });

        it('handles undefined', () => {
            const value = undefined;
            const result = toStepError(value);
            expect(typeof result.message).toBe('string');
        });
    });
});
