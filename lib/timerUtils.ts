import { Mission } from "@/types/mission";

export const ACTIVE_MISSION_STORAGE_KEY = "outventure-active-mission";

export interface StoredActiveMission {
  mission: Mission;
  startedAt: number;
  expectedEndAt: number;
  warningTriggered?: boolean;
  completedAt?: number;
  completedEarly?: boolean;
}

/**
 * Returns the warning threshold in milliseconds based on total mission duration.
 * - <= 10 mins: warn at 1 min remaining
 * - 11-30 mins: warn at 5 mins remaining
 * - > 30 mins: warn at 10 mins remaining
 */
export function getWarningThresholdMs(durationMinutes: number): number {
  if (durationMinutes <= 10) {
    return 1 * 60 * 1000;
  }
  if (durationMinutes <= 30) {
    return 5 * 60 * 1000;
  }
  return 10 * 60 * 1000;
}

/**
 * Returns human-friendly text for the near-end warning.
 */
export function getWarningLabel(durationMinutes: number): string {
  if (durationMinutes <= 10) {
    return "Only 1 minute left!";
  }
  if (durationMinutes <= 30) {
    return "5 minutes remaining!";
  }
  return "10 minutes remaining!";
}

/**
 * Formats milliseconds into MM:SS or HH:MM:SS string.
 */
export function formatCountdown(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Formats milliseconds into an accessible verbal string for aria-labels.
 */
export function formatAccessibleTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);

  return `${parts.join(" ")} remaining`;
}
