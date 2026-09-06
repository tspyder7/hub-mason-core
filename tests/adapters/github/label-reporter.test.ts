import { createGithubLabelReporter } from '@/src/adapters/github/label-reporter';
import { addLabelToIssue } from '@/src/github/issues/add-label';
import { getLabelsFromIssue } from '@/src/github/issues/get-labels';
import { removeLabelFromIssue } from '@/src/github/issues/remove-label';
import { adapterRepository as repository } from '@/tests/fixtures/repository';
import { createLabelByName as createLabel } from '@/tests/fixtures/labels';

vi.mock('@/src/github/issues/add-label', () => ({
    addLabelToIssue: vi.fn(),
}));

vi.mock('@/src/github/issues/get-labels', () => ({
    getLabelsFromIssue: vi.fn(),
}));

vi.mock('@/src/github/issues/remove-label', () => ({
    removeLabelFromIssue: vi.fn(),
}));

describe('createGithubLabelReporter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('updateStatus', () => {
        it('adds status label when no previous status labels', async () => {
            vi.mocked(getLabelsFromIssue).mockResolvedValue([
                createLabel('bug'),
            ]);
            vi.mocked(addLabelToIssue).mockResolvedValue(undefined);
            const reporter = createGithubLabelReporter({
                repository,
                issueNumber: 10,
                labelPrefix: 'status:',
            });

            await reporter.updateStatus(createLabel('status:done'));

            expect(getLabelsFromIssue).toHaveBeenCalledWith(10, repository);
            expect(removeLabelFromIssue).not.toHaveBeenCalled();
            expect(addLabelToIssue).toHaveBeenCalledWith(
                {
                    issueNumber: 10,
                    label: expect.objectContaining({ name: 'status:done' }),
                },
                repository,
            );
        });

        it('removes previous prefixed labels then adds new one', async () => {
            const oldA = createLabel('status:pending');
            const oldB = createLabel('status:review');
            vi.mocked(getLabelsFromIssue).mockResolvedValue([
                oldA,
                createLabel('bug'),
                oldB,
            ]);
            vi.mocked(removeLabelFromIssue).mockResolvedValue(undefined);
            vi.mocked(addLabelToIssue).mockResolvedValue(undefined);
            const reporter = createGithubLabelReporter({
                repository,
                issueNumber: 10,
                labelPrefix: 'status:',
            });

            await reporter.updateStatus(createLabel('status:done'));

            expect(removeLabelFromIssue).toHaveBeenCalledTimes(2);
            expect(removeLabelFromIssue).toHaveBeenCalledWith(
                { issueNumber: 10, label: oldA },
                repository,
            );
            expect(addLabelToIssue).toHaveBeenCalledWith(
                {
                    issueNumber: 10,
                    label: expect.objectContaining({ name: 'status:done' }),
                },
                repository,
            );
        });

        it('restores removed labels when add fails and rethrows', async () => {
            const oldA = createLabel('status:pending');
            vi.mocked(getLabelsFromIssue).mockResolvedValue([oldA]);
            vi.mocked(removeLabelFromIssue).mockResolvedValue(undefined);
            vi.mocked(addLabelToIssue)
                .mockRejectedValueOnce(new Error('add failed'))
                .mockResolvedValue(undefined);
            const reporter = createGithubLabelReporter({
                repository,
                issueNumber: 10,
                labelPrefix: 'status:',
            });

            await expect(
                reporter.updateStatus(createLabel('status:done')),
            ).rejects.toThrow('add failed');
            expect(addLabelToIssue).toHaveBeenCalledTimes(2);
            expect(addLabelToIssue).toHaveBeenLastCalledWith(
                { issueNumber: 10, label: oldA },
                repository,
            );
        });

        it('throws when remove fails and restores successful removals', async () => {
            const oldA = createLabel('status:a');
            const oldB = createLabel('status:b');
            vi.mocked(getLabelsFromIssue).mockResolvedValue([oldA, oldB]);
            vi.mocked(removeLabelFromIssue)
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('remove failed'));
            vi.mocked(addLabelToIssue).mockResolvedValue(undefined);
            const reporter = createGithubLabelReporter({
                repository,
                issueNumber: 10,
                labelPrefix: 'status:',
            });

            await expect(
                reporter.updateStatus(createLabel('status:done')),
            ).rejects.toThrow('remove failed');
            // oldA removed ok, restore attempted
            expect(addLabelToIssue).toHaveBeenCalledWith(
                { issueNumber: 10, label: oldA },
                repository,
            );
        });

        it('logs error when restore fails and still throws original', async () => {
            const oldA = createLabel('status:pending');
            vi.mocked(getLabelsFromIssue).mockResolvedValue([oldA]);
            vi.mocked(removeLabelFromIssue).mockResolvedValue(undefined);
            vi.mocked(addLabelToIssue).mockRejectedValue(
                new Error('add failed'),
            );
            const reporter = createGithubLabelReporter({
                repository,
                issueNumber: 10,
                labelPrefix: 'status:',
            });

            await expect(
                reporter.updateStatus(createLabel('status:done')),
            ).rejects.toThrow('add failed');
            expect(addLabelToIssue).toHaveBeenCalledTimes(2);
        });

        it('throws when fetching labels fails', async () => {
            vi.mocked(getLabelsFromIssue).mockRejectedValue(
                new Error('fetch failed'),
            );
            const reporter = createGithubLabelReporter({
                repository,
                issueNumber: 10,
                labelPrefix: 'status:',
            });

            await expect(
                reporter.updateStatus(createLabel('status:done')),
            ).rejects.toThrow('fetch failed');
            expect(addLabelToIssue).not.toHaveBeenCalled();
        });
    });

    describe('onTransition', () => {
        const createReporter = () =>
            createGithubLabelReporter({
                repository,
                issueNumber: 1,
                labelPrefix: 'status:',
            });

        it('invokes sync callback when provided', async () => {
            const reporter = createReporter();
            const cb = vi.fn();

            await reporter.onTransition(cb);

            expect(cb).toHaveBeenCalledOnce();
        });

        it('awaits async callback when provided', async () => {
            const reporter = createReporter();
            let done = false;
            const cb = vi.fn(async () => {
                done = true;
            });

            await reporter.onTransition(cb);

            expect(cb).toHaveBeenCalledOnce();
            expect(done).toBe(true);
        });

        it('does nothing when called with no args', async () => {
            const reporter = createReporter();

            await expect(reporter.onTransition()).resolves.toBeUndefined();
        });

        it('ignores event-like object without throwing', async () => {
            const reporter = createReporter();
            const onTransition = reporter.onTransition as unknown as (
                ...args: unknown[]
            ) => Promise<void>;

            await expect(onTransition({ from: 'a' })).resolves.toBeUndefined();
        });
    });
});
