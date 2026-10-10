import { Mission, MissionIntensity } from "@/types/mission";
import { MissionContext } from "@/types/missionContext";
import { MissionPlan } from "@/types/missionPlan";

/**
 * Validates and strictly normalizes an unknown LLM output into exactly 3 Mission objects.
 * Returns null if the structure is fundamentally invalid or missing required fields.
 */
export function validateAndNormalizeMissions(
  raw: unknown,
  context?: MissionContext
): Mission[] | null {
  if (!raw || typeof raw !== "object") return null;

  const rawObj = raw as Record<string, unknown>;
  const list = Array.isArray(rawObj.missions)
    ? rawObj.missions
    : Array.isArray(raw)
    ? (raw as unknown[])
    : null;

  if (!list || list.length !== 3) return null;

  const normalized: Mission[] = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== "object") return null;
    const m = item as Record<string, unknown>;

    const title = typeof m.title === "string" ? m.title.trim() : "";
    const shortDescription =
      typeof m.shortDescription === "string" ? m.shortDescription.trim() : "";
    if (!title || !shortDescription) return null;

    const id =
      typeof m.id === "string" && m.id.trim() ? m.id.trim() : `mission-${i + 1}`;

    const durationMinutes =
      typeof m.durationMinutes === "number" && m.durationMinutes > 0
        ? Math.round(m.durationMinutes)
        : typeof m.durationMinutes === "string" && parseInt(m.durationMinutes, 10) > 0
        ? parseInt(m.durationMinutes, 10)
        : context?.durationMinutes || 20;

    let intensity: MissionIntensity = "medium";
    if (typeof m.intensity === "string") {
      const lower = m.intensity.toLowerCase().trim();
      if (lower === "low" || lower === "medium" || lower === "high") {
        intensity = lower;
      } else if (context?.intensity) {
        intensity = context.intensity;
      }
    } else if (context?.intensity) {
      intensity = context.intensity;
    }

    const players =
      typeof m.players === "string" && m.players.trim()
        ? m.players.trim()
        : context?.peopleCount
        ? `${context.peopleCount} ${context.peopleCount === 1 ? "person" : "people"}`
        : "Any group size";

    // Strict equipment rule: if context has no equipmentAvailable, equipmentNeeded MUST be []
    let equipmentNeeded: string[] = [];
    const contextHasEquipment =
      Array.isArray(context?.equipmentAvailable) &&
      context!.equipmentAvailable.length > 0;

    if (contextHasEquipment && Array.isArray(m.equipmentNeeded)) {
      equipmentNeeded = m.equipmentNeeded
        .filter((eq) => typeof eq === "string" && eq.trim().length > 0)
        .map((eq) => (eq as string).trim());
    } else {
      equipmentNeeded = [];
    }

    const whyItFits = typeof m.whyItFits === "string" ? m.whyItFits.trim() : "";

    const rawSteps = Array.isArray(m.steps) ? m.steps : [];
    const steps = rawSteps
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => (s as string).trim());
    if (steps.length === 0) return null;

    const rawSafety = Array.isArray(m.safetyNotes) ? m.safetyNotes : [];
    const safetyNotes = rawSafety
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => (s as string).trim());

    normalized.push({
      id,
      title,
      shortDescription,
      durationMinutes,
      intensity,
      players,
      equipmentNeeded,
      whyItFits,
      steps,
      safetyNotes,
    });
  }

  return normalized.length === 3 ? normalized : null;
}

/**
 * Legacy single-plan normalizer preserved for backward compatibility.
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

  if (typeof input !== "object" || input === null) {
    return defaultPlan;
  }

  const obj = input as Record<string, unknown>;

  const safeString = (val: unknown): string | null =>
    typeof val === "string" && val.trim().length > 0 ? val.trim() : null;

  const safeNumber = (val: unknown): number | null => {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const safeStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) {
      return val
        .filter((v) => typeof v === "string" && (v as string).trim().length > 0)
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
