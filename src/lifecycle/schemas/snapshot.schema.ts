import { z } from 'zod';

import { lifecycleConfigSchema } from './config.schema';
import { stepDefinitionSchema, stepSchema } from './step.schema';

/**
 * Validates a lifecycle snapshot: unique definitions, steps match definitions and statuses.
 */
export const lifecycleSnapshotSchema = z
    .object({
        config: lifecycleConfigSchema,
        definitions: z.array(stepDefinitionSchema).min(1),
        steps: z.array(stepSchema),
        meta: z.object({
            requestId: z.string().min(1),
            requestType: z.string().optional(),
            createdAt: z.string().min(1),
            portalVersion: z.string().optional(),
        }),
    })
    .superRefine(({ definitions, steps, config }, ctx) => {
        const { statuses, initial } = config;
        const defIds = new Set(definitions.map(({ id }) => id));

        defIds.size !== definitions.length &&
            ctx.addIssue({
                code: 'custom',
                message: 'definitions must have unique ids',
                path: ['definitions'],
            });

        steps.forEach(({ id, status }) => {
            !defIds.has(id) &&
                ctx.addIssue({
                    code: 'custom',
                    message: `step id "${id}" not in definitions`,
                    path: ['steps'],
                });

            !statuses.includes(status) &&
                ctx.addIssue({
                    code: 'custom',
                    message: `step status "${status}" not in config.statuses`,
                    path: ['steps'],
                });
        });

        !statuses.includes(initial) &&
            ctx.addIssue({
                code: 'custom',
                message: `initial "${initial}" not in statuses`,
                path: ['config', 'initial'],
            });
    });
