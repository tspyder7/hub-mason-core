import type { Label } from '@octokit/webhooks-types';

import type { Repository } from './repository';
import type { Reporter, Step, StepError, WorkflowMeta } from './step';

/**
 * Props for creating a GitHub status-comment reporter.
 *
 * @template Status - String union of workflow statuses.
 */
export type CreateGithubCommentReporterProps<Status extends string> = {
    repository: Repository;
    issueNumber: number;
    meta: WorkflowMeta;
    emoji: Partial<Record<Status, string>>;
    failedStatusFilter?: (status: Status) => boolean;
    getCommentId?: () => number | undefined;
    setCommentId?: (id: number) => void;
    runError?: StepError | null;
};

/**
 * Props for posting a one-off summary comment.
 *
 * @template Status - String union of workflow statuses.
 */
export type PostSummaryCommentProps<Status extends string> = {
    repository: Repository;
    issueNumber: number;
    meta: WorkflowMeta;
    steps: readonly Step<Status>[];
    emoji: Partial<Record<Status, string>>;
    failedStatusFilter?: (status: Status) => boolean;
    runError?: StepError | null;
};

/**
 * Props for rendering a live status comment.
 *
 * @template Status - String union of workflow statuses.
 */
export type RenderStatusCommentProps<Status extends string> = {
    steps: readonly Step<Status>[];
    meta: WorkflowMeta;
    emoji: Partial<Record<Status, string>>;
    failedStatusFilter?: (status: Status) => boolean;
    runError?: StepError | null;
};

/**
 * Props for rendering a final summary comment.
 *
 * @template Status - String union of workflow statuses.
 */
export type RenderSummaryProps<Status extends string> = {
    steps: readonly Step<Status>[];
    meta: WorkflowMeta;
    emoji: Partial<Record<Status, string>>;
    failedStatusFilter?: (status: Status) => boolean;
    runError?: StepError | null;
};

/**
 * Transition event delivered to label-reporter callbacks.
 */
export type LabelTransitionEvent = Parameters<
    NonNullable<Reporter<string>['onTransition']>
>[0];

/**
 * Optional callback invoked after label sync.
 */
export type LabelTransitionCallback = (
    event?: LabelTransitionEvent,
) => void | Promise<void>;

/**
 * Props for creating a GitHub status-label reporter.
 */
export type CreateGithubLabelReporterProps = {
    repository: Repository;
    issueNumber: number;
    labelPrefix: string;
};

/**
 * Status-label reporter with explicit update plus transition hook.
 */
export type GithubLabelReporter = {
    onTransition: (callback?: LabelTransitionCallback) => Promise<void>;
    updateStatus: (to: Label) => Promise<void>;
};
