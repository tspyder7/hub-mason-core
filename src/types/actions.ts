/**
 * Input for dispatching a GitHub Actions workflow.
 */
export type DispatchWorkflowInput = {
    workflowId: string | number;
    ref: string;
    inputs?: Record<string, string | number | boolean>;
};
