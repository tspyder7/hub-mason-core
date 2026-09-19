import type { Label } from '@octokit/webhooks-types';
import { GithubClient } from '@/src/github/client';
import { createLabelInRepo } from '@/src/github/repository/create-label';
import { getLabelsFromRepo } from '@/src/github/repository/get-labels';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';
import { createLabel } from '@/tests/fixtures/labels';

vi.mock('@/src/github/repository/get-labels', () => ({
    getLabelsFromRepo: vi.fn(),
}));

describe('createLabelInRepo', () => {
    const createLabelMock = vi.fn();
    const repoLabels: Label[] = [
        createLabel({ name: 'bug' }),
        createLabel({ name: 'test' }),
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { createLabel: createLabelMock } },
        } as never);
        createLabelMock.mockResolvedValue(undefined);
        vi.mocked(getLabelsFromRepo).mockResolvedValue(repoLabels);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('creates label when it does not exist', async () => {
            const label = createLabel({
                name: 'repo-request',
                description: 'Test label',
            });

            await createLabelInRepo(label, repository);

            expect(getLabelsFromRepo).toHaveBeenCalledWith(repository);
            expect(createLabelMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
                name: 'repo-request',
                description: 'Test label',
                color: 'ff0000',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Creating label in john-doe/test-repo',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Created label in john-doe/test-repo: repo-request',
            );
        });

        it('uses empty string when description is missing', async () => {
            // omit description to trigger fallback
            const labelWithoutDesc = {
                name: 'new-label',
                color: '000000',
            } as Label;

            await createLabelInRepo(labelWithoutDesc, repository);

            expect(createLabelMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
                name: 'new-label',
                description: '',
                color: '000000',
            });
        });

        it('handles undefined description fallback', async () => {
            const label = {
                name: 'new-label',
                color: '123456',
            } as unknown as Label;

            await createLabelInRepo(label, repository);

            expect(createLabelMock).toHaveBeenCalledWith(
                expect.objectContaining({ description: '' }),
            );
        });
    });

    describe('skip', () => {
        it('skips creation when label already exists', async () => {
            vi.mocked(getLabelsFromRepo).mockResolvedValueOnce([
                ...repoLabels,
                createLabel({ name: 'repo-request' }),
            ]);
            const label = createLabel({ name: 'repo-request' });

            await createLabelInRepo(label, repository);

            expect(createLabelMock).not.toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'Label already exists, skipping label creation',
            );
        });

        it('skips when label name matches existing label exactly', async () => {
            vi.mocked(getLabelsFromRepo).mockResolvedValueOnce([
                createLabel({ name: 'bug' }),
            ]);

            await createLabelInRepo(createLabel({ name: 'bug' }), repository);

            expect(createLabelMock).not.toHaveBeenCalled();
        });
    });

    describe('failure', () => {
        it('throws and logs error when createLabel fails', async () => {
            createLabelMock.mockRejectedValueOnce(new Error('Network error'));
            const label = createLabel({ name: 'repo-request' });

            await expect(createLabelInRepo(label, repository)).rejects.toThrow(
                'Network error',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to create label in john-doe/test-repo',
            );
        });

        it('throws and logs error when getLabelsFromRepo fails', async () => {
            vi.mocked(getLabelsFromRepo).mockRejectedValueOnce(
                new Error('Fetch failed'),
            );
            const label = createLabel({ name: 'repo-request' });

            await expect(createLabelInRepo(label, repository)).rejects.toThrow(
                'Fetch failed',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Fetch failed' }),
                }),
                'Failed to create label in john-doe/test-repo',
            );
            expect(createLabelMock).not.toHaveBeenCalled();
        });
    });
});
