import { BrainState, BrainVoice, BrainRule, BrainWeights } from '@/types';

const STORAGE_KEY = 'brandbrain_state_v1';

export const SAMPLE_VOICE: BrainVoice = {
  summary:
    'Direct, punchy builder voice that cuts through corporate fluff with crisp first-principles takes, clear frameworks, and dry pragmatic humor.',
  traits: [
    'Radically Direct & Anti-Fluff',
    'Opinionated & Contrarian',
    'Actionable & Tactical',
    'High Velocity',
  ],
  sentenceStyle:
    'Short, punchy sentences. High density of information. One thought per line with aggressive paragraph breaks.',
  vocabulary: [
    'signal vs noise',
    'first-principles',
    'playbook',
    'leverage',
    'zero-to-one',
    'frictionless',
    'unfiltered',
  ],
  emojiUsage:
    'Minimal. Strictly used as functional bullets (⚡, 🎯, 💡), never as decorative filler.',
  signaturePhrases: [
    'Here is the unfiltered truth:',
    'Most people optimize for the wrong metric.',
    'Kill the vanity metrics.',
    'Simple scales, complex fails.',
  ],
  avoid: [
    'thrilled to announce',
    'game-changer',
    'synergy',
    'deep dive',
    'hope this helps',
    'revolutionary',
  ],
};

export const SAMPLE_RULES: BrainRule[] = [
  {
    id: 'rule-sample-1',
    text: 'Lead with a sharp, contrarian stance that subverts consensus.',
    evidence: '"Most founders build 10 features when 1 killer workflow is all users care about."',
    source: 'sample',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-sample-2',
    text: 'Ban all corporate PR fluff and vague marketing jargon.',
    evidence: '"Never say synergy or revolutionary — explain the exact measurable outcome."',
    source: 'sample',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-sample-3',
    text: 'Structure insights in short, digestible lines with single-line rhythm.',
    evidence: '"Line 1 hooks. Line 2 proves. Line 3 gives the actionable takeaway."',
    source: 'sample',
    createdAt: new Date().toISOString(),
  },
];

export function getBrain(): BrainState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrainState;
  } catch (err) {
    console.error('Failed to read brand brain from localStorage:', err);
    return null;
  }
}

export function saveBrain(
  newVoice: BrainVoice,
  newRules: BrainRule[] = [],
  isSample = false,
  weights?: BrainWeights,
  explanation?: string
): BrainState {
  if (typeof window === 'undefined') {
    return {
      version: 1,
      voice: newVoice,
      rules: newRules,
      weights,
      history: [],
      isSample,
    };
  }

  try {
    const current = getBrain();
    const now = new Date().toISOString();

    if (!current) {
      const initial: BrainState = {
        version: 1,
        voice: newVoice,
        rules: newRules,
        weights,
        history: [],
        isSample,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    // Bump version and push snapshot of old state into history
    const updated: BrainState = {
      version: current.version + 1,
      voice: newVoice,
      rules: newRules.length > 0 ? newRules : current.rules,
      weights: weights || current.weights,
      history: [
        ...current.history,
        {
          version: current.version,
          at: now,
          voiceSnapshot: current.voice,
          rules: current.rules,
          weights: current.weights,
          explanation: explanation || 'Updated brand voice and rules.',
        },
      ],
      isSample,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save brand brain to localStorage:', err);
    return {
      version: 1,
      voice: newVoice,
      rules: newRules,
      weights,
      history: [],
      isSample,
    };
  }
}

export function restoreBrainVersion(versionNumber: number): BrainState | null {
  const current = getBrain();
  if (!current) return null;

  if (current.version === versionNumber) return current;

  const historical = current.history.find((h) => h.version === versionNumber);
  if (!historical) return null;

  return saveBrain(
    historical.voiceSnapshot,
    historical.rules,
    false,
    historical.weights,
    `Restored from historical version v${versionNumber}`
  );
}

export function loadSampleBrain(): BrainState {
  return saveBrain(SAMPLE_VOICE, SAMPLE_RULES, true);
}

export function clearBrain(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear brand brain from localStorage:', err);
  }
}

