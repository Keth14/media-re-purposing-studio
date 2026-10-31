export interface TranscriptSegment {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
}

export type HookType = 'question' | 'bold claim' | 'story' | 'stat' | 'contrarian';

export interface ClipScores {
  hook: number;
  emotion: number;
  standalone_clarity: number;
  overall: number;
}

export interface Clip {
  title: string;
  start_sec: number;
  end_sec: number;
  hook_type: HookType;
  scores: ClipScores;
  reason: string;
  trigger_quote: string;
}

export interface IngestResponse {
  success: boolean;
  videoId: string | null;
  segments: TranscriptSegment[];
  formattedTranscript: string;
  totalDuration: number;
  error?: string;
  canFallbackToPaste?: boolean;
}

export interface ClipsResponse {
  success: boolean;
  videoId: string | null;
  clips: Clip[];
  error?: string;
}

