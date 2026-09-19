import { GithubClient } from '@/src/github/client';
import { addCommentToIssue } from '@/src/github/issues/add-comment';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('addCommentToIssue', () => {
    const createCommentMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { createComment: createCommentMock } },
        } as never);
        createCommentMock.mockResolvedValue({ data: { id: 123 } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('posts comment to issue and returns comment id', async () => {
            const input = { issueNumber: 42, comment: 'Hello world' };

            const commentId = await addCommentToIssue(input, repository);

            expect(createCommentMock).toHaveBeenCalledWith({
                issue_number: 42,
                body: 'Hello world',
                owner: 'john-doe',
                repo: 'test-repo',
            });
            expect(commentId).toBe(123);
        });

        it('uses empty string when comment is not provided', async () => {
            const input = {
                issueNumber: 42,
                comment: undefined,
            } as unknown as {
                issueNumber: number;
                comment: string;
            };

            await addCommentToIssue(input, repository);

            expect(createCommentMock).toHaveBeenCalledWith({
                issue_number: 42,
                body: '',
                owner: 'john-doe',
                repo: 'test-repo',
            });
        });

        it('logs success message after posting comment', async () => {
            const input = { issueNumber: 42, comment: 'Hello' };

            await addCommentToIssue(input, repository);

            expect(logger.info).toHaveBeenCalledWith(
                'Posted comment successfully to: john-doe/test-repo#42 (comment id: 123)',
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when posting comment fails', async () => {
            const error = new Error('Network error');
            createCommentMock.mockRejectedValueOnce(error);
            const input = { issueNumber: 42, comment: 'Hello' };

            await expect(addCommentToIssue(input, repository)).rejects.toThrow(
                'Network error',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to post comment to: john-doe/test-repo#42',
            );
        });
    });
});
