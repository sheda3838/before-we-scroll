import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

const ALLOWED_MIME_PREFIXES = ["audio/"];
const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "video/webm", // Fallback for browsers recording audio into webm containers
]);

function getExtensionFromMime(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("mp4") || lower.includes("m4a")) return "mp4";
  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  if (lower.includes("wav")) return "wav";
  return "webm";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("[Transcription] ELEVENLABS_API_KEY is not configured in environment.");
      return NextResponse.json(
        { success: false, error: "Unable to transcribe audio." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Unable to transcribe audio." },
        { status: 400 }
      );
    }

    // Size validation
    if (audio.size === 0 || audio.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Unable to transcribe audio." },
        { status: 400 }
      );
    }

    // MIME type check
    const mimeType = audio.type || "audio/webm";
    const isValidType =
      ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) ||
      ALLOWED_MIME_TYPES.has(mimeType);

    if (!isValidType) {
      return NextResponse.json(
        { success: false, error: "Unable to transcribe audio." },
        { status: 400 }
      );
    }

    const ext = getExtensionFromMime(mimeType);
    const filename = `audio.${ext}`;

    // Send audio file to ElevenLabs Speech-to-Text API
    const elevenFormData = new FormData();
    elevenFormData.append("file", audio, filename);
    elevenFormData.append("model_id", "scribe_v1");

    const elevenResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: elevenFormData,
    });

    if (!elevenResponse.ok) {
      console.error(`[Transcription] ElevenLabs STT returned non-OK status: ${elevenResponse.status}`);
      return NextResponse.json(
        { success: false, error: "Unable to transcribe audio." },
        { status: 502 }
      );
    }

    const data = await elevenResponse.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";

    return NextResponse.json({
      success: true,
      text,
    });
  } catch (error: unknown) {
    console.error("[Transcription] Error processing transcription request:", error);
    return NextResponse.json(
      { success: false, error: "Unable to transcribe audio." },
      { status: 500 }
    );
  }
}
