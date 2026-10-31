import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAMPLE_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'sample.json');

export async function GET() {
  try {
    if (!fs.existsSync(SAMPLE_FILE_PATH)) {
      return NextResponse.json({ success: true, hasSample: false, sample: null });
    }

    const raw = fs.readFileSync(SAMPLE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || !parsed.videoId || !Array.isArray(parsed.clips) || parsed.clips.length === 0) {
      return NextResponse.json({ success: true, hasSample: false, sample: null });
    }

    return NextResponse.json({ success: true, hasSample: true, sample: parsed });
  } catch (err: unknown) {
    console.error('Error reading sample.json:', err);
    return NextResponse.json(
      { success: false, hasSample: false, error: 'Failed to read sample.json' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'Saving sample is only allowed in development environment.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { videoId, title, formattedTranscript, transcriptSegments, totalDuration, clips } = body;

    if (!videoId || !clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required videoId or clips array.' },
        { status: 400 }
      );
    }

    const dir = path.dirname(SAMPLE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sampleData = {
      videoId,
      title: title || 'Real Processed Video',
      totalDuration: totalDuration || (clips[0]?.totalVideoDuration ?? 360),
      formattedTranscript: formattedTranscript || '',
      transcriptSegments: transcriptSegments || [],
      clips: clips.slice(0, 6),
      savedAt: new Date().toISOString(),
    };

    fs.writeFileSync(SAMPLE_FILE_PATH, JSON.stringify(sampleData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Sample saved successfully to src/data/sample.json',
      sample: sampleData,
    });
  } catch (err: unknown) {
    console.error('Error saving sample.json:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save sample' },
      { status: 500 }
    );
  }
}
