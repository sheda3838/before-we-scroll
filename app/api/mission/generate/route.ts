import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { MissionContext } from "@/types/missionContext";
import {
  extractAndParseJson,
  validateAndNormalizeMissionContext,
} from "@/lib/validateMissionContext";
import { validateAndNormalizeMissions } from "@/lib/validateMissionPlan";

const MODEL_NAME = "gemini-3.1-flash-lite";

function buildMissionGenerationPrompt(ctx: MissionContext): string {
  return `You are the mission generation engine for Outventure AI.

Given one confirmed MissionContext, generate EXACTLY 3 distinct, engaging activities (missions) tailored specifically to the user's situation and surroundings.

CONFIRMED MISSION CONTEXT:
${JSON.stringify(ctx, null, 2)}

REQUIREMENTS:
1. Generate EXACTLY 3 missions.
2. Diversity: The 3 missions must be meaningfully different from each other in structure, objective, and gameplay mechanics (do NOT just provide 3 variations of the same activity).
3. Context Fit: Utilize the confirmed environment type, space size, surface, and physical features.
4. Player Count & Duration: Match the requested group size and keep duration close to the stated time budget.
5. Equipment Rules: ONLY use equipment explicitly listed under "equipmentAvailable". If equipmentAvailable is empty, you must NOT require any equipment. Do NOT hallucinate or require balls, cones, chalk, paper, timers, or other items that are not in equipmentAvailable. Environment features (such as slides, benches, paths, markings, trees) are NOT equipment.
6. Constraints: Strictly honor all constraints:
   - If noRunning is true: walking, standing, or sitting only. Absolutely no running or sprinting.
   - If kidFriendly is true: safe, accessible, and fun for children; suitable for mixed adults and kids.
   - If quietActivity is true: low noise level; no shouting or loud cheering.
7. Real-World Movement: Encourage real-world movement and interaction with the physical environment. Minimize continuous screen/phone usage.
8. Safety: Include realistic, context-specific safety notes (accounting for surfaces, obstacles, structures, and age group).
9. Single-Call Completeness: Each mission must include all steps and safety instructions so selecting a mission later does not require another AI call.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching the schema below. Do NOT wrap in markdown codeblocks (no \`\`\`json) and do NOT include any introductory or concluding text.

{
  "missions": [
    {
      "id": "mission-1",
      "title": "string",
      "shortDescription": "string",
      "durationMinutes": number,
      "intensity": "low" | "medium" | "high",
      "players": "string",
      "equipmentNeeded": ["string"],
      "whyItFits": "string",
      "steps": [
        "step 1",
        "step 2",
        "step 3"
      ],
      "safetyNotes": [
        "string"
      ]
    }
  ]
}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Malformed request payload." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !("context" in body)) {
    return NextResponse.json(
      { success: false, error: "A valid context field is required." },
      { status: 400 }
    );
  }

  const rawCtx = (body as { context: unknown }).context;
  const ctx = validateAndNormalizeMissionContext(rawCtx);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[MissionGenerate] GEMINI_API_KEY is not configured.");
    return NextResponse.json(
      { success: false, error: "We couldn't create your missions this time. Please try again." },
      { status: 500 }
    );
  }

  const prompt = buildMissionGenerationPrompt(ctx);
  const ai = new GoogleGenAI({ apiKey });

  const MAX_ATTEMPTS = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const startTime = Date.now();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
      const latencyMs = Date.now() - startTime;

      const rawOutput = response.text?.trim() || "";
      if (!rawOutput) {
        throw new Error("Empty response received from generation model.");
      }

      const parsed = extractAndParseJson(rawOutput);
      const missions = validateAndNormalizeMissions(parsed, ctx);

      if (!missions || missions.length !== 3) {
        console.error("[MissionGenerate] Failed to validate normalized missions:", parsed);
        return NextResponse.json(
          { success: false, error: "We couldn't create your missions this time. Please try again." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        missions,
        diagnostics: {
          model: MODEL_NAME,
          latencyMs,
        },
      });
    } catch (err: unknown) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[MissionGenerate] Attempt ${attempt} encountered error, retrying in 1.5s...`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  console.error("[MissionGenerate] All attempts failed:", lastError);
  return NextResponse.json(
    { success: false, error: "We couldn't create your missions this time. Please try again." },
    { status: 500 }
  );
}
