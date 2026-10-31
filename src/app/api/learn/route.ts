import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { checkRateLimit, recordRateLimitSuccess } from '@/lib/rate-limiter';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';
import { calculateMultiplier } from '@/lib/stats';
import { BrainVoice, BrainRule, BrainWeights, ComputedStats, HookType, DurationBucket } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractNumbersFromString(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map((m) => Math.abs(parseFloat(m)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check for dictated creator feedback
    if (body.dictated_feedback || body.dictated_rule) {
      const rawText = String(body.dictated_feedback || body.dictated_rule).trim();
      if (!rawText) {
        return NextResponse.json(
          { success: false, error: 'Dictated feedback text is required.' },
          { status: 400 }
        );
      }

      const newRule: BrainRule = {
        id: `rule-dictated-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: rawText,
        evidence: `Direct creator dictate: "${rawText}"`,
        source: 'dictated',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        new_rule: newRule,
        new_rules: [newRule],
        source: 'dictated',
        explanation: `Creator dictated directive added: "${rawText}"`,
      });
    }

    const { stats, currentBrain } = body as {
      stats: ComputedStats;
      currentBrain: { voice: BrainVoice; rules: BrainRule[]; version: number; weights?: BrainWeights };
    };

    if (!stats || !stats.totalPosts || stats.totalPosts < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Need at least 2 logged posts to analyze performance patterns and update Brand Brain.',
        },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateLimit = checkRateLimit(req);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimit.error },
        { status: 429 }
      );
    }

    const apiKey = getSanitizedApiKey(process.env.GEMINI_API_KEY);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured in .env.local.' },
        { status: 401 }
      );
    }

    const modelName = getGeminiModel();
    const ai = new GoogleGenAI({ apiKey });

    // Format stats table for LLM
    const hookSummary = Object.entries(stats.hookStats)
      .map(([k, s]) => `- ${k} hook: count=${s.count}, meanScore=${s.meanScore}, lift=${s.lift > 0 ? '+' : ''}${s.lift}%, status=${s.status}`)
      .join('\n');

    const durationSummary = Object.entries(stats.durationStats)
      .map(([k, s]) => `- ${k}: count=${s.count}, meanScore=${s.meanScore}, lift=${s.lift > 0 ? '+' : ''}${s.lift}%, status=${s.status}`)
      .join('\n');

    const platformSummary = Object.entries(stats.platformStats)
      .map(([k, s]) => `- ${s.label}: count=${s.count}, meanScore=${s.meanScore}, lift=${s.lift > 0 ? '+' : ''}${s.lift}%, status=${s.status}`)
      .join('\n');

    const currentRulesText = (currentBrain?.rules || [])
      .map((r, i) => `${i + 1}. [ID: ${r.id}] "${r.text}" (Evidence: ${r.evidence})`)
      .join('\n');

    const systemPrompt = `You are an elite quantitative content strategist and algorithmic auditor.
You analyze empirical audience retention data to update the creator's persistent Brand Brain.

CRITICAL INSTRUCTIONS:
1. Every new rule MUST quote real numbers directly from the stats table in its "evidence" field (e.g. "+42.5% lift", "n=5", "mean 82.4").
2. DO NOT HALLUCINATE OR INVENT NUMBERS. Only use numbers that exist in the provided stats table. Any invented numbers will fail verification.
3. Determine what rules to add, change, or remove based on winning and underperforming categories.
4. If a hook or length significantly underperforms (lift < -15%), recommend adjusting the avoid list or rules.
5. Provide a plain 2-3 sentence explanation summarizing what empirical shifts were detected.`;

    const userPrompt = `PERFORMANCE STATS SUMMARY (Total Posts: ${stats.totalPosts}, Overall Mean Score: ${stats.overallMean}):
Hook Performance:
${hookSummary}

Duration Performance:
${durationSummary}

Platform Performance:
${platformSummary}

Winning Categories:
- Winning Hooks: ${stats.winningHooks.join(', ') || 'None'}
- Best Length: ${stats.bestLength}
- Best Platform: ${stats.bestPlatform}

CURRENT BRAND BRAIN RULES (v${currentBrain?.version || 1}):
${currentRulesText || 'No custom rules yet.'}

Current Voice Summary: "${currentBrain?.voice?.summary || 'Direct founder voice.'}"

Generate the structured JSON updates.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        new_rules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'Actionable writing/editing rule' },
              evidence: {
                type: Type.STRING,
                description: 'Verbatim metrics citing stats numbers (e.g. "+42.5% lift across n=3 posts")',
              },
              confidence: { type: Type.NUMBER, description: 'Confidence score between 0.0 and 1.0' },
            },
            required: ['text', 'evidence', 'confidence'],
          },
        },
        changed_rules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'ID of rule to modify' },
              text: { type: Type.STRING, description: 'Updated rule text' },
              reason: { type: Type.STRING, description: 'Why this rule was adjusted based on performance' },
            },
            required: ['id', 'text', 'reason'],
          },
        },
        removed_rules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'ID of rule to delete' },
              reason: { type: Type.STRING, description: 'Why this rule was invalidated' },
            },
            required: ['id', 'reason'],
          },
        },
        voice_adjustments: {
          type: Type.OBJECT,
          properties: {
            summary_refinement: { type: Type.STRING },
            added_traits: { type: Type.ARRAY, items: { type: Type.STRING } },
            added_avoid: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        explanation: {
          type: Type.STRING,
          description: 'A 2-3 sentence plain English explanation of what changed and why',
        },
      },
      required: ['new_rules', 'changed_rules', 'removed_rules', 'explanation'],
    };

    const candidateModels = [modelName, 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    let responseText = '';
    let lastError: unknown = null;

    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.2,
          },
        });
        responseText = response.text?.trim() || '';
        if (responseText) break;
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Model ${m} failed for /api/learn, attempting fallback...`, err instanceof Error ? err.message : err);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (!responseText) {
      const message = lastError instanceof Error ? lastError.message : 'Error communicating with Gemini.';
      return NextResponse.json(
        { success: false, error: `Gemini Learning Error: ${message}` },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(responseText);

    // SERVER-SIDE NUMBER VALIDATION:
    // Reject rules that invent numbers not present in the stats table
    const validNumbers = new Set<number>(
      stats.allNumbers.flatMap((n) => [
        Math.round(n * 10) / 10,
        Math.round(n),
        Math.floor(n),
        Math.ceil(n),
        Math.abs(Math.round(n)),
      ])
    );

    const validatedNewRules: BrainRule[] = [];
    const rawNewRules = Array.isArray(parsed.new_rules) ? parsed.new_rules : [];

    for (const rule of rawNewRules) {
      const citedNumbers = extractNumbersFromString(rule.evidence || '');

      // Check if at least one cited number is in the valid numbers set (or if no numbers were cited, reject)
      if (citedNumbers.length === 0) {
        continue; // Must cite evidence with real numbers
      }

      const hasInvalidNumber = citedNumbers.some((num) => {
        const rounded = Math.round(num * 10) / 10;
        const intVal = Math.round(num);
        return !validNumbers.has(rounded) && !validNumbers.has(intVal) && !validNumbers.has(Math.floor(num));
      });

      if (hasInvalidNumber) {
        console.warn(`Rejecting hallucinated rule numbers in evidence: "${rule.evidence}"`);
        continue;
      }

      validatedNewRules.push({
        id: `rule-learned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: rule.text,
        evidence: rule.evidence,
        confidence: typeof rule.confidence === 'number' ? rule.confidence : 0.85,
        source: 'feedback_loop',
        createdAt: new Date().toISOString(),
      });
    }

    // Compute learned weights directly from empirical stats (deterministic, clamp 0.7 - 1.3)
    const hook_multipliers: Partial<Record<HookType, number>> = {};
    for (const [hook, stat] of Object.entries(stats.hookStats)) {
      hook_multipliers[hook as HookType] = calculateMultiplier(stat.lift);
    }

    const duration_multipliers: Partial<Record<DurationBucket, number>> = {};
    for (const [dur, stat] of Object.entries(stats.durationStats)) {
      duration_multipliers[dur as DurationBucket] = calculateMultiplier(stat.lift);
    }

    const weights: BrainWeights = {
      hook_multipliers,
      duration_multipliers,
    };

    // Count rate limit only on success
    recordRateLimitSuccess(req);

    return NextResponse.json({
      success: true,
      new_rules: validatedNewRules,
      changed_rules: parsed.changed_rules || [],
      removed_rules: parsed.removed_rules || [],
      voice_adjustments: parsed.voice_adjustments || {},
      explanation: parsed.explanation || 'Updated rules and category multipliers from audience analytics.',
      weights,
    });
  } catch (err: unknown) {
    console.error('/api/learn error:', err);
    const error = err instanceof Error ? err.message : 'Unknown server error processing learning feedback.';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

