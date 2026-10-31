import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  RotateCw,
  Sparkles,
  Video,
  Camera,
  Briefcase,
  Send,
  Type,
  AlignLeft,
  Hash,
  MonitorPlay,
  AlertCircle,
} from 'lucide-react';
import { Clip, Platform, PlatformCopy, BrainState, CopyResponse } from '@/types';
import { Button } from '@/components/ui/button';

interface PlatformCopySectionProps {
  clip: Clip;
  brain: BrainState | null;
  clipId: string;
}

const PLATFORMS: { id: Platform; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'youtube_shorts', label: 'Shorts', icon: Video },
  { id: 'instagram_reels', label: 'Reels', icon: Camera },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { id: 'x', label: 'X', icon: Send },
];

export function PlatformCopySection({ clip, brain, clipId }: PlatformCopySectionProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube_shorts');
  const [copyData, setCopyData] = useState<Record<Platform, PlatformCopy | null>>({
    youtube_shorts: null,
    instagram_reels: null,
    linkedin: null,
    x: null,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const voiceVersion = brain?.version || 1;

  const fetchCopy = async (platform: Platform, forceRegen = false) => {
    // If we already have it in local state and not forcing regen, skip
    if (!forceRegen && copyData[platform]) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip,
          platform,
          voice: brain?.voice || null,
          voiceVersion,
          clipId,
        }),
      });

      const data: CopyResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate copy.');
      }

      setCopyData((prev) => ({
        ...prev,
        [platform]: data.copy,
      }));
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error generating copy.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch when platform changes if not present
  useEffect(() => {
    fetchCopy(selectedPlatform, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, brain?.version]);

  const handleCopyText = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const currentCopy = copyData[selectedPlatform];

  return (
    <div className="mt-5 border-t border-neutral-800/80 pt-4 space-y-4">
      {/* Platform Tabs Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
          Per-Platform Copy
        </span>

        {currentCopy && (
          <span className="text-[10px] font-mono text-neutral-500">
            {currentCopy.isNeutralVoice ? (
              <span className="text-neutral-500">Neutral voice</span>
            ) : (
              <span className="text-indigo-400 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                Voice v{voiceVersion}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800/80">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const isActive = selectedPlatform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlatform(p.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="space-y-3">
        {loading && (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-8 rounded-lg bg-neutral-950/70 border border-neutral-800/60" />
            <div className="h-16 rounded-lg bg-neutral-950/70 border border-neutral-800/60" />
            <div className="h-7 rounded-lg bg-neutral-950/70 border border-neutral-800/60" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchCopy(selectedPlatform, true)}
              className="text-xs underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && currentCopy && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5 text-xs"
          >
            {/* Hook / Opener */}
            <div className="group/field rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-2.5 space-y-1 relative">
              <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <Type className="h-3 w-3 text-indigo-400" />
                  Hook (First Line)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(currentCopy.hook, `${selectedPlatform}-hook`)}
                  className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors"
                >
                  {copiedField === `${selectedPlatform}-hook` ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-neutral-200 font-medium pr-10">{currentCopy.hook}</p>
            </div>

            {/* Caption */}
            <div className="group/field rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-2.5 space-y-1 relative">
              <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <AlignLeft className="h-3 w-3 text-indigo-400" />
                  Caption
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(currentCopy.caption, `${selectedPlatform}-caption`)}
                  className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors"
                >
                  {copiedField === `${selectedPlatform}-caption` ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-neutral-300 whitespace-pre-line leading-relaxed pr-10">
                {currentCopy.caption}
              </p>
            </div>

            {/* On-Screen Text & Hashtags Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* On-Screen Text */}
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <span className="flex items-center gap-1.5 text-neutral-400">
                    <MonitorPlay className="h-3 w-3 text-amber-400" />
                    On-Screen Text
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentCopy.on_screen_text, `${selectedPlatform}-screen`)}
                    className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"
                  >
                    {copiedField === `${selectedPlatform}-screen` ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <p className="text-neutral-200 font-semibold">{currentCopy.on_screen_text}</p>
              </div>

              {/* Hashtags */}
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <span className="flex items-center gap-1.5 text-neutral-400">
                    <Hash className="h-3 w-3 text-sky-400" />
                    Hashtags
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentCopy.hashtags, `${selectedPlatform}-tags`)}
                    className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"
                  >
                    {copiedField === `${selectedPlatform}-tags` ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <p className="text-neutral-400 font-mono text-[11px] truncate">
                  {currentCopy.hashtags || 'None'}
                </p>
              </div>
            </div>

            {/* Regenerate Action */}
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => fetchCopy(selectedPlatform, true)}
                className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" />
                <span>Regenerate copy</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
