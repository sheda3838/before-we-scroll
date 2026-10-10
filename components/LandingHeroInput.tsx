"use client";

import { RefObject } from "react";
import {
  Mic,
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
  ArrowRight,
  Loader2,
  Square,
} from "lucide-react";

interface LandingHeroInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedImage: File | null;
  imagePreviewUrl: string | null;
  fileError: string | null;
  loading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  speechError: string | null;
  isTouchDevice: boolean;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  galleryInputRef: RefObject<HTMLInputElement | null>;
  startRecording: () => void;
  stopRecording: () => void;
  handleRemoveImage: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formatTimer: (seconds: number) => string;
}

export function LandingHeroInput({
  inputText,
  setInputText,
  selectedImage,
  imagePreviewUrl,
  fileError,
  loading,
  isRecording,
  isTranscribing,
  recordingDuration,
  speechError,
  isTouchDevice,
  cameraInputRef,
  galleryInputRef,
  startRecording,
  stopRecording,
  handleRemoveImage,
  onSubmit,
  formatTimer,
}: LandingHeroInputProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Hero text */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Less scrolling</span>
          <span className="text-emerald-400 dark:text-emerald-600">&bull;</span>
          <span>More doing</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          Turn the moment before another scroll into something worth doing.
        </h1>

        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Tell us where you are, your group, and your time. Speak, snap a photo, or type we&apos;ll create three quick real-world missions.
        </p>
      </div>

      {/* Main interactive input card */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md p-5 sm:p-7 space-y-5">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Quick Actions at Top (Voice & Photo) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              1. Quick inputs
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Voice Button */}
              {!isRecording && !isTranscribing && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/40 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </span>
                  <span>Tap to Speak</span>
                </button>
              )}

              {/* Recording active state */}
              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-bold transition cursor-pointer animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Recording ({formatTimer(recordingDuration)})</span>
                </button>
              )}

              {/* Transcribing state */}
              {isTranscribing && (
                <div className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Turning your voice into text...</span>
                </div>
              )}

              {/* Photo Input Button */}
              {!selectedImage ? (
                isTouchDevice ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/40 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/40 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Gallery</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={loading}
                    className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/40 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </span>
                    <span>Add a Photo</span>
                  </button>
                )
              ) : (
                /* Selected Photo Preview Chip */
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {imagePreviewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreviewUrl}
                        alt="Surroundings preview"
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                        {selectedImage.name}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {formatFileSize(selectedImage.size)} &bull; Photo ready
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-1.5 py-1"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input combinations guide */}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
              Speak, type, add a photo or mix them. Use any one or combine them together.
            </p>
          </div>

          {/* Voice error banner */}
          {speechError && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* File error banner */}
          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* 2. Text Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="activity-request"
              className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
            >
              <span>2. Or describe what you want</span>
              <span className="text-[11px] font-normal text-zinc-400">
                {selectedImage ? "Optional with photo" : "Text, voice, or photo"}
              </span>
            </label>
            <textarea
              id="activity-request"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. We have 15 minutes, two friends in a small backyard, and want something active..."
              disabled={loading || isRecording || isTranscribing}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition disabled:opacity-50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || isRecording || isTranscribing || (!inputText.trim() && !selectedImage)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Understanding your surroundings...</span>
              </>
            ) : (
              <>
                <span>Find My Missions</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
