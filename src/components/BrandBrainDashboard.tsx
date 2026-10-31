import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  Share2,
  Shield,
  Layers,
  RotateCw,
  Quote,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Database,
  Trash2,
  Sliders,
  History,
  Tag,
  Volume2,
  Hash,
} from 'lucide-react';
import { BrainState, BrainRule, PostedResult, ComputedStats } from '@/types';
import { computeStats } from '@/lib/stats';
import { loadSampleResults, clearPostedResults } from '@/lib/tracker';
import { Button } from '@/components/ui/button';

interface BrandBrainDashboardProps {
  brain: BrainState | null;
  postedResults: PostedResult[];
  onResultsUpdated: (results: PostedResult[]) => void;
  onUpdateBrain: () => void;
  isUpdatingBrain: boolean;
  onSelectHistoricalVersion?: (version: number) => void;
}

export function BrandBrainDashboard({
  brain,
  postedResults,
  onResultsUpdated,
  onUpdateBrain,
  isUpdatingBrain,
  onSelectHistoricalVersion,
}: BrandBrainDashboardProps) {
  const stats: ComputedStats = computeStats(postedResults);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<number | null>(null);

  const handleLoadSamples = () => {
    const loaded = loadSampleResults();
    onResultsUpdated(loaded);
  };

  const handleClearResults = () => {
    clearPostedResults();
    onResultsUpdated([]);
  };

  const currentVersion = brain?.version || 1;
  const historyItems = brain?.history || [];

  return (
    <div className="w-full space-y-8 text-neutral-100">
      {/* Top Banner / Actions Card */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-neutral-900/60 to-neutral-950/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-indigo-950/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300 font-mono">
              <Brain className="h-3.5 w-3.5 text-indigo-400" />
              <span>Algorithmic Feedback Engine</span>
              <span>•</span>
              <span className="font-bold text-white">v{currentVersion}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
              Brand Brain <span className="headline-shimmer font-medium">Intelligence Core</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl leading-relaxed">
              Empirical rules, algorithmic lift weights, and performance telemetry learned directly from audience retention.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleLoadSamples}
              variant="outline"
              size="sm"
              className="rounded-xl border-neutral-800 bg-neutral-900/80 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800"
            >
              <Database className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
              Load sample results
            </Button>

            <Button
              onClick={onUpdateBrain}
              disabled={isUpdatingBrain || postedResults.length < 2}
              size="sm"
              className="rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold tracking-wide disabled:opacity-50 transition-all shadow-lg shadow-white/5"
            >
              {isUpdatingBrain ? (
                <>
                  <RotateCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating Brain...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Update Brand Brain from results
                </>
              )}
            </Button>

            {postedResults.length > 0 && (
              <button
                type="button"
                onClick={handleClearResults}
                title="Clear logged results"
                className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-500 hover:text-rose-400 hover:border-rose-900 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Telemetry Glass Metric Cards */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Winning Hooks */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 backdrop-blur-md space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                Winning Hooks
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">&gt;15% Lift</span>
            </div>
            <div className="space-y-1">
              {stats.winningHooks.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {stats.winningHooks.map((h, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300 font-medium capitalize"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-neutral-500">Collect more data</span>
              )}
            </div>
          </div>

          {/* Metric 2: Best Length */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 backdrop-blur-md space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Best Length
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Duration</span>
            </div>
            <p className="text-lg font-light text-white capitalize">{stats.bestLength}</p>
          </div>

          {/* Metric 3: Best Platform */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 backdrop-blur-md space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-indigo-400" />
                Best Platform
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Channel</span>
            </div>
            <p className="text-lg font-light text-white capitalize">{stats.bestPlatform.replace('_', ' ')}</p>
          </div>

          {/* Metric 4: Total Posts & Mean */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 backdrop-blur-md space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                Audience Posts
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Mean: {stats.overallMean}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-light text-white">{stats.totalPosts}</span>
              <span className="text-xs text-neutral-500 font-mono">tracked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Architecture Glass Card */}
      <div className="rounded-3xl border border-neutral-800/80 bg-neutral-900/30 p-6 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">Active Brand Voice Summary & Directives</h3>
          </div>
          <span className="rounded-full bg-neutral-800 border border-neutral-700/60 px-2.5 py-0.5 text-[10px] font-mono text-neutral-300">
            Version {currentVersion}
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-neutral-200 leading-relaxed font-normal">
            {brain?.voice?.summary || 'Direct founder builder voice. Focused on signal over noise.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Traits */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Voice Traits
              </span>
              <div className="flex flex-wrap gap-1">
                {(brain?.voice?.traits || ['Direct', 'Practical', 'Analytical']).map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200 font-mono"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Sentence Style & Tone */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Sentence Architecture
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed font-mono">
                {brain?.voice?.sentenceStyle || 'Short, punchy sentences. High signal.'}
              </p>
            </div>

            {/* Avoid List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                Blacklisted Patterns (Avoid)
              </span>
              <div className="flex flex-wrap gap-1">
                {(brain?.voice?.avoid || ['fluff', 'buzzwords']).map((a, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300 font-mono line-through"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Learned Rules + Version History Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Learned Rules with "Learned Because" Receipts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-white">Learned Rules & Receipts</h3>
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              {brain?.rules?.length || 0} active rule{brain?.rules?.length !== 1 ? 's' : ''}
            </span>
          </div>

          {brain?.rules && brain.rules.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {brain.rules.map((rule) => {
                const isSample = rule.source === 'sample';
                const isFeedback = rule.source === 'feedback_loop';
                const isDictated = rule.source === 'dictated';
                return (
                  <div
                    key={rule.id}
                    className="group rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4 backdrop-blur-md hover:border-neutral-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-100 leading-snug">
                        {rule.text}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                          isDictated
                            ? 'bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300'
                            : isFeedback
                            ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                            : isSample
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {isDictated
                          ? 'dictated'
                          : isFeedback
                          ? 'real data'
                          : isSample
                          ? 'sample'
                          : 'writing sample'}
                      </span>
                    </div>

                    {/* Learned Because Receipt */}
                    <div className="rounded-xl border border-neutral-900 bg-black/40 p-3 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-neutral-500 uppercase tracking-wider text-[10px]">
                        <Quote className="h-3 w-3 text-indigo-400" />
                        <span>Learned because receipt</span>
                      </div>
                      <p className="text-neutral-300 italic">
                        {rule.evidence}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-800 p-8 text-center text-xs text-neutral-500 space-y-1">
              <p>No rules recorded yet.</p>
              <p className="text-[11px] text-neutral-600">
                Load sample results or paste writing samples in the Brand Voice panel to extract rules.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Version History Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-medium text-white">Version Timeline</h3>
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              v{currentVersion} current
            </span>
          </div>

          <div className="space-y-3">
            {/* Current Active Version Card */}
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                  Version {currentVersion} (Active)
                </span>
                <span className="text-[10px] text-indigo-400">active</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                {brain?.voice?.summary || 'Standard direct founder voice.'}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono pt-1">
                <span>{brain?.rules?.length || 0} rules</span>
                <span>•</span>
                <span>
                  {brain?.weights?.hook_multipliers
                    ? `${Object.keys(brain.weights.hook_multipliers).length} hook weights`
                    : 'raw'}
                </span>
              </div>
            </div>

            {/* Historical Versions */}
            {historyItems.length > 0 ? (
              <div className="space-y-2 pt-2">
                {historyItems
                  .slice()
                  .reverse()
                  .map((hist) => (
                    <button
                      key={hist.version}
                      type="button"
                      onClick={() => setSelectedHistoryVersion(hist.version)}
                      className="w-full text-left rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-3 hover:border-neutral-700 hover:bg-neutral-900/40 transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-300 font-medium group-hover:text-white">
                          v{hist.version}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(hist.at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-1">
                        {hist.explanation || hist.voiceSnapshot?.summary || 'Historical state.'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                        <span>{hist.rules.length} rules</span>
                        <span className="text-indigo-400 group-hover:underline">Click to view snapshot →</span>
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-4 italic">
                Past versions will appear here as your Brand Brain learns.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Posted Results Table / Logged Telemetry */}
      {postedResults.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-800/80 bg-neutral-950/40 p-8 text-center space-y-3">
          <div className="h-10 w-10 rounded-2xl bg-neutral-900 border border-neutral-800 mx-auto flex items-center justify-center">
            <Database className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-300">No Audience Telemetry Logged Yet</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
              Click &ldquo;Load sample results&rdquo; above or log performance results on clip cards to begin training your Brand Brain.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadSamples}
            className="rounded-xl border-neutral-800 bg-neutral-900/80 text-xs text-neutral-300 hover:text-white"
          >
            <Database className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
            Load 12 Sample Results
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-neutral-400" />
                Raw Performance Telemetry Logs ({postedResults.length})
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Logged audience metrics used to derive hook & duration multipliers
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-[11px]">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Platform</th>
                  <th className="pb-2">Hook</th>
                  <th className="pb-2">Length</th>
                  <th className="pb-2">Views</th>
                  <th className="pb-2">Retention</th>
                  <th className="pb-2">Engagement</th>
                  <th className="pb-2">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-300">
                {postedResults.map((post) => (
                  <tr key={post.id} className="hover:bg-neutral-900/30">
                    <td className="py-2.5 font-sans font-medium text-neutral-200 max-w-xs truncate">
                      {post.title}
                    </td>
                    <td className="py-2.5 capitalize">{post.platform.replace('_', ' ')}</td>
                    <td className="py-2.5 capitalize text-indigo-300">{post.hook_type}</td>
                    <td className="py-2.5">{post.duration_bucket}</td>
                    <td className="py-2.5">{post.views.toLocaleString()}</td>
                    <td className="py-2.5 text-emerald-400 font-semibold">{post.retention_pct}%</td>
                    <td className="py-2.5 text-neutral-400">
                      {post.likes}L / {post.shares}S
                    </td>
                    <td className="py-2.5">
                      {post.isSample ? (
                        <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[9px]">
                          sample
                        </span>
                      ) : (
                        <span className="rounded bg-neutral-800 text-neutral-300 px-1.5 py-0.5 text-[9px]">
                          real
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Snapshot Inspector Modal */}
      {selectedHistoryVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-400" />
                Snapshot: Version {selectedHistoryVersion}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedHistoryVersion(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {(() => {
              const hist = historyItems.find((h) => h.version === selectedHistoryVersion);
              if (!hist) return <p className="text-neutral-500">Version not found.</p>;
              return (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">Archived At</span>
                    <p className="text-neutral-300 font-mono">{new Date(hist.at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">Voice Summary</span>
                    <p className="text-neutral-200 leading-relaxed">{hist.voiceSnapshot.summary}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">Rules at this Version ({hist.rules.length})</span>
                    <ul className="mt-1 space-y-1.5 text-neutral-300 list-disc list-inside">
                      {hist.rules.map((r) => (
                        <li key={r.id} className="text-neutral-200">
                          <span className="font-medium">{r.text}</span>
                          {r.evidence && (
                            <span className="block text-[10px] text-neutral-500 italic font-mono pl-4">
                              receipt: {r.evidence}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {onSelectHistoricalVersion && (
                    <Button
                      onClick={() => {
                        onSelectHistoricalVersion(hist.version);
                        setSelectedHistoryVersion(null);
                      }}
                      className="w-full rounded-xl bg-white text-black hover:bg-neutral-200 h-9 text-xs font-semibold mt-3"
                    >
                      Restore Version {hist.version} as Active
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
