"use client";

import Link from "next/link";

export default function FindMyNicheResultsPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/find-my-niche"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Back"
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

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Results
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Placeholder — recommendations will appear here.
        </p>
      </div>
    </div>
  );
}
