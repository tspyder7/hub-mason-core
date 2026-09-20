import type {
    CreateGithubCommentReporterProps,
    PostSummaryCommentProps,
} from '@/src/types/reporter';
import type { Reporter } from '@/src/types/step';
import { addCommentToIssue } from '@/src/github/issues/add-comment';
import { updateCommentOnIssue } from '@/src/github/issues/update-comment';
import { withUnlockedIssue } from '@/src/github/issues/with-lock';
import { renderStatusComment, renderSummary } from './renderer';

/**
 * Creates a reporter that posts/updates a status comment on each transition.
 *
 * Reuses the stored comment ID when available, otherwise creates a new comment.
 *
 * @param input - Repository, issue, workflow meta, emoji map, and comment-ID accessors.
 * @returns Reporter with `onTransition` handler.
 */
export const createGithubCommentReporter = <Status extends string>(
    input: CreateGithubCommentReporterProps<Status>,
): Reporter<Status> => ({
    onTransition: async ({ all }) => {
        const body = renderStatusComment({
            steps: all,
            meta: input.meta,
            emoji: input.emoji,
            failedStatusFilter: input.failedStatusFilter,
            runError: input.runError,
        });

        await withUnlockedIssue({
            issueNumber: input.issueNumber,
            repository: input.repository,
            fn: async () => {
                const commentId = input.getCommentId?.();

                if (commentId) {
                    await updateCommentOnIssue(
                        { commentId, comment: body },
                        input.repository,
                    );
                    return;
                }

                const newId = await addCommentToIssue(
                    { issueNumber: input.issueNumber, comment: body },
                    input.repository,
                );
                input.setCommentId?.(newId);
            },
        });
    },
});

/**
 * Posts a one-off summary comment for the given steps.
 *
 * @param input - Repository, issue, workflow meta, steps, and emoji map.
 * @throws Rethrows GitHub API errors.
 */
export const postSummaryComment = async <Status extends string>(
    input: PostSummaryCommentProps<Status>,
): Promise<void> => {
    const body = renderSummary({
        steps: input.steps,
        meta: input.meta,
        emoji: input.emoji,
        failedStatusFilter: input.failedStatusFilter,
        runError: input.runError,
    });

    await withUnlockedIssue({
        issueNumber: input.issueNumber,
        repository: input.repository,
        fn: async () => {
            await addCommentToIssue(
                { issueNumber: input.issueNumber, comment: body },
                input.repository,
            );
        },
    });
};
