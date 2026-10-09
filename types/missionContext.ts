export type IntensityLevel = "low" | "medium" | "high" | null;
export type IndoorOutdoor = "indoor" | "outdoor" | null;
export type SpaceSize = "small" | "medium" | "large" | null;

export interface MissionEnvironment {
  type: string | null;
  indoorOutdoor: IndoorOutdoor;
  spaceSize: SpaceSize;
  surface: string | null;
  features: string[];
  obstacles: string[];
}

export interface MissionConstraints {
  noRunning: boolean | null;
  kidFriendly: boolean | null;
  quietActivity: boolean | null;
}

export interface MissionContext {
  peopleCount: number | null;
  durationMinutes: number | null;
  activityGoal: string | null;
  intensity: IntensityLevel;
  ageGroup: string | null;

  environment: MissionEnvironment;

  equipmentAvailable: string[];

  constraints: MissionConstraints;
}

export function createEmptyMissionContext(): MissionContext {
  return {
    peopleCount: null,
    durationMinutes: null,
    activityGoal: null,
    intensity: null,
    ageGroup: null,
    environment: {
      type: null,
      indoorOutdoor: null,
      spaceSize: null,
      surface: null,
      features: [],
      obstacles: [],
    },
    equipmentAvailable: [],
    constraints: {
      noRunning: null,
      kidFriendly: null,
      quietActivity: null,
    },
  };
}
