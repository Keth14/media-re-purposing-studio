import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { checkRateLimit, recordRateLimitSuccess } from '@/lib/rate-limiter';
import { getCopyCacheKey, getCachedCopy, setCachedCopy } from '@/lib/copy-cache';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';
import { Platform, PlatformCopy, BrainVoice } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PLATFORMS: Platform[] = ['youtube_shorts', 'instagram_reels', 'linkedin', 'x'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clip,
      platform,
      voice,
      rules,
      voiceVersion = 1,
      rulesVersion,
      clipId: rawClipId,
      constraints,
    } = body;

    if (!clip || !platform) {
      return NextResponse.json(
        { success: false, error: 'Clip data and platform are required.' },
        { status: 400 }
      );
    }

    const selectedPlatform: Platform = VALID_PLATFORMS.includes(platform)
      ? platform
      : 'youtube_shorts';

    const clipId = rawClipId || clip.id || `${clip.start_sec}-${clip.end_sec}`;
    const rVer = rulesVersion ?? (Array.isArray(rules) ? rules.length : 0);
    const hasConstraints = Array.isArray(constraints) && constraints.length > 0;
    const cacheKey = getCopyCacheKey(clipId, selectedPlatform, Number(voiceVersion) || 1, rVer);

    // 1. Check in-memory copy cache (bypass if explicit improvement constraints are provided)
    if (!hasConstraints) {
      const cached = getCachedCopy(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          copy: cached,
          fromCache: true,
        });
      }
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

    const hasVoice = Boolean(
      voice && typeof voice === 'object' && voice.summary && voice.traits?.length > 0
    );

    const modelName = getGeminiModel();
    const ai = new GoogleGenAI({ apiKey });

    // Platform-specific rules
    const platformInstructions = {
      youtube_shorts: `PLATFORM: YouTube Shorts
- Title/Hook: MUST be under 70 characters, extremely punchy, curiosity-driven.
- Caption: 2-3 short, engaging sentences that support the video.
- Hashtags: 3-5 relevant tags including #Shorts.
- On-Screen Text: Punchy 3-6 word text hook to overlay on the first 3 seconds of the video.`,
      instagram_reels: `PLATFORM: Instagram Reels
- Hook: The irresistible opening line for the Reel.
- Caption: Short, punchy caption. Emojis MUST only be used if the brand voice explicitly uses them (${hasVoice ? voice.emojiUsage : 'no decorative emoji'}).
- Hashtags: 4-6 focused hashtags.
- On-Screen Text: High-retention text overlay hook for visual attention.`,
      linkedin: `PLATFORM: LinkedIn
- Hook: A single, compelling opening sentence that compels readers to click "see more".
- Caption: Exactly 3 to 6 short lines with clear line breaks. Ends with an engaging question to drive comment discussion.
- Hashtags: 2-3 professional industry hashtags.
- On-Screen Text: Authoritative video badge or headline overlay suggestion.`,
      x: `PLATFORM: X (formerly Twitter)
- Hook: The bold statement or hook opener.
- Caption: Either a single tweet under 280 characters, OR a tight 3-tweet mini-thread formatted with "1/", "2/", "3/".
- Hashtags: 1 or 0 hashtags (modern X native style prefers no hashtag clutter).
- On-Screen Text: Bold, pithy text overlay for the video thumbnail/clip.`,
    };

    const voicePrompt = hasVoice
      ? `BRAND VOICE SPECIFICATION (You MUST write strictly in this authentic voice):
Summary: ${voice.summary}
Key Traits: ${voice.traits.join(', ')}
Sentence Style: ${voice.sentenceStyle}
Preferred Vocabulary: ${voice.vocabulary.join(', ')}
Emoji Policy: ${voice.emojiUsage}
Signature Cadences: ${voice.signaturePhrases.join(' | ')}
Things to AVOID: ${voice.avoid.join(', ')}`
      : `BRAND VOICE: No brand voice configured yet. Note: Writing in a clean, neutral, professional creator tone.`;

    const rulesPrompt =
      Array.isArray(rules) && rules.length > 0
        ? `\nLEARNED BRAND RULES (Strictly enforce these empirical writing rules):\n${rules
            .map((r: any, i: number) => `${i + 1}. ${r.text}`)
            .join('\n')}`
        : '';

    const constraintsPrompt = hasConstraints
      ? `\nIMPROVEMENT CONSTRAINTS (FIX PREVIOUS VOICE MISMATCHES):\n${constraints
          .map((c: string) => `- ${c}`)
          .join('\n')}\nAddress these mismatches directly and strictly ensure the new copy resolves them.`
      : '';

    const systemPrompt = `You are a premier social media copywriter and repurposing specialist.
Generate compelling, native social copy for a short video clip.

${platformInstructions[selectedPlatform]}

${voicePrompt}
${rulesPrompt}
${constraintsPrompt}`;

    const userPrompt = `VIDEO CLIP INFORMATION:
Title: "${clip.title}"
Trigger Quote: "${clip.trigger_quote}"
Hook Type: ${clip.hook_type}
Duration: ${clip.end_sec - clip.start_sec} seconds
Why it works: "${clip.reason}"

Generate the platform copy formatted strictly according to the JSON schema.`;

    const responseSchema = {
      type: Type.OBJECT,
      description: 'Native social copy for the specified platform',
      properties: {
        hook: { type: Type.STRING, description: 'First line / opener / title' },
        caption: { type: Type.STRING, description: 'The platform-tailored post body' },
        hashtags: { type: Type.STRING, description: 'Formatted hashtags e.g. #Shorts #Marketing' },
        on_screen_text: {
          type: Type.STRING,
          description: 'Text overlay hook to display on screen during the clip',
        },
      },
      required: ['hook', 'caption', 'hashtags', 'on_screen_text'],
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
            temperature: 0.3,
          },
        });
        responseText = response.text?.trim() || '';
        if (responseText) break;
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Model ${m} failed for /api/copy, attempting fallback...`);
      }
    }

    if (!responseText) {
      const message = lastError instanceof Error ? lastError.message : 'Error communicating with Gemini.';
      return NextResponse.json(
        { success: false, error: `Gemini Copy Generation Error: ${message}` },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(responseText);

    const generatedCopy: PlatformCopy = {
      platform: selectedPlatform,
      hook: parsed.hook || clip.title,
      caption: parsed.caption || clip.reason,
      hashtags: parsed.hashtags || '',
      on_screen_text: parsed.on_screen_text || clip.title,
      isNeutralVoice: !hasVoice,
    };

    // Cache the result
    setCachedCopy(cacheKey, generatedCopy);

    // Count rate limit only on successful Gemini calls
    recordRateLimitSuccess(req);

    return NextResponse.json({
      success: true,
      copy: generatedCopy,
      fromCache: false,
    });
  } catch (err: unknown) {
    console.error('/api/copy error:', err);
    const error = err instanceof Error ? err.message : 'Unknown server error generating copy.';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

