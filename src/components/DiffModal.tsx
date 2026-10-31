import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  ArrowRight,
  PlusCircle,
  AlertTriangle,
  MinusCircle,
  TrendingUp,
  Brain,
  CheckCircle2,
  Quote,
  Shield,
  Layers,
  Sliders,
  Check,
} from 'lucide-react';
import { DiffViewData, BrainState } from '@/types';
import { Button } from '@/components/ui/button';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffData: DiffViewData | null;
  oldBrain: BrainState | null;
  newBrain: BrainState | null;
}

export function DiffModal({
  isOpen,
  onClose,
  diffData,
  oldBrain,
  newBrain,
}: DiffModalProps) {
  if (!diffData) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* Full-Screen Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 shadow-2xl shadow-indigo-950/30 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-neutral-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10">
                  <Brain className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight">
                      What Changed: Brand Brain Evolution
                    </h2>
                    <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-mono text-indigo-300">
                      v{diffData.fromVersion} <ArrowRight className="h-3 w-3" /> v{diffData.toVersion}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Empirical before/after snapshot comparing baseline vs updated intelligence
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Explanation Synthesis Banner */}
            <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-200 leading-relaxed space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
                Executive Synthesis
              </span>
              <p className="text-neutral-200">{diffData.explanation}</p>
            </div>

            {/* Side-by-Side: Left = brain v(N), Right = brain v(N+1) */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: brain v(N) */}
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2">
                  <span className="font-mono text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-neutral-500" />
                    Left: Brain v{diffData.fromVersion} (Previous)
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">baseline</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                    Voice Summary
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {oldBrain?.voice?.summary || 'Direct founder voice baseline.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                    Traits
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(oldBrain?.voice?.traits || ['Direct', 'Practical']).map((t, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-400 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-neutral-800/40">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>Rules at v{diffData.fromVersion}</span>
                    <span>{oldBrain?.rules?.length || 0} rules</span>
                  </div>
                </div>
              </div>

              {/* Right Column: brain v(N+1) */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                  <span className="font-mono text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    Right: Brain v{diffData.toVersion} (Updated)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">learned</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">
                    Refined Voice Summary
                  </span>
                  <p className="text-xs text-neutral-100 leading-relaxed">
                    {newBrain?.voice?.summary || oldBrain?.voice?.summary}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">
                    Updated Traits & Directives
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(newBrain?.voice?.traits || []).map((t, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-200 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-indigo-500/20">
                  <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                    <span>Active Rules at v{diffData.toVersion}</span>
                    <span className="font-bold text-white">{newBrain?.rules?.length || 0} rules</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Staggered Diff Sections */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mt-6 space-y-6 text-xs"
            >
              {/* Rules Added (Green) */}
              {diffData.addedRules.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold">
                    <PlusCircle className="h-4 w-4 text-emerald-400" />
                    <span>Rules Added in Green ({diffData.addedRules.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {diffData.addedRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-neutral-100 font-medium text-sm leading-snug">{rule.text}</p>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400 shrink-0">
                            +new rule
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[11px] text-emerald-300/90 font-mono italic bg-black/40 rounded-xl p-2.5 border border-emerald-900/30">
                          <Quote className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Learned because: {rule.evidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Rules Changed (Amber) */}
              {diffData.changedRules.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>Rules Refined in Amber ({diffData.changedRules.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {diffData.changedRules.map((change, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase">Old:</span>
                          <p className="text-neutral-400 line-through">{change.oldText}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">New:</span>
                          <p className="text-neutral-100 font-medium">{change.newText}</p>
                        </div>
                        <p className="text-[11px] text-amber-300/90 font-mono italic">
                          Reason: {change.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Rules Removed (Red) */}
              {diffData.removedRules.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-xs uppercase tracking-wider font-semibold">
                    <MinusCircle className="h-4 w-4 text-rose-400" />
                    <span>Rules Deprecated in Red ({diffData.removedRules.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {diffData.removedRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-1.5 text-rose-300"
                      >
                        <p className="line-through text-neutral-300">{rule.text}</p>
                        <p className="text-[11px] text-rose-400 font-mono">
                          Reason: {rule.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Voice Changes */}
              {diffData.voiceChanges && diffData.voiceChanges.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs uppercase tracking-wider font-semibold">
                    <Sliders className="h-4 w-4 text-indigo-400" />
                    <span>Voice Changes</span>
                  </div>
                  <div className="space-y-2">
                    {diffData.voiceChanges.map((vc, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <span className="font-mono text-neutral-400 uppercase text-[10px]">{vc.field}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-neutral-500 line-through">{vc.from}</span>
                          <ArrowRight className="h-3 w-3 text-neutral-500 shrink-0" />
                          <span className="text-indigo-300 font-medium">{vc.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Clip Reordering List (e.g. #4 -> #1 because question hooks lift +42% (n=5)) */}
              {diffData.reorderedClips && diffData.reorderedClips.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3 pt-3 border-t border-neutral-900">
                  <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs uppercase tracking-wider font-semibold">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                    <span>Clip Reranking Impact</span>
                  </div>
                  <div className="space-y-2">
                    {diffData.reorderedClips.map((clip, idx) => {
                      const movedUp = clip.newRank < clip.oldRank;
                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3.5 hover:border-neutral-700 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <p className="text-neutral-200 font-medium truncate max-w-md">
                              {clip.title}
                            </p>
                            <p className="text-[11px] text-neutral-400 font-mono">
                              {clip.reason}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`rounded-xl px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 ${
                                movedUp
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              }`}
                            >
                              #{clip.oldRank} <ArrowRight className="inline h-3 w-3" /> #{clip.newRank}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-neutral-800/80 flex items-center justify-end">
              <Button
                onClick={onClose}
                className="rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold px-6 h-10 shadow-lg shadow-white/5 transition-all"
              >
                Apply Changes & Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
