import { Octokit } from 'octokit';
import { GithubClient } from '@/src/github/client';

vi.mock('octokit', () => ({
    Octokit: vi.fn(),
}));

describe('octokit-client tests', () => {
    beforeEach(() => {
        vi.stubEnv('HUB_MASON_GITHUB_APP_TOKEN', 'test-secret-token');
        (GithubClient as unknown as { instance: null }).instance = null;
        null;
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it('should return Octokit client instance', () => {
        const client = GithubClient.getInstance();

        expect(Octokit).toHaveBeenCalledOnce();
        expect(Octokit).toHaveBeenCalledWith({
            auth: 'test-secret-token',
        });
        expect(client).toBeDefined();
    });

    it('should throw error when HUB_MASON_GITHUB_APP_TOKEN is not set', () => {
        delete process.env['HUB_MASON_GITHUB_APP_TOKEN'];

        expect(() => GithubClient.getInstance()).toThrow(
            'Missing required environment variable: HUB_MASON_GITHUB_APP_TOKEN',
        );
    });

    it('should return same client on subsequent initialization', () => {
        const client1 = GithubClient.getInstance();
        const client2 = GithubClient.getInstance();

        expect(Octokit).toHaveBeenCalledOnce();
        expect(Octokit).toHaveBeenCalledWith({
            auth: 'test-secret-token',
        });
        expect(client1).toBe(client2);
    });
});
