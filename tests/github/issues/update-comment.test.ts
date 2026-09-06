import { GithubClient } from '@/src/github/client';
import { updateCommentOnIssue } from '@/src/github/issues/update-comment';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('updateCommentOnIssue', () => {
    const updateCommentMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { updateComment: updateCommentMock } },
        } as never);
        updateCommentMock.mockResolvedValue({ data: { id: 7 } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('updates comment on issue', async () => {
            const input = { commentId: 7, comment: 'Updated body' };

            await updateCommentOnIssue(input, repository);

            expect(updateCommentMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
                comment_id: 7,
                body: 'Updated body',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Updating comment 7 on: john-doe/test-repo',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Updated comment 7 on: john-doe/test-repo',
            );
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('handles empty comment body', async () => {
            const input = { commentId: 7, comment: '' };

            await updateCommentOnIssue(input, repository);

            expect(updateCommentMock).toHaveBeenCalledWith(
                expect.objectContaining({ body: '' }),
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when updating comment fails', async () => {
            updateCommentMock.mockRejectedValueOnce(new Error('Network error'));
            const input = { commentId: 7, comment: 'Updated body' };

            await expect(
                updateCommentOnIssue(input, repository),
            ).rejects.toThrow('Network error');
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to update comment 7 on: john-doe/test-repo',
            );
        });
    });
});
