import { GithubClient } from '@/src/github/client';
import { closeIssue } from '@/src/github/issues/close-issue';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('closeIssue', () => {
    const updateMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { update: updateMock } },
        } as never);
        updateMock.mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('closes issue successfully', async () => {
            const input = { issueNumber: 10 };

            await closeIssue(input, repository);

            expect(updateMock).toHaveBeenCalledWith({
                repo: 'test-repo',
                issue_number: 10,
                owner: 'john-doe',
                state: 'closed',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Closing issue: john-doe/test-repo#10',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Closed issue: john-doe/test-repo#10',
            );
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe('failure', () => {
        it('throws and logs error when closing fails', async () => {
            const error = new Error('Network issue');
            updateMock.mockRejectedValueOnce(error);
            const input = { issueNumber: 10 };

            await expect(closeIssue(input, repository)).rejects.toThrow(
                'Network issue',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network issue' }),
                }),
                'Failed to close issue: john-doe/test-repo#10',
            );
        });
    });
});
