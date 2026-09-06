import type { Step } from '@/src/types/step';

export const createStep = <S extends string>(
    overrides: Partial<Step<S>> = {},
): Step<S> => ({
    id: 'step-1',
    name: 'Build',
    status: 'pending' as S,
    details: [],
    ...overrides,
});
