import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clip, HookType, BrainState } from '@/types';
import { ScoreBar } from './ScoreBar';
import { PlatformCopySection } from './PlatformCopySection';
import { LogResultModal } from './LogResultModal';
import { formatTimestamp } from '@/lib/youtube';
import { Quote, Flame, Clock, Sparkles, ArrowUp, ArrowDown, PlusCircle } from 'lucide-react';

interface ClipCardProps {
  clip: Clip;
  videoId: string | null;
  rank: number;
  brain?: BrainState | null;
  onResultLogged?: () => void;
  totalDuration?: number;
}

const HOOK_BADGE_STYLES: Record<HookType, { bg: string; text: string; border: string }> = {
  question: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
  },
  'bold claim': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  story: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  stat: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  contrarian: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
  },
};

export function ClipCard({ clip, videoId, rank, brain, onResultLogged, totalDuration: propTotalDuration }: ClipCardProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const duration = Math.max(1, clip.end_sec - clip.start_sec);
  const hookStyle = HOOK_BADGE_STYLES[clip.hook_type] || HOOK_BADGE_STYLES['bold claim'];

  const displayScore = clip.adjustedOverall ?? clip.scores.overall;
  const hasRankAdjustment = clip.rankDelta !== undefined && clip.rankDelta !== 0;

  const totalDuration =
    propTotalDuration ||
    clip.totalVideoDuration ||
    (clip.end_sec > 300 ? clip.end_sec + 60 : 360);

  const startPercent = Math.min(95, Math.max(0, (clip.start_sec / totalDuration) * 100));
  const widthPercent = Math.max(4, Math.min(100 - startPercent, (duration / totalDuration) * 100));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { type: 'spring', stiffness: 320, damping: 28 },
        opacity: { duration: 0.3 },
      }}
      className="group relative flex flex-col rounded-3xl border border-neutral-800/80 bg-neutral-950/70 p-5 backdrop-blur-xl shadow-2xl shadow-black/80 transition-all duration-300 hover:border-neutral-700 hover:bg-neutral-950/90"
    >
      {/* Top Bar: Rank & Overall Score */}
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono font-bold text-neutral-200">
            #{rank}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${hookStyle.bg} ${hookStyle.text} ${hookStyle.border}`}
          >
            <Sparkles className="h-3 w-3" />
            {clip.hook_type}
          </span>
        </div>

        {/* Score Ring */}
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800/90 bg-neutral-900/60 px-3 py-1.5 backdrop-blur-md">
          <Flame className="h-4 w-4 text-amber-500" />
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1 font-mono">
              <span className="text-sm font-bold text-white">{displayScore}</span>
              <span className="text-[10px] text-neutral-500">/100</span>
            </div>
            {clip.rawOverall !== undefined && (
              <div className="text-[10px] font-mono text-neutral-400">
                raw: <span className="text-neutral-300 font-medium">{clip.rawOverall}</span> • adj:{' '}
                <span className="text-indigo-400 font-medium">{displayScore}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brand Brain Rank Adjustment Tag */}
      {hasRankAdjustment && (
        <div className="mb-3.5 flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300 font-mono">
          <div className="flex items-center gap-1.5">
            {clip.rankDelta! > 0 ? (
              <ArrowUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            )}
            <span className="font-medium text-white">Brand Brain adjusted this</span>
          </div>
          <span className={`font-bold ${clip.rankDelta! > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {clip.rankDelta! > 0 ? `+${clip.rankDelta}` : clip.rankDelta}{' '}
            {clip.rankDelta! > 0 ? 'spots up' : 'spots down'}
          </span>
        </div>
      )}

      {/* Video Player or Audio/Time Placeholder */}
      <div className="relative mb-3.5 overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 aspect-video shadow-inner">
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?start=${clip.start_sec}&end=${clip.end_sec}`}
            title={clip.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-950/90 p-4 text-center">
            <Clock className="mb-2 h-7 w-7 text-neutral-600" />
            <p className="text-xs text-neutral-400 font-mono">
              Timestamp: {formatTimestamp(clip.start_sec)} - {formatTimestamp(clip.end_sec)}
            </p>
            <p className="text-[11px] text-neutral-600 mt-1">
              (Transcript clip from pasted source)
            </p>
          </div>
        )}
      </div>

      {/* Full Video Timeline Placement Track */}
      <div className="mb-4 rounded-xl border border-neutral-800/60 bg-neutral-900/40 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span className="flex items-center gap-1.5 text-neutral-300">
            <Clock className="h-3 w-3 text-indigo-400" />
            Timeline Placement
          </span>
          <span>
            {formatTimestamp(clip.start_sec)} - {formatTimestamp(clip.end_sec)}
            <span className="text-neutral-600"> / </span>
            {formatTimestamp(totalDuration)}
          </span>
        </div>
        <div className="relative h-1.5 w-full rounded-full bg-neutral-800/80 overflow-hidden">
          <div
            className="absolute top-0 bottom-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Timestamp Pill & Title */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <Clock className="h-3 w-3 text-neutral-500" />
            <span>
              {formatTimestamp(clip.start_sec)} - {formatTimestamp(clip.end_sec)}
            </span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-300 font-medium">{duration}s</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[10px] text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors font-mono"
          >
            <PlusCircle className="h-3 w-3 text-indigo-400" />
            Log result
          </button>
        </div>

        <h3 className="text-lg font-medium tracking-tight text-neutral-100 group-hover:text-white transition-colors">
          {clip.title}
        </h3>
      </div>

      {/* Reason */}
      <p className="mb-4 text-xs leading-relaxed text-neutral-400">
        {clip.adjustmentReason || clip.reason}
      </p>

      {/* Trigger Quote Highlight */}
      <div className="mb-5 rounded-2xl border border-neutral-800/90 bg-neutral-950/70 p-3.5 relative overflow-hidden">
        <Quote className="absolute right-2 top-2 h-6 w-6 text-neutral-800/50 pointer-events-none" />
        <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
          Trigger Quote
        </p>
        <p className="text-xs italic text-neutral-200 leading-snug">
          &ldquo;{clip.trigger_quote}&rdquo;
        </p>
      </div>

      {/* 3 Animated Score Bars */}
      <div className="space-y-2.5 pt-3 border-t border-neutral-800/60">
        <ScoreBar
          label="Hook Strength"
          score={clip.scores.hook}
          color="bg-amber-500"
        />
        <ScoreBar
          label="Emotional Resonance"
          score={clip.scores.emotion}
          color="bg-rose-500"
        />
        <ScoreBar
          label="Standalone Clarity"
          score={clip.scores.standalone_clarity}
          color="bg-sky-500"
        />
      </div>

      {/* Per-Platform Copy Generation */}
      <PlatformCopySection
        clip={clip}
        brain={brain || null}
        clipId={clip.id || `clip-${rank}-${clip.start_sec}-${clip.end_sec}`}
      />

      {/* Log Result Modal */}
      <LogResultModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        clip={clip}
        rank={rank}
        onResultLogged={() => {
          if (onResultLogged) onResultLogged();
        }}
      />
    </motion.div>
  );
}
