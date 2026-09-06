import type { Label } from '@octokit/webhooks-types';
import type { Repository } from '@/src/types/repository';
import { logger } from '@/src/utils/logger';
import { addLabelToIssue } from '@/src/github/issues/add-label';
import { getLabelsFromIssue } from '@/src/github/issues/get-labels';
import { removeLabelFromIssue } from '@/src/github/issues/remove-label';
import type { Reporter } from '@/src/types/step';

type TransitionEvent = Parameters<
    NonNullable<Reporter<string>['onTransition']>
>[0];

type TransitionCallback = (event?: TransitionEvent) => void | Promise<void>;

/**
 * Creates a status-label reporter that swaps `<prefix>*` labels atomically.
 *
 * Removes existing prefixed labels before adding the new one; restores removed
 * labels when the update fails.
 *
 * @param input - Repository, issue number, and label prefix to manage.
 * @returns Object with `updateStatus` and `onTransition` handlers.
 */
export const createGithubLabelReporter = (input: {
    repository: Repository;
    issueNumber: number;
    labelPrefix: string;
}): {
    onTransition: (callback?: TransitionCallback) => Promise<void>;
    updateStatus: (to: Label) => Promise<void>;
} => {
    const removeStatusLabel = async (
        label: Label,
    ): Promise<
        | { success: true; label: Label }
        | { success: false; label: Label; error: unknown }
    > => {
        try {
            await removeLabelFromIssue(
                { issueNumber: input.issueNumber, label },
                input.repository,
            );
            return { success: true, label };
        } catch (error) {
            return { success: false, label, error };
        }
    };

    const restoreStatusLabel = async (label: Label): Promise<void> => {
        try {
            await addLabelToIssue(
                { issueNumber: input.issueNumber, label },
                input.repository,
            );
            logger.warn(`Restored previous status label: ${label.name}`);
        } catch (error) {
            logger.error(
                { err: error },
                `Failed to restore previous status label: ${label.name}`,
            );
        }
    };

    const updateStatus = async (to: Label): Promise<void> => {
        let removedLabels: Label[] = [];

        try {
            const issueLabels = await getLabelsFromIssue(
                input.issueNumber,
                input.repository,
            );
            const fromLabels = issueLabels.filter(({ name }) =>
                name.startsWith(input.labelPrefix),
            );

            logger.info(
                fromLabels.length > 0
                    ? `Updating status: ${fromLabels.map(({ name }) => name).join(', ')} -> ${to.name}`
                    : `Adding status label: ${to.name}`,
            );

            const results = await Promise.all(
                fromLabels.map((label) => removeStatusLabel(label)),
            );
            removedLabels = results
                .filter((r): r is { success: true; label: Label } => r.success)
                .map(({ label }) => label);
            const failure = results.find(
                (r): r is { success: false; label: Label; error: unknown } =>
                    !r.success,
            );
            if (failure) throw failure.error;

            await addLabelToIssue(
                { issueNumber: input.issueNumber, label: to },
                input.repository,
            );
            logger.info(`Updated status to ${to.name}`);
        } catch (err) {
            await Promise.all(
                removedLabels.map((label) => restoreStatusLabel(label)),
            );
            logger.error(
                { err },
                `Failed to update status to ${to.name} on ${input.repository.owner}/${input.repository.repo}#${input.issueNumber}`,
            );
            throw err;
        }
    };

    return {
        updateStatus,
        onTransition: async (callback?: TransitionCallback): Promise<void> => {
            if (typeof callback === 'function') {
                await callback();
            }
        },
    };
};
