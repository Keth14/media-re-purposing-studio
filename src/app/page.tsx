"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipCard } from '@/components/ClipCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { BrandVoicePanel } from '@/components/BrandVoicePanel';
import { Clip, IngestResponse, ClipsResponse, BrainState } from '@/types';
import { getBrain } from '@/lib/brain';

type TabType = 'youtube' | 'paste';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [pastedTranscript, setPastedTranscript] = useState<string>('');
  const [manualVideoId, setManualVideoId] = useState<string>('');

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const [videoId, setVideoId] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [fromCache, setFromCache] = useState<boolean>(false);

  // Brand Voice State
  const [brain, setBrain] = useState<BrainState | null>(null);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState<boolean>(false);

  // Load brain from localStorage on mount
  useEffect(() => {
    setBrain(getBrain());
  }, []);

  // Prevent double-clicks or React strict-mode double firing
  const isSubmittingRef = React.useRef<boolean>(false);

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
      if (!pastedTranscript.trim()) {
        setError('Please paste a transcript to extract clips from.');
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
      setTranscriptPreview(ingestData.formattedTranscript);

      // Step 2: Clip Selection via Gemini
      setLoadingStep('AI analyzing viral hooks & extracting the 6 best clips...');

      const clipsRes = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formattedTranscript: ingestData.formattedTranscript,
          videoId: ingestData.videoId,
          totalDuration: ingestData.totalDuration,
        }),
      });

      const clipsData: ClipsResponse & { fromCache?: boolean } = await clipsRes.json();

      if (!clipsRes.ok || !clipsData.success) {
        throw new Error(clipsData.error || 'Failed to select clips from transcript.');
      }

      if (!clipsData.clips || clipsData.clips.length === 0) {
        throw new Error('No clips could be extracted. The transcript might be too short or lacks clear conversational segments.');
      }

      setClips(clipsData.clips);
      setFromCache(Boolean(clipsData.fromCache));
      setLoadingStep(null);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoadingStep(null);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-40">
        <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-violet-600/10 via-indigo-600/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 py-12 flex flex-col items-center">
        {/* Header */}
        <header className="text-center space-y-4 mb-10 max-w-2xl">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsVoicePanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-4 py-1.5 text-xs text-neutral-300 backdrop-blur-sm hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-sm group"
            >
              <Brain className="h-3.5 w-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="font-mono uppercase tracking-wider text-[11px]">Brand Voice</span>
              {brain ? (
                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <span>v{brain.version}</span>
                  {brain.isSample && (
                    <span className="rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 text-[9px] font-mono">
                      sample
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-neutral-500 font-mono text-[10px]">(not set)</span>
              )}
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">
            Transform Long Videos into <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500 font-normal">Viral Clips</span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Ingest YouTube transcripts, detect viral hooks, and generate the top 6 standalone short-form clips powered by Gemini.
          </p>
        </header>

        {/* Ingest Card */}
        <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 space-y-6">
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
                <label className="block text-xs font-medium text-neutral-400">
                  Paste Transcript Text (plain text or with [mm:ss] timestamps)
                </label>
                <textarea
                  rows={7}
                  value={pastedTranscript}
                  onChange={(e) => setPastedTranscript(e.target.value)}
                  placeholder="[00:00] Paste your transcript here...&#10;Or paste plain text without timestamps — the system will automatically estimate timestamps at ~150 words per minute."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 text-sm text-neutral-200 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 font-mono transition-all leading-relaxed"
                />
              </div>

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

          {/* Find Clips Button */}
          <div className="pt-2">
            <Button
              onClick={handleFindClips}
              disabled={Boolean(loadingStep)}
              className="w-full rounded-xl bg-white text-black hover:bg-neutral-200 h-12 text-sm font-semibold tracking-wide transition-all shadow-lg shadow-white/5 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-200">Operation Error</p>
                  <p className="text-rose-300/90 leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Section */}
        <section className="w-full mt-14 space-y-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-5">
            <div>
              <h2 className="text-2xl font-light tracking-tight text-white flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
                Selected Short-Form Clips
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                The 6 highest-scoring 20-60 second clips ranked by viral hook & standalone retention.
              </p>
            </div>

            {clips.length > 0 && (
              <div className="flex items-center gap-2">
                {fromCache && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400 font-mono">
                    <Sparkles className="h-3 w-3" />
                    Cached (0 Gemini calls)
                  </span>
                )}
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>6 clips ready</span>
                </div>
              </div>
            )}
          </div>

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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-950/30 py-20 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/60 mb-4">
                <Flame className="h-6 w-6 text-neutral-600" />
              </div>
              <h3 className="text-base font-medium text-neutral-300 mb-1">
                No clips generated yet
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
                Enter a YouTube URL or paste transcript above and click &ldquo;Find clips&rdquo; to extract the best short-form segments.
              </p>
            </div>
          )}

          {/* Render Clips */}
          {!loadingStep && clips.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {clips.map((clip, idx) => (
                <ClipCard
                  key={`${clip.start_sec}-${clip.end_sec}-${idx}`}
                  clip={clip}
                  videoId={videoId}
                  rank={idx + 1}
                  brain={brain}
                />
              ))}
            </motion.div>
          )}

          {/* Transcript Drawer / Preview */}
          {transcriptPreview && (
            <div className="mt-12 rounded-2xl border border-neutral-900 bg-neutral-950/40 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
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

      {/* Brand Voice Side Panel Drawer */}
      <BrandVoicePanel
        isOpen={isVoicePanelOpen}
        onClose={() => setIsVoicePanelOpen(false)}
        brain={brain}
        onBrainUpdate={(newBrain) => setBrain(newBrain)}
      />
    </div>
  );
}
