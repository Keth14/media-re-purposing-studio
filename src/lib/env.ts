/**
 * Strips surrounding whitespace and quotes (single or double) from environment variable values.
 */
export function getSanitizedApiKey(rawKey?: string): string {
  if (!rawKey) return '';
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export function getGeminiModel(): string {
  const model = process.env.GEMINI_MODEL;
  if (!model) return 'gemini-3.8-flash';
  const clean = model.trim().replace(/^["']|["']$/g, '').trim();
  return clean || 'gemini-3.8-flash';
}
