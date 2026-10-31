import { NextResponse } from 'next/server';
import { getSanitizedApiKey, getGeminiModel } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = getSanitizedApiKey(process.env.GEMINI_API_KEY);
  const model = getGeminiModel();

  return NextResponse.json({
    hasKey: apiKey.length > 0,
    keyLength: apiKey.length,
    keyStart: apiKey.length >= 4 ? apiKey.slice(0, 4) : apiKey,
    model,
  });
}

