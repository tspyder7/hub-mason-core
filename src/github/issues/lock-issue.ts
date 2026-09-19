import type { LockIssueInput } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Locks a GitHub issue to limit conversation.
 *
 * @param input - Issue number and optional lock reason.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const lockIssue = async (
    input: LockIssueInput,
    repository: Repository,
): Promise<void> => {
    const { issueNumber, lockReason = 'resolved' } = input;
    const { repo, owner } = repository;

    try {
        logger.info(`Locking issue: ${owner}/${repo}#${issueNumber}`);

        const client = GithubClient.getInstance();

        await client.rest.issues.lock({
            issue_number: issueNumber,
            owner,
            repo,
            lock_reason: lockReason,
        });

        logger.info(`Locked issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to lock issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
