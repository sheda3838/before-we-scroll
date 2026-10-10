"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import type { Mission } from "@/types/mission";

interface MissionCompleteProps {
  mission: Mission;
  completedEarly: boolean;
  onOpenFeedback: () => void;
  onSkipAndGoHome: () => void;
}

export function MissionComplete({
  mission,
  completedEarly,
  onOpenFeedback,
  onSkipAndGoHome,
}: MissionCompleteProps) {
  const intensityLabel =
    mission.intensity === "low"
      ? "Gentle"
      : mission.intensity === "medium"
      ? "Medium"
      : "High Energy";

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 shadow-xl p-8 sm:p-12 text-center space-y-6">
        {/* Celebration Vector Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mission Complete
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto leading-relaxed">
            {completedEarly
              ? "You finished your mission early. Outstanding effort out there!"
              : "You made it to the end. That was time spent doing instead of scrolling."}
          </p>
        </div>

        {/* Mission Recap */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
          <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            {mission.title}
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            {mission.durationMinutes} minutes &bull; {intensityLabel} &bull; {mission.players}
          </p>
        </div>

        {/* Primary and Secondary Actions */}
        <div className="pt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={onOpenFeedback}
            className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <span>Share Your Experience</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSkipAndGoHome}
            className="w-full py-3 px-6 rounded-2xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Skip &amp; Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
