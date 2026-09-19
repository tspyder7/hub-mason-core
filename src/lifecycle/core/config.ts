import { lifecycleConfigSchema } from '../schemas/config.schema';

import type { LifecycleConfig } from '../../types/config';

export type { LifecycleConfig } from '../../types/config';

/**
 * Validates and returns a lifecycle configuration.
 *
 * @param config - Statuses, initial status, transitions, and options.
 * @returns The same config when valid.
 * @throws When schema validation fails.
 */
export const createLifecycleConfig = <S extends string>(
    config: LifecycleConfig<S>,
): LifecycleConfig<S> => {
    lifecycleConfigSchema.parse(config);
    return config;
};
