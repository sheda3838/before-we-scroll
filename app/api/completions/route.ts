import { NextRequest, NextResponse } from "next/server";
import { getCompletionsCollection } from "@/lib/mongodb";
import type {
  CompletionSubmissionPayload,
  CompletionDocument,
  CompletionApiResponse,
} from "@/types/completion";
import type { FeedbackRating, ContextMatchOption, InstructionAccuracyOption, DifficultyOption } from "@/types/feedback";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Invalid content type. Expected application/json." },
        { status: 400 }
      );
    }

    let body: Partial<CompletionSubmissionPayload>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json<CompletionApiResponse>(
        { success: false, error: "Invalid JSON payload." },
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

    // 5. Construct normalized completion document
    const now = new Date();
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
      photo: null,
      createdAt: now,
      updatedAt: now,
    };

    // 6. Insert into MongoDB
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

    return NextResponse.json<CompletionApiResponse>(
      {
        success: false,
        error: "Unable to save completion.",
      },
      { status: 500 }
    );
  }
}
