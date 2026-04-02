"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeGetItem } from "@/lib/storage-utils";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";
import type { SpotifyData } from "@/lib/spotify-api";
import { BottomNav } from "@/components/BottomNav";

const PLAYLIST_COLORS = ["#1a1a2e", "#0f3460", "#1a2e1a", "#2e1a1a", "#1a2a2e"] as const;

export default function MatchMyVibePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyData["playlists"]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      const data = safeGetItem<SpotifyData>(SPOTIFY_DATA_STORAGE_KEY);
      setPlaylists(data?.playlists ?? []);
    } catch {
      setPlaylists([]);
    }
  }, [mounted]);

  const handleRetry = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SPOTIFY_DATA_STORAGE_KEY);
    } catch {
      // ignore
    }
    router.replace("/home");
  };

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
            Match My Vibe
          </h1>
        </header>

        <p className="text-[15px] text-[#a1a1aa] mb-6">
          Pick a playlist — we'll decode its mood
        </p>

        {!mounted ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[72px] rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[15px] text-[#a1a1aa] mb-6">
              No playlists found. Create a playlist on Spotify and come back.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.12)] h-[52px] px-6 font-semibold text-white transition hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c] duration-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {playlists.map((pl, i) => {
              const imgUrl = pl.images?.[0]?.url ?? null;
              const fallbackColor = PLAYLIST_COLORS[i % PLAYLIST_COLORS.length]!;
              const trackCount = pl.tracks?.total ?? 0;
              const isSpotifyOwned = pl.owner_id?.startsWith("spotify") ?? false;
              return (
                <Link
                  key={pl.id}
                  href={`/match-my-vibe/results?playlist_id=${encodeURIComponent(pl.id)}&playlist_name=${encodeURIComponent(pl.name)}`}
                  className="flex h-[72px] w-full items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141414] px-3.5 transition duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c]"
                >
                  <div className="relative h-12 w-12 flex-shrink-0">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-lg"
                        style={{ backgroundColor: fallbackColor }}
                        aria-hidden
                      />
                    )}
                    {isSpotifyOwned && (
                      <span
                        className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.12)]"
                        title="Spotify editorial playlist — limited track data"
                        aria-label="Limited access"
                      >
                        <svg className="h-2.5 w-2.5 text-[#71717a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{pl.name}</p>
                    <p className="text-[13px] text-[#a1a1aa]">
                      {trackCount} tracks{isSpotifyOwned ? " · Spotify editorial" : ""}
                    </p>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
