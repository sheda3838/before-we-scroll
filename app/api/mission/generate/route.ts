import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { MissionContext } from '@/types/missionContext';
import { extractAndParseJson } from '@/lib/validateMissionContext';
import { validateAndNormalizeMissionPlan } from '@/lib/validateMissionPlan';

const MODEL_NAME = 'gemma-4-26b-a4b-it';

function buildGenerationPrompt(ctx: MissionContext): string {
  const lines: string[] = [
    'You are the mission generation engine for Outventure AI.',
    '',
    'Given the confirmed MissionContext below, generate a creative, safe outdoor/indoor activity mission.',
    '',
    'Rules:',
    '- Only use information present in the MissionContext.',
    '- Keep activities concise and actionable (each is one clear step).',
    '- If durationMinutes is null, estimate and set estimatedDurationMinutes.',
    '- If participants is null, use peopleCount from context (or null).',
    '- If no equipment in context, suggest no-equipment activities.',
    '- safetyNotes must be practical.',
    '',
    'Return ONLY valid JSON matching this schema:',
    '{',
    '  "title": string,',
    '  "description": string,',
    '  "activities": string[],',
    '  "estimatedDurationMinutes": number | null,',
    '  "participants": number | null,',
    '  "equipmentNeeded": string[],',
    '  "safetyNotes": string[]',
    '}',
    '',
    'No markdown, no code fences, no explanations. JSON only.',
    '',
    'MissionContext:',
    JSON.stringify(ctx, null, 2),
  ];
  return lines.join('\n');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed request.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('context' in body)) {
    return NextResponse.json(
      { success: false, error: 'context field is required.' },
      { status: 400 }
    );
  }

  const ctx = (body as { context: MissionContext }).context;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Missing GEMINI_API_KEY.' }, { status: 500 });
  }

  const prompt = buildGenerationPrompt(ctx);
  const MAX_RETRIES = 3;
  let lastError = 'Unknown error.';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const startTime = Date.now();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
      const latencyMs = Date.now() - startTime;

      const rawOutput = response.text?.trim() || '';
      if (!rawOutput) throw new Error('Empty response from model.');

      const parsed = extractAndParseJson(rawOutput);
      const plan = validateAndNormalizeMissionPlan(parsed);

      return NextResponse.json({ success: true, plan, latencyMs });
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Unexpected error.';
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  return NextResponse.json(
    { success: false, error: 'Mission generation failed: ' + lastError },
    { status: 500 }
  );
}
