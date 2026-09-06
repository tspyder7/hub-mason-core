import { vi } from 'vitest';

vi.mock('@/src/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));
