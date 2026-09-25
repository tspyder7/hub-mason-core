import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';
import type { DispatchWorkflowInput } from '@/src/types/actions';
import type { Repository } from '@/src/types/repository';

/**
 * Dispatches a GitHub Actions workflow via `workflow_dispatch`.
 *
 * @param input - Workflow file/ID, ref, and optional inputs.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const dispatchWorkflow = async (
    input: DispatchWorkflowInput,
    repository: Repository,
): Promise<void> => {
    const { workflowId, ref, inputs } = input;
    const { repo, owner } = repository;

    try {
        logger.info(
            `Dispatching workflow ${String(workflowId)} on ${owner}/${repo}@${ref}`,
        );

        const client = GithubClient.getInstance();

        await client.rest.actions.createWorkflowDispatch({
            owner,
            repo,
            workflow_id: workflowId,
            ref,
            inputs,
        });

        logger.info(
            `Dispatched workflow ${String(workflowId)} on ${owner}/${repo}@${ref}`,
        );
    } catch (err) {
        logger.error(
            { err },
            `Failed to dispatch workflow ${String(workflowId)} on ${owner}/${repo}@${ref}`,
        );

        throw err;
    }
};
