"use client";

import {
  ClipboardList,
  Compass,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import type {
  MissionContext,
  SpaceSize,
  IndoorOutdoor,
} from "@/types/missionContext";

interface ContextReviewProps {
  context: MissionContext;
  featuresDraft: string;
  obstaclesDraft: string;
  equipmentDraft: string;
  isGeneratingMissions: boolean;
  onUpdateField: <K extends keyof MissionContext>(key: K, val: MissionContext[K]) => void;
  onUpdateEnvironment: <K extends keyof MissionContext["environment"]>(
    key: K,
    val: MissionContext["environment"][K]
  ) => void;
  onUpdateConstraints: <K extends keyof MissionContext["constraints"]>(
    key: K,
    val: MissionContext["constraints"][K]
  ) => void;
  onFeaturesDraftChange: (val: string) => void;
  onObstaclesDraftChange: (val: string) => void;
  onEquipmentDraftChange: (val: string) => void;
  onRemoveFeature: (idx: number) => void;
  onRemoveObstacle: (idx: number) => void;
  onRemoveEquipment: (idx: number) => void;
  onBackToHome: () => void;
  onGenerateMissions: () => void;
}

export function ContextReview({
  context,
  featuresDraft,
  obstaclesDraft,
  equipmentDraft,
  isGeneratingMissions,
  onUpdateField,
  onUpdateEnvironment,
  onUpdateConstraints,
  onFeaturesDraftChange,
  onObstaclesDraftChange,
  onEquipmentDraftChange,
  onRemoveFeature,
  onRemoveObstacle,
  onRemoveEquipment,
  onBackToHome,
  onGenerateMissions,
}: ContextReviewProps) {
  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 py-2.5 text-xs sm:text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400";

  const labelCls = "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";

  const ageOptions = ["Kids", "Teens", "Adults", "Mixed"];

  return (
    <div className="w-full space-y-6">
      {/* Header and Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          Step 1 of 2
        </span>
      </div>

      {/* Screen Title */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          We&apos;ve got the picture
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Review what we understood. Tweak any details before we build your missions.
        </p>
      </div>

      {/* Main Review Form Card */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
        {/* Section 1: YOUR PLAN */}
        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Your Plan</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* People Count */}
            <div>
              <label htmlFor="rev-people-count" className={labelCls}>
                People in Group
              </label>
              <input
                id="rev-people-count"
                type="number"
                min="1"
                max="50"
                value={context.peopleCount ?? ""}
                onChange={(e) =>
                  onUpdateField("peopleCount", e.target.value ? parseInt(e.target.value, 10) : null)
                }
                placeholder="e.g. 2, 4, 6..."
                className={inputCls}
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="rev-duration" className={labelCls}>
                Available Time (Minutes)
              </label>
              <input
                id="rev-duration"
                type="number"
                min="5"
                max="180"
                value={context.durationMinutes ?? ""}
                onChange={(e) =>
                  onUpdateField("durationMinutes", e.target.value ? parseInt(e.target.value, 10) : null)
                }
                placeholder="e.g. 15, 30..."
                className={inputCls}
              />
            </div>

            {/* Goal */}
            <div className="sm:col-span-2">
              <label htmlFor="rev-goal" className={labelCls}>
                Activity Goal
              </label>
              <input
                id="rev-goal"
                type="text"
                value={context.activityGoal ?? ""}
                onChange={(e) => onUpdateField("activityGoal", e.target.value || null)}
                placeholder="e.g. Fun active game, explore nature, quick workout..."
                className={inputCls}
              />
            </div>

            {/* Intensity Level */}
            <div>
              <label className={labelCls}>Intensity</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["low", "medium", "high"] as const).map((level) => {
                  const isSelected = context.intensity === level;
                  const labels: Record<string, string> = {
                    low: "Gentle",
                    medium: "Medium",
                    high: "High",
                  };
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onUpdateField("intensity", isSelected ? null : level)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                      }`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Age Group */}
            <div>
              <label className={labelCls}>Age Group</label>
              <div className="flex flex-wrap gap-1.5">
                {ageOptions.map((opt) => {
                  const isSelected = context.ageGroup?.toLowerCase() === opt.toLowerCase();
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onUpdateField("ageGroup", isSelected ? null : opt)}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: YOUR SURROUNDINGS */}
        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Your Surroundings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Indoor / Outdoor */}
            <div>
              <label className={labelCls}>Environment Location</label>
              <div className="grid grid-cols-2 gap-2">
                {(["outdoor", "indoor"] as IndoorOutdoor[]).map((loc) => {
                  const isSelected = context.environment.indoorOutdoor === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => onUpdateEnvironment("indoorOutdoor", isSelected ? null : loc)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                      }`}
                    >
                      {loc === "outdoor" ? (
                        <>
                          <Compass className="w-3.5 h-3.5" />
                          <span>Outdoors</span>
                        </>
                      ) : (
                        <>
                          <Home className="w-3.5 h-3.5" />
                          <span>Indoors</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Space Size */}
            <div>
              <label className={labelCls}>Space Size</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["small", "medium", "large"] as SpaceSize[]).map((size) => {
                  const isSelected = context.environment.spaceSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onUpdateEnvironment("spaceSize", isSelected ? null : size)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all capitalize cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ground / Surface */}
            <div>
              <label htmlFor="rev-surface" className={labelCls}>
                Ground / Surface
              </label>
              <input
                id="rev-surface"
                type="text"
                value={context.environment.surface ?? ""}
                onChange={(e) => onUpdateEnvironment("surface", e.target.value || null)}
                placeholder="e.g. Grass, pavement, hardwood, turf..."
                className={inputCls}
              />
            </div>

            {/* Place Type */}
            <div>
              <label htmlFor="rev-type" className={labelCls}>
                Place Type
              </label>
              <input
                id="rev-type"
                type="text"
                value={context.environment.type ?? ""}
                onChange={(e) => onUpdateEnvironment("type", e.target.value || null)}
                placeholder="e.g. City park, backyard, living room..."
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Section 3: WHAT'S AROUND YOU */}
        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>What&apos;s Around You</span>
          </h3>

          <div className="space-y-4">
            {/* Features */}
            <div>
              <label htmlFor="rev-features" className={labelCls}>
                Features & Landmarks
              </label>
              {context.environment.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {context.environment.features.map((feat, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200/70 dark:border-emerald-800/60"
                    >
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveFeature(i)}
                        className="text-emerald-400 hover:text-emerald-700 p-0.5 cursor-pointer"
                        aria-label={`Remove feature ${feat}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="rev-features"
                type="text"
                value={featuresDraft}
                onChange={(e) => onFeaturesDraftChange(e.target.value)}
                placeholder="e.g. Bench, big tree, fountain (comma-separated)..."
                className={inputCls}
              />
            </div>

            {/* Obstacles */}
            <div>
              <label htmlFor="rev-obstacles" className={labelCls}>
                Obstacles & Hazards
              </label>
              {context.environment.obstacles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {context.environment.obstacles.map((obs, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs border border-amber-200/70 dark:border-amber-800/60"
                    >
                      <span>{obs}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveObstacle(i)}
                        className="text-amber-400 hover:text-amber-800 p-0.5 cursor-pointer"
                        aria-label={`Remove obstacle ${obs}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="rev-obstacles"
                type="text"
                value={obstaclesDraft}
                onChange={(e) => onObstaclesDraftChange(e.target.value)}
                placeholder="e.g. Muddy area, slippery steps (comma-separated)..."
                className={inputCls}
              />
            </div>

            {/* Equipment */}
            <div>
              <label htmlFor="rev-equipment" className={labelCls}>
                Equipment Available
              </label>
              {context.equipmentAvailable.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {context.equipmentAvailable.map((eq, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs border border-blue-200/70 dark:border-blue-800/60"
                    >
                      <span>{eq}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveEquipment(i)}
                        className="text-blue-400 hover:text-blue-700 p-0.5 cursor-pointer"
                        aria-label={`Remove equipment ${eq}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="rev-equipment"
                type="text"
                value={equipmentDraft}
                onChange={(e) => onEquipmentDraftChange(e.target.value)}
                placeholder="e.g. Ball, frisbee, water bottles (leave empty if none)..."
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Section 4: PREFERENCES & CONSTRAINTS */}
        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Preferences & Safety</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* No Running */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                No Running?
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateConstraints("noRunning", context.constraints.noRunning === true ? null : true)}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    context.constraints.noRunning === true
                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConstraints("noRunning", context.constraints.noRunning === false ? null : false)}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    context.constraints.noRunning === false
                      ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-400 text-zinc-800 dark:text-zinc-200"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  No pref
                </button>
              </div>
            </div>

            {/* Kid Friendly */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                Kid Friendly?
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateConstraints("kidFriendly", context.constraints.kidFriendly === true ? null : true)}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    context.constraints.kidFriendly === true
                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConstraints("kidFriendly", context.constraints.kidFriendly === false ? null : false)}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    context.constraints.kidFriendly === false
                      ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-400 text-zinc-800 dark:text-zinc-200"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  No pref
                </button>
              </div>
            </div>

            {/* Quiet Activity */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                Quiet Activity?
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateConstraints("quietActivity", context.constraints.quietActivity === true ? null : true)}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    context.constraints.quietActivity === true
                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConstraints("quietActivity", context.constraints.quietActivity === false ? null : false)}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    context.constraints.quietActivity === false
                      ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-400 text-zinc-800 dark:text-zinc-200"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  No pref
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-5 sm:p-6 bg-zinc-50/60 dark:bg-zinc-950/40 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onGenerateMissions}
            disabled={isGeneratingMissions}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            {isGeneratingMissions ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating three missions for you...</span>
              </>
            ) : (
              <>
                <span>Create My Missions</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
