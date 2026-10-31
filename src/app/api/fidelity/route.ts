import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { checkRateLimit, recordRateLimitSuccess } from '@/lib/rate-limiter';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';
import { getFidelityCacheKey, getCachedFidelity, setCachedFidelity } from '@/lib/fidelity-cache';
import { BrainVoice, VoiceFidelityResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice, voiceVersion = 1 } = body as {
      text: string;
      voice: BrainVoice | null;
      voiceVersion?: number;
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text content is required for voice fidelity evaluation.' },
        { status: 400 }
      );
    }

    const cleanText = text.trim();
    const cacheKey = getFidelityCacheKey(cleanText, Number(voiceVersion) || 1);

    // 1. Check in-memory fidelity cache
    const cached = getCachedFidelity(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        ...cached,
        fromCache: true,
      });
    }

    // 2. Check rate limit
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

    // Voice context extraction
    const summary = voice?.summary || 'Direct, practical, no-fluff builder voice.';
    const traits = voice?.traits?.length ? voice.traits.join(', ') : 'Direct, High-signal, Pragmatic';
    const sentenceStyle = voice?.sentenceStyle || 'Short, punchy sentences.';
    const signaturePhrases = voice?.signaturePhrases?.length ? voice.signaturePhrases.join(' | ') : 'None specified';
    const avoid = voice?.avoid?.length ? voice.avoid.join(', ') : 'fluff, corporate jargon';

    const systemPrompt = `You are a world-class brand voice auditor and editorial director.
Your role is to rigorously evaluate whether a piece of social media copy authentically sounds like the creator's defined brand voice.

EVALUATION CRITERIA:
- Score 0-100:
  90-100: Identical rhythm, lexicon, tone, and signature traits.
  75-89: Solid match, minor tonal deviations or generic phrasing.
  50-74: Partial match, feels somewhat AI-generated or off-brand.
  0-49: Generic marketing fluff, violates avoidance list, or completely mismatches the creator.
- matched_traits: Array of exact or near-match brand traits that the text embodied.
- mismatched_traits: Array of brand traits the text failed to embody or directly violated (e.g., "Overly conversational", "Uses corporate jargon", "Missing question hook").
- suggested_rewrite: EXACTLY ONE crisp line that rewrites the weakest part of the text into the creator's authentic voice.`;

    const userPrompt = `CREATOR BRAND VOICE SPECIFICATION:
- Summary: "${summary}"
- Defined Traits: ${traits}
- Sentence Architecture: "${sentenceStyle}"
- Signature Phrases / Mantras: ${signaturePhrases}
- Avoid Patterns: ${avoid}

COPY TEXT TO EVALUATE:
"""
${cleanText}
"""

Evaluate the text and return the structured JSON matching the schema.`;

    const responseSchema = {
      type: Type.OBJECT,
      description: 'Voice fidelity scoring breakdown',
      properties: {
        score: {
          type: Type.INTEGER,
          description: 'Fidelity score between 0 and 100',
        },
        matched_traits: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Traits from the brand voice successfully present in the text',
        },
        mismatched_traits: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Traits missing, diluted, or violated in the text',
        },
        suggested_rewrite: {
          type: Type.STRING,
          description: 'One punchy rewrite line demonstrating authentic voice adherence',
        },
      },
      required: ['score', 'matched_traits', 'mismatched_traits', 'suggested_rewrite'],
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
        console.warn(`Model ${m} failed for /api/fidelity, attempting fallback...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (!responseText) {
      const message = lastError instanceof Error ? lastError.message : 'Error communicating with Gemini.';
      return NextResponse.json(
        { success: false, error: `Gemini Fidelity Error: ${message}` },
        { status: 502 }
      );
    }

    const parsed: VoiceFidelityResult = JSON.parse(responseText);

    // Clamp score between 0 and 100
    const clampedScore = Math.min(100, Math.max(0, Math.round(parsed.score || 75)));

    const result: VoiceFidelityResult = {
      score: clampedScore,
      matched_traits: Array.isArray(parsed.matched_traits) ? parsed.matched_traits : [],
      mismatched_traits: Array.isArray(parsed.mismatched_traits) ? parsed.mismatched_traits : [],
      suggested_rewrite: parsed.suggested_rewrite || '',
    };

    // ONLY count rate limit on successful Gemini generation
    recordRateLimitSuccess(req);

    // Save to cache
    setCachedFidelity(cacheKey, result);

    return NextResponse.json({
      success: true,
      ...result,
      fromCache: false,
    });
  } catch (err: unknown) {
    console.error('API /api/fidelity error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
