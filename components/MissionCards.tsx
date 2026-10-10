"use client";

import {
  Clock,
  Zap,
  Users,
  Backpack,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import type { Mission } from "@/types/mission";

interface MissionCardsProps {
  missions: Mission[];
  isGeneratingMissions: boolean;
  onSelectMission: (mission: Mission) => void;
  onAdjustDetails: () => void;
  onRegenerate: () => void;
}

export function MissionCards({
  missions,
  isGeneratingMissions,
  onSelectMission,
  onAdjustDetails,
  onRegenerate,
}: MissionCardsProps) {
  const badgeStyles = [
    {
      label: "Mission 1",
      badge: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Mission 2",
      badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      accent: "hover:border-amber-500",
    },
    {
      label: "Mission 3",
      badge: "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800",
      accent: "hover:border-teal-500",
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onAdjustDetails}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Details</span>
        </button>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGeneratingMissions}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isGeneratingMissions ? "animate-spin" : ""}`} />
          <span>Fresh Ideas</span>
        </button>
      </div>

      {/* Heading */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pick your mission
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Three unique ways to make the most of your space right now. Select one to see the steps.
        </p>
      </div>

      {/* 3 Mission Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {missions.map((m, index) => {
          const style = badgeStyles[index % badgeStyles.length];
          const intensityLabel =
            m.intensity === "low"
              ? "Gentle"
              : m.intensity === "medium"
              ? "Medium"
              : "High Energy";

          return (
            <div
              key={m.id || index}
              className={`flex flex-col justify-between rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-all duration-200 ${style.accent}`}
            >
              <div className="space-y-4">
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${style.badge}`}
                  >
                    {style.label}
                  </span>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{m.durationMinutes} min</span>
                  </span>
                </div>

                {/* Title & Short Description */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                    {m.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {m.shortDescription}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{intensityLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <Users className="w-3 h-3 text-emerald-600" />
                    <span>{m.players}</span>
                  </span>
                  {m.equipmentNeeded.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      <Backpack className="w-3 h-3 text-amber-600" />
                      <span>{m.equipmentNeeded.join(", ")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>No equipment needed</span>
                    </span>
                  )}
                </div>

                {/* Why it fits preview */}
                {m.whyItFits && (
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-0.5">
                      Why this fits:
                    </span>
                    {m.whyItFits}
                  </div>
                )}
              </div>

              {/* View Mission Action */}
              <div className="pt-5 mt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => onSelectMission(m)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  <span>View Mission</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
