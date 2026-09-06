import { pino } from 'pino';
import type { Logger } from 'pino';

/**
 * Shared pino logger with pretty, colorized output.
 */
export const logger: Logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});
