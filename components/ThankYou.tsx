"use client";

import { CheckCircle2, Star, Check, PlusCircle, ArrowLeft } from "lucide-react";
import type { CompletedMissionFeedbackSubmission } from "@/types/feedback";

interface ThankYouProps {
  submission: CompletedMissionFeedbackSubmission | null;
  savedCompletionId: string | null;
  onResetToHome: () => void;
}

export function ThankYou({
  submission,
  savedCompletionId,
  onResetToHome,
}: ThankYouProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 shadow-xl text-center space-y-6">
        {/* Heart / Check Vector Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Thanks for sharing!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto leading-relaxed">
            Your adventure is complete and your feedback helps inspire more real-world doing.
          </p>
          {savedCompletionId && (
            <span className="sr-only" aria-hidden="true" data-completion-id={savedCompletionId} />
          )}
        </div>

        {/* Feedback Recap */}
        {submission && (
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    submission.feedback.rating >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-200 dark:text-zinc-700"
                  }`}
                  aria-hidden="true"
                />
              ))}
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 ml-1.5">
                ({submission.feedback.rating} / 5)
              </span>
            </div>

            {submission.feedback.comment && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                &ldquo;{submission.feedback.comment}&rdquo;
              </p>
            )}

            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-1 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {submission.feedback.shareFeedbackPublicly ? (
                <span>Considered for Before We Scroll community sharing</span>
              ) : (
                <span>Kept private</span>
              )}
            </div>
          </div>
        )}

        {/* Actions back to Home */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onResetToHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Plan Another</span>
          </button>

          <button
            type="button"
            onClick={onResetToHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
