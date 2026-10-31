import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript, YoutubeTranscriptError } from 'youtube-transcript';
import {
  extractYouTubeVideoId,
  mergeTranscriptSegments,
  parsePastedTranscript,
} from '@/lib/youtube';
import { TranscriptSegment } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${resolvedVideoId}&format=json`
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (oembedData.title) videoTitle = oembedData.title;
          }
        } catch {
          // fallback
        }
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

      try {
        const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);

        if (!rawTranscript || rawTranscript.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'No transcript found for this video. Captions may be disabled on this video.',
              canFallbackToPaste: true,
              videoId,
            },
            { status: 404 }
          );
        }

        // Determine if offsets/durations are in milliseconds or seconds
        // YouTube srv3 format returns milliseconds (e.g. offset: 18640, duration: 3240)
        const isMs = rawTranscript.slice(0, 5).some((item) => item.duration > 50 || item.offset > 5000);

        const normalizedSegments: TranscriptSegment[] = rawTranscript.map((item) => ({
          text: item.text,
          start: isMs ? item.offset / 1000 : item.offset,
          duration: isMs ? item.duration / 1000 : item.duration,
        }));

        const merged = mergeTranscriptSegments(normalizedSegments, 20);

        let videoTitle = 'YouTube Video';
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (oembedData.title) videoTitle = oembedData.title;
          }
        } catch {
          // fallback
        }

        return NextResponse.json({
          success: true,
          videoId,
          videoTitle,
          segments: merged.segments,
          formattedTranscript: merged.formattedTranscript,
          totalDuration: merged.totalDuration,
        });
      } catch (err: unknown) {
        let errorMessage = 'Failed to fetch YouTube transcript. The video might not have captions enabled or is restricted.';

        if (err instanceof YoutubeTranscriptError) {
          errorMessage = err.message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        return NextResponse.json(
          {
            success: false,
            error: `${errorMessage} You can paste the transcript directly in the "Paste transcript" tab.`,
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

