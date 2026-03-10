"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";

type SpotifyData = {
  topArtists: {
    short_term: { genres?: string[] }[];
    medium_term: { genres?: string[] }[];
    long_term: { genres?: string[] }[];
  };
};

function getTopGenres(limit: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as SpotifyData;
    const counts: Record<string, number> = {};
    const ranges = [
      data.topArtists?.short_term,
      data.topArtists?.medium_term,
      data.topArtists?.long_term,
    ].filter(Boolean) as { genres?: string[] }[][];

    for (const range of ranges) {
      for (const artist of range) {
        const genres = artist?.genres ?? [];
        for (const g of genres) {
          const key = g.trim().toLowerCase();
          if (key) counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name]) => name);
  } catch {
    return [];
  }
}

const FALLBACK_GENRES = [
  "pop",
  "indie",
  "rock",
  "hip-hop",
  "r&b",
  "electronic",
  "alternative",
  "soul",
  "folk",
  "jazz",
  "punk",
  "country",
];

export default function FindMyNichePage() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const topGenres = useMemo(() => {
    if (!mounted) return [];
    const list = getTopGenres(12);
    return list.length > 0 ? list : FALLBACK_GENRES.slice(0, 12);
  }, [mounted]);

  const displayGenres = mounted ? topGenres : FALLBACK_GENRES.slice(0, 12);

  const handleExplore = () => {
    if (!selectedGenre) return;
    router.push("/find-my-niche/results");
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Back to home"
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
          Find My Niche
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick a genre to explore your aesthetic
        </p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {displayGenres.map((genre) => {
            const label =
              genre.charAt(0).toUpperCase() + genre.slice(1).replace(/-/g, " ");
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() =>
                  setSelectedGenre(isSelected ? null : genre)
                }
                className={`rounded-full border py-3 px-4 text-sm font-medium transition ${
                  isSelected
                    ? "border-[#1DB954] bg-[#1DB954]/20 text-white"
                    : "border-white/15 bg-white/[0.03] text-white hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-12">
          <button
            type="button"
            onClick={handleExplore}
            disabled={!selectedGenre}
            className="w-full rounded-xl py-4 font-semibold text-black transition disabled:opacity-50 disabled:cursor-not-allowed bg-[#1DB954] hover:bg-[#1ed760] disabled:hover:bg-[#1DB954]"
          >
            Explore This Vibe
          </button>
        </div>
      </div>
    </div>
  );
}
