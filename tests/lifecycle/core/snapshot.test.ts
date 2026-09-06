import {
    createDispatchContext,
    parseDispatchContext,
} from '@/src/lifecycle/core/snapshot';
import { ValidationError } from '@/src/lifecycle/core/errors';
import { createSignature } from '@/src/lifecycle/security/sign';
import { createSnapshot } from '@/tests/fixtures/lifecycle';

import type { DefaultStatus } from '@/src/lifecycle/presets';

describe('snapshot', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createDispatchContext', () => {
        it('creates context with valid signature', () => {
            const snapshot = createSnapshot();
            const issuedAt = new Date().toISOString();

            const ctx = createDispatchContext({
                snapshot,
                requestId: 'req-1',
                requestType: 'demo',
                issuedAt,
                secret: 'secret',
                actor: 'alice',
            });

            expect(ctx.requestId).toBe('req-1');
            expect(ctx.requestType).toBe('demo');
            expect(ctx.lifecycleSnapshot).toEqual(snapshot);
            expect(ctx.signature).toBe(
                createSignature({
                    requestId: 'req-1',
                    issuedAt,
                    secret: 'secret',
                }),
            );
            expect(ctx.actor).toBe('alice');
        });

        it('creates context without actor', () => {
            const snapshot = createSnapshot();
            const issuedAt = new Date().toISOString();

            const ctx = createDispatchContext({
                snapshot,
                requestId: 'req-1',
                requestType: 'demo',
                issuedAt,
                secret: 'secret',
            });

            expect(ctx.actor).toBeUndefined();
        });
    });

    describe('parseDispatchContext', () => {
        it('parses valid context', () => {
            const snapshot = createSnapshot();
            const issuedAt = new Date().toISOString();
            const ctx = createDispatchContext({
                snapshot,
                requestId: snapshot.meta.requestId,
                requestType: 'demo',
                issuedAt,
                secret: 'secret',
            });

            const parsed = parseDispatchContext<DefaultStatus>({
                inputs: { context: JSON.stringify(ctx) },
                secret: 'secret',
            });

            expect(parsed.requestId).toBe(ctx.requestId);
            expect(parsed.signature).toBe(ctx.signature);
        });

        it('throws when context missing', () => {
            const inputs = {};

            expect(() =>
                parseDispatchContext({ inputs, secret: 'secret' }),
            ).toThrow(ValidationError);
        });

        it('throws when context empty string', () => {
            const inputs = { context: '' };

            expect(() =>
                parseDispatchContext({ inputs, secret: 'secret' }),
            ).toThrow('Missing context');
        });

        it('throws when context invalid JSON', () => {
            const inputs = { context: '{invalid' };

            expect(() =>
                parseDispatchContext({ inputs, secret: 'secret' }),
            ).toThrow('Invalid context JSON');
        });

        it('throws when schema invalid', () => {
            const inputs = { context: JSON.stringify({ foo: 'bar' }) };

            expect(() =>
                parseDispatchContext({ inputs, secret: 'secret' }),
            ).toThrow();
        });

        it('throws when signature invalid', () => {
            const snapshot = createSnapshot();
            const issuedAt = new Date().toISOString();
            const ctx = createDispatchContext({
                snapshot,
                requestId: snapshot.meta.requestId,
                requestType: 'demo',
                issuedAt,
                secret: 'correct',
            });

            expect(() =>
                parseDispatchContext({
                    inputs: { context: JSON.stringify(ctx) },
                    secret: 'wrong',
                }),
            ).toThrow();
        });

        it('throws when requestId mismatches snapshot meta', () => {
            const snapshot = createSnapshot();
            const issuedAt = new Date().toISOString();
            const ctx = createDispatchContext({
                snapshot,
                requestId: 'other-id',
                requestType: 'demo',
                issuedAt,
                secret: 'secret',
            });
            // snapshot meta requestId is req-1, ctx requestId other-id
            // need snapshot meta to equal ctx requestId? No – we want mismatch,
            // so keep snapshot meta as req-1 while ctx requestId other-id.
            // createDispatchContext already does that since snapshot untouched.

            expect(() =>
                parseDispatchContext({
                    inputs: { context: JSON.stringify(ctx) },
                    secret: 'secret',
                }),
            ).toThrow('requestId mismatch');
        });
    });
});
