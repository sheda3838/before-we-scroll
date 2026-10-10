import type { ObjectId } from "mongodb";
import type { MissionContext } from "./missionContext";
import type { Mission } from "./mission";
import type {
  FeedbackRating,
  ContextMatchOption,
  InstructionAccuracyOption,
  DifficultyOption,
} from "./feedback";

export interface MissionExecutionInfo {
  startedAt: string;
  expectedEndAt: string;
  completedAt: string;
  completedEarly: boolean;
}

export interface FeedbackData {
  rating: FeedbackRating;
  contextMatch: ContextMatchOption | null;
  instructionsAccurate: InstructionAccuracyOption | null;
  difficulty: DifficultyOption | null;
  comment: string;
  shareFeedbackPublicly: boolean;
  sharePhotoPublicly: boolean;
}

export interface CompletionSubmissionPayload {
  sessionId: string;
  context: MissionContext;
  mission: Mission;
  execution: MissionExecutionInfo;
  feedback: FeedbackData;
}

export interface CompletionDocument {
  _id?: ObjectId;
  sessionId: string;
  context: MissionContext;
  mission: Mission;
  execution: MissionExecutionInfo;
  feedback: FeedbackData;
  photo: null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompletionApiResponse {
  success: boolean;
  completionId?: string;
  error?: string;
}
