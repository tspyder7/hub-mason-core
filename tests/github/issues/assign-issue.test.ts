import { GithubClient } from '@/src/github/client';
import { assignIssueToUser } from '@/src/github/issues/assign-issue';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('assignIssueToUser', () => {
    const addAssigneesMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { addAssignees: addAssigneesMock } },
        } as never);
        addAssigneesMock.mockResolvedValue({});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('assigns issue to given users', async () => {
            const input = {
                issueNumber: 42,
                assignee: ['john-doe', 'jane-doe'],
            };

            await assignIssueToUser(input, repository);

            expect(addAssigneesMock).toHaveBeenCalledWith({
                issue_number: 42,
                assignees: ['john-doe', 'jane-doe'],
                owner: 'john-doe',
                repo: 'test-repo',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Assigned issue to: john-doe, jane-doe - john-doe/test-repo#42',
            );
        });

        it('logs assigning and assigned messages', async () => {
            const input = { issueNumber: 42, assignee: ['john-doe'] };

            await assignIssueToUser(input, repository);

            expect(logger.info).toHaveBeenCalledWith(
                'Assigning issue to: john-doe - john-doe/test-repo#42',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Assigned issue to: john-doe - john-doe/test-repo#42',
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when assigning fails', async () => {
            addAssigneesMock.mockRejectedValueOnce(new Error('Network error'));
            const input = { issueNumber: 42, assignee: ['john-doe'] };

            await expect(assignIssueToUser(input, repository)).rejects.toThrow(
                'Network error',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to assign issue to: john-doe - john-doe/test-repo#42',
            );
        });
    });
});
