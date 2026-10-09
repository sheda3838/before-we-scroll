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
// Multimodal Prompt Builder
// ---------------------------------------------------------------------------

function buildMultimodalExtractionPrompt(
  userText: string | null,
  hasImage: boolean
): string {
  const parts: string[] = [
    `You are the context extraction engine for Outventure AI.`,
    ``,
    `Your job is to extract mission context into a structured MissionContext JSON object.`,
    ``,
  ];

  if (userText && hasImage) {
    parts.push(
      `SOURCES PROVIDED:`,
      `1. User natural language request: "${userText}"`,
      `2. Environment photograph of the user's surroundings.`,
      ``,
      `EXTRACTION & MERGING RULES:`,
      `- Extract user intent (peopleCount, durationMinutes, activityGoal, intensity, ageGroup, constraints, explicitly requested equipment) from the user text.`,
      `- Extract physical environment details (type, indoorOutdoor, spaceSize, surface, features, obstacles) and clearly visible equipment from the image.`,
      `- If user text and image conflict on physical location (e.g. text says "outside in a park" but image clearly shows an indoor room), prioritize the visible image evidence for physical environment fields (type, indoorOutdoor, surface, features).`,
      `- Combine both sources into ONE single MissionContext object. Do not return separate objects.`
    );
  } else if (hasImage) {
    parts.push(
      `SOURCE PROVIDED:`,
      `1. Environment photograph of the surroundings. (No user text provided)`,
      ``,
      `EXTRACTION RULES:`,
      `- Extract physical environment details (type, indoorOutdoor, spaceSize, surface, features, obstacles) and clearly visible equipment directly from the image.`,
      `- Do NOT assume or invent peopleCount, durationMinutes, activityGoal, intensity, ageGroup, or constraints from an environment image alone. Return null for those scalar fields.`
    );
  } else {
    parts.push(
      `SOURCE PROVIDED:`,
      `1. User natural language request: "${userText}"`,
      ``,
      `EXTRACTION RULES:`,
      `- Extract only information explicitly stated or safely implied by the user text.`
    );
  }

  parts.push(
    ``,
    `GENERAL RULES:`,
    `- Do not invent information. Do not assume defaults.`,
    `- Broad spaceSize estimation only: "small", "medium", or "large". Do not guess exact measurements.`,
    `- Equipment distinction: only clearly visible, usable activity equipment (e.g. football, volleyball, frisbee, cones, ball, ropes) belongs in equipmentAvailable. Built fixtures (park benches, slides, swings, patio chairs, tables, fences) belong in environment.features.`,
    `- For every unknown scalar field, return null.`,
    `- For unknown list fields, return [].`,
    ``,
    `Return ONLY valid JSON matching this schema:`,
    `{`,
    `  "peopleCount": number | null,`,
    `  "durationMinutes": number | null,`,
    `  "activityGoal": string | null,`,
    `  "intensity": "low" | "medium" | "high" | null,`,
    `  "ageGroup": string | null,`,
    `  "environment": {`,
    `    "type": string | null,`,
    `    "indoorOutdoor": "indoor" | "outdoor" | null,`,
    `    "spaceSize": "small" | "medium" | "large" | null,`,
    `    "surface": string | null,`,
    `    "features": string[],`,
    `    "obstacles": string[]`,
    `  },`,
    `  "equipmentAvailable": string[],`,
    `  "constraints": {`,
    `    "noRunning": boolean | null,`,
    `    "kidFriendly": boolean | null,`,
    `    "quietActivity": boolean | null`,
    `  }`,
    `}`,
    ``,
    `Do not include markdown code fences or explanations.`
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Route handler (supports Text-only, Image-only, and Text + Image)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
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

  const contentType = request.headers.get("content-type") || "";

  let userText: string | null = null;
  let imageBuffer: Buffer | null = null;
  let imageMimeType: string | null = null;

  // ── Parse multipart/form-data or application/json ─────────────────────────
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Malformed form data request.",
        },
        { status: 400 }
      );
    }

    const textEntry = formData.get("text");
    if (typeof textEntry === "string" && textEntry.trim().length > 0) {
      userText = textEntry.trim();
    }

    const fileEntry = formData.get("image");
    if (fileEntry instanceof File && fileEntry.size > 0) {
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedMimes.includes(fileEntry.type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Unsupported image format. Please upload JPEG, PNG, or WebP.",
          },
          { status: 400 }
        );
      }

      // 10MB limit
      if (fileEntry.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: "Image exceeds the maximum allowed 10MB file size.",
          },
          { status: 400 }
        );
      }

      try {
        const arrayBuffer = await fileEntry.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        imageMimeType = fileEntry.type;
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to read image data.",
          },
          { status: 400 }
        );
      }
    }
  } else {
    // JSON fallback
    try {
      const body = await request.json();
      if (
        body &&
        typeof body === "object" &&
        "text" in body &&
        typeof (body as { text: unknown }).text === "string" &&
        (body as { text: string }).text.trim().length > 0
      ) {
        userText = (body as { text: string }).text.trim();
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Malformed JSON request body.",
        },
        { status: 400 }
      );
    }
  }

  // Reject only when BOTH text and image are missing
  if (!userText && !imageBuffer) {
    return NextResponse.json(
      {
        success: false,
        error: "Please provide either activity text or an environment photo.",
      },
      { status: 400 }
    );
  }

  const prompt = buildMultimodalExtractionPrompt(userText, !!imageBuffer);

  // ── Prepare contents for Google GenAI ─────────────────────────────────────
  const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

  if (imageBuffer && imageMimeType) {
    contents.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBuffer.toString("base64"),
      },
    });
  }
  contents.push(prompt);

  // ── Model call with attempt instrumentation ───────────────────────────────
  const totalStart = Date.now();
  const ai = new GoogleGenAI({ apiKey });
  const attempts: AttemptRecord[] = [];

  const MAX_ATTEMPTS = 1;
  let lastError: unknown = null;
  let successOutput: string | null = null;

  for (let attemptNum = 1; attemptNum <= MAX_ATTEMPTS; attemptNum++) {
    const attemptStart = Date.now();
    console.log(`[Analyze] Attempt ${attemptNum} started (model: ${MODEL_NAME})`);

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
      });

      const attemptMs = Date.now() - attemptStart;
      const rawOutput = response.text?.trim() || "";

      if (!rawOutput) {
        const record: AttemptRecord = {
          attempt: attemptNum,
          latencyMs: attemptMs,
          success: false,
          status: null,
          errorMessage: "Empty response received from extraction model.",
        };
        attempts.push(record);
        console.log(`[Analyze] Attempt ${attemptNum} failed — empty response — ${attemptMs}ms`);
        lastError = new Error("Empty response received from extraction model.");
        break;
      }

      const record: AttemptRecord = {
        attempt: attemptNum,
        latencyMs: attemptMs,
        success: true,
        status: 200,
      };
      attempts.push(record);
      console.log(`[Analyze] Attempt ${attemptNum} succeeded — ${attemptMs}ms`);
      successOutput = rawOutput;
      break;
    } catch (error: unknown) {
      const attemptMs = Date.now() - attemptStart;

      let status: number | null = null;
      let errorMessage = "An unexpected error occurred.";

      if (error instanceof Error) {
        errorMessage = error.message;
        const errWithStatus = error as Error & { status?: number; statusCode?: number };
        if (typeof errWithStatus.status === "number") {
          status = errWithStatus.status;
        } else if (typeof errWithStatus.statusCode === "number") {
          status = errWithStatus.statusCode;
        } else {
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
      console.log(`[Analyze] Attempt ${attemptNum} failed — ${statusLabel}${attemptMs}ms`);
      lastError = error;
      break;
    }
  }

  const totalMs = Date.now() - totalStart;
  console.log(`[Analyze] Total request time: ${totalMs}ms, attempts: ${attempts.length}`);

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
