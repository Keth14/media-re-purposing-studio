import React from 'react';

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
      <div className="h-1.5 w-full bg-neutral-800/80 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

