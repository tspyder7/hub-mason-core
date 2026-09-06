import { GithubClient } from '@/src/github/client';
import { getLabelsFromIssue } from '@/src/github/issues/get-labels';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';
import { createLabels } from '@/tests/fixtures/labels';

describe('getLabelsFromIssue', () => {
    const listLabelsOnIssueMock = vi.fn();
    const labels = createLabels();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { listLabelsOnIssue: listLabelsOnIssueMock } },
        } as never);
        listLabelsOnIssueMock.mockResolvedValue({ data: labels });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('fetches labels from issue', async () => {
            const issueNumber = 42;

            const result = await getLabelsFromIssue(issueNumber, repository);

            expect(listLabelsOnIssueMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
                issue_number: 42,
            });
            expect(result).toStrictEqual(labels);
            expect(logger.info).toHaveBeenCalledWith(
                'Fetching labels from issue: john-doe/test-repo#42',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Fetched labels from issue: john-doe/test-repo#42: 2',
            );
        });

        it('returns empty array when issue has no labels', async () => {
            listLabelsOnIssueMock.mockResolvedValueOnce({ data: [] });

            const result = await getLabelsFromIssue(42, repository);

            expect(result).toEqual([]);
            expect(logger.info).toHaveBeenCalledWith(
                'Fetched labels from issue: john-doe/test-repo#42: 0',
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when fetching labels fails', async () => {
            listLabelsOnIssueMock.mockRejectedValueOnce(
                new Error('Network error'),
            );

            await expect(getLabelsFromIssue(42, repository)).rejects.toThrow(
                'Network error',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to fetch labels from issue: john-doe/test-repo#42',
            );
        });
    });
});
