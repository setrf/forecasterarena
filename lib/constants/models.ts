/**
 * Model catalog and lookup helpers.
 *
 * Public import path preserved as a flat barrel.
 */

export { MODELS } from '@/lib/constants/models/catalog';
export type { ModelId } from '@/lib/constants/models/lookup';
export { getModelById, getModelByOpenRouterId } from '@/lib/constants/models/lookup';
