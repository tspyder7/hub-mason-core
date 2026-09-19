import type { Repository } from '@/src/types/repository';
import type { UpdateCommentOnIssueInput } from '@/src/types/issues';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Updates the body of an existing issue comment.
 *
 * @param input - Comment ID and new body.
 * @param repository - Target owner/repo.
 * @throws Rethrows GitHub API errors.
 */
export const updateCommentOnIssue = async (
    input: UpdateCommentOnIssueInput,
    repository: Repository,
): Promise<void> => {
    const { commentId, comment } = input;
    const { repo, owner } = repository;

    try {
        logger.info(`Updating comment ${commentId} on: ${owner}/${repo}`);

        const client = GithubClient.getInstance();

        await client.rest.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
            body: comment,
        });

        logger.info(`Updated comment ${commentId} on: ${owner}/${repo}`);
    } catch (err) {
        logger.error(
            { err },
            `Failed to update comment ${commentId} on: ${owner}/${repo}`,
        );

        throw err;
    }
};
