"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function MatchMyVibeResultsContent() {
  const searchParams = useSearchParams();
  const playlistName = searchParams.get("playlist_name") ?? "Playlist";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/match-my-vibe"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Back to Match My Vibe"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </header>

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white truncate">
          {playlistName}
        </h1>

        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="text-[15px] text-[#a1a1aa]">Analysing {playlistName}...</p>
          <div className="h-8 w-8 rounded-full border-2 border-[#52525b] border-t-white animate-spin" aria-hidden />
        </div>

        <p className="mt-8 text-[13px] text-[#52525b] text-center">
          This page will be connected to the AI engine in Sprint 2
        </p>
      </div>
    </div>
  );
}

export default function MatchMyVibeResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
        </div>
      }
    >
      <MatchMyVibeResultsContent />
    </Suspense>
  );
}
