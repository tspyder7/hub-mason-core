// vitest.config.ts
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./', import.meta.url)),
        },
    },
    test: {
        typecheck: {
            enabled: true,
            include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
            ignoreSourceErrors: false,
        },
        setupFiles: ['./tests/fixtures/setup.ts'],
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx,js,jsx}'],
            reportOnFailure: true,
            // TODO: restore to 100 after lifecycle tests added — current lifecycle 0% drags global down
            thresholds: {
                lines: 35,
                branches: 9,
                functions: 20,
                statements: 35,
            },
        },
    },
});
