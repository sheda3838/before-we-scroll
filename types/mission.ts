export type MissionIntensity = "low" | "medium" | "high";

export interface Mission {
  id: string;
  title: string;
  shortDescription: string;
  durationMinutes: number;
  intensity: MissionIntensity;
  players: string;
  equipmentNeeded: string[];
  whyItFits: string;
  steps: string[];
  safetyNotes: string[];
}

export interface MissionGenerationResponse {
  success: boolean;
  missions?: Mission[];
  error?: string;
  diagnostics?: {
    model: string;
    latencyMs: number;
  };
}
