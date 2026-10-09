import {
  MissionContext,
  IntensityLevel,
  IndoorOutdoor,
  SpaceSize,
} from "@/types/missionContext";

function normalizeString(val: unknown): string | null {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizeNumber(val: unknown): number | null {
  if (typeof val === "number" && !Number.isNaN(val) && val > 0) {
    return Math.round(val);
  }
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeBoolean(val: unknown): boolean | null {
  if (typeof val === "boolean") {
    return val;
  }
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return null;
}

function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) {
    return [];
  }
  return val
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function normalizeIntensity(val: unknown): IntensityLevel {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "low" || lower === "medium" || lower === "high") {
      return lower;
    }
  }
  return null;
}

function normalizeIndoorOutdoor(val: unknown): IndoorOutdoor {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "indoor" || lower === "outdoor") {
      return lower;
    }
  }
  return null;
}

function normalizeSpaceSize(val: unknown): SpaceSize {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "small" || lower === "medium" || lower === "large") {
      return lower;
    }
  }
  return null;
}

/**
 * Safely extract and parse JSON from LLM output, handling markdown codeblocks or leading/trailing text.
 */
export function extractAndParseJson(rawText: string): unknown {
  let cleaned = rawText.trim();

  // Strip markdown fences
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt extracting the first outermost JSON object
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const candidate = cleaned.substring(startIdx, endIdx + 1);
      return JSON.parse(candidate);
    }
    throw new Error("No valid JSON structure found in model response.");
  }
}

/**
 * Validates and strictly coerces an unknown input object into a valid MissionContext object.
 * Missing or invalid fields are normalized safely to null or [].
 */
export function validateAndNormalizeMissionContext(raw: unknown): MissionContext {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const envObj = (
    typeof obj.environment === "object" && obj.environment !== null
      ? obj.environment
      : {}
  ) as Record<string, unknown>;

  const constraintsObj = (
    typeof obj.constraints === "object" && obj.constraints !== null
      ? obj.constraints
      : {}
  ) as Record<string, unknown>;

  return {
    peopleCount: normalizeNumber(obj.peopleCount),
    durationMinutes: normalizeNumber(obj.durationMinutes),
    activityGoal: normalizeString(obj.activityGoal),
    intensity: normalizeIntensity(obj.intensity),
    ageGroup: normalizeString(obj.ageGroup),

    environment: {
      type: normalizeString(envObj.type),
      indoorOutdoor: normalizeIndoorOutdoor(envObj.indoorOutdoor),
      spaceSize: normalizeSpaceSize(envObj.spaceSize),
      surface: normalizeString(envObj.surface),
      features: normalizeStringArray(envObj.features),
      obstacles: normalizeStringArray(envObj.obstacles),
    },

    equipmentAvailable: normalizeStringArray(obj.equipmentAvailable),

    constraints: {
      noRunning: normalizeBoolean(constraintsObj.noRunning),
      kidFriendly: normalizeBoolean(constraintsObj.kidFriendly),
      quietActivity: normalizeBoolean(constraintsObj.quietActivity),
    },
  };
}
