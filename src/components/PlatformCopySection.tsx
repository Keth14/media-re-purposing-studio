import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Camera,
  Briefcase,
  Send,
  Copy,
  Check,
  RotateCw,
  Sparkles,
  AlertCircle,
  Type,
  AlignLeft,
  Hash,
  MonitorPlay,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Wand2,
  Info,
} from 'lucide-react';
import {
  Clip,
  Platform,
  PlatformCopy,
  BrainState,
  CopyResponse,
  VoiceFidelityResult,
  FidelityResponse,
} from '@/types';
import { Button } from '@/components/ui/button';

interface PlatformCopySectionProps {
  clip: Clip;
  brain: BrainState | null;
  clipId?: string;
  onOpenVoicePanel?: () => void;
}

const PLATFORMS: { id: Platform; label: string; icon: React.ElementType }[] = [
  { id: 'youtube_shorts', label: 'YouTube Shorts', icon: Video },
  { id: 'instagram_reels', label: 'Reels', icon: Camera },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { id: 'x', label: 'X', icon: Send },
];

export function PlatformCopySection({
  clip,
  brain,
  clipId,
  onOpenVoicePanel,
}: PlatformCopySectionProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube_shorts');
  const [copyData, setCopyData] = useState<Record<Platform, PlatformCopy | null>>({
    youtube_shorts: null,
    instagram_reels: null,
    linkedin: null,
    x: null,
  });
  const [fidelityData, setFidelityData] = useState<Record<Platform, VoiceFidelityResult | null>>({
    youtube_shorts: null,
    instagram_reels: null,
    linkedin: null,
    x: null,
  });
  const [fidelityErrors, setFidelityErrors] = useState<Record<Platform, string | null>>({
    youtube_shorts: null,
    instagram_reels: null,
    linkedin: null,
    x: null,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingFidelity, setLoadingFidelity] = useState<boolean>(false);
  const [improvingMatch, setImprovingMatch] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const voiceVersion = brain?.version || 1;
  const hasVoice = Boolean(
    brain?.voice &&
    brain.voice.summary &&
    brain.voice.summary.trim() &&
    brain.voice.traits &&
    brain.voice.traits.length > 0
  );

  const evaluateFidelity = async (platform: Platform, copyItem: PlatformCopy) => {
    if (!copyItem || !hasVoice || !brain?.voice) return;
    const combinedText = `${copyItem.hook}\n\n${copyItem.caption}`.trim();
    if (!combinedText) return;

    setLoadingFidelity(true);
    setFidelityErrors((prev) => ({ ...prev, [platform]: null }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      const res = await fetch('/api/fidelity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: combinedText,
          voice: brain.voice,
          voiceVersion: brain.version || 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: FidelityResponse = await res.json();
      if (res.ok && data.success && typeof data.score === 'number') {
        setFidelityData((prev) => ({
          ...prev,
          [platform]: {
            score: data.score!,
            matched_traits: data.matched_traits || [],
            mismatched_traits: data.mismatched_traits || [],
            suggested_rewrite: data.suggested_rewrite || '',
          },
        }));
      } else {
        throw new Error(data.error || 'Failed to evaluate voice fidelity.');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error('Failed to evaluate voice fidelity:', err);
      const isTimeout =
        (err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('abort'))) ||
        (err instanceof DOMException && err.name === 'AbortError');
      setFidelityErrors((prev) => ({
        ...prev,
        [platform]: isTimeout
          ? 'Took too long to calculate (20s timeout)'
          : err instanceof Error
          ? err.message
          : 'Failed to score fidelity',
      }));
    } finally {
      setLoadingFidelity(false);
    }
  };

  const fetchCopy = async (platform: Platform, forceRegen = false, constraints?: string[]) => {
    // If we already have it in local state and not forcing regen or constraints, skip
    if (!forceRegen && !constraints && copyData[platform]) {
      return;
    }

    if (constraints && constraints.length > 0) {
      setImprovingMatch(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip,
          platform,
          voice: brain?.voice || null,
          rules: brain?.rules || [],
          voiceVersion,
          rulesVersion: brain?.version || 1,
          clipId,
          constraints: constraints || undefined,
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

      // Automatically evaluate voice fidelity for the newly generated copy
      evaluateFidelity(platform, data.copy);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error generating copy.');
    } finally {
      setLoading(false);
      setImprovingMatch(false);
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

  const handleImproveMatch = () => {
    const currentFid = fidelityData[selectedPlatform];
    const mismatches = currentFid?.mismatched_traits || [];
    const constraints = [
      ...mismatches.map((m) => `Strictly fix mismatch: ${m}`),
      ...(currentFid?.suggested_rewrite
        ? [`Incorporate style: "${currentFid.suggested_rewrite}"`]
        : []),
    ];
    fetchCopy(selectedPlatform, true, constraints);
  };

  const currentCopy = copyData[selectedPlatform];
  const currentFidelity = fidelityData[selectedPlatform];
  const currentFidelityError = fidelityErrors[selectedPlatform];

  const ringScore = currentFidelity?.score ?? null;
  const ringColor =
    ringScore !== null && ringScore >= 85
      ? 'text-emerald-400'
      : ringScore !== null && ringScore >= 70
      ? 'text-indigo-400'
      : 'text-amber-400';

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
              onClick={() => {
                setSelectedPlatform(p.id);
                setShowTooltip(false);
              }}
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
            className="space-y-3 text-xs"
          >
            {/* Voice Fidelity Score Bar */}
            <div className="relative rounded-2xl border border-neutral-800 bg-neutral-950/90 p-3 backdrop-blur-md">
              {!hasVoice ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="font-semibold text-white text-xs">Brand Voice Inactive</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Learn your voice or use a sample voice to calculate authenticity match scores.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenVoicePanel}
                    className="rounded-xl border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-mono h-8 px-3 shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    <span>Learn your voice to unlock match score</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Score Ring */}
                  <div className="flex items-center gap-3">
                    {/* SVG Circular Progress Ring */}
                    <div className="relative flex items-center justify-center h-10 w-10 shrink-0">
                      <svg className="h-10 w-10 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-neutral-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {currentFidelity && (
                          <path
                            className={ringColor}
                            strokeDasharray={`${currentFidelity.score}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        )}
                      </svg>
                      <span className="absolute font-mono text-[11px] font-bold text-white">
                        {loadingFidelity ? '...' : currentFidelity ? `${currentFidelity.score}%` : '--'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-xs">
                          {currentFidelity
                            ? `Sounds like you: ${currentFidelity.score}%`
                            : loadingFidelity
                            ? 'Evaluating voice fidelity...'
                            : currentFidelityError
                            ? 'Voice match evaluation failed'
                            : 'Sounds like you: calculating'}
                        </span>

                        {/* Tooltip Trigger */}
                        {currentFidelity && (
                          <button
                            type="button"
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="text-neutral-400 hover:text-indigo-300 transition-colors p-0.5 rounded"
                            title="View matched & mismatched traits"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {currentFidelityError ? (
                        <div className="flex items-center gap-1.5 text-rose-300 text-[11px]">
                          <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />
                          <span>{currentFidelityError}</span>
                          <button
                            type="button"
                            onClick={() => evaluateFidelity(selectedPlatform, currentCopy)}
                            className="underline text-rose-400 hover:text-rose-200 ml-1 font-mono text-[10px]"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-400">
                          {currentFidelity && currentFidelity.mismatched_traits.length > 0
                            ? `${currentFidelity.mismatched_traits.length} tonal mismatch${
                                currentFidelity.mismatched_traits.length > 1 ? 'es' : ''
                              } detected`
                            : loadingFidelity
                            ? 'Evaluating against your brand voice traits (max 20s)...'
                            : 'Accurately reflects your brand voice traits.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Improve Match Button */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleImproveMatch}
                      disabled={improvingMatch || loading || loadingFidelity || !hasVoice}
                      size="sm"
                      className="rounded-xl bg-indigo-600/90 text-white hover:bg-indigo-500 h-8 text-[11px] font-medium px-3 flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                    >
                      {improvingMatch ? (
                        <>
                          <RotateCw className="h-3 w-3 animate-spin" />
                          <span>Improving...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3" />
                          <span>Improve match</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tooltip / Breakdown Drawer */}
              <AnimatePresence>
                {showTooltip && currentFidelity && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-neutral-800 space-y-2.5 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Matched Traits */}
                      <div className="space-y-1.5 bg-neutral-900/40 rounded-xl p-2.5 border border-neutral-800/60">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          Matched Traits ({currentFidelity.matched_traits.length})
                        </span>
                        {currentFidelity.matched_traits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {currentFidelity.matched_traits.map((trait, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-300 font-mono"
                              >
                                {trait}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-500 italic">None matched yet.</span>
                        )}
                      </div>

                      {/* Mismatched Traits */}
                      <div className="space-y-1.5 bg-neutral-900/40 rounded-xl p-2.5 border border-neutral-800/60">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1 font-semibold">
                          <XCircle className="h-3 w-3 text-rose-400" />
                          Mismatched Traits ({currentFidelity.mismatched_traits.length})
                        </span>
                        {currentFidelity.mismatched_traits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {currentFidelity.mismatched_traits.map((trait, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-300 font-mono"
                              >
                                {trait}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400/80 italic">
                            No voice mismatches!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Suggested Rewrite */}
                    {currentFidelity.suggested_rewrite && (
                      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-2.5 space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold block">
                          Suggested Rewrite Line
                        </span>
                        <p className="text-neutral-200 text-xs italic">
                          &ldquo;{currentFidelity.suggested_rewrite}&rdquo;
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                disabled={loading || improvingMatch}
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
