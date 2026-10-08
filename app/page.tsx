"use client";

import { useState } from "react";

interface TestResponse {
  success: boolean;
  model?: string;
  response?: string;
  latencyMs?: number;
  error?: string;
}

interface BenchmarkResults {
  latencies: number[];
  average: number;
  fastest: number;
  slowest: number;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<number | null>(null);
  const [result, setResult] = useState<TestResponse | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSingleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/test-gemma", {
        method: "POST",
      });
      const data: TestResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || `Request failed with status ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to API"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRun10Tests = async () => {
    setRunningBenchmark(true);
    setError(null);
    setBenchmark(null);
    const collectedLatencies: number[] = [];

    try {
      for (let i = 1; i <= 10; i++) {
        setBenchmarkProgress(i);
        let retries = 4;
        let success = false;

        while (retries >= 0 && !success) {
          const res = await fetch("/api/test-gemma", {
            method: "POST",
          });
          const data: TestResponse = await res.json();

          if (res.ok && data.success && typeof data.latencyMs === "number") {
            collectedLatencies.push(data.latencyMs);
            success = true;
          } else {
            if (retries === 0) {
              throw new Error(
                data.error || `Test ${i}/10 failed with status ${res.status}`
              );
            }
            retries--;
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }

      const total = collectedLatencies.reduce((acc, curr) => acc + curr, 0);
      const avg = total / collectedLatencies.length;
      const fastest = Math.min(...collectedLatencies);
      const slowest = Math.max(...collectedLatencies);

      setBenchmark({
        latencies: collectedLatencies,
        average: avg,
        fastest,
        slowest,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An error occurred during the 10-test run"
      );
    } finally {
      setRunningBenchmark(false);
      setBenchmarkProgress(null);
    }
  };

  const isBusy = loading || runningBenchmark;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="w-full max-w-lg p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 space-y-6">
        <h1 className="text-2xl font-bold text-center tracking-tight">
          Outventure AI - Gemma Test
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleSingleTest}
            disabled={isBusy}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors cursor-pointer text-sm"
          >
            {loading ? "Testing Gemma..." : "Test Gemma"}
          </button>

          <button
            onClick={handleRun10Tests}
            disabled={isBusy}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors cursor-pointer text-sm"
          >
            {runningBenchmark
              ? `Running Test ${benchmarkProgress}/10...`
              : "Run 10 Tests"}
          </button>
        </div>

        {isBusy && (
          <div className="flex items-center justify-center space-x-2 text-sm text-zinc-500">
            <svg
              className="animate-spin h-5 w-5 text-zinc-600 dark:text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>
              {runningBenchmark
                ? `Executing test ${benchmarkProgress} of 10 sequentially...`
                : "Calling /api/test-gemma..."}
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <p className="font-semibold mb-1">Error:</p>
            <p className="break-words">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Model:{" "}
                </span>
                <span className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
                  {result.model}
                </span>
              </div>
              {typeof result.latencyMs === "number" && (
                <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                  Latency: {result.latencyMs} ms ({(result.latencyMs / 1000).toFixed(2)}s)
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Response:
              </p>
              <p className="mt-1 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-100 dark:border-emerald-900/40">
                {result.response}
              </p>
            </div>
          </div>
        )}

        {benchmark && (
          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-sm space-y-3">
            <h2 className="font-semibold text-indigo-950 dark:text-indigo-200 text-base">
              10-Test Latency Benchmark
            </h2>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white dark:bg-zinc-900 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-xs text-zinc-500 block">Average</span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {Math.round(benchmark.average)} ms
                </span>
                <span className="text-xs text-zinc-400 block">
                  ({(benchmark.average / 1000).toFixed(2)}s)
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-zinc-900 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-xs text-zinc-500 block">Fastest</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {benchmark.fastest} ms
                </span>
                <span className="text-xs text-zinc-400 block">
                  ({(benchmark.fastest / 1000).toFixed(2)}s)
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-zinc-900 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-xs text-zinc-500 block">Slowest</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {benchmark.slowest} ms
                </span>
                <span className="text-xs text-zinc-400 block">
                  ({(benchmark.slowest / 1000).toFixed(2)}s)
                </span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                Individual Latencies:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-mono">
                {benchmark.latencies.map((latency, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-white dark:bg-zinc-900 rounded border border-indigo-100 dark:border-indigo-900/40 text-center"
                  >
                    <span className="text-zinc-400 block text-[10px]">#{idx + 1}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {latency} ms
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      ({(latency / 1000).toFixed(2)}s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
