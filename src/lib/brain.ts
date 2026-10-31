import { BrainState, BrainVoice, BrainRule, BrainWeights, BrainHistoryItem, PostedResult, ExportedBrain } from '@/types';
import { loadSampleResults, savePostedResultsRaw } from '@/lib/tracker';

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

/**
 * Prebuilt Sample Brain at version 3 with full history:
 * - v1 raw (initial profile)
 * - v2 after first learning (+28% question lift)
 * - v3 after second learning (5 rules with evidence and numbers)
 * Every item labeled "sample"
 */
export const DEMO_BRAIN: BrainState = {
  version: 3,
  isSample: true,
  voice: SAMPLE_VOICE,
  weights: {
    hook_multipliers: {
      question: 1.22,
      contrarian: 1.28,
      'bold claim': 1.05,
      story: 0.80,
      stat: 1.02,
    },
    duration_multipliers: {
      'under 25s': 1.22,
      '25-40s': 1.0,
      'over 40s': 0.78,
    },
  },
  rules: [
    {
      id: 'demo-rule-1',
      text: 'Lead with contrarian tension: contrarian hooks outperform average retention by +34%.',
      evidence: 'Stop Building 10 Features For Your MVP generated 11.2k views with 82% avg retention (n=4, 82% vs 61% baseline).',
      source: 'sample',
      createdAt: '2026-10-29T10:00:00.000Z',
    },
    {
      id: 'demo-rule-2',
      text: 'Ask urgent, specific questions in the first 3 seconds: question hooks yield +28% performance lift.',
      evidence: 'Why Do Most Landing Pages Fail In 3 Seconds? drove 78% retention and 460 likes across 5 tracked posts.',
      source: 'sample',
      createdAt: '2026-10-29T11:30:00.000Z',
    },
    {
      id: 'demo-rule-3',
      text: 'Cap clip duration under 25 seconds: sub-25s clips beat 40s+ clips with a +22% higher completion rate.',
      evidence: 'Sub-25s clips averaged 78% retention vs 54% on 40s+ clips across 7 sample posts.',
      source: 'sample',
      createdAt: '2026-10-30T09:15:00.000Z',
    },
    {
      id: 'demo-rule-4',
      text: 'Prioritize LinkedIn over X: LinkedIn distribution achieved a +41% higher engagement ratio.',
      evidence: 'LinkedIn posts averaged 510 likes and 69 shares vs 180 likes on X (n=8 vs n=4 sample posts).',
      source: 'sample',
      createdAt: '2026-10-30T14:45:00.000Z',
    },
    {
      id: 'demo-rule-5',
      text: 'Eliminate decorative adjectives and corporate jargon: direct frameworks lifted shares by +35%.',
      evidence: 'Simple Scales, Complex Fails drove 39 shares with zero buzzwords; fluff-free scripts beat baseline by +35%.',
      source: 'sample',
      createdAt: '2026-10-31T08:00:00.000Z',
    },
  ],
  history: [
    {
      version: 1,
      at: '2026-10-28T09:00:00.000Z',
      voiceSnapshot: {
        summary: 'Direct founder voice baseline extracted from raw writing samples.',
        traits: ['Direct', 'Tactical', 'Founder-led'],
        sentenceStyle: 'Standard conversational founder prose.',
        vocabulary: ['playbook', 'framework', 'scale'],
        emojiUsage: 'Minimal',
        signaturePhrases: ['Focus on execution.'],
        avoid: ['synergy', 'game-changer'],
      },
      rules: [
        {
          id: 'demo-raw-1',
          text: 'Focus on tactical execution over broad business theory.',
          evidence: 'Raw creator writing sample from podcast episode #12.',
          source: 'sample',
          createdAt: '2026-10-28T09:00:00.000Z',
        },
      ],
      weights: {
        hook_multipliers: {},
        duration_multipliers: {},
      },
      explanation: 'v1 raw: initial brand voice profile initialized from founder transcripts.',
    },
    {
      version: 2,
      at: '2026-10-29T16:00:00.000Z',
      voiceSnapshot: {
        summary: 'Direct, punchy builder voice that cuts through corporate fluff with crisp first-principles takes.',
        traits: ['Radically Direct & Anti-Fluff', 'Opinionated & Contrarian', 'Actionable & Tactical'],
        sentenceStyle: 'Short, punchy sentences. High density.',
        vocabulary: ['signal vs noise', 'first-principles', 'zero-to-one'],
        emojiUsage: 'Minimal functional bullets',
        signaturePhrases: ['Here is the unfiltered truth:', 'Simple scales, complex fails.'],
        avoid: ['thrilled to announce', 'game-changer', 'synergy'],
      },
      rules: [
        {
          id: 'demo-rule-1',
          text: 'Lead with contrarian tension: contrarian hooks outperform average retention by +34%.',
          evidence: 'Stop Building 10 Features For Your MVP generated 11.2k views with 82% avg retention (n=4, 82% vs 61% baseline).',
          source: 'sample',
          createdAt: '2026-10-29T10:00:00.000Z',
        },
        {
          id: 'demo-rule-2',
          text: 'Ask urgent, specific questions in the first 3 seconds: question hooks yield +28% performance lift.',
          evidence: 'Why Do Most Landing Pages Fail In 3 Seconds? drove 78% retention and 460 likes across 5 tracked posts.',
          source: 'sample',
          createdAt: '2026-10-29T11:30:00.000Z',
        },
        {
          id: 'demo-rule-3',
          text: 'Cap clip duration under 25 seconds: sub-25s clips beat 40s+ clips with a +22% higher completion rate.',
          evidence: 'Sub-25s clips averaged 78% retention vs 54% on 40s+ clips across 7 sample posts.',
          source: 'sample',
          createdAt: '2026-10-30T09:15:00.000Z',
        },
      ],
      weights: {
        hook_multipliers: {
          question: 1.15,
          contrarian: 1.20,
          'bold claim': 1.05,
          story: 0.85,
        },
        duration_multipliers: {
          'under 25s': 1.15,
          '25-40s': 1.0,
          'over 40s': 0.85,
        },
      },
      explanation: 'v2 after first learning: identified strong lift for question (+28%) and contrarian (+34%) hooks.',
    },
  ],
};

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

export function setBrainRaw(brain: BrainState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brain));
  } catch (err) {
    console.error('Failed to save raw brain:', err);
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

/**
 * Loads the prebuilt Demo Brain (v3) along with 12 sample results
 */
export function loadDemoBrain(): { brain: BrainState; results: PostedResult[] } {
  const brain = DEMO_BRAIN;
  const results = loadSampleResults();
  setBrainRaw(brain);
  return { brain, results };
}

export function clearBrain(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear brand brain from localStorage:', err);
  }
}

/**
 * Validates the shape of imported brain JSON
 */
export function validateBrainShape(data: unknown): {
  valid: boolean;
  error?: string;
  brain?: BrainState;
  results?: PostedResult[];
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Imported file is not a valid JSON object.' };
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number' || isNaN(obj.version)) {
    return { valid: false, error: 'Missing or invalid "version" number in brain.json.' };
  }

  if (!obj.voice || typeof obj.voice !== 'object') {
    return { valid: false, error: 'Missing or invalid "voice" object in brain.json.' };
  }
  const voice = obj.voice as Record<string, unknown>;
  if (typeof voice.summary !== 'string' || !Array.isArray(voice.traits)) {
    return {
      valid: false,
      error: 'Voice object must contain a "summary" string and a "traits" array.',
    };
  }

  if (!Array.isArray(obj.rules)) {
    return { valid: false, error: 'Missing or invalid "rules" array in brain.json.' };
  }

  for (let i = 0; i < obj.rules.length; i++) {
    const r = obj.rules[i];
    if (!r || typeof r !== 'object' || typeof (r as Record<string, unknown>).text !== 'string') {
      return { valid: false, error: `Rule at index ${i} is invalid (must have a "text" string).` };
    }
  }

  if (!Array.isArray(obj.history)) {
    return { valid: false, error: 'Missing or invalid "history" array in brain.json.' };
  }

  const results: PostedResult[] = Array.isArray(obj.results)
    ? (obj.results as PostedResult[])
    : [];

  const brain: BrainState = {
    version: obj.version,
    voice: obj.voice as BrainVoice,
    rules: obj.rules as BrainRule[],
    weights: (obj.weights as BrainWeights) || undefined,
    history: obj.history as BrainHistoryItem[],
    isSample: Boolean(obj.isSample),
  };

  return { valid: true, brain, results };
}

/**
 * Exports the brain and posted results to a downloadable brain.json file
 */
export function exportBrain(brain: BrainState | null, results: PostedResult[]): void {
  const exportPayload: ExportedBrain = {
    version: brain?.version || 1,
    voice: brain?.voice || SAMPLE_VOICE,
    rules: brain?.rules || [],
    history: brain?.history || [],
    results: results || [],
    weights: brain?.weights,
    isSample: Boolean(brain?.isSample),
    exportedAt: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brain.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

