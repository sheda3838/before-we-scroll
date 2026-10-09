// MissionPlan schema representing the generated outdoor mission
export interface MissionPlan {
  title: string | null; // Short mission title
  description: string | null; // Detailed mission description
  activities: string[]; // List of activity steps
  estimatedDurationMinutes: number | null; // Total estimated duration
  participants: number | null; // Number of participants
  equipmentNeeded: string[]; // List of required equipment
  safetyNotes: string[]; // Safety considerations
}
