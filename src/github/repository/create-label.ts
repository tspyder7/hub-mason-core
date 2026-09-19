import type { Label } from '@octokit/webhooks-types';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';
import { getLabelsFromRepo } from './get-labels';
import type { Repository } from '@/src/types/repository';

/**
 * Creates a label in the repo unless a label with the same name already exists.
 *
 * @param label - Label name, color, and optional description.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const createLabelInRepo = async (
    label: Label,
    repository: Repository,
) => {
    const { repo, owner } = repository;

    try {
        const labels = await getLabelsFromRepo(repository);

        const isLabelExists = !!labels.find(({ name }) => name === label.name);

        if (isLabelExists) {
            logger.info('Label already exists, skipping label creation');
            return;
        }

        logger.info(`Creating label in ${owner}/${repo}`);

        const client = GithubClient.getInstance();

        await client.rest.issues.createLabel({
            owner,
            repo,
            name: label.name,
            description: label.description || '',
            color: label.color,
        });

        logger.info(`Created label in ${owner}/${repo}: ${label.name}`);
    } catch (err) {
        logger.error({ err }, `Failed to create label in ${owner}/${repo}`);

        throw err;
    }
};
