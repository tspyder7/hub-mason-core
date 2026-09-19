import { GithubClient } from '@/src/github/client';
import { getLabelsFromRepo } from '@/src/github/repository/get-labels';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';
import { createLabels } from '@/tests/fixtures/labels';

describe('getLabelsFromRepo', () => {
    const listLabelsForRepoMock = vi.fn();
    const repoLabels = createLabels();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { listLabelsForRepo: listLabelsForRepoMock } },
        } as never);
        listLabelsForRepoMock.mockResolvedValue({ data: repoLabels });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('fetches labels from repository', async () => {
            const result = await getLabelsFromRepo(repository);

            expect(listLabelsForRepoMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
            });
            expect(result).toStrictEqual(repoLabels);
            expect(logger.info).toHaveBeenCalledWith(
                'Fetching labels from john-doe/test-repo',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Fetched labels from john-doe/test-repo: 2',
            );
        });

        it('returns empty array when no labels exist', async () => {
            listLabelsForRepoMock.mockResolvedValueOnce({ data: [] });

            const result = await getLabelsFromRepo(repository);

            expect(result).toEqual([]);
            expect(logger.info).toHaveBeenCalledWith(
                'Fetched labels from john-doe/test-repo: 0',
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when fetching fails', async () => {
            listLabelsForRepoMock.mockRejectedValueOnce(
                new Error('Network error'),
            );

            await expect(getLabelsFromRepo(repository)).rejects.toThrow(
                'Network error',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Fetching labels from john-doe/test-repo',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to fetch labels from john-doe/test-repo',
            );
        });
    });
});
