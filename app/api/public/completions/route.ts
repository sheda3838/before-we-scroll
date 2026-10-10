import { NextResponse } from "next/server";
import { getCompletionsCollection } from "@/lib/mongodb";
import type { CommunityStory } from "@/types/communityStory";

// Maximum records returned on a single request
const MAX_RESULTS = 6;

export async function GET() {
  try {
    const collection = await getCompletionsCollection();

    // Strict server-side filter: only publicly consented records
    const cursor = collection
      .find(
        { "feedback.shareFeedbackPublicly": true },
        {
          // Explicitly project ONLY the fields needed for the public DTO.
          // All other fields are excluded by default when projection is used.
          projection: {
            _id: 1,
            "mission.title": 1,
            "mission.shortDescription": 1,
            "mission.durationMinutes": 1,
            "mission.intensity": 1,
            "feedback.rating": 1,
            "feedback.comment": 1,
            "feedback.sharePhotoPublicly": 1,
            "execution.completedAt": 1,
            photo: 1,
          },
        }
      )
      .sort({ "execution.completedAt": -1 })
      .limit(MAX_RESULTS);

    const docs = await cursor.toArray();

    const stories: CommunityStory[] = docs.map((doc) => {
      // Only expose application photo URL when BOTH photo sharing consent AND a GridFS photo exist.
      // Existing records with photo: null safely yield photoUrl: null.
      const hasPhotoConsent = Boolean(doc.feedback?.sharePhotoPublicly);
      const hasPhoto = Boolean(doc.photo?.gridFsFileId);
      const completionId = doc._id!.toString();
      const photoUrl =
        hasPhotoConsent && hasPhoto
          ? `/api/public/completions/${completionId}/photo`
          : null;

      return {
        id: doc._id!.toString(),
        missionTitle: String(doc.mission?.title ?? ""),
        missionShortDescription: String(doc.mission?.shortDescription ?? ""),
        durationMinutes: Number(doc.mission?.durationMinutes ?? 0),
        intensity: (doc.mission?.intensity ?? "medium") as
          | "low"
          | "medium"
          | "high",
        rating: Number(doc.feedback?.rating ?? 0),
        comment: String(doc.feedback?.comment ?? ""),
        completedAt: String(doc.execution?.completedAt ?? ""),
        photoUrl,
      };
    });

    return NextResponse.json<{
      stories: CommunityStory[];
      beforeWeScrolls: CommunityStory[];
    }>(
      { stories, beforeWeScrolls: stories },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/public/completions] Error:", message);

    // Do NOT expose internal error details publicly
    return NextResponse.json(
      { stories: [], beforeWeScrolls: [] },
      { status: 500 }
    );
  }
}
