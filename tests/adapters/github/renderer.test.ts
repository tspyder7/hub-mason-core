import {
    renderStatusComment,
    renderSummary,
} from '@/src/adapters/github/renderer';

import { createStep } from '@/tests/fixtures/steps';

type Status = 'pending' | 'failed' | 'completed';

const baseMeta = {
    requestId: 'req-1',
    requestType: 'demo',
    owner: 'octo',
    repo: 'repo',
    runId: 123,
};

const emoji = { pending: '⚪', failed: '🔴', completed: '🟢' } as const;

describe('renderer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('renderStatusComment', () => {
        it('renders heading, request id, and steps table', () => {
            const steps = [
                createStep<Status>({ details: ['a', 'b'] }),
                createStep<Status>({
                    id: 'step-2',
                    name: 'Test',
                    status: 'completed',
                    details: [],
                }),
            ];

            const result = renderStatusComment({
                steps,
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain('demo');
            expect(result).toContain('req-1');
            expect(result).toContain('Build');
            expect(result).toContain('Test');
            expect(result).toContain('⚪');
            expect(result).toContain('🟢');
            expect(result).toContain('a, b');
            expect(result).toContain('-');
        });

        it('falls back to raw status when emoji missing', () => {
            const steps = [createStep<Status>()];

            const result = renderStatusComment({
                steps,
                meta: baseMeta,
                emoji: {},
            });

            expect(result).toContain('pending');
        });

        it('renders workflow run link when meta complete', () => {
            const result = renderStatusComment({
                steps: [],
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain(
                'https://github.com/octo/repo/actions/runs/123',
            );
        });

        it('renders portal run only when engine is missing', () => {
            const result = renderStatusComment({
                steps: [],
                meta: {
                    ...baseMeta,
                    portal: { owner: 'octo', repo: 'portal', runId: 456 },
                },
                emoji,
            });

            expect(result).toContain(
                'https://github.com/octo/portal/actions/runs/456',
            );
            expect(result).not.toContain('--->');
        });

        it('renders engine run only when portal is missing', () => {
            const result = renderStatusComment({
                steps: [],
                meta: {
                    requestId: 'req-1',
                    requestType: 'demo',
                    engine: { owner: 'octo', repo: 'engine', runId: 789 },
                },
                emoji,
            });

            expect(result).toContain(
                'https://github.com/octo/engine/actions/runs/789',
            );
            expect(result).not.toContain('--->');
        });

        it('renders portal ---> engine chain when both runs are present', () => {
            const result = renderStatusComment({
                steps: [],
                meta: {
                    ...baseMeta,
                    portal: { owner: 'octo', repo: 'portal', runId: 456 },
                    engine: { owner: 'octo', repo: 'engine', runId: 789 },
                },
                emoji,
            });

            expect(result).toContain(
                'https://github.com/octo/portal/actions/runs/456',
            );
            expect(result).toContain(
                'https://github.com/octo/engine/actions/runs/789',
            );
            expect(result).toContain('--->');
        });

        it('falls back to flat run when structured runs are incomplete', () => {
            const result = renderStatusComment({
                steps: [],
                meta: {
                    ...baseMeta,
                    portal: { owner: 'octo', repo: 'portal' },
                    engine: { owner: 'octo' },
                },
                emoji,
            });

            expect(result).toContain(
                'https://github.com/octo/repo/actions/runs/123',
            );
            expect(result).not.toContain('--->');
        });

        it('omits workflow run when meta incomplete', () => {
            const result = renderStatusComment({
                steps: [],
                meta: { requestId: 'req-1' },
                emoji,
            });

            expect(result).not.toContain('actions/runs');
        });

        it('renders error section for failed steps with message and stack', () => {
            const steps = [
                createStep<Status>({
                    status: 'failed',
                    error: { message: 'boom', stack: 'at foo' },
                }),
            ];

            const result = renderStatusComment({
                steps,
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain('Error');
            expect(result).toContain('Failed at step:');
            expect(result).toContain('boom');
            expect(result).toContain('at foo');
        });

        it('uses Unknown error when failed step has no error', () => {
            const steps = [createStep<Status>({ status: 'failed' })];

            const result = renderStatusComment({
                steps,
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain('Unknown error');
        });

        it('omits table when steps empty', () => {
            const result = renderStatusComment({
                steps: [],
                meta: baseMeta,
                emoji,
            });

            expect(result).not.toContain('| Step |');
            expect(result).toContain('req-1');
        });

        it('uses custom failedStatusFilter', () => {
            const steps = [createStep<Status>({ status: 'pending' })];

            const result = renderStatusComment({
                steps,
                meta: baseMeta,
                emoji,
                failedStatusFilter: (s) => s === 'pending',
            });

            expect(result).toContain('Error');
            expect(result).toContain('Failed at step:');
        });

        it('renders runError with stack', () => {
            const result = renderStatusComment({
                steps: [],
                meta: baseMeta,
                emoji,
                runError: { message: 'run boom', stack: 'run stack' },
            });

            expect(result).toContain('run boom');
            expect(result).toContain('run stack');
        });

        it('renders runError without stack', () => {
            const result = renderStatusComment({
                steps: [],
                meta: baseMeta,
                emoji,
                runError: { message: 'run boom' },
            });

            expect(result).toContain('run boom');
        });

        it('defaults requestType when missing', () => {
            const result = renderStatusComment({
                steps: [],
                meta: { requestId: 'req-1' },
                emoji,
            });

            expect(result).toContain('request');
        });

        it('renders dash when requestId missing', () => {
            const result = renderStatusComment({
                steps: [],
                meta: {} as never,
                emoji,
            });

            expect(result).toContain('-');
        });
    });

    describe('renderSummary', () => {
        it('renders COMPLETED when no failures', () => {
            const result = renderSummary({
                steps: [createStep<Status>({ status: 'completed' })],
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain('Summary');
            expect(result).toContain('COMPLETED');
            expect(result).toContain('demo');
            expect(result).not.toContain('### Error');
        });

        it('renders FAILED for failed step with error and stack', () => {
            const result = renderSummary({
                steps: [
                    createStep<Status>({
                        status: 'failed',
                        error: { message: 'bad', stack: 'stack-trace' },
                    }),
                ],
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain('FAILED');
            expect(result).toContain('bad');
            expect(result).toContain('stack-trace');
        });

        it('renders FAILED for runError when no failed steps', () => {
            const result = renderSummary({
                steps: [createStep<Status>()],
                meta: baseMeta,
                emoji,
                runError: { message: 'run failed' },
            });

            expect(result).toContain('FAILED');
            expect(result).toContain('run failed');
        });

        it('uses Unknown error fallback', () => {
            const result = renderSummary({
                steps: [createStep<Status>({ status: 'failed' })],
                meta: baseMeta,
                emoji,
            });

            expect(result).toContain('Unknown error');
        });

        it('uses custom failedStatusFilter', () => {
            const result = renderSummary({
                steps: [createStep<Status>({ status: 'pending' })],
                meta: baseMeta,
                emoji,
                failedStatusFilter: (s) => s === 'pending',
            });

            expect(result).toContain('FAILED');
        });

        it('renders workflow run and unknown request type fallback', () => {
            const result = renderSummary({
                steps: [],
                meta: { requestId: 'req-1', owner: 'o', repo: 'r', runId: 1 },
                emoji,
            });

            expect(result).toContain('unknown');
            expect(result).toContain('actions/runs/1');
        });

        it('renders portal ---> engine chain in summary when both runs are present', () => {
            const result = renderSummary({
                steps: [],
                meta: {
                    requestId: 'req-1',
                    portal: { owner: 'o', repo: 'portal', runId: 456 },
                    engine: { owner: 'o', repo: 'engine', runId: 789 },
                },
                emoji,
            });

            expect(result).toContain(
                'https://github.com/o/portal/actions/runs/456',
            );
            expect(result).toContain(
                'https://github.com/o/engine/actions/runs/789',
            );
            expect(result).toContain('--->');
        });

        it('omits workflow run when meta incomplete', () => {
            const result = renderSummary({
                steps: [],
                meta: { requestId: 'req-1' },
                emoji,
            });

            expect(result).not.toContain('actions/runs');
        });

        it('renders dash when requestId missing in summary', () => {
            const result = renderSummary({
                steps: [],
                meta: {} as never,
                emoji,
            });

            expect(result).toContain('-');
        });
    });
});
