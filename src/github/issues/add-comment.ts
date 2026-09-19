import type { AddCommentToIssueInput } from '@/src/types/issues';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { GithubClient } from '../client';

/**
 * Posts a comment on a GitHub issue.
 *
 * @param input - Issue number and comment body.
 * @param repository - Target owner/repo.
 * @returns Created comment ID.
 * @throws Rethrows GitHub API errors.
 */
export const addCommentToIssue = async (
    input: AddCommentToIssueInput,
    repository: Repository,
): Promise<number> => {
    const { issueNumber, comment: commentBody = '' } = input;
    const { repo, owner } = repository;

    try {
        logger.info(`Posting comment to: ${owner}/${repo}#${issueNumber}`);

        const client = GithubClient.getInstance();

        const {
            data: { id: commentId },
        } = await client.rest.issues.createComment({
            issue_number: issueNumber,
            body: commentBody,
            owner,
            repo,
        });

        logger.info(
            `Posted comment successfully to: ${owner}/${repo}#${issueNumber} (comment id: ${commentId})`,
        );

        return commentId;
    } catch (err) {
        logger.error(
            { err },
            `Failed to post comment to: ${owner}/${repo}#${issueNumber}`,
        );

        throw err;
    }
};
