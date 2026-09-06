import type { Issue, PullRequest } from '@octokit/webhooks-types';
import type { Repository } from './repository';

/**
 * Normalized GitHub Actions event with repo, actor, and run metadata.
 */
export interface GithubEvent {
    eventName: string;
    issue: Issue;
    pullRequest: PullRequest;
    repo: Repository;
    action?: string;
    workflow: string;
    runId: number;
    actor: string;
    requestId: string;
}
