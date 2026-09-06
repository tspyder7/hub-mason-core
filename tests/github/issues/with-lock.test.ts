import { withUnlockedIssue } from '@/src/github/issues/with-lock';
import { getIssueLockState } from '@/src/github/issues/get-issue-lock-state';
import { lockIssue } from '@/src/github/issues/lock-issue';
import { unlockIssue } from '@/src/github/issues/unlock-issue';
import { testRepository as repository } from '@/tests/fixtures/repository';

vi.mock('@/src/github/issues/get-issue-lock-state', () => ({
    getIssueLockState: vi.fn(),
}));

vi.mock('@/src/github/issues/lock-issue', () => ({
    lockIssue: vi.fn(),
}));

vi.mock('@/src/github/issues/unlock-issue', () => ({
    unlockIssue: vi.fn(),
}));

describe('withUnlockedIssue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('unlocked issue', () => {
        it('runs fn directly without locking calls when issue is unlocked', async () => {
            vi.mocked(getIssueLockState).mockResolvedValue({
                locked: false,
                activeLockReason: '',
            });
            const fn = vi.fn().mockResolvedValue('result');

            const result = await withUnlockedIssue({
                issueNumber: 10,
                repository,
                fn,
            });

            expect(result).toBe('result');
            expect(fn).toHaveBeenCalledOnce();
            expect(unlockIssue).not.toHaveBeenCalled();
            expect(lockIssue).not.toHaveBeenCalled();
        });
    });

    describe('locked issue', () => {
        it('unlocks, runs fn, and relocks with active reason', async () => {
            vi.mocked(getIssueLockState).mockResolvedValue({
                locked: true,
                activeLockReason: 'resolved',
            });
            vi.mocked(unlockIssue).mockResolvedValue(undefined);
            vi.mocked(lockIssue).mockResolvedValue(undefined);
            const fn = vi.fn().mockResolvedValue(42);

            const result = await withUnlockedIssue({
                issueNumber: 7,
                repository,
                fn,
            });

            expect(result).toBe(42);
            expect(unlockIssue).toHaveBeenCalledWith(
                { issueNumber: 7 },
                repository,
            );
            expect(lockIssue).toHaveBeenCalledWith(
                { issueNumber: 7, lockReason: 'resolved' },
                repository,
            );
            expect(fn).toHaveBeenCalledOnce();
        });

        it('relocks with undefined reason when active reason null', async () => {
            vi.mocked(getIssueLockState).mockResolvedValue({
                locked: true,
                activeLockReason: null,
            });
            vi.mocked(unlockIssue).mockResolvedValue(undefined);
            vi.mocked(lockIssue).mockResolvedValue(undefined);
            const fn = vi.fn().mockResolvedValue('ok');

            await withUnlockedIssue({ issueNumber: 7, repository, fn });

            expect(lockIssue).toHaveBeenCalledWith(
                { issueNumber: 7, lockReason: undefined },
                repository,
            );
        });

        it('relocks with undefined reason when no active reason', async () => {
            vi.mocked(getIssueLockState).mockResolvedValue({
                locked: true,
                activeLockReason: '',
            });
            vi.mocked(unlockIssue).mockResolvedValue(undefined);
            vi.mocked(lockIssue).mockResolvedValue(undefined);
            const fn = vi.fn().mockResolvedValue('ok');

            await withUnlockedIssue({ issueNumber: 7, repository, fn });

            expect(lockIssue).toHaveBeenCalledWith(
                { issueNumber: 7, lockReason: '' },
                repository,
            );
        });

        it('relocks even when fn throws and rethrows error', async () => {
            vi.mocked(getIssueLockState).mockResolvedValue({
                locked: true,
                activeLockReason: 'spam',
            });
            vi.mocked(unlockIssue).mockResolvedValue(undefined);
            vi.mocked(lockIssue).mockResolvedValue(undefined);
            const fn = vi.fn().mockRejectedValue(new Error('boom'));

            await expect(
                withUnlockedIssue({ issueNumber: 7, repository, fn }),
            ).rejects.toThrow('boom');
            expect(lockIssue).toHaveBeenCalledWith(
                { issueNumber: 7, lockReason: 'spam' },
                repository,
            );
        });

        it('throws when unlock fails and does not run fn', async () => {
            vi.mocked(getIssueLockState).mockResolvedValue({
                locked: true,
                activeLockReason: 'resolved',
            });
            vi.mocked(unlockIssue).mockRejectedValue(
                new Error('unlock failed'),
            );
            const fn = vi.fn();

            await expect(
                withUnlockedIssue({ issueNumber: 7, repository, fn }),
            ).rejects.toThrow('unlock failed');
            expect(fn).not.toHaveBeenCalled();
            expect(lockIssue).not.toHaveBeenCalled();
        });
    });

    describe('failure', () => {
        it('propagates getIssueLockState error', async () => {
            vi.mocked(getIssueLockState).mockRejectedValue(
                new Error('fetch failed'),
            );
            const fn = vi.fn();

            await expect(
                withUnlockedIssue({ issueNumber: 7, repository, fn }),
            ).rejects.toThrow('fetch failed');
            expect(fn).not.toHaveBeenCalled();
        });
    });
});
