import { z } from 'zod';

import { lifecycleSnapshotSchema } from './snapshot.schema';

/**
 * Validates a signed request context wrapping a lifecycle snapshot.
 */
export const requestContextSchema = z.object({
    requestId: z.string().min(1),
    requestType: z.string().min(1),
    lifecycleSnapshot: lifecycleSnapshotSchema,
    signature: z.string().min(1),
    issuedAt: z.string().min(1),
    actor: z.string().optional(),
});
