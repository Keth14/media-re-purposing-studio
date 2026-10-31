import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Quote,
  Shield,
  Layers,
  HelpCircle,
  FileText,
  Trash2,
  Mic,
  Send,
} from 'lucide-react';
import { BrainState, BrainVoice, BrainRule } from '@/types';
import { saveBrain, loadSampleBrain, clearBrain } from '@/lib/brain';
import { Button } from '@/components/ui/button';

interface BrandVoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
  brain: BrainState | null;
  onBrainUpdate: (newBrain: BrainState | null) => void;
}

export function BrandVoicePanel({
  isOpen,
  onClose,
  brain,
  onBrainUpdate,
}: BrandVoicePanelProps) {
  const [samples, setSamples] = useState<string>('');
  const [learning, setLearning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dictatedFeedback, setDictatedFeedback] = useState<string>('');
  const [submittingDictation, setSubmittingDictation] = useState<boolean>(false);

  const handleDictateFeedback = async () => {
    if (!dictatedFeedback.trim()) return;

    setSubmittingDictation(true);
    setError(null);

    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dictated_feedback: dictatedFeedback.trim(),
          currentBrain: brain,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record dictated rule.');
      }

      const newRule: BrainRule = data.new_rule;
      const currentRules = brain?.rules || [];
      const updatedRules = [newRule, ...currentRules];

      const currentVoice = brain?.voice || {
        summary: 'Direct, practical, no-fluff builder voice.',
        traits: ['Pragmatic', 'Direct', 'High-signal'],
        sentenceStyle: 'Short, punchy sentences.',
        vocabulary: ['signal', 'ship', 'retention'],
        emojiUsage: 'rare',
        signaturePhrases: [],
        avoid: ['fluff', 'buzzwords'],
      };

      const updatedBrain = saveBrain(
        currentVoice,
        updatedRules,
        false,
        brain?.weights,
        `Added creator dictated rule: "${dictatedFeedback.trim()}"`
      );

      onBrainUpdate(updatedBrain);
      setDictatedFeedback('');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error submitting dictated feedback.');
    } finally {
      setSubmittingDictation(false);
    }
  };

  const handleLearnVoice = async () => {
    if (!samples.trim()) {
      setError('Please paste writing or speaking samples first.');
      return;
    }

    setLearning(true);
    setError(null);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples: samples.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract brand voice.');
      }

      const updatedBrain = saveBrain(data.voice, data.rules, false);
      onBrainUpdate(updatedBrain);
      setSamples('');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error learning brand voice.');
    } finally {
      setLearning(false);
    }
  };

  const handleLoadSample = () => {
    setError(null);
    const sampleBrain = loadSampleBrain();
    onBrainUpdate(sampleBrain);
  };

  const handleClear = () => {
    clearBrain();
    onBrainUpdate(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-out Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-neutral-800 bg-neutral-950 p-6 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                  <Brain className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-white flex items-center gap-2">
                    Brand Voice Brain
                    {brain && (
                      <span className="rounded-md border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400">
                        v{brain.version}
                      </span>
                    )}
                    {brain?.isSample && (
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                        sample
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Your persistent writing DNA & stylistic guidelines
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input Section */}
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Paste 3-5 samples of how you write or talk (posts, captions, a dictated rant)
                </label>
                <textarea
                  rows={5}
                  value={samples}
                  onChange={(e) => setSamples(e.target.value)}
                  placeholder="Paste your unedited writing samples or dictation transcripts here..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 p-3.5 text-xs text-neutral-200 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 font-mono transition-all leading-relaxed"
                />
                <p className="text-[11px] text-neutral-400 italic flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3 text-indigo-400 shrink-0" />
                  Tip: dictate with Wispr, your spoken words are your real voice.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLearnVoice}
                  disabled={learning || !samples.trim()}
                  className="flex-1 rounded-xl bg-white text-black hover:bg-neutral-200 h-10 text-xs font-semibold tracking-wide disabled:opacity-50"
                >
                  {learning ? (
                    <>
                      <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Analyzing Voice...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Learn my voice
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLoadSample}
                  className="rounded-xl border-neutral-800 bg-neutral-900/60 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white h-10 px-3"
                >
                  Use sample voice
                </Button>

                {brain && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Reset Brand Voice"
                    className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-500 hover:text-rose-400 hover:border-rose-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dictate Feedback & Manual Directives */}
              <div className="pt-4 border-t border-neutral-800/80 space-y-3">
                {/* Mic hint */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300 flex items-start gap-2.5">
                  <Mic className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">Press your Wispr hotkey and speak.</p>
                    <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                      Your spoken words train your voice.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5 text-indigo-400" />
                      Dictate feedback
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">Press Enter to add</span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={2}
                      value={dictatedFeedback}
                      onChange={(e) => setDictatedFeedback(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleDictateFeedback();
                        }
                      }}
                      placeholder="Dictate feedback or styling notes... e.g. 'punchier hooks, drop emojis' (Press Enter)"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 font-mono transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={handleDictateFeedback}
                      disabled={submittingDictation || !dictatedFeedback.trim()}
                      className="absolute right-2.5 bottom-3 rounded-lg bg-white text-black p-1.5 hover:bg-neutral-200 disabled:opacity-40 transition-all"
                      title="Send dictated rule"
                    >
                      {submittingDictation ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Example Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-neutral-500 font-mono">Example chips:</span>
                    {['punchier hooks', 'drop emojis', 'more contrarian', 'cut corporate jargon'].map(
                      (chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setDictatedFeedback(chip)}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-indigo-500/40 hover:text-white transition-colors font-mono"
                        >
                          +{chip}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Display Active Voice */}
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Active Voice Profile
                </h3>
                {brain?.history && brain.history.length > 0 && (
                  <span className="text-[10px] font-mono text-neutral-500">
                    {brain.history.length} previous version{brain.history.length > 1 ? 's' : ''} saved
                  </span>
                )}
              </div>

              {brain ? (
                <div className="space-y-5 text-xs">
                  {/* Summary */}
                  <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                      Voice Synthesis
                    </span>
                    <p className="text-neutral-200 leading-relaxed font-normal">
                      {brain.voice.summary}
                    </p>
                  </div>

                  {/* Traits Chips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                      Core Traits
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {brain.voice.traits.map((trait, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300 font-medium"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sentence Style & Emoji */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/30 p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        Sentence Style
                      </span>
                      <p className="text-neutral-300 text-[11px] leading-relaxed">
                        {brain.voice.sentenceStyle}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/30 p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        Emoji Usage
                      </span>
                      <p className="text-neutral-300 text-[11px] leading-relaxed">
                        {brain.voice.emojiUsage}
                      </p>
                    </div>
                  </div>

                  {/* Vocabulary Chips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                      Preferred Vocabulary
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {brain.voice.vocabulary.map((word, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] font-mono text-neutral-300"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Signature Phrases */}
                  {brain.voice.signaturePhrases.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        Signature Phrases
                      </span>
                      <div className="space-y-1.5">
                        {brain.voice.signaturePhrases.map((phrase, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-neutral-800/60 bg-neutral-900/20 px-3 py-1.5 text-xs text-neutral-300 italic"
                          >
                            &ldquo;{phrase}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Avoid List */}
                  {brain.voice.avoid.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500/80">
                        Things to Avoid
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {brain.voice.avoid.map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-rose-950/60 bg-rose-950/20 px-2 py-0.5 text-[11px] font-mono text-rose-400"
                          >
                            ✕ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rules with Evidence Citations */}
                  {brain.rules.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-neutral-900">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-emerald-400" />
                        Evidence-Backed Writing Rules
                      </span>
                      <div className="space-y-2.5">
                        {brain.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-neutral-200 font-medium text-xs leading-snug">
                                {rule.text}
                              </p>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-mono shrink-0 ${
                                  rule.source === 'dictated'
                                    ? 'bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300'
                                    : rule.source === 'feedback_loop'
                                    ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {rule.source}
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5 text-[11px] text-neutral-400 italic">
                              <Quote className="h-3 w-3 text-neutral-600 shrink-0 mt-0.5" />
                              <p className="text-neutral-400">
                                Citation: <span className="text-neutral-300 font-mono">{rule.evidence}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center space-y-2">
                  <p className="text-neutral-400 text-xs">
                    No custom brand voice learned yet.
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    Paste writing samples above or click &ldquo;Use sample voice&rdquo; to load the default founder voice.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

