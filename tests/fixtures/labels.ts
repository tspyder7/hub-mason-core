import type { Label } from '@octokit/webhooks-types';

export const createLabel = (overrides: Partial<Label> = {}): Label =>
    ({
        name: 'bug',
        color: 'ff0000',
        description: 'Bug label',
        id: 1,
        node_id: 'node',
        url: 'url',
        default: false,
        ...overrides,
    }) as Label;

export const createLabelByName = (name: string): Label =>
    ({ name, color: 'ffffff' }) as Label;

export const createLabels = (): Label[] =>
    [{ name: 'bug' }, { name: 'test' }] as Label[];
