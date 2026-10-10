"use client";

import { RefObject } from "react";
import {
  Star,
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import type {
  FeedbackRating,
  ContextMatchOption,
  InstructionAccuracyOption,
  DifficultyOption,
} from "@/types/feedback";

interface FeedbackFormProps {
  missionTitle: string;
  feedbackRating: FeedbackRating | null;
  feedbackContextMatch: ContextMatchOption | null;
  feedbackInstructionsAccurate: InstructionAccuracyOption | null;
  feedbackDifficulty: DifficultyOption | null;
  feedbackComment: string;
  feedbackPhoto: File | null;
  feedbackPhotoPreviewUrl: string | null;
  feedbackPhotoError: string | null;
  shareFeedbackPublicly: boolean;
  sharePhotoPublicly: boolean;
  feedbackValidationError: string | null;
  isSavingFeedback: boolean;
  isTouchDevice: boolean;
  feedbackCameraInputRef: RefObject<HTMLInputElement | null>;
  feedbackGalleryInputRef: RefObject<HTMLInputElement | null>;
  onRatingChange: (val: FeedbackRating) => void;
  onContextMatchChange: (val: ContextMatchOption | null) => void;
  onInstructionsAccurateChange: (val: InstructionAccuracyOption | null) => void;
  onDifficultyChange: (val: DifficultyOption | null) => void;
  onCommentChange: (val: string) => void;
  onRemovePhoto: () => void;
  onToggleShareFeedback: (checked: boolean) => void;
  onToggleSharePhoto: (checked: boolean) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FeedbackForm({
  missionTitle,
  feedbackRating,
  feedbackContextMatch,
  feedbackInstructionsAccurate,
  feedbackDifficulty,
  feedbackComment,
  feedbackPhoto,
  feedbackPhotoPreviewUrl,
  feedbackPhotoError,
  shareFeedbackPublicly,
  sharePhotoPublicly,
  feedbackValidationError,
  isSavingFeedback,
  isTouchDevice,
  feedbackCameraInputRef,
  feedbackGalleryInputRef,
  onRatingChange,
  onContextMatchChange,
  onInstructionsAccurateChange,
  onDifficultyChange,
  onCommentChange,
  onRemovePhoto,
  onToggleShareFeedback,
  onToggleSharePhoto,
  onCancel,
  onSubmit,
}: FeedbackFormProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          How was your mission?
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Sharing feedback for &ldquo;{missionTitle}&rdquo;. Takes less than a minute.
        </p>
      </div>

      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md p-6 sm:p-8 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* 1. Overall Rating with Star Icons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
              1. Overall Experience <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {([1, 2, 3, 4, 5] as FeedbackRating[]).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onRatingChange(star)}
                  className="p-1 text-2xl sm:text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                      feedbackRating && feedbackRating >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-200 dark:text-zinc-700 hover:text-amber-300"
                    }`}
                  />
                </button>
              ))}
              {feedbackRating && (
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 ml-2">
                  ({feedbackRating} / 5)
                </span>
              )}
            </div>
          </div>

          {/* 2. Quick Reflection Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {/* Context Match */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Did it fit your surroundings?
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["yes", "mostly", "no"] as ContextMatchOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onContextMatchChange(feedbackContextMatch === opt ? null : opt)}
                    className={`py-2 text-xs font-semibold rounded-xl border capitalize transition cursor-pointer ${
                      feedbackContextMatch === opt
                        ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions Accurate */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Were instructions clear?
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["yes", "mostly", "no"] as InstructionAccuracyOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      onInstructionsAccurateChange(
                        feedbackInstructionsAccurate === opt ? null : opt
                      )
                    }
                    className={`py-2 text-xs font-semibold rounded-xl border capitalize transition cursor-pointer ${
                      feedbackInstructionsAccurate === opt
                        ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                How did it feel?
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ["too-easy", "Easy"],
                    ["just-right", "Just right"],
                    ["too-hard", "Hard"],
                  ] as [DifficultyOption, string][]
                ).map(([opt, label]) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onDifficultyChange(feedbackDifficulty === opt ? null : opt)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                      feedbackDifficulty === opt
                        ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Comment */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label htmlFor="fb-comment" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              Your thoughts (optional)
            </label>
            <textarea
              id="fb-comment"
              rows={3}
              value={feedbackComment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="What made this fun? Any surprises or suggestions?"
              maxLength={1000}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 px-3.5 py-2.5 text-xs sm:text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
            />
          </div>

          {/* 4. Add a Memory (Photo) */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                Add a memory from your mission
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                If you choose to share it, your photo may appear in Before We Scroll community stories to inspire others.
              </p>
            </div>

            {!feedbackPhoto ? (
              isTouchDevice ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => feedbackCameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => feedbackGalleryInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Choose Photo</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => feedbackGalleryInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Choose Photo (JPEG, PNG, WebP up to 10MB)</span>
                </button>
              )
            ) : (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3 min-w-0">
                  {feedbackPhotoPreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={feedbackPhotoPreviewUrl}
                      alt="Selected preview"
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {feedbackPhoto.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {formatFileSize(feedbackPhoto.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => feedbackGalleryInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={onRemovePhoto}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition"
                    title="Remove"
                    aria-label="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {feedbackPhotoError && (
              <p className="text-xs text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{feedbackPhotoError}</span>
              </p>
            )}
          </div>

          {/* 5. Sharing Preferences */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
              Community Sharing
            </span>

            <label className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={shareFeedbackPublicly}
                onChange={(e) => onToggleShareFeedback(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                  Share my feedback publicly
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-relaxed">
                  Your rating, comment, and mission may appear in Before We Scroll community stories.
                </span>
              </div>
            </label>

            {feedbackPhoto && shareFeedbackPublicly && (
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 cursor-pointer animate-fadeIn">
                <input
                  type="checkbox"
                  checked={sharePhotoPublicly}
                  onChange={(e) => onToggleSharePhoto(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                    Allow my photo to be shown publicly
                  </span>
                  <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 block leading-relaxed">
                    If checked, your uploaded memory photo can be featured on community cards.
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Validation Error */}
          {feedbackValidationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{feedbackValidationError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSavingFeedback || !feedbackRating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {isSavingFeedback ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving feedback...</span>
                </>
              ) : (
                <>
                  <span>Submit Feedback</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
