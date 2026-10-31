import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { Clip, Platform, PostedResult } from '@/types';
import { savePostedResult, getDurationBucket } from '@/lib/tracker';
import { Button } from '@/components/ui/button';

interface LogResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: Clip;
  rank: number;
  onResultLogged: (newResult: PostedResult) => void;
}

export function LogResultModal({
  isOpen,
  onClose,
  clip,
  rank,
  onResultLogged,
}: LogResultModalProps) {
  const duration = Math.max(1, clip.end_sec - clip.start_sec);
  const bucket = getDurationBucket(duration);

  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [views, setViews] = useState<string>('5000');
  const [retentionPct, setRetentionPct] = useState<string>('65');
  const [likes, setLikes] = useState<string>('250');
  const [shares, setShares] = useState<string>('30');
  const [topicTag, setTopicTag] = useState<string>('Strategy');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedViews = Math.max(0, parseInt(views, 10) || 0);
    const parsedRetention = Math.min(100, Math.max(0, parseInt(retentionPct, 10) || 0));
    const parsedLikes = Math.max(0, parseInt(likes, 10) || 0);
    const parsedShares = Math.max(0, parseInt(shares, 10) || 0);

    const result = savePostedResult({
      clip_id: clip.id || `clip-${rank}-${clip.start_sec}-${clip.end_sec}`,
      title: clip.title,
      hook_type: clip.hook_type,
      duration_bucket: bucket,
      duration_sec: duration,
      platform,
      topic_tag: topicTag || 'General',
      original_rank: rank,
      views: parsedViews,
      retention_pct: parsedRetention,
      likes: parsedLikes,
      shares: parsedShares,
      isSample: false,
    });

    onResultLogged(result);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Log Performance Result</h3>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">{clip.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Clip Attributes Summary */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-neutral-300">
                Hook: {clip.hook_type}
              </span>
              <span className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-neutral-300">
                Duration: {bucket} ({duration}s)
              </span>
              <span className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-neutral-400">
                Rank #{rank}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Posted Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube_shorts">YouTube Shorts</option>
                  <option value="instagram_reels">Instagram Reels</option>
                  <option value="x">X (Twitter)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Total Views
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Avg Retention % (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={retentionPct}
                    onChange={(e) => setRetentionPct(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Shares / Reposts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Topic / Angle Tag
                </label>
                <input
                  type="text"
                  value={topicTag}
                  onChange={(e) => setTopicTag(e.target.value)}
                  placeholder="e.g. Founder, Landing Page, Growth"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={success}
                  className="w-full rounded-xl bg-white text-black hover:bg-neutral-200 h-10 text-xs font-semibold tracking-wide transition-all"
                >
                  {success ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Result Logged!
                    </span>
                  ) : (
                    <span>Save to Brand Brain Tracker</span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
