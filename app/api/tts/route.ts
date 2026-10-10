import { NextResponse } from "next/server";
import {
  ELEVENLABS_TTS_VOICE_ID,
  ELEVENLABS_TTS_MODEL_ID,
  MAX_NARRATION_TEXT_LENGTH,
} from "@/lib/ttsConfig";
import { buildMissionNarrationScript } from "@/lib/narrationBuilder";
import type { Mission } from "@/types/mission";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("[TTS] ELEVENLABS_API_KEY is not configured in environment.");
      return NextResponse.json(
        { success: false, error: "Narration service is currently unavailable." },
        { status: 500 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Invalid content type. Expected application/json." },
        { status: 400 }
      );
    }

    let body: { mission?: Mission; mode?: string; text?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    const narrationMode: "full" | "steps" = body.mode === "steps" ? "steps" : "full";
    let spokenText = "";

    if (body.mission && typeof body.mission === "object" && body.mission.title) {
      spokenText = buildMissionNarrationScript(body.mission, narrationMode);
    } else if (typeof body.text === "string" && body.text.trim().length > 0) {
      spokenText = body.text.trim();
    }

    if (!spokenText || spokenText.length === 0) {
      return NextResponse.json(
        { success: false, error: "No mission narration content provided." },
        { status: 400 }
      );
    }

    // Input length restriction to prevent abuse
    if (spokenText.length > MAX_NARRATION_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: "Narration text exceeds allowed length." },
        { status: 400 }
      );
    }

    // Call ElevenLabs Text-to-Speech API
    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_TTS_VOICE_ID}`;
    const elevenResponse = await fetch(elevenUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: spokenText,
        model_id: ELEVENLABS_TTS_MODEL_ID,
      }),
    });

    if (!elevenResponse.ok) {
      console.error(`[TTS] ElevenLabs returned non-OK status: ${elevenResponse.status}`);
      return NextResponse.json(
        { success: false, error: "Unable to generate narration." },
        { status: 502 }
      );
    }

    const audioArrayBuffer = await elevenResponse.arrayBuffer();

    return new NextResponse(audioArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[TTS] Error handling TTS request:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Unable to generate narration." },
      { status: 500 }
    );
  }
}
