import { Octokit } from 'octokit';

/**
 * Singleton Octokit client authenticated via `HUB_MASON_GITHUB_APP_TOKEN`.
 */
export class GithubClient {
    private static instance: Octokit | null;

    /* v8 ignore next */
    private constructor() {}

    /**
     * Returns the shared Octokit instance, creating it on first use.
     *
     * @returns Authenticated Octokit client.
     * @throws When `HUB_MASON_GITHUB_APP_TOKEN` is missing.
     */
    static getInstance(): Octokit {
        if (GithubClient.instance) return GithubClient.instance;

        const { HUB_MASON_GITHUB_APP_TOKEN: authToken } = process.env!;

        if (!authToken)
            throw new Error(
                'Missing required environment variable: HUB_MASON_GITHUB_APP_TOKEN',
            );

        GithubClient.instance = new Octokit({
            auth: authToken,
        });

        return GithubClient.instance;
    }
}
