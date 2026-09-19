import { gfmTableToMarkdown } from 'mdast-util-gfm-table';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Blockquote, Code, Paragraph, Root, TableRow } from 'mdast';

import {
    blockquote,
    code,
    heading,
    inlineCode,
    link,
    paragraph,
    strong,
    table,
    tableCell,
    tableRow,
    text,
} from '../../markdown/tags';
import type { Step, WorkflowMeta } from '../../types/step';

const toMarkdownRoot = (children: Root['children']): string =>
    toMarkdown(
        { type: 'root', children },
        { extensions: [gfmTableToMarkdown({ tablePipeAlign: false })] },
    );

const renderStepRow = <S extends string>(input: {
    step: Step<S>;
    emoji: Partial<Record<S, string>>;
}): TableRow =>
    tableRow([
        tableCell([text(input.step.name)]),
        tableCell([text(input.emoji[input.step.status] ?? input.step.status)]),
        tableCell([
            text(
                input.step.details.length > 0
                    ? input.step.details.join(', ')
                    : '-',
            ),
        ]),
    ]);

const renderFailedStep = <S extends string>(
    step: Step<S>,
): Array<Paragraph | Blockquote | Code> => [
    paragraph([text('Failed at step: '), strong(step.name)]),
    blockquote([paragraph([text(step.error?.message ?? 'Unknown error')])]),
    ...(step.error?.stack ? [code(step.error.stack)] : []),
];

const renderWorkflowRun = (meta: WorkflowMeta): Paragraph | null => {
    if (!meta.owner || !meta.repo || !meta.runId) return null;
    return paragraph([
        text('Workflow run: '),
        link(
            `https://github.com/${meta.owner}/${meta.repo}/actions/runs/${meta.runId}`,
            meta.runId.toString(),
        ),
    ]);
};

/**
 * Renders a live status comment (steps table plus failures) as Markdown.
 *
 * @param input - Steps, workflow meta, emoji map, and failure detection.
 * @returns Markdown comment body.
 */
export const renderStatusComment = <S extends string>(input: {
    steps: readonly Step<S>[];
    meta: WorkflowMeta;
    emoji: Partial<Record<S, string>>;
    failedStatusFilter?: (status: S) => boolean;
    runError?: { message: string; stack?: string } | null;
}): string => {
    const failedSteps = input.failedStatusFilter
        ? input.steps.filter((s) => input.failedStatusFilter!(s.status))
        : input.steps.filter((s) => s.status.toLowerCase().includes('fail'));

    const runError = input.runError ?? null;

    const children: Root['children'] = [
        heading(2, input.meta.requestType ?? 'request'),
        paragraph([
            text('Request-Id: '),
            inlineCode(input.meta.requestId ?? '-'),
        ]),
    ];

    const runPara = renderWorkflowRun(input.meta);
    if (runPara) children.push(runPara);

    if (input.steps.length) {
        children.push(
            table([
                tableRow([
                    tableCell([text('Step')]),
                    tableCell([text('Status')]),
                    tableCell([text('Details')]),
                ]),
                ...input.steps.map((step) =>
                    renderStepRow({ step, emoji: input.emoji }),
                ),
            ]),
        );
    }

    if (failedSteps.length) {
        children.push(heading(3, 'Error'));
        children.push(...failedSteps.flatMap(renderFailedStep));
    }

    if (runError) {
        children.push(
            heading(3, 'Error'),
            blockquote([paragraph([text(runError.message)])]),
            ...(runError.stack ? [code(runError.stack)] : []),
        );
    }

    return toMarkdownRoot(children);
};

/**
 * Renders a final summary comment (status plus first error) as Markdown.
 *
 * @param input - Steps, workflow meta, emoji map, and failure detection.
 * @returns Markdown summary body.
 */
export const renderSummary = <S extends string>(input: {
    steps: readonly Step<S>[];
    meta: WorkflowMeta;
    emoji: Partial<Record<S, string>>;
    failedStatusFilter?: (status: S) => boolean;
    runError?: { message: string; stack?: string } | null;
}): string => {
    const failedSteps = input.failedStatusFilter
        ? input.steps.filter((s) => input.failedStatusFilter!(s.status))
        : input.steps.filter((s) => s.status.toLowerCase().includes('fail'));

    const failed = failedSteps.length > 0 || input.runError != null;
    const status = failed ? 'FAILED' : 'COMPLETED';

    const children: Root['children'] = [
        heading(2, 'Summary'),
        paragraph([
            text('Request type: '),
            strong(input.meta.requestType ?? 'unknown'),
        ]),
        paragraph([
            text('Request-Id: '),
            inlineCode(input.meta.requestId ?? '-'),
        ]),
        paragraph([text('Status: '), strong(status)]),
    ];

    const runPara = renderWorkflowRun(input.meta);
    if (runPara) children.push(runPara);

    if (failed) {
        const failedStep = failedSteps[0];
        const message =
            failedStep?.error?.message ??
            input.runError?.message ??
            'Unknown error';
        const stack = failedStep?.error?.stack ?? input.runError?.stack;

        children.push(
            heading(3, 'Error'),
            blockquote([paragraph([text(message)])]),
            ...(stack ? [code(stack)] : []),
        );
    }

    return toMarkdownRoot(children);
};
