// Re-export new Mission types and maintain backward compatibility
export type { Mission, MissionIntensity, MissionGenerationResponse } from './mission';

export interface MissionPlan {
  title: string | null;
  description: string | null;
  activities: string[];
  estimatedDurationMinutes: number | null;
  participants: number | null;
  equipmentNeeded: string[];
  safetyNotes: string[];
}
