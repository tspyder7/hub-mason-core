import {
    createSignature,
    verifySignature,
} from '@/src/lifecycle/security/sign';
import { ExpiredError, SignatureError } from '@/src/lifecycle/core/errors';

describe('sign', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createSignature', () => {
        it('creates deterministic hex signature', () => {
            const props = {
                requestId: 'req-1',
                issuedAt: new Date().toISOString(),
                secret: 'secret',
            };

            const first = createSignature(props);
            const second = createSignature(props);

            expect(first).toBe(second);
            expect(first).toMatch(/^[0-9a-f]{64}$/);
        });

        it('creates different signatures for different secrets', () => {
            const issuedAt = new Date().toISOString();

            const a = createSignature({
                requestId: 'req-1',
                issuedAt,
                secret: 'secret-a',
            });
            const b = createSignature({
                requestId: 'req-1',
                issuedAt,
                secret: 'secret-b',
            });

            expect(a).not.toBe(b);
        });

        it('creates different signatures for different request ids', () => {
            const issuedAt = new Date().toISOString();

            const a = createSignature({
                requestId: 'req-1',
                issuedAt,
                secret: 's',
            });
            const b = createSignature({
                requestId: 'req-2',
                issuedAt,
                secret: 's',
            });

            expect(a).not.toBe(b);
        });
    });

    describe('verifySignature', () => {
        it('accepts valid signature', () => {
            const requestId = 'req-1';
            const issuedAt = new Date().toISOString();
            const secret = 'secret';
            const signature = createSignature({ requestId, issuedAt, secret });

            expect(() =>
                verifySignature({ signature, requestId, issuedAt, secret }),
            ).not.toThrow();
        });

        it('throws SignatureError for tampered signature', () => {
            const requestId = 'req-1';
            const issuedAt = new Date().toISOString();
            const secret = 'secret';
            const signature = createSignature({ requestId, issuedAt, secret });
            const tampered =
                signature.slice(0, -1) + (signature.endsWith('0') ? '1' : '0');

            expect(() =>
                verifySignature({
                    signature: tampered,
                    requestId,
                    issuedAt,
                    secret,
                }),
            ).toThrow(SignatureError);
        });

        it('throws SignatureError for wrong secret', () => {
            const requestId = 'req-1';
            const issuedAt = new Date().toISOString();
            const signature = createSignature({
                requestId,
                issuedAt,
                secret: 'correct',
            });

            expect(() =>
                verifySignature({
                    signature,
                    requestId,
                    issuedAt,
                    secret: 'wrong',
                }),
            ).toThrow(SignatureError);
        });

        it('throws SignatureError for malformed non-hex signature', () => {
            const props = {
                signature: 'not-hex!!!',
                requestId: 'req-1',
                issuedAt: new Date().toISOString(),
                secret: 'secret',
            };

            expect(() => verifySignature(props)).toThrow(SignatureError);
        });

        it('throws ExpiredError when signature expired', () => {
            const requestId = 'req-1';
            const issuedAt = new Date(
                Date.now() - 60 * 60 * 1000,
            ).toISOString();
            const secret = 'secret';
            const signature = createSignature({ requestId, issuedAt, secret });

            expect(() =>
                verifySignature({ signature, requestId, issuedAt, secret }),
            ).toThrow(ExpiredError);
        });

        it('throws ExpiredError when issuedAt in future', () => {
            const requestId = 'req-1';
            const issuedAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            const secret = 'secret';
            const signature = createSignature({ requestId, issuedAt, secret });

            expect(() =>
                verifySignature({ signature, requestId, issuedAt, secret }),
            ).toThrow(ExpiredError);
        });

        it('throws ExpiredError for invalid issuedAt date', () => {
            const props = {
                signature: 'a'.repeat(64),
                requestId: 'req-1',
                issuedAt: 'not-a-date',
                secret: 'secret',
            };

            expect(() => verifySignature(props)).toThrow(ExpiredError);
        });

        it('respects custom skewMs', () => {
            const requestId = 'req-1';
            const issuedAt = new Date(Date.now() - 1000).toISOString();
            const secret = 'secret';
            const signature = createSignature({ requestId, issuedAt, secret });

            expect(() =>
                verifySignature({
                    signature,
                    requestId,
                    issuedAt,
                    secret,
                    skewMs: 0,
                }),
            ).toThrow(ExpiredError);
            expect(() =>
                verifySignature({
                    signature,
                    requestId,
                    issuedAt,
                    secret,
                    skewMs: 60_000,
                }),
            ).not.toThrow();
        });
    });
});
