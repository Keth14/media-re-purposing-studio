import crypto from 'crypto';
import { Clip } from '@/types';

interface CachedClipsEntry {
  clips: Clip[];
  videoId: string | null;
  cachedAt: number;
}

// In-memory cache for generated clips
const clipsCache = new Map<string, CachedClipsEntry>();

/**
 * Generates a cache key based on the video ID (if available) or a SHA-256 hash of the transcript text.
 */
export function getClipsCacheKey(videoId?: string | null, transcriptText?: string): string {
  if (videoId && videoId.trim()) {
    return `yt:${videoId.trim()}`;
  }

  const normalized = (transcriptText || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return `hash:${hash}`;
}

export function getCachedClips(key: string): { clips: Clip[]; videoId: string | null } | null {
  const entry = clipsCache.get(key);
  if (!entry) return null;
  return { clips: entry.clips, videoId: entry.videoId };
}

export function setCachedClips(
  key: string,
  data: { clips: Clip[]; videoId: string | null }
): void {
  clipsCache.set(key, {
    clips: data.clips,
    videoId: data.videoId,
    cachedAt: Date.now(),
  });
}

export function clearClipsCache(): void {
  clipsCache.clear();
}

