import { IngestResponse } from '@/types';

interface CachedIngestEntry {
  data: IngestResponse;
  cachedAt: number;
}

// In-memory cache for ingested video transcripts, keyed by video ID
const ingestCache = new Map<string, CachedIngestEntry>();

export function getCachedIngest(videoId: string): IngestResponse | null {
  if (!videoId) return null;
  const entry = ingestCache.get(videoId.trim());
  if (!entry) return null;
  return entry.data;
}

export function setCachedIngest(videoId: string, data: IngestResponse): void {
  if (!videoId) return;
  ingestCache.set(videoId.trim(), {
    data,
    cachedAt: Date.now(),
  });
}

export function clearIngestCache(): void {
  ingestCache.clear();
}

