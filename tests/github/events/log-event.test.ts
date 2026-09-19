import type { Issue, Label, PullRequest } from '@octokit/webhooks-types';
import { logEvent } from '@/src/github/event/log-event';
import { logger } from '@/src/utils/logger';
import type { GithubEvent } from '@/src/types/event';

describe('logEvent tests', () => {
    let event: GithubEvent;

    beforeEach(() => {
        event = {
            requestId: 'req-123',
            eventName: 'test-event',
            action: 'test',
            issue: {
                title: 'test issue',
                body: 'this is test issue body',
                number: 100,
                labels: [
                    { name: 'test/label1' },
                    { name: 'test/label2' },
                ] as unknown as Label[],
            } as unknown as Issue,
            repo: { repo: 'default-repo', owner: 'default-owner' },
            pullRequest: {} as unknown as PullRequest,
            workflow: 'test-workflow',
            runId: 1234567890,
            actor: 'test-actor',
        };
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    it('should log event details', () => {
        logEvent(event);

        expect(logger.info).toHaveBeenCalledWith('Github Event');
        expect(logger.info).toHaveBeenCalledWith('Event name: test-event');
        expect(logger.info).toHaveBeenCalledWith('Action: test');
        expect(logger.info).toHaveBeenCalledWith('Issue title: test issue');
        expect(logger.info).toHaveBeenCalledWith(
            'Issue body: this is test issue body',
        );
        expect(logger.info).toHaveBeenCalledWith('Issue number: 100');
        expect(logger.info).toHaveBeenCalledWith(
            'Issue labels: test/label1, test/label2',
        );
        expect(logger.info).toHaveBeenCalledWith('Workflow: test-workflow');
        expect(logger.info).toHaveBeenCalledWith('Run ID: 1234567890');
    });

    it('should log empty Issue labels if not labels does not exists', () => {
        logEvent({
            ...event,
            issue: { labels: undefined } as unknown as Issue,
        });

        expect(logger.info).toHaveBeenCalledWith('Issue labels: ');
    });
});
