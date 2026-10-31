import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenAI, MediaResolution } from '@google/genai';
import {
  extractYouTubeVideoId,
  mergeTranscriptSegments,
  parsePastedTranscript,
  parseGeminiTranscriptLines,
} from '@/lib/youtube';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';
import { getCachedIngest, setCachedIngest } from '@/lib/ingest-cache';
import { TranscriptSegment } from '@/types';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData.title) return oembedData.title;
    }
  } catch {
    // fallback
  }
  return 'YouTube Video';
}

async function transcribeWithGemini(
  videoId: string,
  apiKey: string,
  modelName: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  const promptText =
    'Transcribe the spoken words of this video. Output plain lines in the form [mm:ss] text, one line roughly every 15-20 seconds, no commentary.';
  const fileUri = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // 1. Try with GoogleGenAI SDK
    const ai = new GoogleGenAI({ apiKey });
    const sdkPromise = ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri,
                mimeType: 'video/mp4',
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () =>
        reject(new Error('Gemini video understanding timeout after 55s'))
      );
    });

    try {
      const response = await Promise.race([sdkPromise, timeoutPromise]);
      if (response && response.text && response.text.trim()) {
        return response.text.trim();
      }
    } catch (sdkErr) {
      console.warn('GoogleGenAI SDK video call failed, attempting direct Gemini REST endpoint:', sdkErr);
    }

    // 2. Direct Gemini REST endpoint fallback with mediaResolution: MEDIA_RESOLUTION_LOW
    const restRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri,
                    mimeType: 'video/mp4',
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            mediaResolution: 'MEDIA_RESOLUTION_LOW',
          },
        }),
        signal: controller.signal,
      }
    );

    if (!restRes.ok) {
      const errBody = await restRes.json().catch(() => ({}));
      throw new Error(
        errBody.error?.message || `Gemini REST call returned status ${restRes.status}`
      );
    }

    const restData = await restRes.json();
    const candidateText = restData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText || !candidateText.trim()) {
      throw new Error('Gemini returned an empty transcript.');
    }
    return candidateText.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, text, videoId: manualVideoId } = body;

    // Handle Pasted Transcript
    if (type === 'paste') {
      if (!text || typeof text !== 'string' || !text.trim()) {
        return NextResponse.json(
          { success: false, error: 'Please provide transcript text to process.' },
          { status: 400 }
        );
      }

      // Check if user also provided an optional video URL or ID
      const resolvedVideoId = manualVideoId ? extractYouTubeVideoId(manualVideoId) : null;
      const parsed = parsePastedTranscript(text);

      if (parsed.segments.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Could not extract any readable content from the pasted text.' },
          { status: 400 }
        );
      }

      let videoTitle = 'Pasted Video Transcript';
      if (resolvedVideoId) {
        videoTitle = await fetchVideoTitle(resolvedVideoId);
      }

      return NextResponse.json({
        success: true,
        videoId: resolvedVideoId,
        videoTitle,
        segments: parsed.segments,
        formattedTranscript: parsed.formattedTranscript,
        totalDuration: parsed.totalDuration,
      });
    }

    // Handle YouTube Ingestion
    if (type === 'youtube' || url) {
      const targetUrl = url || body.input;
      if (!targetUrl || typeof targetUrl !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Please enter a valid YouTube video URL or ID.',
            canFallbackToPaste: true,
          },
          { status: 400 }
        );
      }

      const videoId = extractYouTubeVideoId(targetUrl);
      if (!videoId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid YouTube link or video ID. Please check the URL format.',
            canFallbackToPaste: true,
          },
          { status: 400 }
        );
      }

      // 1. Check in-memory cache first by video ID
      const cached = getCachedIngest(videoId);
      if (cached) {
        return NextResponse.json({
          ...cached,
          fromCache: true,
        });
      }

      // 2. First Attempt: youtube-transcript with an 8 second timeout
      let rawTranscript: Array<{ text: string; duration: number; offset: number }> | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        rawTranscript = await Promise.race([
          YoutubeTranscript.fetchTranscript(videoId),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new Error('youtube-transcript scraper timeout after 8s'))
            );
          }),
        ]);
        clearTimeout(timeoutId);
      } catch (scraperErr) {
        console.warn('youtube-transcript scraper failed or timed out:', scraperErr);
        rawTranscript = null;
      }

      // If youtube-transcript succeeded and returned segments
      if (rawTranscript && rawTranscript.length > 0) {
        const isMs = rawTranscript.slice(0, 5).some((item) => item.duration > 50 || item.offset > 5000);

        const normalizedSegments: TranscriptSegment[] = rawTranscript.map((item) => ({
          text: item.text,
          start: isMs ? item.offset / 1000 : item.offset,
          duration: isMs ? item.duration / 1000 : item.duration,
        }));

        const merged = mergeTranscriptSegments(normalizedSegments, 20);
        const videoTitle = await fetchVideoTitle(videoId);

        const responseData = {
          success: true,
          videoId,
          videoTitle,
          segments: merged.segments,
          formattedTranscript: merged.formattedTranscript,
          totalDuration: merged.totalDuration,
        };

        // Cache result by video ID
        setCachedIngest(videoId, responseData);

        return NextResponse.json(responseData);
      }

      // 3. Fallback: Gemini video understanding
      const apiKey = getSanitizedApiKey(process.env.GEMINI_API_KEY);
      if (!apiKey) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Gemini could not read this video. Use a public video under 20 minutes, or paste the transcript.',
            canFallbackToPaste: true,
            videoId,
          },
          { status: 422 }
        );
      }

      const modelName = getGeminiModel();

      try {
        const geminiOutput = await transcribeWithGemini(videoId, apiKey, modelName);
        const parsed = parseGeminiTranscriptLines(geminiOutput);

        if (!parsed.segments || parsed.segments.length === 0) {
          throw new Error('No transcript segments parsed from Gemini video output.');
        }

        const videoTitle = await fetchVideoTitle(videoId);

        const responseData = {
          success: true,
          videoId,
          videoTitle,
          segments: parsed.segments,
          formattedTranscript: parsed.formattedTranscript,
          totalDuration: parsed.totalDuration,
        };

        // Cache result by video ID
        setCachedIngest(videoId, responseData);

        return NextResponse.json(responseData);
      } catch (geminiErr: unknown) {
        console.error('Gemini video understanding error:', geminiErr);
        return NextResponse.json(
          {
            success: false,
            error:
              'Gemini could not read this video. Use a public video under 20 minutes, or paste the transcript.',
            canFallbackToPaste: true,
            videoId,
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request: must specify type "youtube" or "paste".' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown server error during ingest.';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
