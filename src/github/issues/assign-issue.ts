import type { AssignIssueToUserInput } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Assigns users to a GitHub issue.
 *
 * @param input - Issue number and assignee logins.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const assignIssueToUser = async (
    input: AssignIssueToUserInput,
    repository: Repository,
): Promise<void> => {
    const { issueNumber, assignee } = input;
    const { repo, owner } = repository;

    try {
        logger.info(
            `Assigning issue to: ${assignee.join(', ')} - ${owner}/${repo}#${issueNumber}`,
        );

        const client = GithubClient.getInstance();

        await client.rest.issues.addAssignees({
            issue_number: issueNumber,
            assignees: assignee,
            owner,
            repo,
        });

        logger.info(
            `Assigned issue to: ${assignee.join(', ')} - ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        logger.error(
            { err },
            `Failed to assign issue to: ${assignee.join(', ')} - ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
