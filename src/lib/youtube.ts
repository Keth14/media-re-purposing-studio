import { TranscriptSegment } from '@/types';

/**
 * Extracts a YouTube Video ID from various URL patterns or directly if already an ID.
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 11-character alphanumeric ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL regex patterns
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Formats a duration in seconds to [mm:ss] or [hh:mm:ss]
 */
export function formatTimestamp(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parses timestamp string like [01:23] or 1:23:45 to seconds
 */
export function parseTimestampToSeconds(ts: string): number | null {
  const clean = ts.replace(/[\[\]\(\)]/g, '').trim();
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

/**
 * Merges raw segments into roughly ~20-second lines with timestamps.
 */
export function mergeTranscriptSegments(
  rawSegments: TranscriptSegment[],
  targetDurationSec = 20
): { segments: TranscriptSegment[]; formattedTranscript: string; totalDuration: number } {
  if (!rawSegments || rawSegments.length === 0) {
    return { segments: [], formattedTranscript: '', totalDuration: 0 };
  }

  const merged: TranscriptSegment[] = [];
  let currentText: string[] = [];
  let currentStart = rawSegments[0].start;
  let currentEnd = rawSegments[0].start + rawSegments[0].duration;

  for (let i = 0; i < rawSegments.length; i++) {
    const item = rawSegments[i];
    const itemEnd = item.start + item.duration;

    currentText.push(item.text.trim());
    currentEnd = Math.max(currentEnd, itemEnd);

    const chunkDuration = currentEnd - currentStart;
    const isLast = i === rawSegments.length - 1;

    // Check if we hit roughly 20s or end of sentence near target
    if (chunkDuration >= targetDurationSec || isLast) {
      const combinedText = currentText.join(' ').replace(/\s+/g, ' ').trim();
      if (combinedText) {
        merged.push({
          text: combinedText,
          start: Math.round(currentStart * 10) / 10,
          duration: Math.round((currentEnd - currentStart) * 10) / 10,
        });
      }

      if (!isLast) {
        const nextItem = rawSegments[i + 1];
        currentStart = nextItem.start;
        currentEnd = nextItem.start + nextItem.duration;
        currentText = [];
      }
    }
  }

  const lastSeg = merged[merged.length - 1];
  const totalDuration = lastSeg ? lastSeg.start + lastSeg.duration : 0;

  const formattedTranscript = merged
    .map((seg) => `[${formatTimestamp(seg.start)}] ${seg.text}`)
    .join('\n');

  return {
    segments: merged,
    formattedTranscript,
    totalDuration,
  };
}

/**
 * Parses pasted transcript text, detecting explicit timestamps or estimating them from word count (150 words/min = 2.5 words/sec).
 */
export function parsePastedTranscript(text: string): {
  segments: TranscriptSegment[];
  formattedTranscript: string;
  totalDuration: number;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { segments: [], formattedTranscript: '', totalDuration: 0 };
  }

  // Regex to check for timestamp patterns like [00:15] or 01:23 or (02:45) at line starts or inline
  const timestampRegex = /(?:^|\n)\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[:-]?\s*/g;
  const hasTimestamps = timestampRegex.test(trimmed);

  if (hasTimestamps) {
    // Reset regex
    timestampRegex.lastIndex = 0;
    const rawSegments: TranscriptSegment[] = [];
    const lines = trimmed.split('\n');

    let currentTimestampSec = 0;
    let accumulatedText: string[] = [];

    for (const line of lines) {
      const lineMatch = line.match(/^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[:-]?\s*(.*)$/);
      if (lineMatch) {
        const parsedSec = parseTimestampToSeconds(lineMatch[1]);
        if (parsedSec !== null) {
          if (accumulatedText.length > 0) {
            const segDuration = Math.max(1, parsedSec - currentTimestampSec);
            rawSegments.push({
              text: accumulatedText.join(' ').trim(),
              start: currentTimestampSec,
              duration: segDuration,
            });
            accumulatedText = [];
          }
          currentTimestampSec = parsedSec;
          if (lineMatch[2].trim()) {
            accumulatedText.push(lineMatch[2].trim());
          }
          continue;
        }
      }
      if (line.trim()) {
        accumulatedText.push(line.trim());
      }
    }

    if (accumulatedText.length > 0) {
      // Estimate duration based on remaining words (150 wpm = 2.5 words/sec)
      const words = accumulatedText.join(' ').split(/\s+/).length;
      const estimatedDuration = Math.max(3, Math.round(words / 2.5));
      rawSegments.push({
        text: accumulatedText.join(' ').trim(),
        start: currentTimestampSec,
        duration: estimatedDuration,
      });
    }

    if (rawSegments.length > 0) {
      return mergeTranscriptSegments(rawSegments, 20);
    }
  }

  // Fallback: No timestamps detected, estimate timestamps using ~150 words per minute (2.5 words/sec)
  // For roughly 20-second lines, that is ~50 words per chunk
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordsPerChunk = 50; // ~20 seconds at 2.5 words/sec
  const rawSegments: TranscriptSegment[] = [];

  let currentStart = 0;
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkDuration = Math.round(chunkWords.length / 2.5);
    rawSegments.push({
      text: chunkWords.join(' '),
      start: currentStart,
      duration: chunkDuration,
    });
    currentStart += chunkDuration;
  }

  return mergeTranscriptSegments(rawSegments, 20);
}

