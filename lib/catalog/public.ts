import {
  getActiveModelFamilies,
  getCurrentReleaseForFamily,
  getModelReleasesByFamily
} from '@/lib/db/queries';

export interface PublicCatalogModel {
  id: string;
  family_id: string;
  slug: string;
  legacy_model_id: string | null;
  displayName: string;
  shortDisplayName: string;
  provider: string;
  color: string;
  openrouterId: string | null;
  currentReleaseId: string | null;
  currentReleaseName: string | null;
}

export function getPublicCatalogModels(): PublicCatalogModel[] {
  return getActiveModelFamilies().map((family) => {
    const currentRelease = getCurrentReleaseForFamily(family.id)
      ?? getModelReleasesByFamily(family.id)[0]
      ?? null;

    return {
      id: family.slug ?? family.id,
      family_id: family.id,
      slug: family.slug,
      legacy_model_id: family.legacy_model_id,
      displayName: family.public_display_name,
      shortDisplayName: family.short_display_name,
      provider: family.provider,
      color: family.color ?? '#94A3B8',
      openrouterId: currentRelease?.openrouter_id ?? null,
      currentReleaseId: currentRelease?.id ?? null,
      currentReleaseName: currentRelease?.release_name ?? null
    };
  });
}

export function resolvePublicCatalogModel(identifier: string): PublicCatalogModel | undefined {
  return getPublicCatalogModels().find((model) => (
    model.id === identifier ||
    model.family_id === identifier ||
    model.slug === identifier ||
    model.legacy_model_id === identifier
  ));
}
