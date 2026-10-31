import { Platform, PlatformCopy } from '@/types';

interface CachedCopyEntry {
  copy: PlatformCopy;
  cachedAt: number;
}

// In-memory cache keyed by clip id + platform + voice version + rule version
const copyCache = new Map<string, CachedCopyEntry>();

export function getCopyCacheKey(
  clipId: string,
  platform: Platform,
  voiceVersion: number,
  rulesVersion?: number
): string {
  const cleanClipId = clipId.trim();
  const rVer = rulesVersion !== undefined ? `:r${rulesVersion}` : '';
  return `${cleanClipId}:${platform}:v${voiceVersion}${rVer}`;
}

export function getCachedCopy(key: string): PlatformCopy | null {
  const entry = copyCache.get(key);
  if (!entry) return null;
  return entry.copy;
}

export function setCachedCopy(key: string, copy: PlatformCopy): void {
  copyCache.set(key, {
    copy,
    cachedAt: Date.now(),
  });
}

export function clearCopyCache(): void {
  copyCache.clear();
}
