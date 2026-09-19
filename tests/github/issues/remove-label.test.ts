import { RequestError } from 'octokit';
import { GithubClient } from '@/src/github/client';
import { removeLabelFromIssue } from '@/src/github/issues/remove-label';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';
import { createLabelByName as createLabel } from '@/tests/fixtures/labels';

describe('removeLabelFromIssue', () => {
    const removeLabelMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { removeLabel: removeLabelMock } },
        } as never);
        removeLabelMock.mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('removes label from issue', async () => {
            const input = { issueNumber: 10, label: createLabel('bug') };

            await removeLabelFromIssue(input, repository);

            expect(removeLabelMock).toHaveBeenCalledWith({
                repo: 'test-repo',
                issue_number: 10,
                owner: 'john-doe',
                name: 'bug',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Removing bug label from issue: john-doe/test-repo#10',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Removed bug label from issue: john-doe/test-repo#10',
            );
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe('label not found', () => {
        it('logs and returns without throwing on 404', async () => {
            const error = new RequestError('Not Found', 404, {
                request: {
                    method: 'DELETE',
                    url: '/repos/john-doe/test-repo/issues/10/labels/bug',
                    headers: {},
                },
            });
            removeLabelMock.mockRejectedValueOnce(error);
            const input = {
                issueNumber: 10,
                label: createLabel('unknown-label'),
            };

            await removeLabelFromIssue(input, repository);

            expect(logger.info).toHaveBeenCalledWith(
                'Removing unknown-label label from issue: john-doe/test-repo#10',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Label not found on issue. skipping the removeLabel',
            );
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe('failure', () => {
        it('throws and logs error on 401 insufficient permission', async () => {
            const error = new RequestError('Insufficient Permission', 401, {
                request: {
                    method: 'DELETE',
                    url: '/repos/john-doe/test-repo/issues/10/labels/bug',
                    headers: {},
                },
            });
            removeLabelMock.mockRejectedValueOnce(error);
            const input = { issueNumber: 10, label: createLabel('bug') };

            await expect(
                removeLabelFromIssue(input, repository),
            ).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({
                        message: 'Insufficient Permission',
                    }),
                }),
                'Failed to remove bug label from issue: john-doe/test-repo#10',
            );
        });

        it('throws and logs error on network failure', async () => {
            const error = new Error('Network issue');
            removeLabelMock.mockRejectedValueOnce(error);
            const input = { issueNumber: 10, label: createLabel('bug') };

            await expect(
                removeLabelFromIssue(input, repository),
            ).rejects.toThrow('Network issue');
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network issue' }),
                }),
                'Failed to remove bug label from issue: john-doe/test-repo#10',
            );
        });

        it('throws on generic request error with non-404 status', async () => {
            const error = new RequestError('Server Error', 500, {
                request: {
                    method: 'DELETE',
                    url: '/repos/john-doe/test-repo/issues/10/labels/bug',
                    headers: {},
                },
            });
            removeLabelMock.mockRejectedValueOnce(error);

            await expect(
                removeLabelFromIssue(
                    { issueNumber: 10, label: createLabel('bug') },
                    repository,
                ),
            ).rejects.toThrow(error);
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
