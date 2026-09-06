import type { CloseIssueInput } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Closes a GitHub issue.
 *
 * @param input - Issue number to close.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const closeIssue = async (
    input: CloseIssueInput,
    repository: Repository,
): Promise<void> => {
    const { issueNumber } = input;
    const { repo, owner } = repository;

    try {
        logger.info(`Closing issue: ${owner}/${repo}#${issueNumber}`);

        const client = GithubClient.getInstance();

        await client.rest.issues.update({
            issue_number: issueNumber,
            owner,
            repo,
            state: 'closed',
        });

        logger.info(`Closed issue: ${owner}/${repo}#${issueNumber}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to close issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
