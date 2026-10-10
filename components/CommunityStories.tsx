"use client";

import { Star } from "lucide-react";
import type { CommunityStory } from "@/types/communityStory";

interface CommunityStoriesProps {
  stories: CommunityStory[] | null;
  loading: boolean;
  error: boolean;
}

export function CommunityStories({
  stories,
  loading,
  error,
}: CommunityStoriesProps) {
  return (
    <section
      aria-label="Before We Scroll community stories section"
      className="w-full pb-8 space-y-4"
    >
      <div className="text-center space-y-0.5">
        <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Before We Scroll in Action
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          See how others turned an idle moment into something memorable.
        </p>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 space-y-3 animate-pulse shadow-sm"
            >
              <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
              <div className="h-3.5 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-4/5 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Graceful error state */}
      {!loading && error && (
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-3">
          More stories coming soon.
        </p>
      )}

      {/* Empty feed state */}
      {!loading && !error && stories !== null && stories.length === 0 && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-8 text-center shadow-sm">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Community stories will appear here as explorers share their experiences.
          </p>
        </div>
      )}

      {/* Story Cards */}
      {!loading && !error && stories && stories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((story) => {
            const clampedComment =
              story.comment.length > 240
                ? story.comment.slice(0, 240).trimEnd() + "…"
                : story.comment;

            const intensityLabel =
              story.intensity === "low"
                ? "Gentle"
                : story.intensity === "medium"
                ? "Medium"
                : "High Energy";

            return (
              <article
                key={story.id}
                className="flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden hover:border-emerald-500/30 transition-colors"
              >
                {/* Completion photo */}
                {story.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.photoUrl}
                    alt={`Completion photo for ${story.missionTitle}`}
                    className="w-full aspect-video object-cover bg-zinc-100 dark:bg-zinc-800"
                    loading="lazy"
                  />
                )}

                <div className="flex flex-col flex-1 gap-2.5 p-4 sm:p-5">
                  {/* Rating Stars */}
                  <div
                    className="flex items-center gap-1"
                    aria-label={`Rated ${story.rating} out of 5 stars`}
                    role="img"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          story.rating >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-200 dark:text-zinc-700"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {clampedComment && (
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic flex-1">
                      &ldquo;{clampedComment}&rdquo;
                    </p>
                  )}

                  {/* Mission Summary Footer */}
                  <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-0.5">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      {story.missionTitle}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {story.durationMinutes} min &bull; {intensityLabel}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
