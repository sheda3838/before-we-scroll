"use client";

import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onLogoClick?: () => void;
  subtitle?: string;
}

export function Header({ onLogoClick, subtitle }: HeaderProps) {
  return (
    <header className="w-full border-b border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-2.5 text-left group focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-xl py-1 px-1.5 -ml-1.5 transition cursor-pointer"
        >
          {/* Main Logo from /logo.png */}
          <div className="relative h-9 w-28 sm:h-10 sm:w-32 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Before We Scroll"
              className="h-full w-auto object-contain dark:brightness-110 drop-shadow-sm group-hover:scale-[1.02] transition-transform duration-200"
            />
          </div>
          {subtitle && (
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-400 dark:text-zinc-500 border-l border-zinc-200 dark:border-zinc-800 pl-2.5">
              {subtitle}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
