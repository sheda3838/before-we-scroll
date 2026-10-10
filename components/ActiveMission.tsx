"use client";

import { useState } from "react";
import {
  Headphones,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Square,
  Loader2,
} from "lucide-react";
import type { Mission } from "@/types/mission";

interface ActiveMissionProps {
  mission: Mission;
  remainingMs: number;
  warningTriggered: boolean;
  isGeneratingSpeech: boolean;
  generatingSpeechMode: "full" | "steps" | null;
  isPlayingSpeech: boolean;
  isSpeechPaused: boolean;
  activeSpeechMode: "full" | "steps" | null;
  onToggleSpeech: (mode: "full" | "steps") => void;
  onStopSpeech: () => void;
  onRequestFinishEarly: () => void;
}

export function ActiveMission({
  mission,
  remainingMs,
  warningTriggered,
  isGeneratingSpeech,
  generatingSpeechMode,
  isPlayingSpeech,
  isSpeechPaused,
  activeSpeechMode,
  onToggleSpeech,
  onStopSpeech,
  onRequestFinishEarly,
}: ActiveMissionProps) {
  const [showSteps, setShowSteps] = useState(false);

  // Format countdown mm:ss
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isCurrentModeActive = activeSpeechMode === "steps";
  const isGeneratingSteps = isGeneratingSpeech && generatingSpeechMode === "steps";

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Active Mission Card */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl p-6 sm:p-10 text-center space-y-6">
        {/* Status Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Mission in Progress</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight pt-1">
            {mission.title}
          </h2>
        </div>

        {/* DOMINANT TIMER DISPLAY */}
        <div className="py-4 space-y-2">
          <div
            className={`font-mono font-black text-6xl sm:text-7xl tracking-tighter ${
              warningTriggered
                ? "text-rose-600 dark:text-rose-400 animate-pulse"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {timeDisplay}
          </div>

          {warningTriggered && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 justify-center">
              <AlertTriangle className="w-4 h-4" />
              <span>Final minutes! Wrap up your adventure.</span>
            </p>
          )}
        </div>

        {/* Steps-only Audio Narration Control */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs text-emerald-600 dark:text-emerald-400">
              <Headphones className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Steps Audio
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Listen to the numbered steps hands-free
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleSpeech("steps")}
              disabled={isGeneratingSpeech && !isGeneratingSteps}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50"
            >
              {isGeneratingSteps ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : isCurrentModeActive && isPlayingSpeech ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : isCurrentModeActive && isSpeechPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              ) : isCurrentModeActive ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play Steps</span>
                </>
              )}
            </button>

            {isCurrentModeActive && (isPlayingSpeech || isSpeechPaused) && (
              <button
                type="button"
                onClick={onStopSpeech}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Actions Grid */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
          >
            {showSteps ? "Hide Steps" : "View Steps & Safety"}
          </button>

          <button
            type="button"
            onClick={onRequestFinishEarly}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
          >
            Finish Early
          </button>
        </div>
      </div>

      {/* Collapsible Steps & Safety Details */}
      {showSteps && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 animate-fadeIn shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Mission Instructions
          </h3>
          <div className="space-y-2">
            {mission.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-800 dark:text-zinc-200"
              >
                <span className="font-bold text-emerald-600 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {mission.safetyNotes.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                Safety Notes:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                {mission.safetyNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
