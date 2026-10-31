import { Clip, BrainWeights, DurationBucket } from '@/types';
import { getDurationBucket } from './tracker';

/**
 * Reranks clips using learned Brand Brain weights (hook & duration multipliers).
 * Computes raw vs adjusted score and rank delta.
 */
export function rerankClips(clips: Clip[], weights?: BrainWeights): Clip[] {
  if (!clips || clips.length === 0) return [];

  const hasWeights =
    weights &&
    ((weights.hook_multipliers && Object.keys(weights.hook_multipliers).length > 0) ||
      (weights.duration_multipliers && Object.keys(weights.duration_multipliers).length > 0));

  if (!hasWeights) {
    return clips.map((c) => ({
      ...c,
      rawOverall: c.scores.overall,
      adjustedOverall: c.scores.overall,
      rankDelta: 0,
    }));
  }

  // Calculate adjusted scores while preserving original ranks
  const withScores = clips.map((clip, originalIndex) => {
    const rawOverall = clip.scores.overall;
    const duration = Math.max(1, clip.end_sec - clip.start_sec);
    const bucket: DurationBucket = getDurationBucket(duration);

    const hookMult = weights.hook_multipliers?.[clip.hook_type] ?? 1.0;
    const durMult = weights.duration_multipliers?.[bucket] ?? 1.0;
    const combinedMultiplier = hookMult * durMult;

    const adjustedOverall = Math.min(
      100,
      Math.max(0, Math.round(rawOverall * combinedMultiplier))
    );

    let reason = '';
    if (combinedMultiplier >= 1.05) {
      const pct = Math.round((combinedMultiplier - 1) * 100);
      reason = `Boosted +${pct}%: ${clip.hook_type} hook & ${bucket} length excel with your audience.`;
    } else if (combinedMultiplier <= 0.95) {
      const pct = Math.round((1 - combinedMultiplier) * 100);
      reason = `Softened -${pct}%: ${clip.hook_type} hook & ${bucket} length show lower audience retention.`;
    }

    return {
      ...clip,
      rawOverall,
      adjustedOverall,
      originalIndex,
      adjustmentReason: reason,
    };
  });

  // Sort by adjusted score descending
  const sorted = [...withScores].sort((a, b) => b.adjustedOverall - a.adjustedOverall);

  return sorted.map((clip, newIndex) => {
    const rankDelta = clip.originalIndex - newIndex; // +2 means moved up 2 spots
    return {
      ...clip,
      rankDelta,
    };
  });
}
