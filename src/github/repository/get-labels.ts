import type { Label } from '@octokit/webhooks-types';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';
import type { Repository } from '@/src/types/repository';

/**
 * Lists all labels defined in a GitHub repository.
 *
 * @param repository - Target owner/repo.
 * @returns Repo-level labels.
 * @throws Rethrows GitHub API errors.
 */
export const getLabelsFromRepo = async (
    repository: Repository,
): Promise<Label[]> => {
    const { repo, owner } = repository;

    try {
        logger.info(`Fetching labels from ${owner}/${repo}`);

        const client = GithubClient.getInstance();

        const { data: labels } = await client.rest.issues.listLabelsForRepo({
            owner,
            repo,
        });

        logger.info(`Fetched labels from ${owner}/${repo}: ${labels.length}`);

        return labels;
    } catch (err) {
        logger.error({ err }, `Failed to fetch labels from ${owner}/${repo}`);

        throw err;
    }
};
