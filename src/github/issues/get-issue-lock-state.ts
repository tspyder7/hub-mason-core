import type { IssueLockState } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Fetches the lock state of a GitHub issue.
 *
 * @param issueNumber - Issue number to inspect.
 * @param repository - Target owner/repo.
 * @returns Locked flag plus active lock reason.
 * @throws Rethrows GitHub API errors.
 */
export const getIssueLockState = async (
    issueNumber: number,
    repository: Repository,
): Promise<IssueLockState> => {
    const { repo, owner } = repository;

    try {
        logger.info(
            `Fetching lock state of issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = GithubClient.getInstance();

        const {
            data: { locked, active_lock_reason: activeLockReason = '' },
        } = await client.rest.issues.get({
            issue_number: issueNumber,
            owner,
            repo,
        });

        logger.info(
            `Fetched lock state of issue: ${owner}/${repo}#${issueNumber} (locked: ${locked})`,
        );

        return {
            locked,
            activeLockReason,
        };
    } catch (err) {
        logger.error(
            { err },
            `Failed to fetch lock state of issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
