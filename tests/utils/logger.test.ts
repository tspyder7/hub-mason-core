const { mockLogger, pinoMock } = vi.hoisted(() => {
    const mockLogger = {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    };

    return {
        mockLogger,
        pinoMock: vi.fn(() => mockLogger),
    };
});

vi.mock('pino', () => ({
    pino: pinoMock,
}));

import { logger } from '@/src/utils/logger';

vi.unmock('@/src/utils/logger');

describe('logger tests', () => {
    it('creates a pino instance with a pino-pretty transport', () => {
        expect(pinoMock).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                transport: {
                    target: 'pino-pretty',
                    options: expect.objectContaining({
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    }),
                },
            }),
        );
    });

    it('logs info messages', () => {
        logger.info('hello world');
        expect(mockLogger.info).toHaveBeenCalledWith('hello world');
    });

    it('logs warn messages', () => {
        logger.warn('careful now');
        expect(mockLogger.warn).toHaveBeenCalledWith('careful now');
    });

    it('logs error messages with structured data', () => {
        const err = { message: 'boom' };

        logger.error({ err }, 'Failed to do thing');

        expect(mockLogger.error).toHaveBeenCalledWith(
            { err },
            'Failed to do thing',
        );
    });

    it('logs debug messages', () => {
        logger.debug('trace detail');
        expect(mockLogger.debug).toHaveBeenCalledWith('trace detail');
    });
});
