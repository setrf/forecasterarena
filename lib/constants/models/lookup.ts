import { MODELS } from '@/lib/constants/models/catalog';

export type ModelId = typeof MODELS[number]['id'];

export function getModelById(id: string) {
  return MODELS.find((model) => model.id === id);
}

export function getModelByOpenRouterId(openrouterId: string) {
  return MODELS.find((model) => model.openrouterId === openrouterId);
}
