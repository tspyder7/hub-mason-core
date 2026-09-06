import { createHmac, timingSafeEqual } from 'node:crypto';

import { ExpiredError, SignatureError } from '../core/errors';

/**
 * Creates an HMAC-SHA256 signature over `requestId.issuedAt`.
 *
 * @param props - Request ID, issue timestamp, and shared secret.
 * @returns Hex-encoded signature.
 */
export const createSignature = (props: {
    requestId: string;
    issuedAt: string;
    secret: string;
}): string => {
    const payload = `${props.requestId}.${props.issuedAt}`;

    return createHmac('sha256', props.secret)
        .update(payload, 'utf8')
        .digest('hex');
};

/**
 * Verifies signature freshness and equality in constant time.
 *
 * @param props - Signature, request ID, issue timestamp, secret, optional skew.
 * @throws When issuedAt is in future, expired, or signature mismatches.
 */
export const verifySignature = (props: {
    signature: string;
    requestId: string;
    issuedAt: string;
    secret: string;
    skewMs?: number;
}): void => {
    const skewMs = props.skewMs ?? 30 * 60 * 1000;
    const now = Date.now();
    const issued = Date.parse(props.issuedAt);

    if (Number.isNaN(issued) || issued > now + 60_000) {
        throw new ExpiredError('issuedAt in future');
    }

    if (now - issued > skewMs) {
        throw new ExpiredError('signature expired');
    }

    const expected = createSignature({
        requestId: props.requestId,
        issuedAt: props.issuedAt,
        secret: props.secret,
    });

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(props.signature, 'hex');

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new SignatureError('invalid signature');
    }
};
