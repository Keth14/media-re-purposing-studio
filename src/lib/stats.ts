import { PostedResult, ComputedStats, GroupStat, HookType, DurationBucket, Platform } from '@/types';

/**
 * Computes performance score per post and aggregated stats by hook_type, duration bucket, and platform.
 * Score Formula: 0.5 * normalized_views + 0.3 * retention + 0.2 * normalized_engagement(likes+shares)
 */
export function computeStats(posts: PostedResult[]): ComputedStats {
  if (!posts || posts.length === 0) {
    return {
      overallMean: 0,
      totalPosts: 0,
      hookStats: {},
      durationStats: {},
      platformStats: {},
      winningHooks: [],
      bestLength: 'N/A',
      bestPlatform: 'N/A',
      allNumbers: [],
    };
  }

  const maxViews = Math.max(...posts.map((p) => p.views), 1);
  const maxEngagement = Math.max(...posts.map((p) => p.likes + p.shares), 1);

  // Compute individual post scores
  const scoredPosts = posts.map((p) => {
    const normViews = (p.views / maxViews) * 100;
    const normRet = Math.min(100, Math.max(0, p.retention_pct));
    const normEngage = ((p.likes + p.shares) / maxEngagement) * 100;
    const score = Math.round((0.5 * normViews + 0.3 * normRet + 0.2 * normEngage) * 10) / 10;
    return {
      ...p,
      score,
    };
  });

  const totalPosts = scoredPosts.length;
  const overallMean =
    Math.round((scoredPosts.reduce((sum, p) => sum + p.score, 0) / totalPosts) * 10) / 10;

  // Helper to compute group statistics
  function computeGroup(key: string, label: string, groupPosts: typeof scoredPosts): GroupStat {
    const count = groupPosts.length;
    if (count === 0) {
      return {
        key,
        label,
        count: 0,
        meanScore: 0,
        lift: 0,
        status: 'not enough data',
      };
    }

    const meanScore =
      Math.round((groupPosts.reduce((sum, p) => sum + p.score, 0) / count) * 10) / 10;
    const lift =
      overallMean > 0
        ? Math.round(((meanScore - overallMean) / overallMean) * 1000) / 10
        : 0;

    let status: GroupStat['status'] = 'not enough data';
    if (count >= 2 && lift > 15) {
      status = 'winning';
    }

    return {
      key,
      label,
      count,
      meanScore,
      lift,
      status,
    };
  }

  // Hook Stats
  const HOOK_TYPES: HookType[] = ['question', 'contrarian', 'stat', 'bold claim', 'story'];
  const hookStats: Record<string, GroupStat> = {};
  for (const hook of HOOK_TYPES) {
    const matching = scoredPosts.filter((p) => p.hook_type === hook);
    hookStats[hook] = computeGroup(hook, hook, matching);
  }

  // Duration Stats
  const DURATION_BUCKETS: DurationBucket[] = ['under 25s', '25-40s', 'over 40s'];
  const durationStats: Record<string, GroupStat> = {};
  for (const bucket of DURATION_BUCKETS) {
    const matching = scoredPosts.filter((p) => p.duration_bucket === bucket);
    durationStats[bucket] = computeGroup(bucket, bucket, matching);
  }

  // Platform Stats
  const PLATFORMS: Platform[] = ['linkedin', 'youtube_shorts', 'instagram_reels', 'x'];
  const platformStats: Record<string, GroupStat> = {};
  for (const plat of PLATFORMS) {
    const matching = scoredPosts.filter((p) => p.platform === plat);
    const label =
      plat === 'youtube_shorts'
        ? 'Shorts'
        : plat === 'instagram_reels'
        ? 'Reels'
        : plat === 'linkedin'
        ? 'LinkedIn'
        : 'X';
    platformStats[plat] = computeGroup(plat, label, matching);
  }

  // Winning hooks (lift > 15% and count >= 2)
  const winningHooks = Object.values(hookStats)
    .filter((g) => g.status === 'winning')
    .sort((a, b) => b.lift - a.lift)
    .map((g) => g.label);

  // Best length (count >= 2 with highest mean)
  const sortedDurations = Object.values(durationStats)
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.meanScore - a.meanScore);
  const bestLength = sortedDurations[0]?.label || 'under 25s';

  // Best platform (count >= 2 with highest mean)
  const sortedPlatforms = Object.values(platformStats)
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.meanScore - a.meanScore);
  const bestPlatform = sortedPlatforms[0]?.label || 'LinkedIn';

  // Collect all valid numbers for hallucination validation
  const allNumbersSet = new Set<number>([
    totalPosts,
    overallMean,
    Math.round(overallMean),
  ]);

  for (const stat of [
    ...Object.values(hookStats),
    ...Object.values(durationStats),
    ...Object.values(platformStats),
  ]) {
    allNumbersSet.add(stat.count);
    allNumbersSet.add(stat.meanScore);
    allNumbersSet.add(Math.round(stat.meanScore));
    allNumbersSet.add(stat.lift);
    allNumbersSet.add(Math.round(stat.lift));
    allNumbersSet.add(Math.abs(Math.round(stat.lift)));
  }

  return {
    overallMean,
    totalPosts,
    hookStats,
    durationStats,
    platformStats,
    winningHooks,
    bestLength,
    bestPlatform,
    allNumbers: Array.from(allNumbersSet),
  };
}

/**
 * Calculates multiplier for ranking based on lift:
 * Store a multiplier per hook_type and per duration bucket in the brain, from the lift values, clamped 0.7 to 1.3.
 */
export function calculateMultiplier(lift: number): number {
  const scaled = 1 + lift / 100;
  const clamped = Math.max(0.7, Math.min(1.3, scaled));
  return Math.round(clamped * 100) / 100;
}

