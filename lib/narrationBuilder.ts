import { Mission } from "@/types/mission";

export type NarrationMode = "full" | "steps";

/**
 * Builds a concise narration script containing only the steps and safety reminders for active countdown.
 */
export function buildMissionStepsNarration(mission: Mission): string {
  const parts: string[] = [];

  // 1. Opening
  parts.push("Here are the mission steps again.");

  // 2. Steps
  if (Array.isArray(mission.steps) && mission.steps.length > 0) {
    mission.steps.forEach((step, index) => {
      const cleanedStep = step.replace(/^step\s*\d+[:.]?\s*/i, "").trim();
      if (cleanedStep) {
        parts.push(`Step ${index + 1}. ${cleanedStep}`);
      }
    });
  }

  // 3. Safety notes
  if (Array.isArray(mission.safetyNotes) && mission.safetyNotes.length > 0) {
    const validNotes = mission.safetyNotes
      .map((note) => note.trim())
      .filter(Boolean);
    if (validNotes.length > 0) {
      parts.push("Remember these safety points.");
      validNotes.forEach((note) => {
        parts.push(note);
      });
    }
  }

  return parts.join("\n\n");
}

/**
 * Builds a complete spoken script with mission overview, equipment, steps, safety, and encouragement.
 */
export function buildFullMissionNarration(mission: Mission): string {
  const parts: string[] = [];

  // 1. Title & Short Description
  const title = mission.title?.trim();
  if (title) {
    parts.push(`Your mission is ${title}.`);
  }

  const shortDesc = mission.shortDescription?.trim();
  if (shortDesc) {
    parts.push(shortDesc);
  }

  // 2. Duration
  if (mission.durationMinutes) {
    parts.push(`You have ${mission.durationMinutes} minutes.`);
  }

  // 3. Players
  const players = mission.players?.trim();
  if (players) {
    parts.push(`This mission is for ${players}.`);
  }

  // 4. Equipment
  if (!mission.equipmentNeeded || mission.equipmentNeeded.length === 0) {
    parts.push("You don't need any equipment for this mission.");
  } else {
    const items = mission.equipmentNeeded
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
    if (items) {
      parts.push(`You will need: ${items}.`);
    } else {
      parts.push("You don't need any equipment for this mission.");
    }
  }

  // 5. Steps
  if (Array.isArray(mission.steps) && mission.steps.length > 0) {
    parts.push("Here is what to do.");
    mission.steps.forEach((step, index) => {
      // Strip any existing redundant "Step 1" prefixes
      const cleanedStep = step.replace(/^step\s*\d+[:.]?\s*/i, "").trim();
      if (cleanedStep) {
        parts.push(`Step ${index + 1}. ${cleanedStep}`);
      }
    });
  }

  // 6. Safety Notes
  if (Array.isArray(mission.safetyNotes) && mission.safetyNotes.length > 0) {
    parts.push("Before you start, keep these safety points in mind.");
    mission.safetyNotes.forEach((note) => {
      const cleanedNote = note.trim();
      if (cleanedNote) {
        parts.push(cleanedNote);
      }
    });
  }

  // 7. Encouragement closing
  parts.push("You're ready to begin.");

  return parts.join("\n\n");
}

/**
 * Dispatches to full or steps-only narration script builder based on mode.
 */
export function buildMissionNarrationScript(
  mission: Mission,
  mode: NarrationMode = "full"
): string {
  if (mode === "steps") {
    return buildMissionStepsNarration(mission);
  }
  return buildFullMissionNarration(mission);
}
