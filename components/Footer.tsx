export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200/60 dark:border-zinc-850 py-8 px-4 text-center mt-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" className="w-4 h-4 rounded-sm" />
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">Before We Scroll</span>
          <span className="text-zinc-400">&bull;</span>
          <span>Turn the moment before another scroll into something worth doing.</span>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-400">
          Less scrolling. More doing.
        </p>
      </div>
    </footer>
  );
}
