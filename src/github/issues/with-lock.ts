import type { IssueLockReason } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { getIssueLockState } from './get-issue-lock-state';
import { lockIssue } from './lock-issue';
import { unlockIssue } from './unlock-issue';

/**
 * Runs a callback with the issue temporarily unlocked, then restores the lock.
 *
 * Restores the original lock reason when the issue was locked on entry.
 *
 * @param input - Issue number, repository, and callback to run unlocked.
 * @returns Whatever the callback returns.
 * @throws Rethrows lock-state, callback, or relock errors.
 */
export const withUnlockedIssue = async <T>(input: {
    issueNumber: number;
    repository: Repository;
    fn: () => Promise<T>;
}): Promise<T> => {
    const { locked, activeLockReason } = await getIssueLockState(
        input.issueNumber,
        input.repository,
    );

    if (!locked) {
        return input.fn();
    }

    await unlockIssue({ issueNumber: input.issueNumber }, input.repository);

    try {
        return await input.fn();
    } finally {
        await lockIssue(
            {
                issueNumber: input.issueNumber,
                lockReason: (activeLockReason ?? undefined) as
                    IssueLockReason | undefined,
            },
            input.repository,
        );
    }
};
