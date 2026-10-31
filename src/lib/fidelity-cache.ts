import crypto from 'crypto';
import { VoiceFidelityResult } from '@/types';

interface CachedFidelityEntry {
  result: VoiceFidelityResult;
  cachedAt: number;
}

// In-memory cache keyed by text hash + voice version
const fidelityCache = new Map<string, CachedFidelityEntry>();

export function getFidelityCacheKey(text: string, voiceVersion: number): string {
  const normalized = (text || '').trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  return `fid:${hash}:v${voiceVersion}`;
}

export function getCachedFidelity(key: string): VoiceFidelityResult | null {
  const entry = fidelityCache.get(key);
  if (!entry) return null;
  return entry.result;
}

export function setCachedFidelity(key: string, result: VoiceFidelityResult): void {
  fidelityCache.set(key, {
    result,
    cachedAt: Date.now(),
  });
}

export function clearFidelityCache(): void {
  fidelityCache.clear();
}
