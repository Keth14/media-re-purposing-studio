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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 shadow-2xl shadow-indigo-950/20 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-neutral-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10">
                  <Brain className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-light text-white">Brand Brain Evolution</h2>
                    <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-mono text-indigo-300">
                      v{diffData.fromVersion} <ArrowRight className="h-3 w-3" /> v{diffData.toVersion}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    What changed after ingesting real audience performance data
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Explanation Banner */}
            <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-indigo-200 leading-relaxed space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold block">
                Executive Synthesis
              </span>
              <p>{diffData.explanation}</p>
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
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider">
                    <PlusCircle className="h-4 w-4" />
                    <span>Rules Added ({diffData.addedRules.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {diffData.addedRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5"
                      >
                        <p className="text-neutral-100 font-medium">{rule.text}</p>
                        <div className="flex items-start gap-1.5 text-[11px] text-emerald-300/80 font-mono italic">
                          <Quote className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
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
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Rules Refined ({diffData.changedRules.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {diffData.changedRules.map((change, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase">Old:</span>
                          <p className="text-neutral-400 line-through">{change.oldText}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-amber-400 uppercase">New:</span>
                          <p className="text-neutral-100 font-medium">{change.newText}</p>
                        </div>
                        <p className="text-[11px] text-amber-300/80 font-mono italic">
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
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-xs uppercase tracking-wider">
                    <MinusCircle className="h-4 w-4" />
                    <span>Rules Deprecated ({diffData.removedRules.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {diffData.removedRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1 text-rose-300"
                      >
                        <p className="line-through">{rule.text}</p>
                        <p className="text-[11px] text-rose-400/80 font-mono">
                          Reason: {rule.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Clip Reordering List */}
              {diffData.reorderedClips && diffData.reorderedClips.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3 pt-3 border-t border-neutral-900">
                  <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs uppercase tracking-wider">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                    <span>Clip Reranking Impact</span>
                  </div>
                  <div className="space-y-2">
                    {diffData.reorderedClips.map((clip, idx) => {
                      const movedUp = clip.newRank < clip.oldRank;
                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3"
                        >
                          <div className="space-y-0.5">
                            <p className="text-neutral-200 font-medium truncate max-w-md">
                              {clip.title}
                            </p>
                            <p className="text-[11px] text-neutral-400 font-mono">
                              {clip.reason}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold ${
                                movedUp
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                  : 'bg-neutral-800 text-neutral-400'
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
                className="rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-medium px-5 h-9"
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
