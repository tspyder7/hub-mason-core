import { GithubClient } from '@/src/github/client';
import { lockIssue } from '@/src/github/issues/lock-issue';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('lockIssue', () => {
    const lockMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { lock: lockMock } },
        } as never);
        lockMock.mockResolvedValue({ status: 204 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('locks issue with default reason resolved', async () => {
            const input = { issueNumber: 10 };

            await lockIssue(input, repository);

            expect(lockMock).toHaveBeenCalledWith({
                repo: 'test-repo',
                issue_number: 10,
                owner: 'john-doe',
                lock_reason: 'resolved',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Locking issue: john-doe/test-repo#10',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Locked issue: john-doe/test-repo#10',
            );
        });

        it('locks issue with provided lock reason', async () => {
            const input = { issueNumber: 10, lockReason: 'off-topic' } as const;

            await lockIssue(input, repository);

            expect(lockMock).toHaveBeenCalledWith({
                repo: 'test-repo',
                issue_number: 10,
                owner: 'john-doe',
                lock_reason: 'off-topic',
            });
        });

        it('locks issue with spam reason', async () => {
            const input = { issueNumber: 10, lockReason: 'spam' } as const;

            await lockIssue(input, repository);

            expect(lockMock).toHaveBeenCalledWith(
                expect.objectContaining({ lock_reason: 'spam' }),
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when locking fails', async () => {
            const error = new Error('Network issue');
            lockMock.mockRejectedValueOnce(error);
            const input = { issueNumber: 10 };

            await expect(lockIssue(input, repository)).rejects.toThrow(
                'Network issue',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network issue' }),
                }),
                'Failed to lock issue: john-doe/test-repo#10',
            );
        });
    });
});
