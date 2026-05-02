export function stripCodeFences(input: string): string {
  let cleaned = input;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
  }

  return cleaned;
}

export function stripOuterQuotes(input: string): string {
  if (
    (input.startsWith('"') && input.endsWith('"')) ||
    (input.startsWith("'") && input.endsWith("'"))
  ) {
    return input.slice(1, -1);
  }

  return input;
}

export function extractEmbeddedJsonWithAction(input: string): string {
  if (input.trim().startsWith('{')) {
    return input;
  }

  let searchFrom = 0;
  while (searchFrom < input.length) {
    const startIndex = input.indexOf('{', searchFrom);
    if (startIndex < 0) {
      return input;
    }

    let braceCount = 0;
    let endIndex = startIndex;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < input.length; index++) {
      const char = input[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        braceCount++;
      }

      if (char === '}') {
        braceCount--;
      }

      if (braceCount === 0 && index > startIndex) {
        endIndex = index + 1;
        break;
      }
    }

    if (endIndex > startIndex) {
      const candidate = input.slice(startIndex, endIndex);
      if (candidate.includes('"action"')) {
        return candidate;
      }
    }

    searchFrom = startIndex + 1;
  }

  return input;
}

export function cleanResponse(rawResponse: string): string {
  let cleaned = rawResponse.trim();
  cleaned = stripCodeFences(cleaned);
  cleaned = stripOuterQuotes(cleaned);
  cleaned = extractEmbeddedJsonWithAction(cleaned);
  return cleaned.trim();
}
