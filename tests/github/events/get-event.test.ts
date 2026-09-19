import { getEvent } from '@/src/github/event';
import type { Issue, PullRequest } from '@octokit/webhooks-types';

const { mockedContext, randomUUIDMock } = vi.hoisted(() => {
    return {
        randomUUIDMock: vi.fn(),
        mockedContext: {
            payload: {
                issue: {} as unknown as Issue,
                pull_request: {} as unknown as PullRequest,
                action: 'test-action',
            } as unknown,
            repo: { owner: 'default-owner', repo: 'default-repo' },
            eventName: 'push',
            workflow: {},
            runId: 123456789,
            actor: 'test-actor',
        },
    };
});

vi.mock('node:crypto', () => ({
    randomUUID: randomUUIDMock,
}));

vi.mock('@actions/github', () => ({
    getOctokit: vi.fn(),
    context: mockedContext,
}));

describe('getEvent tests', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        randomUUIDMock.mockReturnValue('44e99322-cd27-4038-adea-1e4f191bc9b5');
    });

    it('should return github event', () => {
        const event = getEvent();

        expect(event).toStrictEqual({
            eventName: 'push',
            issue: {},
            pullRequest: {},
            repo: { repo: 'default-repo', owner: 'default-owner' },
            action: 'test-action',
            workflow: {},
            runId: 123456789,
            actor: 'test-actor',
            requestId: '44e99322-cd27-4038-adea-1e4f191bc9b5',
        });
    });
});
