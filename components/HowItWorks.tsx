"use client";

import { MessageSquare, Compass, Footprints } from "lucide-react";

export function HowItWorks() {
  return (
    <section aria-label="How Before We Scroll works" className="w-full space-y-3">
      <div className="text-center space-y-0.5">
        <h2 className="text-sm font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
          How it works
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Three quick steps from scrolling to exploring.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm gap-2">
          <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center" aria-hidden="true">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Tell us your space</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Speak, type, or snap a photo of where you are right now.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm gap-2">
          <span className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center" aria-hidden="true">
            <Compass className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Pick a mission</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              We generate three missions tailored directly to your situation.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm gap-2">
          <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center" aria-hidden="true">
            <Footprints className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Do something real</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Start the timer, step outside or move around, and finish before you scroll.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
