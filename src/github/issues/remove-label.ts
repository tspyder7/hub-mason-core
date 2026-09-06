import { RequestError } from 'octokit';

import type { RemoveLabelFromIssueInput } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Removes a label from a GitHub issue; no-op when the label is absent (404).
 *
 * @param input - Issue number and label to remove.
 * @param repository - Target owner/repo.
 * @throws Rethrows non-404 GitHub API errors.
 */
export const removeLabelFromIssue = async (
    input: RemoveLabelFromIssueInput,
    repository: Repository,
): Promise<void> => {
    const { issueNumber, label } = input;
    const { repo, owner } = repository;

    try {
        logger.info(
            `Removing ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = GithubClient.getInstance();

        await client.rest.issues.removeLabel({
            repo,
            issue_number: issueNumber,
            owner,
            name: label.name,
        });

        logger.info(
            `Removed ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        if (err instanceof RequestError && err.status === 404) {
            logger.info('Label not found on issue. skipping the removeLabel');

            return;
        }

        logger.error(
            { err },
            `Failed to remove ${label.name} label from issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
