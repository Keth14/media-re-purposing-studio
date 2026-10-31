import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { checkRateLimit, recordRateLimitSuccess } from '@/lib/rate-limiter';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';
import { BrainVoice, BrainRule } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { samples } = body;

    if (!samples || typeof samples !== 'string' || samples.trim().length < 30) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least 2-3 sentences of sample text so the AI can analyze your voice.' },
        { status: 400 }
      );
    }

    // Rate limit pre-check
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

    const systemPrompt = `You are a world-class speech and writing analyst, copy director, and brand voice architect.
Analyze the user's provided writing and speaking samples (posts, scripts, or spoken rants).
Extract their genuine voice fingerprint.

REQUIREMENTS:
1. summary: A sharp 2-3 sentence synthesis of their tone, energy, and communication psychology.
2. traits: 3-5 distinct personality traits (e.g., "Pragmatically Contrarian", "Anti-Corporate Directness").
3. sentenceStyle: Description of sentence length, cadence, rhythm, line breaks, and flow.
4. vocabulary: 5-8 recurring words, thematic jargon, or preferred conceptual terms.
5. emojiUsage: Specific usage rule (e.g. "None", "Functional bullets only", "Casual and expressive").
6. signaturePhrases: 3-5 signature transitions, idioms, or opening formulas derived from the samples.
7. avoid: 4-6 corporate clichés, buzzwords, or tones that contradict this authentic voice.
8. rules: 3-5 actionable writing rules. CRITICAL: Every single rule MUST cite a verbatim quote from the user's samples as "evidence".`;

    const userPrompt = `Here are the authentic writing/speech samples:
---
${samples.trim()}
---

Extract the structured voice fingerprint adhering strictly to the JSON schema.`;

    const responseSchema = {
      type: Type.OBJECT,
      description: 'Extracted brand voice fingerprint and evidence-backed rules',
      properties: {
        summary: { type: Type.STRING },
        traits: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        sentenceStyle: { type: Type.STRING },
        vocabulary: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        emojiUsage: { type: Type.STRING },
        signaturePhrases: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        avoid: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        rules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'Actionable style guideline' },
              evidence: { type: Type.STRING, description: 'Direct quote citation from samples proving this trait' },
            },
            required: ['text', 'evidence'],
          },
        },
      },
      required: [
        'summary',
        'traits',
        'sentenceStyle',
        'vocabulary',
        'emojiUsage',
        'signaturePhrases',
        'avoid',
        'rules',
      ],
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
        console.warn(`Model ${m} failed for /api/voice, falling back...`);
      }
    }

    if (!responseText) {
      const message = lastError instanceof Error ? lastError.message : 'Error communicating with Gemini model.';
      return NextResponse.json(
        { success: false, error: `Gemini Voice Extraction Error: ${message}` },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(responseText);

    const voice: BrainVoice = {
      summary: parsed.summary || 'Authentic direct voice.',
      traits: Array.isArray(parsed.traits) ? parsed.traits : [],
      sentenceStyle: parsed.sentenceStyle || 'Direct and punchy.',
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
      emojiUsage: parsed.emojiUsage || 'Minimal',
      signaturePhrases: Array.isArray(parsed.signaturePhrases) ? parsed.signaturePhrases : [],
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid : [],
    };

    const rules: BrainRule[] = Array.isArray(parsed.rules)
      ? parsed.rules.map((r: any, idx: number) => ({
          id: `rule-${Date.now()}-${idx + 1}`,
          text: r.text || 'Be direct and concise',
          evidence: r.evidence ? `"${r.evidence.replace(/^["']|["']$/g, '')}"` : 'From writing sample',
          source: 'learned_samples',
          createdAt: new Date().toISOString(),
        }))
      : [];

    // Count rate limit only on successful Gemini response
    recordRateLimitSuccess(req);

    return NextResponse.json({
      success: true,
      voice,
      rules,
    });
  } catch (err: unknown) {
    console.error('/api/voice error:', err);
    const error = err instanceof Error ? err.message : 'Unknown server error processing voice.';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
