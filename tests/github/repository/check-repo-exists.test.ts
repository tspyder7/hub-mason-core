import { RequestError } from 'octokit';
import { GithubClient } from '@/src/github/client';
import { checkRepoExists } from '@/src/github/repository/check-repo-exists';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

import type { Repository } from '@/src/types/repository';

describe('checkRepoExists', () => {
    const reposGetMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { repos: { get: reposGetMock } },
        } as never);
        reposGetMock.mockResolvedValue({ data: repository });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('returns true when repository exists', async () => {
            const result = await checkRepoExists(repository);

            expect(result).toBe(true);
            expect(reposGetMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Checking if repository john-doe/test-repo exists',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Repository john-doe/test-repo exists',
            );
        });

        it('returns true for different repository', async () => {
            const otherRepo: Repository = {
                owner: 'other-user',
                repo: 'test-repo',
            };

            const result = await checkRepoExists(otherRepo);

            expect(result).toBe(true);
            expect(reposGetMock).toHaveBeenCalledWith({
                owner: 'other-user',
                repo: 'test-repo',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Checking if repository other-user/test-repo exists',
            );
        });
    });

    describe('not found', () => {
        it('returns false when repository is not found (404)', async () => {
            const error = new RequestError('Not Found', 404, {
                request: {
                    method: 'GET',
                    url: '/repos/john-doe/test-repo',
                    headers: {},
                },
            });
            reposGetMock.mockRejectedValueOnce(error);

            const result = await checkRepoExists(repository);

            expect(result).toBe(false);
            expect(logger.info).toHaveBeenCalledWith(
                'Checking if repository john-doe/test-repo exists',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Repository john-doe/test-repo does not exist',
            );
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe('failure', () => {
        it('throws on 401 insufficient permission', async () => {
            const error = new RequestError('Insufficient Permission', 401, {
                request: {
                    method: 'GET',
                    url: '/repos/john-doe/test-repo',
                    headers: {},
                },
            });
            reposGetMock.mockRejectedValueOnce(error);

            await expect(checkRepoExists(repository)).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({
                        message: 'Insufficient Permission',
                    }),
                }),
                'Failed to check if repository john-doe/test-repo exists',
            );
        });

        it('throws on network error', async () => {
            const error = new Error('Network issue');
            reposGetMock.mockRejectedValueOnce(error);

            await expect(checkRepoExists(repository)).rejects.toThrow(
                'Network issue',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network issue' }),
                }),
                'Failed to check if repository john-doe/test-repo exists',
            );
        });

        it('throws on server error 500', async () => {
            const error = new RequestError('Server Error', 500, {
                request: {
                    method: 'GET',
                    url: '/repos/john-doe/test-repo',
                    headers: {},
                },
            });
            reposGetMock.mockRejectedValueOnce(error);

            await expect(checkRepoExists(repository)).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
