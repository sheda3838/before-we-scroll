import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemma-4-26b-a4b-it";
const TEST_PROMPT =
  "You are the AI engine for Before We Scroll. Reply with one short sentence confirming that the Gemma API connection is working.";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing GEMINI_API_KEY environment variable in server environment.",
      },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: TEST_PROMPT,
    });
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    const responseText = response.text?.trim() || "";

    return NextResponse.json({
      success: true,
      model: MODEL_NAME,
      response: responseText,
      latencyMs,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to call Gemma API: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
