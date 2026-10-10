import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { ObjectId } from "mongodb";
import { getCompletionsCollection, getCompletionPhotosBucket } from "@/lib/mongodb";
import type {
  CompletionSubmissionPayload,
  CompletionDocument,
  CompletionApiResponse,
  StoredCompletionPhoto,
} from "@/types/completion";
import type { FeedbackRating, ContextMatchOption, InstructionAccuracyOption, DifficultyOption } from "@/types/feedback";

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validate image buffer against known magic byte signatures.
 * Never trust client MIME or filename extension alone.
 */
function detectImageMimeType(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(req: NextRequest) {
  let uploadedGridFsId: ObjectId | null = null;

  try {
    const contentType = req.headers.get("content-type") || "";

    let body: Partial<CompletionSubmissionPayload> | null = null;
    let photoFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Invalid multipart form data." },
          { status: 400 }
        );
      }

      const payloadRaw = formData.get("payload");
      if (!payloadRaw || typeof payloadRaw !== "string") {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Missing payload in form data." },
          { status: 400 }
        );
      }

      try {
        body = JSON.parse(payloadRaw);
      } catch {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Invalid JSON in payload field." },
          { status: 400 }
        );
      }

      const rawPhoto = formData.get("photo");
      if (rawPhoto && typeof rawPhoto === "object" && typeof (rawPhoto as File).arrayBuffer === "function") {
        photoFile = rawPhoto as File;
      }
    } else if (contentType.includes("application/json")) {
      try {
        body = await req.json();
      } catch {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Invalid JSON payload." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Invalid content type. Expected multipart/form-data or application/json." },
        { status: 400 }
      );
    }

    if (!body) {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Missing completion payload." },
        { status: 400 }
      );
    }

    const { sessionId, context, mission, execution, feedback } = body;

    // 1. Session ID validation
    if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Missing or invalid sessionId." },
        { status: 400 }
      );
    }

    // 2. Mission validation
    if (!mission || typeof mission !== "object" || !mission.title || typeof mission.durationMinutes !== "number") {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Missing or invalid mission details." },
        { status: 400 }
      );
    }

    // 3. Execution validation
    if (
      !execution ||
      typeof execution !== "object" ||
      !execution.startedAt ||
      !execution.expectedEndAt ||
      !execution.completedAt ||
      typeof execution.completedEarly !== "boolean"
    ) {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Missing or invalid execution timestamps." },
        { status: 400 }
      );
    }

    // 4. Feedback validation
    if (!feedback || typeof feedback !== "object") {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Missing feedback object." },
        { status: 400 }
      );
    }

    const validRatings: FeedbackRating[] = [1, 2, 3, 4, 5];
    if (!validRatings.includes(feedback.rating as FeedbackRating)) {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Rating must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    const validContextMatch: ContextMatchOption[] = ["yes", "mostly", "no"];
    const normalizedContextMatch =
      feedback.contextMatch && validContextMatch.includes(feedback.contextMatch as ContextMatchOption)
        ? (feedback.contextMatch as ContextMatchOption)
        : null;

    const validAccuracy: InstructionAccuracyOption[] = ["yes", "mostly", "no"];
    const normalizedAccuracy =
      feedback.instructionsAccurate && validAccuracy.includes(feedback.instructionsAccurate as InstructionAccuracyOption)
        ? (feedback.instructionsAccurate as InstructionAccuracyOption)
        : null;

    const validDifficulty: DifficultyOption[] = ["too-easy", "just-right", "too-hard"];
    const normalizedDifficulty =
      feedback.difficulty && validDifficulty.includes(feedback.difficulty as DifficultyOption)
        ? (feedback.difficulty as DifficultyOption)
        : null;

    const normalizedComment = typeof feedback.comment === "string"
      ? feedback.comment.trim().slice(0, 1000)
      : "";

    const shareFeedbackPublicly = Boolean(feedback.shareFeedbackPublicly);
    // Public photo sharing strictly requires public feedback sharing
    const sharePhotoPublicly = shareFeedbackPublicly && Boolean(feedback.sharePhotoPublicly);

    // 5. Optional photo validation & GridFS persistence
    const now = new Date();
    let storedPhotoMeta: StoredCompletionPhoto | null = null;

    if (photoFile && photoFile.size > 0) {
      // Validate file size (max 10MB)
      if (photoFile.size > MAX_PHOTO_SIZE_BYTES) {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Photo size exceeds maximum limit of 10MB." },
          { status: 400 }
        );
      }

      // Validate declared MIME type
      if (!ALLOWED_MIME_TYPES.includes(photoFile.type)) {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Unsupported image type. Allowed formats: JPEG, PNG, WebP." },
          { status: 400 }
        );
      }

      const photoBuffer = Buffer.from(await photoFile.arrayBuffer());

      // Validate binary magic bytes signature
      const detectedMime = detectImageMimeType(photoBuffer);
      if (!detectedMime) {
        return NextResponse.json<CompletionApiResponse>(
          { success: false, error: "Invalid image content. File signature does not match JPEG, PNG, or WebP." },
          { status: 400 }
        );
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extMap[detectedMime] || "jpg";
      const safeFilename = `completion-${crypto.randomUUID()}.${ext}`;

      const bucket = await getCompletionPhotosBucket();
      const uploadStream = bucket.openUploadStream(safeFilename, {
        metadata: {
          completionPurpose: "mission-completion",
          mimeType: detectedMime,
          uploadedAt: now,
        },
      });

      uploadedGridFsId = uploadStream.id;

      await new Promise<void>((resolve, reject) => {
        uploadStream.on("finish", () => resolve());
        uploadStream.on("error", (err) => reject(err));
        uploadStream.end(photoBuffer);
      });

      storedPhotoMeta = {
        gridFsFileId: uploadedGridFsId,
        mimeType: detectedMime,
        filename: safeFilename,
        size: photoBuffer.length,
        uploadedAt: now,
      };
    }

    // 6. Construct normalized completion document
    const document: CompletionDocument = {
      sessionId: sessionId.trim(),
      context: {
        peopleCount: typeof context?.peopleCount === "number" ? context.peopleCount : null,
        durationMinutes: typeof context?.durationMinutes === "number" ? context.durationMinutes : null,
        activityGoal: typeof context?.activityGoal === "string" ? context.activityGoal.trim() : null,
        intensity: context?.intensity || null,
        ageGroup: typeof context?.ageGroup === "string" ? context.ageGroup.trim() : null,
        environment: {
          type: typeof context?.environment?.type === "string" ? context.environment.type.trim() : null,
          indoorOutdoor: context?.environment?.indoorOutdoor || null,
          spaceSize: context?.environment?.spaceSize || null,
          surface: typeof context?.environment?.surface === "string" ? context.environment.surface.trim() : null,
          features: Array.isArray(context?.environment?.features) ? context.environment.features : [],
          obstacles: Array.isArray(context?.environment?.obstacles) ? context.environment.obstacles : [],
        },
        equipmentAvailable: Array.isArray(context?.equipmentAvailable) ? context.equipmentAvailable : [],
        constraints: {
          noRunning: typeof context?.constraints?.noRunning === "boolean" ? context.constraints.noRunning : null,
          kidFriendly: typeof context?.constraints?.kidFriendly === "boolean" ? context.constraints.kidFriendly : null,
          quietActivity: typeof context?.constraints?.quietActivity === "boolean" ? context.constraints.quietActivity : null,
        },
      },
      mission: {
        id: String(mission.id || ""),
        title: String(mission.title || "").trim(),
        shortDescription: String(mission.shortDescription || "").trim(),
        durationMinutes: Number(mission.durationMinutes) || 0,
        intensity: mission.intensity || "medium",
        players: String(mission.players || "").trim(),
        equipmentNeeded: Array.isArray(mission.equipmentNeeded) ? mission.equipmentNeeded : [],
        whyItFits: String(mission.whyItFits || "").trim(),
        steps: Array.isArray(mission.steps) ? mission.steps : [],
        safetyNotes: Array.isArray(mission.safetyNotes) ? mission.safetyNotes : [],
      },
      execution: {
        startedAt: String(execution.startedAt),
        expectedEndAt: String(execution.expectedEndAt),
        completedAt: String(execution.completedAt),
        completedEarly: Boolean(execution.completedEarly),
      },
      feedback: {
        rating: feedback.rating as FeedbackRating,
        contextMatch: normalizedContextMatch,
        instructionsAccurate: normalizedAccuracy,
        difficulty: normalizedDifficulty,
        comment: normalizedComment,
        shareFeedbackPublicly,
        sharePhotoPublicly,
      },
      photo: storedPhotoMeta,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Insert into MongoDB completions collection
    const collection = await getCompletionsCollection();
    const result = await collection.insertOne(document);

    return NextResponse.json<CompletionApiResponse>(
      {
        success: true,
        completionId: result.insertedId.toString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/completions] Save failure:", errorMsg);

    // Section 10: Clean up orphaned GridFS file if document insertion failed
    if (uploadedGridFsId) {
      try {
        const bucket = await getCompletionPhotosBucket();
        await bucket.delete(uploadedGridFsId);
      } catch (cleanupErr) {
        console.error("[POST /api/completions] Failed to clean up orphaned GridFS file:", cleanupErr);
      }
    }

    return NextResponse.json<CompletionApiResponse>(
      {
        success: false,
        error: "Unable to save completion.",
      },
      { status: 500 }
    );
  }
}
