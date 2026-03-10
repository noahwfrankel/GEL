"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

const RESULTS_FETCHED_AT_PREFIX = "gel_niche_results_";
const STALE_MS = 24 * 60 * 60 * 1000;

function genreToStorageKey(genre: string): string {
  return genre.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "") || "unknown";
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const genreParam = searchParams.get("genre");
  const genre = genreParam ?? "";
  const [isStale, setIsStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!genre || typeof window === "undefined") return;
    const key = `${RESULTS_FETCHED_AT_PREFIX}${genreToStorageKey(genre)}_fetched_at`;
    const raw = localStorage.getItem(key);
    const now = Date.now();

    if (!raw) {
      localStorage.setItem(key, now.toString());
      setFetchedAt(now);
      return;
    }
    const existing = parseInt(raw, 10);
    if (!Number.isNaN(existing)) {
      setFetchedAt(existing);
      if (now - existing > STALE_MS) setIsStale(true);
    }
  }, [genre]);

  const displayGenre = genre
    ? genre
        .split(/[\s-]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "Results";

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/find-my-niche"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Back to Find My Niche"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        </header>

        {isStale && (
          <p className="mb-4 text-xs text-amber-500/90">
            These results are from more than 24 hours ago. We’ll refresh them when we add live recommendations.
          </p>
        )}

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {displayGenre}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Placeholder — recommendations will appear here.
        </p>
      </div>
    </div>
  );
}

export default function FindMyNicheResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
          <div className="h-10 w-48 animate-pulse rounded bg-white/10" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
