"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  SPOTIFY_DATA_STORAGE_KEY,
  type StoredArtist,
} from "@/lib/spotify-api";

type AestheticResponse = {
  aesthetic_label: string;
  description: string;
  colors: string[];
  key_garments: string[];
  ebay_search_keywords: string[];
};

type GenreRow = {
  genre: string;
  artists: string[];
};

type CardState =
  | { status: "idle" | "loading" }
  | { status: "error" }
  | { status: "ok"; data: AestheticResponse };

const AESTHETIC_ENDPOINT = "https://web-production-78bf0.up.railway.app/aesthetic/from-genre";
const CLOSET_CACHE_PREFIX = "gel_closet_aesthetic_";
const CLOSET_FETCHED_AT_PREFIX = "gel_closet_aesthetic_fetched_at_";
const STALE_MS = 24 * 60 * 60 * 1000;

const CARD_GRADIENTS = [
  { color1: "#1a0a2e", color2: "#0a0a1a" },
  { color1: "#0a1a2e", color2: "#0a0a0a" },
  { color1: "#0a1a12", color2: "#0a0a0a" },
] as const;

function genreToStorageKey(genre: string): string {
  return genre.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "") || "unknown";
}

function toArtistArray(value: unknown): StoredArtist[] {
  if (Array.isArray(value)) return value as StoredArtist[];
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown[] }).items)
  ) {
    return (value as { items: StoredArtist[] }).items;
  }
  return [];
}

function getTop3GenresWithArtists(): GenreRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as {
      topArtists?: {
        short_term?: unknown;
        medium_term?: unknown;
        long_term?: unknown;
      };
    };

    const ranges = [
      toArtistArray(data.topArtists?.short_term),
      toArtistArray(data.topArtists?.medium_term),
      toArtistArray(data.topArtists?.long_term),
    ].filter((arr) => arr.length > 0);

    const genreToArtists: Record<string, Set<string>> = {};

    for (const range of ranges) {
      for (const a of range) {
        const name = a?.name?.trim() || "Unknown";
        const genres = (a?.genres ?? []).map((g) => g.trim().toLowerCase()).filter(Boolean);
        for (const g of genres) {
          if (!genreToArtists[g]) genreToArtists[g] = new Set();
          genreToArtists[g].add(name);
        }
      }
    }

    return Object.entries(genreToArtists)
      .map(([genre, names]) => ({
        genre,
        artists: Array.from(names),
        count: names.size,
      }))
      .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
      .slice(0, 3)
      .map(({ genre, artists }) => ({ genre, artists }));
  } catch {
    return [];
  }
}

function formatGenreLabel(genre: string): string {
  return genre
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isCssColor(value: string): boolean {
  if (typeof window === "undefined") return false;
  const el = new Option().style;
  el.color = "";
  el.color = value;
  return el.color !== "";
}

export default function BuildMyClosetPage() {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<GenreRow[]>([]);
  const [cards, setCards] = useState<CardState[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const top = getTop3GenresWithArtists();
    setRows(top);
    setCards(top.map(() => ({ status: "idle" })));
  }, [mounted]);

  const fetchCard = useCallback(async (index: number, row: GenreRow, forceRefresh: boolean) => {
    const key = genreToStorageKey(row.genre);
    const cacheKey = `${CLOSET_CACHE_PREFIX}${key}`;
    const fetchedAtKey = `${CLOSET_FETCHED_AT_PREFIX}${key}`;

    setCards((prev) => {
      const next = [...prev];
      next[index] = { status: "loading" };
      return next;
    });

    try {
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        const fetchedAtRaw = localStorage.getItem(fetchedAtKey);
        const fetchedAt = fetchedAtRaw ? parseInt(fetchedAtRaw, 10) : NaN;
        const isFresh = Number.isFinite(fetchedAt) && Date.now() - fetchedAt <= STALE_MS;
        if (cached && isFresh) {
          const data = JSON.parse(cached) as AestheticResponse;
          setCards((prev) => {
            const next = [...prev];
            next[index] = { status: "ok", data };
            return next;
          });
          return;
        }
      }

      const artistsForApi = row.artists.slice(0, 25);
      const res = await fetch(AESTHETIC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: row.genre, artists: artistsForApi }),
      });

      if (!res.ok) throw new Error(`Aesthetic failed: ${res.status}`);

      const data = (await res.json()) as AestheticResponse;

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(fetchedAtKey, Date.now().toString());
      }

      setCards((prev) => {
        const next = [...prev];
        next[index] = { status: "ok", data };
        return next;
      });
    } catch {
      setCards((prev) => {
        const next = [...prev];
        next[index] = { status: "error" };
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!mounted || rows.length === 0) return;
    rows.forEach((row, i) => {
      void fetchCard(i, row, false);
    });
  }, [mounted, rows, fetchCard]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-6">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white flex-1 text-center pr-10">
            Build My Closet
          </h1>
        </header>

        <p className="text-[15px] text-[#a1a1aa] mb-6">
          Your top genres from Spotify, decoded into closet aesthetics
        </p>

        {!mounted ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[180px] rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[15px] text-[#a1a1aa] py-8 text-center">
            Connect Spotify and listen to music to see your top genres here.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => {
              const state = cards[i] ?? { status: "idle" };
              const grad = CARD_GRADIENTS[i % CARD_GRADIENTS.length]!;
              return (
                <div
                  key={row.genre}
                  className="rounded-[20px] overflow-hidden border border-[rgba(255,255,255,0.08)]"
                  style={{
                    background: `linear-gradient(135deg, ${grad.color1} 0%, ${grad.color2} 100%)`,
                  }}
                >
                  <div className="p-5">
                    <span className="inline-block rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[#a1a1aa]">
                      {formatGenreLabel(row.genre)}
                    </span>

                    {state.status === "loading" || state.status === "idle" ? (
                      <div className="mt-6 flex flex-col items-center py-6">
                        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        <p className="mt-3 text-[13px] text-[#a1a1aa]">Decoding the vibe...</p>
                      </div>
                    ) : state.status === "error" ? (
                      <div className="mt-6 text-center py-4">
                        <p className="text-[14px] text-[#a1a1aa]">Could not load this aesthetic.</p>
                        <button
                          type="button"
                          onClick={() => fetchCard(i, row, true)}
                          className="mt-3 h-9 rounded-lg bg-[#22c55e] px-4 text-[13px] font-semibold text-black"
                        >
                          Retry
                        </button>
                      </div>
                    ) : state.status === "ok" ? (
                      <>
                        <h2 className="mt-4 text-[24px] font-extrabold tracking-tight text-white leading-tight">
                          {state.data.aesthetic_label}
                        </h2>
                        <p className="mt-2 text-[14px] text-[#a1a1aa] leading-relaxed">
                          {state.data.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {(state.data.colors ?? []).slice(0, 6).map((color) => {
                            const valid = isCssColor(color);
                            return (
                              <span
                                key={color}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] border ${
                                  valid
                                    ? "border-white/20 text-black"
                                    : "border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.35)] text-white"
                                }`}
                                style={valid ? { backgroundColor: color } : undefined}
                              >
                                {color}
                              </span>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(state.data.key_garments ?? []).slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[11px] text-white"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/build-my-closet/results?genre=${encodeURIComponent(row.genre)}`}
                          className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#22c55e] px-4 text-[13px] font-semibold text-black transition hover:bg-[#22c55e]/90 duration-200"
                        >
                          Explore This Aesthetic
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
