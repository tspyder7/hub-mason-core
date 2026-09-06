import { GithubClient } from '@/src/github/client';
import { addLabelToIssue } from '@/src/github/issues/add-label';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';
import { createLabel } from '@/tests/fixtures/labels';

vi.mock('@/src/github/repository/create-label', () => ({
    createLabelInRepo: vi.fn(),
}));

import { createLabelInRepo } from '@/src/github/repository/create-label';

describe('addLabelToIssue', () => {
    const addLabelsMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: { issues: { addLabels: addLabelsMock } },
        } as never);
        addLabelsMock.mockResolvedValue(undefined);
        vi.mocked(createLabelInRepo).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('creates label if not exists and adds it to issue', async () => {
            const label = createLabel({ name: 'bug' });
            const input = { issueNumber: 10, label };

            await addLabelToIssue(input, repository);

            expect(createLabelInRepo).toHaveBeenCalledWith(label, repository);
            expect(addLabelsMock).toHaveBeenCalledWith({
                issue_number: 10,
                labels: ['bug'],
                owner: 'john-doe',
                repo: 'test-repo',
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Adding bug label to issue: john-doe/test-repo#10',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Added bug label to issue: john-doe/test-repo#10',
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when adding label fails', async () => {
            const label = createLabel({ name: 'bug' });
            addLabelsMock.mockRejectedValueOnce(new Error('Network error'));

            await expect(
                addLabelToIssue({ issueNumber: 10, label }, repository),
            ).rejects.toThrow('Network error');
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to add bug label to issue: john-doe/test-repo#10',
            );
        });

        it('throws and logs error when creating label fails', async () => {
            const label = createLabel({ name: 'bug' });
            vi.mocked(createLabelInRepo).mockRejectedValueOnce(
                new Error('Failed to create label'),
            );

            await expect(
                addLabelToIssue({ issueNumber: 10, label }, repository),
            ).rejects.toThrow('Failed to create label');
            expect(addLabelsMock).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({
                        message: 'Failed to create label',
                    }),
                }),
                'Failed to add bug label to issue: john-doe/test-repo#10',
            );
        });
    });
});
