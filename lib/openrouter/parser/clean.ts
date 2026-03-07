export function stripCodeFences(input: string): string {
  let cleaned = input;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
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

  const jsonMatch = input.match(/\{[\s\S]*"action"\s*:\s*"[^"]+"/);
  if (!jsonMatch) {
    return input;
  }

  const startIndex = input.indexOf(jsonMatch[0]);
  let braceCount = 0;
  let endIndex = startIndex;

  for (let index = startIndex; index < input.length; index++) {
    if (input[index] === '{') {
      braceCount++;
    }

    if (input[index] === '}') {
      braceCount--;
    }

    if (braceCount === 0 && index > startIndex) {
      endIndex = index + 1;
      break;
    }
  }

  if (endIndex > startIndex) {
    return input.slice(startIndex, endIndex);
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
