import { z } from 'zod';

/**
 * Validates a step definition (id plus display name).
 */
export const stepDefinitionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
});

/**
 * Validates a serializable step error (message plus optional stack).
 */
export const stepErrorSchema = z.object({
    message: z.string(),
    stack: z.string().optional(),
});

/**
 * Validates a runtime step with status, timestamps, details, and error.
 */
export const stepSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    details: z.array(z.string()),
    error: stepErrorSchema.optional(),
});
