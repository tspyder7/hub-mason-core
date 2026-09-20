import { createSignature, verifySignature } from '../security/sign';
import { requestContextSchema } from '../schemas/request-context.schema';
import { ValidationError } from './errors';

import type {
    CreateDispatchContextProps,
    ParseDispatchContextProps,
    RequestContext,
} from '../../types/request-context';

export type { LifecycleSnapshot } from '../../types/snapshot';
export type { RequestContext } from '../../types/request-context';

/**
 * Creates a signed dispatch context for handoff between portal and engine.
 *
 * @param props - Snapshot, request ID/type, issue timestamp, secret, and actor.
 * @returns Signed request context.
 */
export const createDispatchContext = <
    Status extends string,
    StepId extends string = string,
>(
    props: CreateDispatchContextProps<Status, StepId>,
): RequestContext<Status, StepId> => {
    const signature = createSignature({
        requestId: props.requestId,
        issuedAt: props.issuedAt,
        secret: props.secret,
    });

    return {
        requestId: props.requestId,
        requestType: props.requestType,
        lifecycleSnapshot: props.snapshot,
        signature,
        issuedAt: props.issuedAt,
        actor: props.actor,
    } as unknown as RequestContext<Status, StepId>;
};

/**
 * Parses and verifies a dispatch context from workflow inputs.
 *
 * Checks JSON shape, HMAC signature, expiry, and request-ID consistency.
 *
 * @param props - Raw workflow inputs and shared secret.
 * @returns Verified request context.
 * @throws When input is missing, malformed, expired, or signature invalid.
 */
export const parseDispatchContext = <
    Status extends string,
    StepId extends string = string,
>(
    props: ParseDispatchContextProps,
): RequestContext<Status, StepId> => {
    const raw = props.inputs.context ?? '';

    if (!raw) {
        throw new ValidationError('Missing context input');
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new ValidationError('Invalid context JSON');
    }

    const ctx = requestContextSchema.parse(parsed) as unknown as RequestContext<
        Status,
        StepId
    >;

    verifySignature({
        signature: ctx.signature,
        requestId: ctx.requestId,
        issuedAt: ctx.issuedAt,
        secret: props.secret,
    });

    if (ctx.lifecycleSnapshot.meta.requestId !== ctx.requestId) {
        throw new ValidationError(
            'requestId mismatch between context and snapshot meta',
        );
    }

    return ctx;
};
