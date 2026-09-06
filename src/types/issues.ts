import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import type { Label } from '@octokit/webhooks-types';

/**
 * Valid lock reasons accepted by the GitHub lock API.
 */
export type IssueLockReason =
    RestEndpointMethodTypes['issues']['lock']['parameters']['lock_reason'];

/**
 * Lock state of a GitHub issue.
 */
export interface IssueLockState {
    locked: boolean;
    activeLockReason: string | null;
}

/**
 * Input for posting a comment on an issue.
 */
export interface AddCommentToIssueInput {
    issueNumber: number;
    comment: string;
}

/**
 * Input for updating an existing issue comment.
 */
export interface UpdateCommentOnIssueInput {
    commentId: number;
    comment: string;
}

/**
 * Input for assigning users to an issue.
 */
export interface AssignIssueToUserInput {
    issueNumber: number;
    assignee: string[];
}

/**
 * Input for adding a label to an issue.
 */
export interface AddLabelToIssueInput {
    issueNumber: number;
    label: Label;
}

/**
 * Input for removing a label from an issue.
 */
export interface RemoveLabelFromIssueInput {
    issueNumber: number;
    label: Label;
}

/**
 * Input for locking an issue.
 */
export interface LockIssueInput {
    issueNumber: number;
    lockReason?: IssueLockReason;
}

/**
 * Input for unlocking an issue.
 */
export interface UnlockIssueInput {
    issueNumber: number;
}

/**
 * Input for closing an issue.
 */
export interface CloseIssueInput {
    issueNumber: number;
}
