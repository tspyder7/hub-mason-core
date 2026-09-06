import { vi } from 'vitest';
import { GithubClient } from '@/src/github/client';

export const mockGithubClient = <T extends Record<string, unknown>>(
    rest: T,
) => {
    return vi
        .spyOn(GithubClient, 'getInstance')
        .mockReturnValue({ rest } as never);
};
