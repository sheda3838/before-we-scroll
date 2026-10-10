/**
 * Public DTO for a community-shared Outventure completion.
 *
 * Contains ONLY the fields safe to expose to unauthenticated browsers.
 * Never include sessionId, full MissionContext, internal feedback fields,
 * sharing-consent booleans, or MongoDB metadata.
 */
export type PublicOutventure = {
  id: string;
  missionTitle: string;
  missionShortDescription: string;
  durationMinutes: number;
  intensity: "low" | "medium" | "high";
  rating: number;
  comment: string;
  completedAt: string;
  photoUrl: string | null;
};
