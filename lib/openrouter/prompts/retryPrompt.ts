export function buildRetryPrompt(
  originalPrompt: string,
  previousResponse: string,
  error: string
): string {
  return `${originalPrompt}

---
PREVIOUS RESPONSE WAS INVALID:
Error: ${error}

Your response: ${previousResponse.slice(0, 500)}${previousResponse.length > 500 ? '...' : ''}

Please respond with VALID JSON only. No markdown code blocks, no explanation text - just the JSON object.`;
}
