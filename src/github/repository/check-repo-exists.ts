import { RequestError } from 'octokit';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';
import type { Repository } from '@/src/types/repository';

/**
 * Checks whether a GitHub repository exists and is accessible.
 *
 * @param repository - Target owner/repo.
 * @returns True when the repo exists; false on 404.
 * @throws Rethrows non-404 GitHub API errors.
 */
export const checkRepoExists = async (
    repository: Repository,
): Promise<boolean> => {
    const { repo, owner } = repository;

    try {
        logger.info(`Checking if repository ${owner}/${repo} exists`);

        const client = GithubClient.getInstance();

        await client.rest.repos.get({
            owner,
            repo,
        });

        logger.info(`Repository ${owner}/${repo} exists`);

        return true;
    } catch (err) {
        if (err instanceof RequestError && err.status === 404) {
            logger.info(`Repository ${owner}/${repo} does not exist`);
            return false;
        }

        logger.error(
            { err },
            `Failed to check if repository ${owner}/${repo} exists`,
        );

        throw err;
    }
};
