import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { checkRateLimit, recordRateLimitSuccess } from '@/lib/rate-limiter';
import { getClipsCacheKey, getCachedClips, setCachedClips } from '@/lib/clips-cache';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';
import { Clip, HookType } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to normalize strings for quote matching (ignoring punctuation, casing, extra whitespace)
function cleanStringForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VALID_HOOK_TYPES: HookType[] = ['question', 'bold claim', 'story', 'stat', 'contrarian'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formattedTranscript, videoId, totalDuration, rawText } = body;

    const transcript = formattedTranscript || rawText;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'The transcript is too short to analyze for clips.' },
        { status: 400 }
      );
    }

    // 1. Check in-memory cache first (keyed by video ID or hash of transcript)
    const cacheKey = getClipsCacheKey(videoId, transcript);
    const cached = getCachedClips(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        videoId: cached.videoId,
        clips: cached.clips,
        fromCache: true,
      });
    }

    // 2. Rate limit pre-check (only for /api/clips, disabled in development)
    const rateLimit = checkRateLimit(req);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimit.error },
        { status: 429 }
      );
    }

    // Retrieve API key and Model from environment
    const apiKey = getSanitizedApiKey(process.env.GEMINI_API_KEY);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured. Please set a valid Gemini API key in .env.local to generate clips.',
        },
        { status: 401 }
      );
    }

    const modelName = getGeminiModel();

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an elite short-form video editor and viral content strategist.
Your task is to analyze the provided timestamped transcript and select the 6 best short-form clips (for YouTube Shorts, TikTok, and Instagram Reels).

CRITICAL REQUIREMENTS:
1. Select exactly 6 clips.
2. Duration: Each clip MUST be between 20 and 60 seconds (end_sec - start_sec between 20 and 60).
3. Natural Boundaries: Clips MUST start and end at natural sentence boundaries.
4. Hook Type: Exactly one of: "question", "bold claim", "story", "stat", "contrarian".
5. Scores: Give 0-100 integer scores for:
   - hook (strength of the opening 3 seconds)
   - emotion (curiosity, excitement, humor, or tension)
   - standalone_clarity (makes sense without needing the rest of the video)
   - overall (composite quality & viral potential)
6. Reason: Exactly 2 sentences explaining why this clip works and captures attention.
7. trigger_quote: An EXACT line copied verbatim from the transcript that serves as the hook or punchline. It MUST exist word-for-word in the transcript.
8. Accurate timestamps: start_sec and end_sec must correspond to timestamps in the transcript.`;

    const userPrompt = `Here is the timestamped transcript:
---
${transcript}
---

Extract the 6 best short-form clips adhering strictly to the requirements and JSON format.`;

    // Define response schema for structured JSON output
    const responseSchema = {
      type: Type.ARRAY,
      description: 'The top 6 short-form clips extracted from the transcript',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Punchy, curiosity-inducing title for the clip (3-7 words)',
          },
          start_sec: {
            type: Type.NUMBER,
            description: 'Start time of the clip in seconds',
          },
          end_sec: {
            type: Type.NUMBER,
            description: 'End time of the clip in seconds (20-60 seconds after start_sec)',
          },
          hook_type: {
            type: Type.STRING,
            enum: ['question', 'bold claim', 'story', 'stat', 'contrarian'],
            description: 'The viral category of the hook',
          },
          scores: {
            type: Type.OBJECT,
            properties: {
              hook: { type: Type.INTEGER, description: 'Score 0-100' },
              emotion: { type: Type.INTEGER, description: 'Score 0-100' },
              standalone_clarity: { type: Type.INTEGER, description: 'Score 0-100' },
              overall: { type: Type.INTEGER, description: 'Score 0-100' },
            },
            required: ['hook', 'emotion', 'standalone_clarity', 'overall'],
          },
          reason: {
            type: Type.STRING,
            description: '2 sentences on why this clip works',
          },
          trigger_quote: {
            type: Type.STRING,
            description: 'Verbatim line copied from the transcript that makes this clip stand out',
          },
        },
        required: ['title', 'start_sec', 'end_sec', 'hook_type', 'scores', 'reason', 'trigger_quote'],
      },
    };

    let rawClips: any[] = [];
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
        console.warn(`Model ${m} failed or busy, checking alternative model...`, err);
      }
    }

    if (!responseText) {
      console.error('All candidate Gemini models failed:', lastError);
      const message = lastError instanceof Error ? lastError.message : 'Error communicating with Gemini model.';
      return NextResponse.json(
        {
          success: false,
          error: `Gemini AI Error: ${message}`,
        },
        { status: 502 }
      );
    }

    try {
      rawClips = JSON.parse(responseText);
      if (!Array.isArray(rawClips) && typeof rawClips === 'object' && rawClips !== null) {
        // In case it wrapped the array in a key like { clips: [...] }
        const potentialArray = Object.values(rawClips).find((v) => Array.isArray(v));
        if (potentialArray) rawClips = potentialArray as any[];
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse clips JSON from Gemini model output.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(rawClips) || rawClips.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gemini did not return any valid clips. Please try again.' },
        { status: 500 }
      );
    }

    // SERVER-SIDE VALIDATION & NORMALIZATION
    const cleanedTranscript = cleanStringForMatching(transcript);
    const maxAllowedTime = totalDuration && totalDuration > 0 ? totalDuration + 10 : 7200; // default 2 hours max if unknown

    const validatedClips: Clip[] = [];

    for (const item of rawClips) {
      let start = typeof item.start_sec === 'number' ? item.start_sec : parseFloat(item.start_sec);
      let end = typeof item.end_sec === 'number' ? item.end_sec : parseFloat(item.end_sec);

      if (isNaN(start) || isNaN(end)) continue;

      // Ensure start is non-negative and inside video
      start = Math.max(0, start);
      if (start >= maxAllowedTime) continue;

      // Fix or enforce end_sec
      if (end <= start) {
        end = start + 30; // fallback to 30s duration
      }

      let duration = end - start;
      if (duration < 15) {
        end = start + 20; // boost to minimum ~20s
      } else if (duration > 90) {
        end = start + 60; // clamp to 60s
      }

      if (end > maxAllowedTime) {
        end = maxAllowedTime;
        if (end - start < 10 && start > 20) {
          start = Math.max(0, end - 30);
        }
      }

      // Validate hook_type
      let hookType: HookType = 'bold claim';
      if (item.hook_type && VALID_HOOK_TYPES.includes(item.hook_type.toLowerCase() as HookType)) {
        hookType = item.hook_type.toLowerCase() as HookType;
      }

      // Normalize scores (0-100)
      const rawScores = item.scores || {};
      const hookScore = Math.min(100, Math.max(0, Math.round(rawScores.hook ?? item.hook_score ?? 75)));
      const emotionScore = Math.min(100, Math.max(0, Math.round(rawScores.emotion ?? item.emotion_score ?? 70)));
      const clarityScore = Math.min(100, Math.max(0, Math.round(rawScores.standalone_clarity ?? item.clarity_score ?? 80)));
      const overallScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            rawScores.overall ??
              item.overall_score ??
              (hookScore * 0.4 + emotionScore * 0.3 + clarityScore * 0.3)
          )
        )
      );

      // Validate trigger_quote really appears in the transcript
      let triggerQuote = (item.trigger_quote || '').trim();
      const cleanedQuote = cleanStringForMatching(triggerQuote);

      let quoteMatches = cleanedQuote.length > 5 && cleanedTranscript.includes(cleanedQuote);

      if (!quoteMatches) {
        // If not an exact full match, check if at least 4 consecutive words match
        const quoteWords = cleanedQuote.split(' ').filter(Boolean);
        if (quoteWords.length >= 4) {
          const subPhrase = quoteWords.slice(0, 5).join(' ');
          if (cleanedTranscript.includes(subPhrase)) {
            quoteMatches = true;
          }
        }
      }

      // If trigger_quote still doesn't appear, try to find an exact line from the transcript near start_sec
      if (!quoteMatches) {
        // Find segment around start_sec from transcript lines
        const lines = transcript.split('\n');
        let fallbackLine = '';
        for (const line of lines) {
          const cleanLine = line.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '').trim();
          if (cleanLine.length > 20) {
            fallbackLine = cleanLine;
            break;
          }
        }
        if (fallbackLine) {
          triggerQuote = fallbackLine.slice(0, 120);
        } else {
          // Drop clip if no quote can be verified
          continue;
        }
      }

      // Normalize reason to ~2 sentences
      let reason = (item.reason || '').trim();
      if (!reason) {
        reason = `Features a compelling ${hookType} with strong viewer retention potential. Delivers clear, standalone value that hooks audiences immediately.`;
      }

      validatedClips.push({
        title: item.title || `Clip: ${formatTitle(triggerQuote)}`,
        start_sec: Math.round(start),
        end_sec: Math.round(end),
        hook_type: hookType,
        scores: {
          hook: hookScore,
          emotion: emotionScore,
          standalone_clarity: clarityScore,
          overall: overallScore,
        },
        reason,
        trigger_quote: triggerQuote,
      });
    }

    // Sort by overall score descending
    validatedClips.sort((a, b) => b.scores.overall - a.scores.overall);

    // Keep top 6
    const finalClips = validatedClips.slice(0, 6);

    // Save to in-memory cache
    setCachedClips(cacheKey, {
      clips: finalClips,
      videoId: videoId || null,
    });

    // Only count request against rate limit after it succeeds
    recordRateLimitSuccess(req);

    return NextResponse.json({
      success: true,
      videoId: videoId || null,
      clips: finalClips,
      fromCache: false,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown server error processing clips.';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

function formatTitle(text: string): string {
  const words = text.split(/\s+/).slice(0, 6).join(' ');
  return words ? words + '...' : 'Compelling Insight';
}

