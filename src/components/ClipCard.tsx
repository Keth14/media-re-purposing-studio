import React from 'react';
import { Clip, HookType, BrainState } from '@/types';
import { ScoreBar } from './ScoreBar';
import { PlatformCopySection } from './PlatformCopySection';
import { formatTimestamp } from '@/lib/youtube';
import { Quote, Flame, Clock, Sparkles } from 'lucide-react';

interface ClipCardProps {
  clip: Clip;
  videoId: string | null;
  rank: number;
  brain?: BrainState | null;
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

export function ClipCard({ clip, videoId, rank, brain }: ClipCardProps) {
  const duration = Math.max(1, clip.end_sec - clip.start_sec);
  const hookStyle = HOOK_BADGE_STYLES[clip.hook_type] || HOOK_BADGE_STYLES['bold claim'];

  return (
    <div className="group relative flex flex-col rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 backdrop-blur-md transition-all duration-300 hover:border-neutral-700 hover:bg-neutral-900/70 hover:shadow-2xl hover:shadow-black/60">
      {/* Top Bar: Rank & Overall Score */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-xs font-mono font-medium text-neutral-300">
            #{rank}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${hookStyle.bg} ${hookStyle.text} ${hookStyle.border}`}
          >
            <Sparkles className="h-3 w-3" />
            {clip.hook_type}
          </span>
        </div>

        {/* Overall Score Ring */}
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/80 px-2.5 py-1">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <div className="text-right">
            <span className="font-mono text-sm font-bold text-white">{clip.scores.overall}</span>
            <span className="text-[10px] text-neutral-500 font-mono">/100</span>
          </div>
        </div>
      </div>

      {/* Video Player or Audio/Time Placeholder */}
      <div className="relative mb-4 overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950 aspect-video shadow-inner">
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

      {/* Timestamp Pill & Title */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
          <Clock className="h-3 w-3 text-neutral-500" />
          <span>
            {formatTimestamp(clip.start_sec)} - {formatTimestamp(clip.end_sec)}
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-300 font-medium">{duration}s</span>
        </div>
        <h3 className="text-lg font-medium tracking-tight text-neutral-100 group-hover:text-white transition-colors">
          {clip.title}
        </h3>
      </div>

      {/* Reason */}
      <p className="mb-4 text-xs leading-relaxed text-neutral-400">
        {clip.reason}
      </p>

      {/* Trigger Quote Highlight */}
      <div className="mb-5 rounded-xl border border-neutral-800/90 bg-neutral-950/60 p-3.5 relative overflow-hidden">
        <Quote className="absolute right-2 top-2 h-6 w-6 text-neutral-800/50 pointer-events-none" />
        <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
          Trigger Quote
        </p>
        <p className="text-xs italic text-neutral-200 leading-snug">
          &ldquo;{clip.trigger_quote}&rdquo;
        </p>
      </div>

      {/* 3 Score Bars */}
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
    </div>
  );
}

