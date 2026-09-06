import type { Label } from '@octokit/webhooks-types';

import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Lists labels currently on a GitHub issue.
 *
 * @param issueNumber - Issue number to inspect.
 * @param repository - Target owner/repo.
 * @returns Labels on the issue.
 * @throws Rethrows GitHub API errors.
 */
export const getLabelsFromIssue = async (
    issueNumber: number,
    repository: Repository,
): Promise<Label[]> => {
    const { repo, owner } = repository;

    try {
        logger.info(
            `Fetching labels from issue: ${owner}/${repo}#${issueNumber}`,
        );

        const client = GithubClient.getInstance();

        const { data: labels } = await client.rest.issues.listLabelsOnIssue({
            owner,
            repo,
            issue_number: issueNumber,
        });

        logger.info(
            `Fetched labels from issue: ${owner}/${repo}#${issueNumber}: ${labels.length}`,
        );

        return labels;
    } catch (err) {
        logger.error(
            { err },
            `Failed to fetch labels from issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
