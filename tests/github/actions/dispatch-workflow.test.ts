import { GithubClient } from '@/src/github/client';
import { dispatchWorkflow } from '@/src/github/actions/dispatch-workflow';
import { logger } from '@/src/utils/logger';
import { testRepository as repository } from '@/tests/fixtures/repository';

describe('dispatchWorkflow', () => {
    const createWorkflowDispatchMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(GithubClient, 'getInstance').mockReturnValue({
            rest: {
                actions: { createWorkflowDispatch: createWorkflowDispatchMock },
            },
        } as never);
        createWorkflowDispatchMock.mockResolvedValue({});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('success', () => {
        it('dispatches workflow with ref and inputs', async () => {
            const input = {
                workflowId: 'ci.yml',
                ref: 'main',
                inputs: { environment: 'prod' },
            };

            await dispatchWorkflow(input, repository);

            expect(createWorkflowDispatchMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
                workflow_id: 'ci.yml',
                ref: 'main',
                inputs: { environment: 'prod' },
            });
        });

        it('dispatches workflow without inputs', async () => {
            const input = { workflowId: 'ci.yml', ref: 'main' };

            await dispatchWorkflow(input, repository);

            expect(createWorkflowDispatchMock).toHaveBeenCalledWith({
                owner: 'john-doe',
                repo: 'test-repo',
                workflow_id: 'ci.yml',
                ref: 'main',
                inputs: undefined,
            });
        });

        it('supports numeric workflow id', async () => {
            const input = { workflowId: 12345, ref: 'main' };

            await dispatchWorkflow(input, repository);

            expect(createWorkflowDispatchMock).toHaveBeenCalledWith(
                expect.objectContaining({ workflow_id: 12345 }),
            );
        });

        it('logs success message after dispatch', async () => {
            const input = { workflowId: 'ci.yml', ref: 'main' };

            await dispatchWorkflow(input, repository);

            expect(logger.info).toHaveBeenCalledWith(
                'Dispatched workflow ci.yml on john-doe/test-repo@main',
            );
        });
    });

    describe('failure', () => {
        it('throws and logs error when dispatch fails', async () => {
            const error = new Error('Network error');
            createWorkflowDispatchMock.mockRejectedValueOnce(error);
            const input = { workflowId: 'ci.yml', ref: 'main' };

            await expect(dispatchWorkflow(input, repository)).rejects.toThrow(
                'Network error',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    err: expect.objectContaining({ message: 'Network error' }),
                }),
                'Failed to dispatch workflow ci.yml on john-doe/test-repo@main',
            );
        });
    });
});
