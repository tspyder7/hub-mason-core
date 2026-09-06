import { randomUUID } from 'node:crypto';

import * as github from '@actions/github';
import type { Issue, PullRequest } from '@octokit/webhooks-types';
import type { GithubEvent } from '@/src/types/event';

/**
 * Builds a normalized event from the GitHub Actions runtime context.
 *
 * @returns Normalized event with repo, actor, run metadata, and request ID.
 */
export const getEvent = (): GithubEvent => {
    const {
        payload,
        eventName,
        repo: { repo, owner },
        workflow,
        runId,
        actor,
    } = github.context;

    const pullRequest = payload.pull_request as PullRequest;
    const issue = payload.issue as Issue;

    return {
        eventName,
        issue,
        pullRequest,
        repo: { repo, owner },
        action: payload.action,
        workflow,
        runId,
        actor,
        requestId: randomUUID(),
    };
};
