import { GithubClient } from '@/src/github/client';
import { getIssueLockState } from '@/src/github/issues/get-issue-lock-state';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('getIssueLockState', () => {
    const getMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { get: getMock } },
        } as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('returns lock state of locked issue', async () => {
            getMock.mockResolvedValue({
                data: { locked: true, active_lock_reason: 'resolved' },
            });

            const state = await getIssueLockState(10, repository);

            expect(getMock).toHaveBeenCalledWith({
                repo: 'test-repo',
                issue_number: 10,
                owner: 'john-doe',
            });
            expect(state).toEqual({
                locked: true,
                activeLockReason: 'resolved',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Fetched lock state of issue: john-doe/test-repo#10 (locked: true)',
            );
        });

        it('returns lock state of unlocked issue with null reason', async () => {
            getMock.mockResolvedValue({
                data: { locked: false, active_lock_reason: null },
            });

            const state = await getIssueLockState(10, repository);

            expect(state).toEqual({
                locked: false,
                activeLockReason: null,
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Fetching lock state of issue: john-doe/test-repo#10',
            );
        });

        it('defaults activeLockReason to empty string when undefined', async () => {
            getMock.mockResolvedValue({
                data: { locked: false },
            });

            const state = await getIssueLockState(10, repository);

            expect(state).toEqual({
                locked: false,
                activeLockReason: '',
            });
        });

        it('returns unlocked state without reason when active_lock_reason empty', async () => {
            getMock.mockResolvedValue({
                data: { locked: false, active_lock_reason: '' },
            });

            const state = await getIssueLockState(10, repository);

            expect(state).toEqual({ locked: false, activeLockReason: '' });
        });
    });

    describe('failure', () => {
        it('throws and logs error when fetching fails', async () => {
            const error = new Error('Network issue');
            getMock.mockRejectedValueOnce(error);

            await expect(getIssueLockState(10, repository)).rejects.toThrow(
                'Network issue',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network issue' }),
                }),
                'Failed to fetch lock state of issue: john-doe/test-repo#10',
            );
        });
    });
});
