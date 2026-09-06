import {
    createGithubCommentReporter,
    postSummaryComment,
} from '@/src/adapters/github/comment-reporter';
import { addCommentToIssue } from '@/src/github/issues/add-comment';
import { updateCommentOnIssue } from '@/src/github/issues/update-comment';
import { withUnlockedIssue } from '@/src/github/issues/with-lock';
import { adapterRepository as repository } from '@/tests/fixtures/repository';
import { createStep } from '@/tests/fixtures/steps';

vi.mock('@/src/github/issues/add-comment', () => ({
    addCommentToIssue: vi.fn(),
}));

vi.mock('@/src/github/issues/update-comment', () => ({
    updateCommentOnIssue: vi.fn(),
}));

vi.mock('@/src/github/issues/with-lock', () => ({
    withUnlockedIssue: vi.fn(async ({ fn }: { fn: () => Promise<unknown> }) =>
        fn(),
    ),
}));

type Status = 'pending' | 'completed' | 'failed';

const meta = {
    requestId: 'req-1',
    requestType: 'demo',
};

const emoji = { pending: '⚪', completed: '🟢', failed: '🔴' } as const;

describe('comment reporter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(withUnlockedIssue).mockImplementation(
            async ({ fn }: { fn: () => Promise<unknown> }) => fn() as never,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createGithubCommentReporter', () => {
        it('posts new comment when no comment id stored', async () => {
            vi.mocked(addCommentToIssue).mockResolvedValue(99);
            const setCommentId = vi.fn();
            const reporter = createGithubCommentReporter<Status>({
                repository,
                issueNumber: 10,
                meta,
                emoji,
                setCommentId,
            });
            const steps = [createStep<Status>()];

            await reporter.onTransition?.({
                step: steps[0]!,
                from: 'pending',
                to: 'pending',
                all: steps,
            });

            expect(withUnlockedIssue).toHaveBeenCalledWith(
                expect.objectContaining({ issueNumber: 10 }),
            );
            expect(addCommentToIssue).toHaveBeenCalledOnce();
            expect(addCommentToIssue).toHaveBeenCalledWith(
                expect.objectContaining({ issueNumber: 10 }),
                repository,
            );
            const body = vi.mocked(addCommentToIssue).mock.calls[0]?.[0]
                ?.comment as string;
            expect(body).toContain('req-1');
            expect(setCommentId).toHaveBeenCalledWith(99);
            expect(updateCommentOnIssue).not.toHaveBeenCalled();
        });

        it('updates existing comment when id stored', async () => {
            vi.mocked(updateCommentOnIssue).mockResolvedValue(undefined);
            const reporter = createGithubCommentReporter<Status>({
                repository,
                issueNumber: 10,
                meta,
                emoji,
                getCommentId: () => 55,
            });
            const steps = [createStep<Status>()];

            await reporter.onTransition?.({
                step: steps[0]!,
                from: 'pending',
                to: 'pending',
                all: steps,
            });

            expect(updateCommentOnIssue).toHaveBeenCalledWith(
                expect.objectContaining({ commentId: 55 }),
                repository,
            );
            expect(addCommentToIssue).not.toHaveBeenCalled();
        });

        it('passes runError and custom filter through', async () => {
            vi.mocked(addCommentToIssue).mockResolvedValue(1);
            const reporter = createGithubCommentReporter<Status>({
                repository,
                issueNumber: 10,
                meta,
                emoji,
                failedStatusFilter: (s) => s === 'pending',
                runError: { message: 'run boom' },
            });

            await reporter.onTransition?.({
                step: createStep<Status>(),
                from: 'pending',
                to: 'pending',
                all: [createStep<Status>()],
            });

            const body = vi.mocked(addCommentToIssue).mock.calls[0]?.[0]
                ?.comment as string;
            expect(body).toContain('run boom');
            expect(body).toContain('Error');
        });
    });

    describe('postSummaryComment', () => {
        it('posts summary comment with FAILED status', async () => {
            vi.mocked(addCommentToIssue).mockResolvedValue(2);
            const steps = [
                createStep<Status>({
                    status: 'failed',
                    error: { message: 'bad' },
                }),
            ];

            await postSummaryComment({
                repository,
                issueNumber: 11,
                meta,
                steps,
                emoji,
            });

            expect(withUnlockedIssue).toHaveBeenCalledWith(
                expect.objectContaining({ issueNumber: 11 }),
            );
            expect(addCommentToIssue).toHaveBeenCalledWith(
                expect.objectContaining({ issueNumber: 11 }),
                repository,
            );
            const body = vi.mocked(addCommentToIssue).mock.calls[0]?.[0]
                ?.comment as string;
            expect(body).toContain('FAILED');
            expect(body).toContain('bad');
        });

        it('posts COMPLETED summary when no failures', async () => {
            vi.mocked(addCommentToIssue).mockResolvedValue(3);

            await postSummaryComment({
                repository,
                issueNumber: 11,
                meta,
                steps: [createStep<Status>({ status: 'completed' })],
                emoji,
            });

            const body = vi.mocked(addCommentToIssue).mock.calls[0]?.[0]
                ?.comment as string;
            expect(body).toContain('COMPLETED');
        });

        it('includes runError in summary', async () => {
            vi.mocked(addCommentToIssue).mockResolvedValue(4);

            await postSummaryComment({
                repository,
                issueNumber: 11,
                meta,
                steps: [createStep<Status>()],
                emoji,
                runError: { message: 'fatal' },
            });

            const body = vi.mocked(addCommentToIssue).mock.calls[0]?.[0]
                ?.comment as string;
            expect(body).toContain('fatal');
        });
    });
});
