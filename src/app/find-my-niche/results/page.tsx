"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const RESULTS_FETCHED_AT_PREFIX = "gel_niche_results_";
const STALE_MS = 24 * 60 * 60 * 1000;

function genreToStorageKey(genre: string): string {
  return genre.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "") || "unknown";
}

function getAestheticLabel(genre: string): string {
  const g = genre.toLowerCase();
  if (/hip-hop|rap|trap/.test(g)) return "Street Culture";
  if (/rock|punk|metal/.test(g)) return "Raw Energy";
  if (/electronic|house|techno/.test(g)) return "Digital Minimalism";
  if (/jazz|soul|blues/.test(g)) return "Refined Cool";
  if (/pop/.test(g)) return "Modern Edge";
  if (/country|folk|americana/.test(g)) return "Worn-In Americana";
  if (/indie/.test(g)) return "Thoughtful Thrift";
  return genre.split(/[\s-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatGenreLabel(genre: string): string {
  return genre.split(/[\s-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
    try {
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
    } catch {
      // ignore
    }
  }, [genre]);

  const aestheticLabel = genre ? getAestheticLabel(genre) : "Results";
  const displayGenre = genre ? formatGenreLabel(genre) : "";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/find-my-niche"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Back to Find My Niche"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </header>

        {isStale && (
          <p className="mb-4 text-xs text-amber-500/90">
            These results are from more than 24 hours ago. We'll refresh them when we add live recommendations.
          </p>
        )}

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">
          {aestheticLabel}
        </h1>
        <p className="mt-2 text-[15px] text-[#a1a1aa]">
          Fashion sourced for {displayGenre || "this"} aesthetics
        </p>

        <div className="grid grid-cols-2 gap-3 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[160px] rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton flex items-center justify-center"
            >
              <span className="text-[12px] text-[#52525b]">Finding items...</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-[#52525b] text-center">
          Real recommendations connect in Sprint 2 — AI engine coming soon
        </p>
      </div>
    </div>
  );
}

export default function FindMyNicheResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
