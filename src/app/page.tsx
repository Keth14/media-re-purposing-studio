"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import for 3D Boot Intro (ssr: false)
const BootIntro = dynamic(() => import('@/components/BootIntro'), {
  ssr: false,
});
import {
  Brain,
  Video,
  FileText,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  ExternalLink,
  Layers,
  Database,
  TrendingUp,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipCard } from '@/components/ClipCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { BrandVoicePanel } from '@/components/BrandVoicePanel';
import { BrandBrainDashboard } from '@/components/BrandBrainDashboard';
import { DiffModal } from '@/components/DiffModal';
import {
  Clip,
  IngestResponse,
  ClipsResponse,
  BrainState,
  PostedResult,
  DiffViewData,
  BrainRule,
  TranscriptSegment,
} from '@/types';
import { getBrain, saveBrain, restoreBrainVersion } from '@/lib/brain';
import { getPostedResults } from '@/lib/tracker';
import { computeStats } from '@/lib/stats';
import { rerankClips } from '@/lib/rerank';

type TabType = 'youtube' | 'paste';
type ViewMode = 'clips' | 'brain';

export default function Home() {
  const [activeView, setActiveView] = useState<ViewMode>('clips');
  const [activeTab, setActiveTab] = useState<TabType>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [pastedTranscript, setPastedTranscript] = useState<string>('');
  const [manualVideoId, setManualVideoId] = useState<string>('');

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(360);
  const [transcriptPreview, setTranscriptPreview] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [isSampleVideo, setIsSampleVideo] = useState<boolean>(false);

  // Sample data from src/data/sample.json
  const [hasSample, setHasSample] = useState<boolean>(false);
  const [sampleData, setSampleData] = useState<{
    videoId: string;
    title: string;
    totalDuration: number;
    formattedTranscript: string;
    transcriptSegments: TranscriptSegment[];
    clips: Clip[];
  } | null>(null);
  const [isSavingSample, setIsSavingSample] = useState<boolean>(false);
  const [sampleSaveSuccess, setSampleSaveSuccess] = useState<string | null>(null);

  // 3D Boot Intro Session State (Plays once per browser session)
  const [showIntro, setShowIntro] = useState<boolean>(false);

  // Brand Voice & Learning State
  const [brain, setBrain] = useState<BrainState | null>(null);
  const [postedResults, setPostedResults] = useState<PostedResult[]>([]);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState<boolean>(false);

  // Diff Modal State
  const [diffData, setDiffData] = useState<DiffViewData | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [previousBrain, setPreviousBrain] = useState<BrainState | null>(null);
  const [isUpdatingBrain, setIsUpdatingBrain] = useState<boolean>(false);

  // Load brain, posted results, check sample.json, and check intro session on mount
  useEffect(() => {
    setBrain(getBrain());
    setPostedResults(getPostedResults());

    // Check if intro has been seen this session
    try {
      const seen = sessionStorage.getItem('brandbrain_intro_seen');
      if (seen !== 'true') {
        setShowIntro(true);
      }
    } catch (e) {
      console.warn('sessionStorage unavailable for intro check:', e);
    }

    // Check if sample.json exists and load it
    fetch('/api/sample')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.hasSample && data.sample) {
          setHasSample(true);
          setSampleData(data.sample);
        } else {
          setHasSample(false);
          setSampleData(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load sample data:', err);
        setHasSample(false);
        setSampleData(null);
      });
  }, []);

  const handleReplayIntro = () => {
    try {
      sessionStorage.removeItem('brandbrain_intro_seen');
    } catch (e) {
      console.warn('sessionStorage error removing intro key:', e);
    }
    setShowIntro(true);
  };

  // Prevent double-clicks or React strict-mode double firing
  const isSubmittingRef = React.useRef<boolean>(false);

  // Helper to detect if a text looks like a URL/link rather than a transcript
  const looksLikeUrl = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (/^(https?:\/\/|www\.)/i.test(trimmed)) return true;
    if (/(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i.test(trimmed)) return true;
    if (
      !trimmed.includes('\n') &&
      (trimmed.startsWith('http') ||
        trimmed.includes('.com') ||
        trimmed.includes('.be') ||
        trimmed.includes('.org') ||
        trimmed.includes('.net')) &&
      !trimmed.includes(' ')
    ) {
      return true;
    }
    return false;
  };

  const handleFindClips = async () => {
    // Guard against duplicate invocations while processing
    if (isSubmittingRef.current || Boolean(loadingStep)) {
      return;
    }

    setError(null);
    setFallbackNotice(null);
    setClips([]);
    setTranscriptPreview(null);
    setFromCache(false);

    // 1. Validate inputs
    if (activeTab === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError('Please enter a YouTube video URL or ID.');
        return;
      }
    } else {
      const trimmed = pastedTranscript.trim();
      if (!trimmed) {
        setError('Please paste a transcript to extract clips from.');
        return;
      }
      if (looksLikeUrl(trimmed)) {
        setError(
          'That looks like a link, not a transcript. Open the video on YouTube, click ...more, then Show transcript, copy all, and paste it here.'
        );
        return;
      }
      if (trimmed.length < 300) {
        setError(
          `Transcript is too short (${trimmed.length} characters). A transcript requires at least 300 characters to extract high-retention clips. Please copy the full transcript text.`
        );
        return;
      }
    }

    isSubmittingRef.current = true;

    try {
      // Step 1: Ingest Transcript
      setLoadingStep('Ingesting transcript...');

      const ingestPayload =
        activeTab === 'youtube'
          ? { type: 'youtube', url: youtubeUrl.trim() }
          : {
              type: 'paste',
              text: pastedTranscript.trim(),
              videoId: manualVideoId.trim() || undefined,
            };

      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestPayload),
      });

      const ingestData: IngestResponse = await ingestRes.json();

      if (!ingestRes.ok || !ingestData.success) {
        // If YouTube fetch fails, auto switch to Paste tab
        if (activeTab === 'youtube' && ingestData.canFallbackToPaste) {
          setActiveTab('paste');
          setFallbackNotice(
            'Unable to extract captions directly from YouTube. Automatically switched to "Paste transcript" so you can paste the transcript text below.'
          );
          if (ingestData.videoId && !manualVideoId) {
            setManualVideoId(ingestData.videoId);
          }
        }
        throw new Error(ingestData.error || 'Failed to ingest transcript.');
      }

      setVideoId(ingestData.videoId);
      setVideoTitle(ingestData.videoTitle || 'Processed Video');
      setTranscriptPreview(ingestData.formattedTranscript);
      setTranscriptSegments(ingestData.segments || []);
      setTotalDuration(ingestData.totalDuration || 360);
      setIsSampleVideo(false);

      // Step 2: Clip Selection via Gemini (with 45s AbortController timeout)
      setLoadingStep('AI analyzing viral hooks & extracting the 6 best clips...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 45000);

      try {
        const clipsRes = await fetch('/api/clips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formattedTranscript: ingestData.formattedTranscript,
            videoId: ingestData.videoId,
            totalDuration: ingestData.totalDuration,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const clipsData: ClipsResponse & { fromCache?: boolean } = await clipsRes.json();

        if (!clipsRes.ok || !clipsData.success) {
          throw new Error(clipsData.error || 'Failed to select clips from transcript.');
        }

        if (!clipsData.clips || clipsData.clips.length === 0) {
          throw new Error('No clips could be extracted. The transcript might be too short or lacks clear conversational segments.');
        }

        // Apply Brand Brain Reranking if weights exist
        const adjusted = rerankClips(clipsData.clips, brain?.weights);
        setClips(adjusted);
        setFromCache(Boolean(clipsData.fromCache));
      } catch (clipsErr: unknown) {
        clearTimeout(timeoutId);
        if (
          (clipsErr instanceof Error && clipsErr.name === 'AbortError') ||
          (clipsErr instanceof DOMException && clipsErr.name === 'AbortError')
        ) {
          throw new Error('Took too long, try again');
        }
        throw clipsErr;
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoadingStep(null);
      isSubmittingRef.current = false;
    }
  };

  // Instant Demo: Try Sample Video (Loaded ONLY from src/data/sample.json)
  const handleTrySampleVideo = () => {
    if (!sampleData) return;
    setError(null);
    setFallbackNotice(null);
    setVideoId(sampleData.videoId);
    setVideoTitle(sampleData.title);
    setTranscriptPreview(sampleData.formattedTranscript);
    setTranscriptSegments(sampleData.transcriptSegments || []);
    setTotalDuration(sampleData.totalDuration || 360);
    setFromCache(true);
    setIsSampleVideo(true);
    const reranked = rerankClips(sampleData.clips, brain?.weights);
    setClips(reranked);
  };

  // Dev-only: Save Current Video & Generated Clips as Sample to src/data/sample.json
  const handleSaveAsSample = async () => {
    if (!videoId || clips.length === 0) return;
    setIsSavingSample(true);
    setSampleSaveSuccess(null);
    try {
      const res = await fetch('/api/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title: videoTitle || 'Real Processed Video',
          formattedTranscript: transcriptPreview,
          transcriptSegments,
          totalDuration,
          clips: clips.slice(0, 6),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHasSample(true);
        setSampleData(data.sample);
        setSampleSaveSuccess('Saved to src/data/sample.json');
        setTimeout(() => setSampleSaveSuccess(null), 5000);
      } else {
        throw new Error(data.error || 'Failed to save sample.');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save sample.');
    } finally {
      setIsSavingSample(false);
    }
  };

  // Feedback Loop: Learn & Update Brand Brain from Performance Stats
  const handleUpdateBrainFromResults = async () => {
    if (postedResults.length < 2) {
      setError('Log at least 2 results or load sample results to update Brand Brain.');
      return;
    }

    setIsUpdatingBrain(true);
    setError(null);

    try {
      const stats = computeStats(postedResults);

      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          currentBrain: brain,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update Brand Brain from results.');
      }

      const oldState = brain;
      setPreviousBrain(oldState);

      // Update rules: remove deleted, update changed, append new validated rules
      let updatedRules: BrainRule[] = [...(oldState?.rules || [])];

      if (Array.isArray(data.removed_rules)) {
        const removeIds = new Set(data.removed_rules.map((r: any) => r.id));
        updatedRules = updatedRules.filter((r) => !removeIds.has(r.id));
      }

      if (Array.isArray(data.changed_rules)) {
        for (const change of data.changed_rules) {
          const idx = updatedRules.findIndex((r) => r.id === change.id);
          if (idx !== -1) {
            updatedRules[idx] = {
              ...updatedRules[idx],
              text: change.text,
            };
          }
        }
      }

      if (Array.isArray(data.new_rules)) {
        updatedRules = [...updatedRules, ...data.new_rules];
      }

      // Update voice adjustments
      const currentVoice = oldState?.voice || {
        summary: 'Direct founder voice.',
        traits: ['Pragmatically Direct'],
        sentenceStyle: 'Punchy and concise.',
        vocabulary: ['signal vs noise'],
        emojiUsage: 'Minimal',
        signaturePhrases: [],
        avoid: [],
      };

      const updatedVoice = {
        ...currentVoice,
        summary: data.voice_adjustments?.summary_refinement || currentVoice.summary,
        traits: Array.from(
          new Set([...currentVoice.traits, ...(data.voice_adjustments?.added_traits || [])])
        ),
        avoid: Array.from(
          new Set([...currentVoice.avoid, ...(data.voice_adjustments?.added_avoid || [])])
        ),
      };

      // Apply Brain update and version bump
      const newBrainState = saveBrain(
        updatedVoice,
        updatedRules,
        false,
        data.weights,
        data.explanation
      );
      setBrain(newBrainState);

      // Compute clip reordering diff if clips exist
      let reorderedClips: DiffViewData['reorderedClips'] = [];
      if (clips.length > 0) {
        const reranked = rerankClips(clips, data.weights);
        setClips(reranked);

        reorderedClips = reranked
          .filter((c) => c.rankDelta !== undefined && c.rankDelta !== 0)
          .map((c) => {
            const oldRank = (c as any).originalIndex !== undefined ? (c as any).originalIndex + 1 : 1;
            const newRank = reranked.findIndex((item) => item.title === c.title) + 1;
            const hookLift = stats.hookStats[c.hook_type]?.lift ?? 0;
            const hookCount = stats.hookStats[c.hook_type]?.count ?? 0;
            return {
              clipId: c.title,
              title: c.title,
              oldRank,
              newRank,
              reason: `because ${c.hook_type} hooks lift ${hookLift > 0 ? '+' : ''}${hookLift}% (n=${hookCount})`,
            };
          });
      } else if (postedResults.length > 0) {
        // Illustrative reordering projection from sample posts
        const sampleClipsProjection = postedResults.slice(0, 6).map((p, idx) => ({
          title: p.title,
          start_sec: 0,
          end_sec: p.duration_sec,
          hook_type: p.hook_type,
          scores: { hook: 80, emotion: 75, standalone_clarity: 80, overall: Math.round(p.score || 75) },
          reason: 'Audience telemetry projection',
          trigger_quote: p.title,
          originalIndex: idx,
        }));
        const reranked = rerankClips(sampleClipsProjection as any, data.weights);
        reorderedClips = reranked
          .filter((c) => c.rankDelta !== undefined && c.rankDelta !== 0)
          .map((c) => {
            const oldRank = (c as any).originalIndex !== undefined ? (c as any).originalIndex + 1 : 1;
            const newRank = reranked.findIndex((item) => item.title === c.title) + 1;
            const hookLift = stats.hookStats[c.hook_type]?.lift ?? 0;
            const hookCount = stats.hookStats[c.hook_type]?.count ?? 0;
            return {
              clipId: c.title,
              title: c.title,
              oldRank,
              newRank,
              reason: `because ${c.hook_type} hooks lift ${hookLift > 0 ? '+' : ''}${hookLift}% (n=${hookCount})`,
            };
          });
      }

      // Prepare Diff View Data
      const diff: DiffViewData = {
        fromVersion: oldState?.version || 1,
        toVersion: newBrainState.version,
        addedRules: data.new_rules || [],
        changedRules: data.changed_rules || [],
        removedRules: data.removed_rules || [],
        voiceChanges: [
          ...(data.voice_adjustments?.summary_refinement
            ? [
                {
                  field: 'Summary',
                  from: oldState?.voice?.summary || '',
                  to: data.voice_adjustments.summary_refinement,
                },
              ]
            : []),
        ],
        explanation: data.explanation || 'Refined rules and category weights from empirical performance.',
        reorderedClips,
      };

      setDiffData(diff);
      setIsDiffModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error updating Brand Brain.');
    } finally {
      setIsUpdatingBrain(false);
    }
  };

  const handleHistoricalRestore = (versionNumber: number) => {
    const restored = restoreBrainVersion(versionNumber);
    if (restored) {
      setBrain(restored);
      if (clips.length > 0) {
        setClips(rerankClips(clips, restored.weights));
      }
    }
  };

  const handleRefreshResults = () => {
    const updated = getPostedResults();
    setPostedResults(updated);
  };

  return (
    <div className="studio-grain min-h-screen bg-[#070709] text-neutral-100 flex flex-col items-center overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Background Studio Glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-30">
        <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 py-8 flex flex-col items-center space-y-8">
        {/* Navigation Bar / Mode Toggle & Brand Brain Header Badge */}
        <div className="w-full flex items-center justify-between border-b border-neutral-900/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10">
              <Brain className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-light text-base tracking-tight text-white block">
                BrandBrain <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-400">Studio</span>
              </span>
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:block">
                Video Repurposing Engine
              </span>
            </div>
          </div>

          {/* View Mode Toggle Pill */}
          <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800/80 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveView('clips')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 sm:px-4 py-1.5 text-xs font-medium transition-all ${
                activeView === 'clips'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Clips Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('brain')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 sm:px-4 py-1.5 text-xs font-medium transition-all ${
                activeView === 'brain'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Brand Brain</span>
            </button>
          </div>

          {/* Right: Pulsing Brand Brain Header Badge & Voice Panel Trigger */}
          <div className="flex items-center gap-2">
            {/* Brand Brain header badge: a pulsing dot and current version with honest memory tooltip */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setActiveView('brain')}
                className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5 text-xs font-mono text-neutral-200 backdrop-blur-md hover:border-indigo-500/60 transition-all hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                title="Memory is saved in this browser. Export it to keep or move it."
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-neutral-400 group-hover:text-neutral-200 text-[11px] hidden md:inline">Brain</span>
                <span className="font-bold text-white">v{brain?.version || 1}</span>
              </button>

              {/* Honest Note Tooltip */}
              <div className="pointer-events-none absolute top-full right-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 w-56 rounded-xl border border-neutral-800 bg-neutral-900/95 p-2.5 text-center text-[10px] font-sans text-neutral-300 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 backdrop-blur-md">
                <span className="text-indigo-400 font-mono font-medium mr-1">Note:</span>
                Memory is saved in this browser. Export it to keep or move it.
              </div>
            </div>

            {/* Brand Voice Shortcut Trigger */}
            <button
              type="button"
              onClick={() => setIsVoicePanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 px-2.5 sm:px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 transition-all font-mono"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden md:inline">Voice</span>
              {brain?.isSample && (
                <span className="rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 text-[9px]">
                  sample
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="w-full flex items-start justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-200">Notice</p>
                  <p className="text-rose-300/90 leading-relaxed">{error}</p>
                </div>
              </div>
              {error.toLowerCase().includes('took too long') && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleFindClips()}
                  className="shrink-0 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW 1: CLIPS STUDIO */}
        {activeView === 'clips' && (
          <div className="w-full flex flex-col items-center space-y-10">
            {/* Hero Header with Animated Gradient Glow & 3-Step Strip */}
            <header className="relative text-center space-y-6 max-w-3xl pt-2">
              {/* Animated Gradient Glow behind the headline */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[580px] h-[180px] sm:h-[260px] bg-gradient-to-tr from-indigo-600/25 via-violet-600/15 to-transparent blur-3xl rounded-full" />

              <h1 className="relative text-4xl sm:text-6xl font-light tracking-tight text-white leading-tight">
                <span className="headline-shimmer">
                  Transform Long Videos into Viral Short Clips
                </span>
              </h1>

              <p className="relative text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-xl mx-auto">
                Extract high-retention moments, enforce your authentic brand voice, and learn from real post telemetry.
              </p>

              {/* Three-step strip: Paste -> Clips -> Learn */}
              <div className="relative inline-flex items-center gap-2 sm:gap-4 rounded-2xl border border-neutral-800/90 bg-neutral-950/80 px-4 py-2 text-xs font-mono text-neutral-300 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                  <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 font-bold">1</span>
                  <span>Paste</span>
                </div>
                <ArrowRight className="h-3 w-3 text-neutral-600" />
                <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                  <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 font-bold">2</span>
                  <span>Clips</span>
                </div>
                <ArrowRight className="h-3 w-3 text-neutral-600" />
                <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                  <span className="h-5 w-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-300 font-bold">3</span>
                  <span>Learn</span>
                </div>
              </div>
            </header>

            {/* Ingest Card */}
            <div className="w-full max-w-3xl rounded-3xl border border-neutral-800/80 bg-neutral-950/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 space-y-6">
              {/* Tabs */}
              <div className="flex rounded-xl bg-neutral-900/80 p-1 border border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('youtube');
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'youtube'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Video className="h-4 w-4 text-red-500" />
                  YouTube link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'paste'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <FileText className="h-4 w-4 text-indigo-400" />
                  Paste transcript
                </button>
              </div>

              {/* Fallback Notice */}
              <AnimatePresence>
                {fallbackNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-amber-200">Switched to Transcript Paste</p>
                      <p className="text-amber-300/90 leading-relaxed">{fallbackNotice}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Content: YouTube Link */}
              {activeTab === 'youtube' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-neutral-400">
                    YouTube Video URL or ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 px-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 font-mono transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Supports standard YouTube URLs, youtu.be, shorts, and live streams with captions.
                  </p>
                </div>
              )}

              {/* Tab Content: Paste Transcript */}
              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-neutral-400">
                        Paste Transcript Text (plain text or with [mm:ss] timestamps)
                      </label>
                      <span
                        className={`text-[11px] font-mono transition-colors ${
                          pastedTranscript.trim().length === 0
                            ? 'text-neutral-500'
                            : looksLikeUrl(pastedTranscript)
                            ? 'text-amber-400'
                            : pastedTranscript.trim().length < 300
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {pastedTranscript.trim().length} chars (min 300)
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      value={pastedTranscript}
                      onChange={(e) => {
                        setPastedTranscript(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="[00:00] Paste your transcript here...&#10;Or paste plain text without timestamps — the system will automatically estimate timestamps at ~150 words per minute."
                      className={`w-full rounded-xl border bg-neutral-900/90 p-4 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none font-mono transition-all leading-relaxed ${
                        looksLikeUrl(pastedTranscript)
                          ? 'border-amber-500/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                          : 'border-neutral-800 focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600'
                      }`}
                    />
                  </div>

                  {/* Inline Alert: URL Detected */}
                  {looksLikeUrl(pastedTranscript) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5 backdrop-blur-sm"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-amber-100">Link detected instead of transcript</p>
                        <p className="text-amber-200/90 leading-relaxed">
                          That looks like a link, not a transcript. Open the video on YouTube, click ...more, then Show transcript, copy all, and paste it here.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Inline Hint: Under 300 Chars */}
                  {!looksLikeUrl(pastedTranscript) &&
                    pastedTranscript.trim().length > 0 &&
                    pastedTranscript.trim().length < 300 && (
                      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-3.5 py-2.5 text-xs text-neutral-400 flex items-center justify-between">
                        <span>Transcript text must be at least 300 characters to extract quality clips.</span>
                        <span className="font-mono text-amber-400/90 text-[11px] shrink-0 ml-2">
                          {300 - pastedTranscript.trim().length} more needed
                        </span>
                      </div>
                    )}

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-neutral-500">
                      Optional YouTube Video URL or ID (for video playback)
                    </label>
                    <input
                      type="text"
                      value={manualVideoId}
                      onChange={(e) => setManualVideoId(e.target.value)}
                      placeholder="Optional: e.g. https://www.youtube.com/watch?v=..."
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:border-neutral-700 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Find Clips + Try Sample Video Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  onClick={handleFindClips}
                  disabled={Boolean(loadingStep)}
                  className="flex-1 w-full rounded-xl bg-white text-black hover:bg-neutral-200 h-12 text-sm font-semibold tracking-wide transition-all shadow-lg shadow-white/5 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingStep ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-neutral-900" />
                      <span>{loadingStep}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-black" />
                      <span>Find clips</span>
                      <ArrowRight className="h-4 w-4 text-black ml-1" />
                    </>
                  )}
                </Button>

                {/* "Try sample video" button: loads only from src/data/sample.json; hidden if missing */}
                {hasSample && sampleData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTrySampleVideo}
                    disabled={Boolean(loadingStep)}
                    className="w-full sm:w-auto rounded-xl border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 hover:text-white h-12 px-5 text-xs text-neutral-300 font-mono transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                    title={`Instantly preview clips from "${sampleData.title}"`}
                  >
                    <Play className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Try sample video</span>
                    <span className="rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.2 text-[9px]">
                      sample
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Results Section */}
            <section className="w-full mt-10 space-y-8">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-5">
                <div>
                  <h2 className="text-2xl font-light tracking-tight text-white flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
                    Selected Short-Form Clips
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Ranked and weighted by Brand Brain algorithmic retention multipliers.
                  </p>
                </div>

                {clips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {(fromCache || isSampleVideo) && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 font-mono">
                        <span className="rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-bold">
                          sample
                        </span>
                        <span className="truncate max-w-[200px] sm:max-w-[320px]">
                          Sample: {videoTitle || sampleData?.title || 'Featured Video'}
                        </span>
                      </div>
                    )}

                    {/* Dev-Only "Save as sample" button: appears only when NODE_ENV is development and real clips are generated */}
                    {process.env.NODE_ENV === 'development' && !fromCache && !isSampleVideo && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveAsSample}
                        disabled={isSavingSample}
                        className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-mono h-8 px-3 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        title="Dev-only: Save video ID, title, transcript, and 6 clips to src/data/sample.json"
                      >
                        {isSavingSample ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin text-indigo-300" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            <span>Save as sample</span>
                          </>
                        )}
                      </Button>
                    )}

                    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300 font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{clips.length} clips ready</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Save Toast */}
              <AnimatePresence>
                {sampleSaveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5 font-mono"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{sampleSaveSuccess}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Skeletons on Loading */}
              {loadingStep && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <SkeletonCard key={idx} />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loadingStep && clips.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-800/80 bg-neutral-950/40 py-20 px-6 text-center space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-lg">
                    <Flame className="h-6 w-6 text-neutral-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-medium text-neutral-200">
                      No clips extracted yet
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-sm leading-relaxed mx-auto">
                      Enter a YouTube URL above or paste a transcript to test instant short-form extraction.
                    </p>
                  </div>
                  {hasSample && sampleData && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTrySampleVideo}
                      className="rounded-xl border-neutral-800 bg-neutral-900 text-xs text-neutral-300 hover:text-white"
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
                      Load Sample Clips
                    </Button>
                  )}
                </div>
              )}

              {/* Render Clips with Stagger-in and Reorder Animation */}
              {!loadingStep && clips.length > 0 && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08,
                      },
                    },
                  }}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {clips.map((clip, idx) => (
                    <ClipCard
                      key={`${clip.id || clip.title}-${idx}`}
                      clip={clip}
                      videoId={videoId}
                      rank={idx + 1}
                      brain={brain}
                      totalDuration={totalDuration}
                      onResultLogged={handleRefreshResults}
                      onOpenVoicePanel={() => setIsVoicePanelOpen(true)}
                      isSample={fromCache || isSampleVideo}
                      sampleVideoTitle={videoTitle || sampleData?.title}
                    />
                  ))}
                </motion.div>
              )}

              {/* Transcript Drawer / Preview */}
              {transcriptPreview && (
                <div className="mt-12 rounded-3xl border border-neutral-900 bg-neutral-950/40 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                    <span className="flex items-center gap-2 text-neutral-300">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      Normalized Timestamped Transcript
                    </span>
                    <span>~20s segment lines</span>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-xl bg-black/60 p-4 text-xs font-mono text-neutral-400 border border-neutral-900 leading-relaxed select-all">
                    {transcriptPreview}
                  </pre>
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: BRAND BRAIN INTELLIGENCE CORE */}
        {activeView === 'brain' && (
          <BrandBrainDashboard
            brain={brain}
            postedResults={postedResults}
            onResultsUpdated={(newResults) => {
              setPostedResults(newResults);
            }}
            onBrainUpdated={(newBrain) => {
              setBrain(newBrain);
              if (clips.length > 0 && newBrain?.weights) {
                setClips(rerankClips(clips, newBrain.weights));
              }
            }}
            onUpdateBrain={handleUpdateBrainFromResults}
            isUpdatingBrain={isUpdatingBrain}
            onSelectHistoricalVersion={handleHistoricalRestore}
          />
        )}

        {/* Video Studio Footer */}
        <footer className="w-full mt-24 border-t border-neutral-900/80 py-8 text-center space-y-2">
          <p className="text-xs text-neutral-400 font-mono tracking-wide">
            Sample data is labeled. Real results come from your posts.
          </p>
          <p className="text-[11px] text-neutral-600 font-mono">
            Brand Brain Studio • Algorithmic Video Repurposing & Voice Engine
          </p>
          <div>
            <button
              type="button"
              onClick={handleReplayIntro}
              className="text-[11px] font-mono text-neutral-500 hover:text-indigo-400 transition-colors underline cursor-pointer mt-1"
            >
              Replay intro
            </button>
          </div>
        </footer>
      </div>

      {/* 3D Boot Intro Overlay (Plays once per session, preloads app behind it) */}
      {showIntro && (
        <BootIntro onComplete={() => setShowIntro(false)} />
      )}

      {/* Brand Voice Side Panel Drawer */}
      <BrandVoicePanel
        isOpen={isVoicePanelOpen}
        onClose={() => setIsVoicePanelOpen(false)}
        brain={brain}
        onBrainUpdate={(newBrain) => {
          setBrain(newBrain);
          if (clips.length > 0 && newBrain?.weights) {
            setClips(rerankClips(clips, newBrain.weights));
          }
        }}
      />

      {/* Diff View Modal ("What Changed") */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        diffData={diffData}
        oldBrain={previousBrain}
        newBrain={brain}
      />
    </div>
  );
}
