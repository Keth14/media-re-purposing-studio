import { PostedResult, DurationBucket, HookType, Platform } from '@/types';

const TRACKER_STORAGE_KEY = 'brandbrain_posted_results_v1';

export function getDurationBucket(seconds: number): DurationBucket {
  if (seconds < 25) return 'under 25s';
  if (seconds <= 40) return '25-40s';
  return 'over 40s';
}

export function getPostedResults(): PostedResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PostedResult[];
  } catch (err) {
    console.error('Failed to read posted results from localStorage:', err);
    return [];
  }
}

export function savePostedResult(result: Omit<PostedResult, 'id' | 'createdAt'>): PostedResult {
  const newEntry: PostedResult = {
    ...result,
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  if (typeof window === 'undefined') return newEntry;

  try {
    const current = getPostedResults();
    const updated = [newEntry, ...current];
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save posted result to localStorage:', err);
  }

  return newEntry;
}

export function deletePostedResult(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getPostedResults();
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete posted result:', err);
  }
}

export function clearPostedResults(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TRACKER_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear posted results:', err);
  }
}

export function savePostedResultsRaw(results: PostedResult[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(results));
  } catch (err) {
    console.error('Failed to save posted results raw:', err);
  }
}

/**
 * 12 realistic fake results showing clear, measurable patterns:
 * - Question and Contrarian hooks beat Story hooks by a massive margin
 * - Clips under 30s beat longer ones (over 40s)
 * - LinkedIn beats X
 */
export const SAMPLE_POSTED_RESULTS: Omit<PostedResult, 'id' | 'createdAt'>[] = [
  {
    clip_id: 'sample-clip-1',
    title: 'Why Do Most Landing Pages Fail In 3 Seconds?',
    hook_type: 'question',
    duration_bucket: 'under 25s',
    duration_sec: 22,
    platform: 'linkedin',
    topic_tag: 'Landing Pages',
    original_rank: 2,
    views: 9400,
    retention_pct: 78,
    likes: 460,
    shares: 68,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-2',
    title: 'Stop Building 10 Features For Your MVP',
    hook_type: 'contrarian',
    duration_bucket: 'under 25s',
    duration_sec: 21,
    platform: 'linkedin',
    topic_tag: 'MVP Strategy',
    original_rank: 1,
    views: 11200,
    retention_pct: 82,
    likes: 580,
    shares: 84,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-3',
    title: 'Are You Losing 80% Of Your Traffic Right Here?',
    hook_type: 'question',
    duration_bucket: 'under 25s',
    duration_sec: 24,
    platform: 'youtube_shorts',
    topic_tag: 'Conversion',
    original_rank: 3,
    views: 14500,
    retention_pct: 74,
    likes: 720,
    shares: 92,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-4',
    title: 'More Features Will Not Save Your Retention',
    hook_type: 'contrarian',
    duration_bucket: '25-40s',
    duration_sec: 28,
    platform: 'linkedin',
    topic_tag: 'Product',
    original_rank: 4,
    views: 8600,
    retention_pct: 73,
    likes: 410,
    shares: 55,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-5',
    title: 'What Happens When You Delete 80% Of Your Copy?',
    hook_type: 'question',
    duration_bucket: '25-40s',
    duration_sec: 27,
    platform: 'linkedin',
    topic_tag: 'Copywriting',
    original_rank: 5,
    views: 7900,
    retention_pct: 69,
    likes: 380,
    shares: 48,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-6',
    title: 'Simple Scales, Complex Fails Every Time',
    hook_type: 'contrarian',
    duration_bucket: '25-40s',
    duration_sec: 31,
    platform: 'instagram_reels',
    topic_tag: 'Scaling',
    original_rank: 6,
    views: 6800,
    retention_pct: 66,
    likes: 320,
    shares: 39,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-7',
    title: '80 Percent Of Traffic Bounces On Weak Headlines',
    hook_type: 'stat',
    duration_bucket: 'under 25s',
    duration_sec: 23,
    platform: 'linkedin',
    topic_tag: 'Growth',
    original_rank: 7,
    views: 7100,
    retention_pct: 64,
    likes: 290,
    shares: 34,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-8',
    title: 'Data Shows Headlines Hook Under 3 Seconds',
    hook_type: 'stat',
    duration_bucket: '25-40s',
    duration_sec: 34,
    platform: 'youtube_shorts',
    topic_tag: 'Analytics',
    original_rank: 8,
    views: 5200,
    retention_pct: 59,
    likes: 195,
    shares: 26,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-9',
    title: 'We Doubled Signups By Changing One Word',
    hook_type: 'bold claim',
    duration_bucket: '25-40s',
    duration_sec: 29,
    platform: 'x',
    topic_tag: 'Growth',
    original_rank: 9,
    views: 3100,
    retention_pct: 49,
    likes: 110,
    shares: 16,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-10',
    title: 'How I Started My Company From Scratch In 2021',
    hook_type: 'story',
    duration_bucket: 'over 40s',
    duration_sec: 48,
    platform: 'youtube_shorts',
    topic_tag: 'Origin Story',
    original_rank: 10,
    views: 2200,
    retention_pct: 38,
    likes: 72,
    shares: 9,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-11',
    title: 'The Journey Of Our First Failed Product Launch',
    hook_type: 'story',
    duration_bucket: 'over 40s',
    duration_sec: 52,
    platform: 'x',
    topic_tag: 'Founder Journey',
    original_rank: 11,
    views: 1800,
    retention_pct: 35,
    likes: 54,
    shares: 7,
    isSample: true,
  },
  {
    clip_id: 'sample-clip-12',
    title: 'My Experience Pitching 50 Investors Last Year',
    hook_type: 'story',
    duration_bucket: 'over 40s',
    duration_sec: 45,
    platform: 'x',
    topic_tag: 'Fundraising',
    original_rank: 12,
    views: 2100,
    retention_pct: 39,
    likes: 68,
    shares: 8,
    isSample: true,
  },
];

export function loadSampleResults(): PostedResult[] {
  const loaded: PostedResult[] = SAMPLE_POSTED_RESULTS.map((item, idx) => ({
    ...item,
    id: `sample-${idx + 1}-${Date.now()}`,
    createdAt: new Date(Date.now() - (12 - idx) * 86400000).toISOString(),
  }));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(loaded));
    } catch (err) {
      console.error('Failed to load sample results:', err);
    }
  }

  return loaded;
}

