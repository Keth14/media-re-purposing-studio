export interface TranscriptSegment {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
}

export type HookType = 'question' | 'bold claim' | 'story' | 'stat' | 'contrarian';
export type DurationBucket = 'under 25s' | '25-40s' | 'over 40s';
export type Platform = 'youtube_shorts' | 'instagram_reels' | 'linkedin' | 'x';

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
  // Feedback loop adjustments
  rawOverall?: number;
  adjustedOverall?: number;
  rankDelta?: number;
  adjustmentReason?: string;
  totalVideoDuration?: number;
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
  source: string; // 'sample' | 'learned_samples' | 'feedback_loop'
  createdAt: string;
  confidence?: number;
}

export interface BrainWeights {
  hook_multipliers: Partial<Record<HookType, number>>;
  duration_multipliers: Partial<Record<DurationBucket, number>>;
}

export interface BrainHistoryItem {
  version: number;
  at: string;
  voiceSnapshot: BrainVoice;
  rules: BrainRule[];
  weights?: BrainWeights;
  explanation?: string;
}

export interface BrainState {
  version: number;
  voice: BrainVoice;
  rules: BrainRule[];
  weights?: BrainWeights;
  history: BrainHistoryItem[];
  isSample?: boolean;
}

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

export interface VoiceFidelityResult {
  score: number; // 0 - 100
  matched_traits: string[];
  mismatched_traits: string[];
  suggested_rewrite: string;
}

export interface FidelityResponse {
  success: boolean;
  score?: number;
  matched_traits?: string[];
  mismatched_traits?: string[];
  suggested_rewrite?: string;
  error?: string;
  fromCache?: boolean;
}

// Feedback Loop Types
export interface PostedResult {
  id: string;
  clip_id: string;
  title: string;
  hook_type: HookType;
  duration_bucket: DurationBucket;
  duration_sec: number;
  platform: Platform;
  topic_tag: string;
  original_rank: number;
  views: number;
  retention_pct: number;
  likes: number;
  shares: number;
  isSample: boolean;
  createdAt: string;
  score?: number;
}

export interface GroupStat {
  key: string;
  label: string;
  count: number;
  meanScore: number;
  lift: number; // e.g. +42.5%
  status: 'winning' | 'underperforming' | 'neutral' | 'not enough data';
}

export interface ComputedStats {
  overallMean: number;
  totalPosts: number;
  hookStats: Record<string, GroupStat>;
  durationStats: Record<string, GroupStat>;
  platformStats: Record<string, GroupStat>;
  winningHooks: string[];
  bestLength: string;
  bestPlatform: string;
  allNumbers: number[];
}

export interface DiffViewData {
  fromVersion: number;
  toVersion: number;
  addedRules: BrainRule[];
  changedRules: { id: string; oldText: string; newText: string; reason: string }[];
  removedRules: { id: string; text: string; reason: string }[];
  voiceChanges: { field: string; from: string; to: string }[];
  explanation: string;
  reorderedClips?: {
    clipId: string;
    title: string;
    oldRank: number;
    newRank: number;
    reason: string;
  }[];
}
