import { z } from 'zod';

/**
 * Validates lifecycle config: statuses contain initial, transitions, terminal, and emoji keys.
 */
export const lifecycleConfigSchema = z
    .object({
        statuses: z.array(z.string().min(1)).min(1),
        initial: z.string().min(1),
        transitions: z.record(z.string(), z.array(z.string())),
        emoji: z.record(z.string(), z.string()).optional(),
        terminal: z.array(z.string()).optional(),
        version: z.string().optional(),
        labelPrefix: z.string().optional(),
    })
    .superRefine(({ statuses, initial, transitions, terminal, emoji }, ctx) => {
        !statuses.includes(initial) &&
            ctx.addIssue({
                code: 'custom',
                message: `initial status "${initial}" must be in statuses`,
                path: ['initial'],
            });

        Object.entries(transitions).forEach(([from, tos]) => {
            !statuses.includes(from) &&
                ctx.addIssue({
                    code: 'custom',
                    message: `transition from status "${from}" not in statuses`,
                    path: ['transitions', from],
                });

            tos.forEach((to) => {
                !statuses.includes(to) &&
                    ctx.addIssue({
                        code: 'custom',
                        message: `transition to status "${to}" not in statuses`,
                        path: ['transitions', from],
                    });
            });
        });

        terminal?.forEach((t) => {
            !statuses.includes(t) &&
                ctx.addIssue({
                    code: 'custom',
                    message: `terminal status "${t}" not in statuses`,
                    path: ['terminal'],
                });
        });

        emoji &&
            Object.keys(emoji).forEach((key) => {
                !statuses.includes(key) &&
                    ctx.addIssue({
                        code: 'custom',
                        message: `emoji key "${key}" not in statuses`,
                        path: ['emoji', key],
                    });
            });
    });
