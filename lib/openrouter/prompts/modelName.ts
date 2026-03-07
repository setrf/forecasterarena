export function getShortModelName(modelId: string): string {
  const parts = modelId.split('/');
  return parts[parts.length - 1];
}
