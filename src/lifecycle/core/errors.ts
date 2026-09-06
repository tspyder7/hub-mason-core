import { serializeError } from 'serialize-error';

import type { StepError } from '../../types/step';

/**
 * Thrown when a status transition is not allowed by config.
 */
export class TransitionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TransitionError';
    }
}

/**
 * Thrown when input or state fails validation.
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Thrown when HMAC signature verification fails.
 */
export class SignatureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SignatureError';
    }
}

/**
 * Thrown when a signed context is expired or issued in the future.
 */
export class ExpiredError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpiredError';
    }
}

/**
 * Normalizes any thrown value into a serializable step error.
 *
 * @param error - Unknown thrown value.
 * @returns Step error with message and optional stack.
 */
export const toStepError = (error: unknown): StepError => {
    const serialized = serializeError(error) as {
        message?: string;
        stack?: string;
    };

    return {
        message: serialized.message ?? 'Unknown error',
        stack: serialized.stack,
    };
};
