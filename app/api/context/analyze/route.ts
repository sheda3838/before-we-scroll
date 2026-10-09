import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  extractAndParseJson,
  validateAndNormalizeMissionContext,
} from "@/lib/validateMissionContext";

const MODEL_NAME = "gemini-3.1-flash-lite";

// ---------------------------------------------------------------------------
// Diagnostic types
// ---------------------------------------------------------------------------

interface AttemptRecord {
  attempt: number;
  latencyMs: number;
  success: boolean;
  status: number | null;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildExtractionPrompt(userText: string): string {
  return `You are the context extraction engine for Outventure AI.

Your job is ONLY to extract information explicitly stated in the user's request.

Do not invent information.
Do not assume defaults.
Do not infer missing values unless they are directly and safely implied by the wording.

For every unknown scalar field, return null.
For unknown list fields, return [].

Return ONLY valid JSON matching the supplied MissionContext schema:
{
  "peopleCount": number | null,
  "durationMinutes": number | null,
  "activityGoal": string | null,
  "intensity": "low" | "medium" | "high" | null,
  "ageGroup": string | null,
  "environment": {
    "type": string | null,
    "indoorOutdoor": "indoor" | "outdoor" | null,
    "spaceSize": "small" | "medium" | "large" | null,
    "surface": string | null,
    "features": string[],
    "obstacles": string[]
  },
  "equipmentAvailable": string[],
  "constraints": {
    "noRunning": boolean | null,
    "kidFriendly": boolean | null,
    "quietActivity": boolean | null
  }
}

Do not include markdown.
Do not include explanations.
Do not include code fences.

User request: "${userText}"`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── Parse request body ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Malformed JSON request body.",
      },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("text" in body) ||
    typeof (body as { text: unknown }).text !== "string" ||
    (body as { text: string }).text.trim().length === 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid input: 'text' field must be a non-empty string.",
      },
      { status: 400 }
    );
  }

  const userText = (body as { text: string }).text.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing GEMINI_API_KEY in server environment.",
      },
      { status: 500 }
    );
  }

  const prompt = buildExtractionPrompt(userText);

  // ── Gemma call with attempt instrumentation ───────────────────────────────
  // NOTE: The existing behavior is a single attempt (no retry loop).
  // This instrumentation layer records per-attempt timing without changing
  // the retry count, retry delays, or retry conditions.
  const totalStart = Date.now();
  const ai = new GoogleGenAI({ apiKey });
  const attempts: AttemptRecord[] = [];

  // Single attempt — mirrors the existing behavior exactly.
  // Structured as a loop so the instrumentation can track retries if the
  // upstream retry policy ever changes, without altering current behavior.
  const MAX_ATTEMPTS = 1; // ← do not change; preserves existing retry behavior
  let lastError: unknown = null;
  let successOutput: string | null = null;

  for (let attemptNum = 1; attemptNum <= MAX_ATTEMPTS; attemptNum++) {
    const attemptStart = Date.now();
    console.log(`[Gemma] Attempt ${attemptNum} started`);

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });

      const attemptMs = Date.now() - attemptStart;
      const rawOutput = response.text?.trim() || "";

      if (!rawOutput) {
        // Treat empty response as a failure for this attempt
        const record: AttemptRecord = {
          attempt: attemptNum,
          latencyMs: attemptMs,
          success: false,
          status: null,
          errorMessage: "Empty response received from Gemma model.",
        };
        attempts.push(record);
        console.log(
          `[Gemma] Attempt ${attemptNum} failed — empty response — ${attemptMs}ms`
        );
        lastError = new Error("Empty response received from Gemma model.");
        break; // No retry — preserve existing behavior
      }

      const record: AttemptRecord = {
        attempt: attemptNum,
        latencyMs: attemptMs,
        success: true,
        status: 200,
      };
      attempts.push(record);
      console.log(
        `[Gemma] Attempt ${attemptNum} succeeded — ${attemptMs}ms`
      );
      successOutput = rawOutput;
      break;
    } catch (error: unknown) {
      const attemptMs = Date.now() - attemptStart;

      // Try to extract an HTTP status code from the error if available
      let status: number | null = null;
      let errorMessage = "An unexpected error occurred.";

      if (error instanceof Error) {
        errorMessage = error.message;
        // @google/genai surfaces status in error.status or within the message
        const errWithStatus = error as Error & { status?: number; statusCode?: number };
        if (typeof errWithStatus.status === "number") {
          status = errWithStatus.status;
        } else if (typeof errWithStatus.statusCode === "number") {
          status = errWithStatus.statusCode;
        } else {
          // Attempt to parse status code from the message text e.g. "… 503 …"
          const match = errorMessage.match(/\b(4\d{2}|5\d{2})\b/);
          if (match) {
            status = parseInt(match[1], 10);
          }
        }
      }

      const record: AttemptRecord = {
        attempt: attemptNum,
        latencyMs: attemptMs,
        success: false,
        status,
        errorMessage,
      };
      attempts.push(record);

      const statusLabel = status !== null ? `${status} — ` : "";
      console.log(
        `[Gemma] Attempt ${attemptNum} failed — ${statusLabel}${attemptMs}ms`
      );
      lastError = error;
      break; // No retry — preserve existing behavior
    }
  }

  const totalMs = Date.now() - totalStart;
  console.log(`[Gemma] Total request time: ${totalMs}ms`);
  console.log(`[Gemma] Total attempts: ${attempts.length}`);

  const diagnostics = {
    totalAttempts: attempts.length,
    attempts: attempts.map((a) => ({
      attempt: a.attempt,
      latencyMs: a.latencyMs,
      success: a.success,
      status: a.status,
    })),
  };

  // ── Handle failure ────────────────────────────────────────────────────────
  if (successOutput === null) {
    const message =
      lastError instanceof Error
        ? lastError.message
        : "An unexpected error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to analyze context: ${message}`,
      },
      { status: 500 }
    );
  }

  // ── Parse and validate the successful output ──────────────────────────────
  try {
    const parsedJson = extractAndParseJson(successOutput);
    const validatedContext = validateAndNormalizeMissionContext(parsedJson);

    return NextResponse.json({
      success: true,
      context: validatedContext,
      latencyMs: totalMs,
      diagnostics,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to analyze context: ${message}`,
      },
      { status: 500 }
    );
  }
}
