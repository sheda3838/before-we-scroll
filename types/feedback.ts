export type FeedbackRating = 1 | 2 | 3 | 4 | 5;
export type ContextMatchOption = "yes" | "mostly" | "no";
export type InstructionAccuracyOption = "yes" | "mostly" | "no";
export type DifficultyOption = "too-easy" | "just-right" | "too-hard";

export interface MissionFeedback {
  rating: FeedbackRating | null;
  contextMatch: ContextMatchOption | null;
  instructionsAccurate: InstructionAccuracyOption | null;
  difficulty: DifficultyOption | null;
  comment: string;
  completionPhoto: File | null;
  shareFeedbackPublicly: boolean;
  sharePhotoPublicly: boolean;
}

export interface CompletedMissionSummary {
  id: string;
  title: string;
  shortDescription: string;
  durationMinutes: number;
  intensity: string;
  players: string;
}

export interface CompletedMissionFeedbackSubmission {
  mission: CompletedMissionSummary;
  feedback: {
    rating: FeedbackRating;
    contextMatch: ContextMatchOption | null;
    instructionsAccurate: InstructionAccuracyOption | null;
    difficulty: DifficultyOption | null;
    comment: string;
    shareFeedbackPublicly: boolean;
    sharePhotoPublicly: boolean;
  };
  completionPhoto: File | null;
  completedAt: string; // ISO 8601 string
}
