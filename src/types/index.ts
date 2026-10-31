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
  id?: string;
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

// Brand Voice & Rules Data Model
export interface BrainVoice {
  summary: string;
  traits: string[];
  sentenceStyle: string;
  vocabulary: string[];
  emojiUsage: string;
  signaturePhrases: string[];
  avoid: string[];
}

export interface BrainRule {
  id: string;
  text: string;
  evidence: string;
  source: string;
  createdAt: string;
}

export interface BrainHistoryItem {
  version: number;
  at: string;
  voiceSnapshot: BrainVoice;
  rules: BrainRule[];
}

export interface BrainState {
  version: number;
  voice: BrainVoice;
  rules: BrainRule[];
  history: BrainHistoryItem[];
  isSample?: boolean;
}

export type Platform = 'youtube_shorts' | 'instagram_reels' | 'linkedin' | 'x';

export interface PlatformCopy {
  platform: Platform;
  hook: string;
  caption: string;
  hashtags: string;
  on_screen_text: string;
  isNeutralVoice?: boolean;
}

export interface CopyResponse {
  success: boolean;
  copy: PlatformCopy;
  error?: string;
  fromCache?: boolean;
}
