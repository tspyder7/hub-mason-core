import type { AddLabelToIssueInput } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';
import { createLabelInRepo } from '../repository/create-label';

/**
 * Ensures the label exists in the repo, then adds it to the issue.
 *
 * @param input - Issue number and label to add.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const addLabelToIssue = async (
    input: AddLabelToIssueInput,
    repository: Repository,
): Promise<void> => {
    const { issueNumber, label } = input;
    const { repo, owner } = repository;

    try {
        logger.info(
            `Adding ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );

        await createLabelInRepo(label, repository);

        const client = GithubClient.getInstance();

        await client.rest.issues.addLabels({
            issue_number: issueNumber,
            labels: [label.name],
            owner,
            repo,
        });

        logger.info(
            `Added ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );
    } catch (err) {
        logger.error(
            { err },
            `Failed to add ${label.name} label to issue: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
