import React from 'react';
import { motion } from 'framer-motion';

interface ScoreBarProps {
  label: string;
  score: number;
  color?: string;
}

export function ScoreBar({ label, score, color = 'bg-indigo-500' }: ScoreBarProps) {
  const percentage = Math.min(100, Math.max(0, score));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-400 font-medium">{label}</span>
        <span className="font-mono text-neutral-200 font-semibold">{percentage}</span>
      </div>
      <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}
