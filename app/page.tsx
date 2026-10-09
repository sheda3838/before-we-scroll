"use client";

import { useState, useRef, useEffect } from "react";
import {
  MissionContext,
  IntensityLevel,
  IndoorOutdoor,
  SpaceSize,
} from "@/types/missionContext";

// ---------------------------------------------------------------------------
// Diagnostic types (mirrors the server response shape)
// ---------------------------------------------------------------------------
interface AttemptDiagnostic {
  attempt: number;
  latencyMs: number;
  success: boolean;
  status: number | null;
}

interface Diagnostics {
  totalAttempts: number;
  attempts: AttemptDiagnostic[];
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedContext, setExtractedContext] = useState<MissionContext | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  // Local draft inputs for array fields to allow natural comma-separated typing
  const [featuresDraft, setFeaturesDraft] = useState("");
  const [obstaclesDraft, setObstaclesDraft] = useState("");
  const [equipmentDraft, setEquipmentDraft] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile/touch capability client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasTouch =
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches;
      setIsTouchDevice(Boolean(hasTouch));
    }
  }, []);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      setFileError("Please choose a valid JPEG, PNG, or WebP photo.");
      e.target.value = "";
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setFileError("This photo is larger than 10MB. Please choose a smaller file.");
      e.target.value = "";
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(preview);
    e.target.value = "";

    // Reset all previous analysis results when an image is selected or replaced
    setExtractedContext(null);
    setLatencyMs(null);
    setDiagnostics(null);
    setError(null);
    setFeaturesDraft("");
    setObstaclesDraft("");
    setEquipmentDraft("");
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setFileError(null);

    // Reset all previous analysis results when an image is removed
    setExtractedContext(null);
    setLatencyMs(null);
    setDiagnostics(null);
    setError(null);
    setFeaturesDraft("");
    setObstaclesDraft("");
    setEquipmentDraft("");
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setLoading(true);
    setError(null);
    setExtractedContext(null);
    setLatencyMs(null);
    setDiagnostics(null);

    try {
      const formData = new FormData();
      if (inputText.trim()) {
        formData.append("text", inputText.trim());
      }
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const res = await fetch("/api/context/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || `Error analyzing request (${res.status})`);
      } else {
        const ctx = data.context as MissionContext;
        setExtractedContext(ctx);
        setFeaturesDraft(ctx.environment.features.join(", "));
        setObstaclesDraft(ctx.environment.obstacles.join(", "));
        setEquipmentDraft(ctx.equipmentAvailable.join(", "));
        setLatencyMs(data.latencyMs ?? null);
        if (data.diagnostics) {
          setDiagnostics(data.diagnostics as Diagnostics);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof MissionContext>(key: K, val: MissionContext[K]) => {
    if (!extractedContext) return;
    setExtractedContext({ ...extractedContext, [key]: val });
  };

  const updateEnvironment = <K extends keyof MissionContext["environment"]>(
    key: K,
    val: MissionContext["environment"][K]
  ) => {
    if (!extractedContext) return;
    setExtractedContext({
      ...extractedContext,
      environment: { ...extractedContext.environment, [key]: val },
    });
  };

  const updateConstraints = <K extends keyof MissionContext["constraints"]>(
    key: K,
    val: MissionContext["constraints"][K]
  ) => {
    if (!extractedContext) return;
    setExtractedContext({
      ...extractedContext,
      constraints: { ...extractedContext.constraints, [key]: val },
    });
  };

  // Tag removal helpers
  const removeFeature = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.environment.features.filter((_, i) => i !== idx);
    updateEnvironment("features", next);
    setFeaturesDraft(next.join(", "));
  };

  const removeObstacle = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.environment.obstacles.filter((_, i) => i !== idx);
    updateEnvironment("obstacles", next);
    setObstaclesDraft(next.join(", "));
  };

  const removeEquipment = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.equipmentAvailable.filter((_, i) => i !== idx);
    updateField("equipmentAvailable", next);
    setEquipmentDraft(next.join(", "));
  };

  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400";

  const labelCls = "block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5";

  // Predefined age group chips
  const ageOptions = ["Kids", "Teens", "Adults", "Mixed"];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">

        {/* Hidden File Inputs for Standard Camera & Gallery Browsing */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          id="camera-input"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          id="gallery-input"
        />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Outventure AI
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-900 dark:text-zinc-50">
            Plan Your Next Outventure
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Describe your group, snap or upload your surroundings — we will organize your mission context in seconds.
          </p>
        </div>

        {/* Input Form Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800/80 space-y-5">
          <form onSubmit={handleAnalyze} className="space-y-5">
            {/* 1. Text Request */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="activity-request"
                  className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200"
                >
                  What would you like to do?
                </label>
                <span className="text-xs text-zinc-400 font-normal">
                  {selectedImage ? "Optional if photo provided" : "Text or photo required"}
                </span>
              </div>
              <textarea
                id="activity-request"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="We are 6 people, have 15 minutes, and want something fun and active..."
                disabled={loading}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition disabled:opacity-50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
              />
            </div>

            {/* 2. Photo of Surroundings (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Add a photo of your surroundings
                </label>
                <span className="text-xs text-zinc-400 font-normal">
                  Optional
                </span>
              </div>

              {!selectedImage ? (
                <div className="border border-dashed border-zinc-300 dark:border-zinc-750 rounded-xl p-4 bg-zinc-50/40 dark:bg-zinc-850/30 text-center transition hover:border-zinc-400 dark:hover:border-zinc-650">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Upload a park, playground, backyard, or room photo to automatically detect the space, surface, and equipment.
                  </p>
                  <div className="flex items-center justify-center gap-2.5 flex-wrap">
                    {isTouchDevice ? (
                      <>
                        {/* Mobile camera capture */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => cameraInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                        >
                          <span className="text-sm">📷</span>
                          <span>Take Photo</span>
                        </button>

                        {/* Mobile gallery picker */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => galleryInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition cursor-pointer"
                        >
                          <span className="text-sm">🖼️</span>
                          <span>Choose Photo</span>
                        </button>
                      </>
                    ) : (
                      /* Desktop / laptop file picker */
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition cursor-pointer"
                      >
                        <span className="text-sm">🖼️</span>
                        <span>Choose Image</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    JPEG, PNG, or WebP up to 10MB
                  </p>
                </div>
              ) : (
                /* Selected Image Preview Card */
                <div className="flex items-center justify-between gap-3.5 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {imagePreviewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreviewUrl}
                        alt="Surroundings preview"
                        className="w-14 h-14 rounded-lg object-cover border border-emerald-300/60 dark:border-emerald-800 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {selectedImage.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatFileSize(selectedImage.size)} · Ready to analyze
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRemoveImage}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {fileError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 font-medium">
                  {fileError}
                </p>
              )}
            </div>

            {/* 3. Action Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <button
                id="analyze-btn"
                type="submit"
                disabled={loading || (!inputText.trim() && !selectedImage)}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Context"
                )}
              </button>

              {/* Development Timing & Diagnostics (Preserved & Unobtrusive) */}
              {latencyMs !== null && !loading && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                    ⚡ {(latencyMs / 1000).toFixed(2)}s
                    {diagnostics && ` · ${diagnostics.totalAttempts} attempt${diagnostics.totalAttempts !== 1 ? "s" : ""}`}
                  </span>

                  {diagnostics && (
                    <details className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                      <summary className="cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 transition">
                        ▸ attempt details
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-right">
                        {diagnostics.attempts.map((a) => (
                          <li key={a.attempt}>
                            Attempt {a.attempt}: {(a.latencyMs / 1000).toFixed(2)}s —{" "}
                            {a.success ? (
                              <span className="text-emerald-500 font-semibold">Success</span>
                            ) : (
                              <span className="text-red-400 font-semibold">{a.status ?? "error"}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </form>

          {loading && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-sm">
              <svg className="animate-spin h-5 w-5 text-emerald-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>
                {selectedImage && inputText.trim()
                  ? "Analyzing your description and surroundings photo..."
                  : selectedImage
                  ? "Analyzing your surroundings photo..."
                  : "Understanding your request details..."}
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <p className="font-semibold mb-0.5">Extraction Error</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Confirmation Screen */}
        {extractedContext && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Header section */}
            <div className="p-6 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Check your details
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Make any changes before we create your outdoor ideas.
                  </p>
                </div>
                <button
                  id="reset-btn"
                  type="button"
                  onClick={() => {
                    setExtractedContext(null);
                    setLatencyMs(null);
                    setDiagnostics(null);
                    setError(null);
                    setInputText("");
                    handleRemoveImage();
                  }}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ↺ Start over
                </button>
              </div>
            </div>

            {/* Primary Fields (Clean, prominent controls) */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* People Count */}
                <div>
                  <label htmlFor="field-people-count" className={labelCls}>
                    People
                  </label>
                  <div className="relative">
                    <input
                      id="field-people-count"
                      type="number"
                      min="1"
                      value={extractedContext.peopleCount ?? ""}
                      onChange={(e) =>
                        updateField("peopleCount", e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      placeholder="Any"
                      className={inputCls}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">
                      people
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label htmlFor="field-duration" className={labelCls}>
                    Time
                  </label>
                  <div className="relative">
                    <input
                      id="field-duration"
                      type="number"
                      min="1"
                      value={extractedContext.durationMinutes ?? ""}
                      onChange={(e) =>
                        updateField("durationMinutes", e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      placeholder="Any"
                      className={inputCls}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400 pointer-events-none">
                      min
                    </span>
                  </div>
                </div>

                {/* Where are you? (Environment Type) */}
                <div>
                  <label htmlFor="field-env-type" className={labelCls}>
                    Where are you?
                  </label>
                  <input
                    id="field-env-type"
                    type="text"
                    value={extractedContext.environment.type ?? ""}
                    onChange={(e) => updateEnvironment("type", e.target.value || null)}
                    placeholder="e.g. Playground, park, backyard..."
                    className={inputCls}
                  />
                </div>

                {/* Indoor / Outdoor Segmented Control */}
                <div>
                  <label className={labelCls}>Indoor / Outdoor</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() =>
                        updateEnvironment(
                          "indoorOutdoor",
                          extractedContext.environment.indoorOutdoor === "outdoor" ? null : "outdoor"
                        )
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        extractedContext.environment.indoorOutdoor === "outdoor"
                          ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      🌳 Outdoor
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateEnvironment(
                          "indoorOutdoor",
                          extractedContext.environment.indoorOutdoor === "indoor" ? null : "indoor"
                        )
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        extractedContext.environment.indoorOutdoor === "indoor"
                          ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      🏠 Indoor
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Goal */}
              <div>
                <label htmlFor="field-activity-goal" className={labelCls}>
                  Activity Goal
                </label>
                <input
                  id="field-activity-goal"
                  type="text"
                  value={extractedContext.activityGoal ?? ""}
                  onChange={(e) => updateField("activityGoal", e.target.value || null)}
                  placeholder="e.g. Fun and active, team building, relaxing walk..."
                  className={inputCls}
                />
              </div>

              {/* Intensity (Segmented Chip Controls) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>Intensity</label>
                  {extractedContext.intensity && (
                    <button
                      type="button"
                      onClick={() => updateField("intensity", null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as IntensityLevel[]).map((level) => {
                    if (!level) return null;
                    const isSelected = extractedContext.intensity === level;
                    const labels: Record<string, string> = {
                      low: "Gentle / Low",
                      medium: "Medium",
                      high: "High Energy",
                    };
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateField("intensity", isSelected ? null : level)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                            : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        {labels[level]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Age Group (Chip options + Custom text) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="field-age-group" className={labelCls}>
                    Age Group
                  </label>
                  {extractedContext.ageGroup && (
                    <button
                      type="button"
                      onClick={() => updateField("ageGroup", null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ageOptions.map((opt) => {
                    const isSelected =
                      extractedContext.ageGroup?.toLowerCase() === opt.toLowerCase();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("ageGroup", isSelected ? null : opt)}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-50/80 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/70 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <input
                  id="field-age-group"
                  type="text"
                  value={extractedContext.ageGroup ?? ""}
                  onChange={(e) => updateField("ageGroup", e.target.value || null)}
                  placeholder="Or enter custom (e.g. Toddlers, Seniors, 7-10 years)..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Collapsible Secondary Details Section */}
            <div className="p-6 bg-zinc-50/40 dark:bg-zinc-900/40">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      More details
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      (Space, surface, equipment & constraints)
                    </span>
                  </div>
                  <span className="text-zinc-400 group-open:rotate-180 transition-transform duration-200 text-xs font-bold">
                    ▼
                  </span>
                </summary>

                <div className="pt-5 space-y-5 border-t border-zinc-200/70 dark:border-zinc-800 mt-4">
                  {/* Space Size */}
                  <div>
                    <label className={labelCls}>Space Size</label>
                    <div className="flex flex-wrap gap-2">
                      {(["small", "medium", "large"] as SpaceSize[]).map((size) => {
                        if (!size) return null;
                        const isSelected = extractedContext.environment.spaceSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              updateEnvironment(
                                "spaceSize",
                                isSelected ? null : size
                              )
                            }
                            className={`py-1.5 px-3.5 text-xs font-medium rounded-lg border transition-all capitalize cursor-pointer ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Surface */}
                  <div>
                    <label htmlFor="field-env-surface" className={labelCls}>
                      Ground / Surface
                    </label>
                    <input
                      id="field-env-surface"
                      type="text"
                      value={extractedContext.environment.surface ?? ""}
                      onChange={(e) => updateEnvironment("surface", e.target.value || null)}
                      placeholder="e.g. Grass, pavement, sand, turf..."
                      className={inputCls}
                    />
                  </div>

                  {/* Environment Features */}
                  <div>
                    <label htmlFor="field-env-features" className={labelCls}>
                      Features & Landmarks
                    </label>
                    {extractedContext.environment.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {extractedContext.environment.features.map((feat, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200/70 dark:border-emerald-800/60"
                          >
                            {feat}
                            <button
                              type="button"
                              onClick={() => removeFeature(i)}
                              className="text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      id="field-env-features"
                      type="text"
                      value={featuresDraft}
                      onChange={(e) => {
                        setFeaturesDraft(e.target.value);
                        updateEnvironment(
                          "features",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Two trees, a bench, open grassy space (comma-separated)..."
                      className={inputCls}
                    />
                  </div>

                  {/* Obstacles */}
                  <div>
                    <label htmlFor="field-env-obstacles" className={labelCls}>
                      Obstacles / Hazards
                    </label>
                    {extractedContext.environment.obstacles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {extractedContext.environment.obstacles.map((obs, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800"
                          >
                            {obs}
                            <button
                              type="button"
                              onClick={() => removeObstacle(i)}
                              className="text-amber-500 hover:text-amber-800 dark:hover:text-amber-100 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      id="field-env-obstacles"
                      type="text"
                      value={obstaclesDraft}
                      onChange={(e) => {
                        setObstaclesDraft(e.target.value);
                        updateEnvironment(
                          "obstacles",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Rocks, fences, steep slope (comma-separated)..."
                      className={inputCls}
                    />
                  </div>

                  {/* Equipment Available */}
                  <div>
                    <label htmlFor="field-equipment" className={labelCls}>
                      Equipment Available
                    </label>
                    {extractedContext.equipmentAvailable.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {extractedContext.equipmentAvailable.map((eq, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-800"
                          >
                            {eq}
                            <button
                              type="button"
                              onClick={() => removeEquipment(i)}
                              className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      id="field-equipment"
                      type="text"
                      value={equipmentDraft}
                      onChange={(e) => {
                        setEquipmentDraft(e.target.value);
                        updateField(
                          "equipmentAvailable",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Football, two cones, frisbee (comma-separated)..."
                      className={inputCls}
                    />
                  </div>

                  {/* Constraints (Friendly 3-way toggle pills) */}
                  <div className="space-y-3 pt-2">
                    <label className={labelCls}>Activity Constraints</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* No Running */}
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          No Running
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => updateConstraints("noRunning", null)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.noRunning === null
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Any
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("noRunning", true)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.noRunning === true
                                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("noRunning", false)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.noRunning === false
                                ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Kid Friendly */}
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          Kid Friendly
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => updateConstraints("kidFriendly", null)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.kidFriendly === null
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Any
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("kidFriendly", true)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.kidFriendly === true
                                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("kidFriendly", false)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.kidFriendly === false
                                ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Quiet Activity */}
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          Quiet Activity
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => updateConstraints("quietActivity", null)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.quietActivity === null
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Any
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("quietActivity", true)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.quietActivity === true
                                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("quietActivity", false)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.quietActivity === false
                                ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* Developer Details (Raw JSON - Collapsible & Unobtrusive) */}
            <div className="p-4 bg-zinc-50/80 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800">
              <details className="text-xs text-zinc-400 group">
                <summary className="cursor-pointer font-mono hover:text-zinc-600 dark:hover:text-zinc-300 transition select-none">
                  ▸ Developer details (Raw JSON)
                </summary>
                <pre className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-850 overflow-x-auto font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {JSON.stringify(extractedContext, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
