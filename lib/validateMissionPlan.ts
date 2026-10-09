import { MissionPlan } from '@/types/missionPlan';

/**
 * Ensures the parsed object conforms to the MissionPlan schema.
 * Missing scalar fields are set to null, missing array fields to [].
 */
export function validateAndNormalizeMissionPlan(input: unknown): MissionPlan {
  const defaultPlan: MissionPlan = {
    title: null,
    description: null,
    activities: [],
    estimatedDurationMinutes: null,
    participants: null,
    equipmentNeeded: [],
    safetyNotes: [],
  };

  if (typeof input !== 'object' || input === null) {
    return defaultPlan;
  }

  const obj = input as Record<string, unknown>;

  const safeString = (val: unknown): string | null =>
    typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;

  const safeNumber = (val: unknown): number | null => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const safeStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) {
      return val
        .filter((v) => typeof v === 'string' && (v as string).trim().length > 0)
        .map((v) => (v as string).trim());
    }
    return [];
  };

  return {
    title: safeString(obj.title),
    description: safeString(obj.description),
    activities: safeStringArray(obj.activities),
    estimatedDurationMinutes: safeNumber(obj.estimatedDurationMinutes),
    participants: safeNumber(obj.participants),
    equipmentNeeded: safeStringArray(obj.equipmentNeeded),
    safetyNotes: safeStringArray(obj.safetyNotes),
  };
}
