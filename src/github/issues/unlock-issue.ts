import type { Repository } from '@/src/types/repository';
import type { UnlockIssueInput } from '@/src/types/issues';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Unlocks a GitHub issue.
 *
 * @param input - Issue number to unlock.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const unlockIssue = async (
    input: UnlockIssueInput,
    repository: Repository,
): Promise<void> => {
    const { issueNumber } = input;
    const { repo, owner } = repository;

    try {
        logger.info(`Unlocking issue: ${owner}/${repo}#${issueNumber}`);

        const client = GithubClient.getInstance();

        await client.rest.issues.unlock({
            issue_number: issueNumber,
            owner,
            repo,
        });

        logger.info(`Unlocked issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to unlock issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
