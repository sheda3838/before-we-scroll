"use client";

import {
  Clock,
  Zap,
  Users,
  Backpack,
  Sparkles,
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Square,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { Mission } from "@/types/mission";

interface MissionDetailProps {
  mission: Mission;
  isGeneratingSpeech: boolean;
  generatingSpeechMode: "full" | "steps" | null;
  isPlayingSpeech: boolean;
  isSpeechPaused: boolean;
  activeSpeechMode: "full" | "steps" | null;
  speechError: string | null;
  onBackToMissions: () => void;
  onToggleSpeech: (mode: "full" | "steps") => void;
  onStopSpeech: () => void;
  onStartMission: () => void;
}

export function MissionDetail({
  mission,
  isGeneratingSpeech,
  generatingSpeechMode,
  isPlayingSpeech,
  isSpeechPaused,
  activeSpeechMode,
  speechError,
  onBackToMissions,
  onToggleSpeech,
  onStopSpeech,
  onStartMission,
}: MissionDetailProps) {
  const intensityLabel =
    mission.intensity === "low"
      ? "Gentle"
      : mission.intensity === "medium"
      ? "Medium"
      : "High Energy";

  const isCurrentModeActive = activeSpeechMode === "full";
  const isGeneratingFull = isGeneratingSpeech && generatingSpeechMode === "full";

  return (
    <div className="w-full space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToMissions}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Missions</span>
        </button>

        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Mission Details
        </span>
      </div>

      {/* Main Mission Card */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md p-6 sm:p-8 space-y-6">
        {/* Title & Description */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <Clock className="w-3.5 h-3.5" />
              <span>{mission.durationMinutes} Minutes</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{intensityLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{mission.players}</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
            {mission.title}
          </h2>

          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {mission.shortDescription}
          </p>
        </div>

        {/* TTS Narration Controls */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Headphones className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Voice Narration
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Listen to the full mission walkthrough
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onToggleSpeech("full")}
              disabled={isGeneratingSpeech && !isGeneratingFull}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer disabled:opacity-50"
            >
              {isGeneratingFull ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing narration...</span>
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
                  <span>Listen</span>
                </>
              )}
            </button>

            {isCurrentModeActive && (isPlayingSpeech || isSpeechPaused) && (
              <button
                type="button"
                onClick={onStopSpeech}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 transition"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {speechError && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Equipment & Fit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Backpack className="w-3.5 h-3.5 text-emerald-600" />
              <span>Equipment Needed</span>
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {mission.equipmentNeeded.length > 0
                ? mission.equipmentNeeded.join(", ")
                : "No equipment required. You're ready to go!"}
            </p>
          </div>

          {mission.whyItFits && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Why This Fits</span>
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {mission.whyItFits}
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Step-by-Step Instructions</span>
          </h3>
          <div className="space-y-2.5">
            {mission.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Notes */}
        {mission.safetyNotes.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Safety Guidelines</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 dark:text-amber-300">
              {mission.safetyNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Start Mission Action CTA */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onStartMission}
            className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base shadow-lg transition cursor-pointer"
          >
            <span>Start Mission ({mission.durationMinutes} min)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
