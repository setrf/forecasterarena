export function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getRequiredTrimmedString(
  value: unknown,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== 'string') {
    return { ok: false, error: `${label} is required` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: `${label} is required` };
  }

  return { ok: true, value: trimmed };
}

export function getOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function getNullableTrimmedString(value: unknown): string | null {
  return getOptionalTrimmedString(value) ?? null;
}
