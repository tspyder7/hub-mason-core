import { GithubClient } from '@/src/github/client';
import { unlockIssue } from '@/src/github/issues/unlock-issue';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('unlockIssue', () => {
    const unlockMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { unlock: unlockMock } },
        } as never);
        unlockMock.mockResolvedValue({ status: 204 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('unlocks issue successfully', async () => {
            const input = { issueNumber: 10 };

            await unlockIssue(input, repository);

            expect(unlockMock).toHaveBeenCalledWith({
                repo: 'test-repo',
                issue_number: 10,
                owner: 'john-doe',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Unlocking issue: john-doe/test-repo#10',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Unlocked issue: john-doe/test-repo#10',
            );
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe('failure', () => {
        it('throws and logs error when unlocking fails', async () => {
            const error = new Error('Network issue');
            unlockMock.mockRejectedValueOnce(error);
            const input = { issueNumber: 10 };

            await expect(unlockIssue(input, repository)).rejects.toThrow(
                'Network issue',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network issue' }),
                }),
                'Failed to unlock issue: john-doe/test-repo#10',
            );
        });
    });
});
