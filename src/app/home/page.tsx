"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  isOnboardingComplete,
  setOnboardingData,
  type OnboardingData,
} from "@/lib/onboarding-storage";
import {
  fetchAndStoreSpotifyData,
  getStoredTokens,
  SPOTIFY_DATA_STORAGE_KEY,
  SPOTIFY_FETCHED_AT_KEY,
} from "@/lib/spotify-api";
import { safeGetItem } from "@/lib/storage-utils";
import { BottomNav } from "@/components/BottomNav";
import type { SpotifyData } from "@/lib/spotify-api";

const FEET_OPTIONS = [4, 5, 6, 7];
const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i);
const WEIGHT_OPTIONS = Array.from({ length: 71 }, (_, i) => 50 + i * 5);
const FIT_OPTIONS = ["Menswear", "Womenswear", "Unisex"] as const;

const WELCOME_HOLD_MS = 2000;
const LOADING_HOLD_MS = 1500;

const ARTIST_FALLBACK_COLORS = ["#1a1a2e", "#0f3460", "#1a2e1a", "#2e1a1a", "#1a2a2e"] as const;

const selectClassName =
  "w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#141414] px-4 py-3 text-white focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e] transition-[border-color,box-shadow] duration-200";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<-3 | -2 | -1 | 0 | 1 | 2 | 3>(-3);
  const [spotifyTokensFailed, setSpotifyTokensFailed] = useState(false);
  const [skippedToHome, setSkippedToHome] = useState(false);
  const sequenceStartedRef = useRef(false);

  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(8);
  const [weightLbs, setWeightLbs] = useState(160);
  const [fitPreferences, setFitPreferences] = useState<
    ("Menswear" | "Womenswear" | "Unisex")[]
  >([]);
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(150);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isOnboardingComplete()) {
      setSkippedToHome(true);
      setPhase(3);
      return;
    }
    if (sequenceStartedRef.current) return;
    sequenceStartedRef.current = true;
    setPhase(-1);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || phase === 3 || phase >= 0 || phase === -3) return;
    if (phase === -1) {
      const t = setTimeout(() => setPhase(-2), WELCOME_HOLD_MS);
      return () => clearTimeout(t);
    }
    if (phase === -2) {
      const t = setTimeout(() => setPhase(0), LOADING_HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [mounted, phase]);

  useEffect(() => {
    if (!mounted || phase !== 3) return;
    let cancelled = false;
    setSpotifyTokensFailed(false);

    const CACHE_MS = 30 * 60 * 1000;

    function shouldFetchSpotifyData(): boolean {
      if (typeof window === "undefined") return true;
      try {
        const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
        const fetchedAt = localStorage.getItem(SPOTIFY_FETCHED_AT_KEY);
        if (!raw) return true;
        if (!fetchedAt) return true;
        const ts = parseInt(fetchedAt, 10);
        if (Number.isNaN(ts)) return true;
        return Date.now() - ts > CACHE_MS;
      } catch {
        return true;
      }
    }

    async function run() {
      let tokens = getStoredTokens();
      if (!tokens) {
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;
        tokens = getStoredTokens();
      }
      if (!tokens) {
        if (!cancelled) setSpotifyTokensFailed(true);
        return;
      }
      if (!shouldFetchSpotifyData()) return;
      try {
        await fetchAndStoreSpotifyData();
      } catch (err) {
        if (!cancelled) console.error("Spotify fetch error:", err);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [mounted, phase]);

  const toggleFit = (fit: (typeof FIT_OPTIONS)[number]) => {
    setFitPreferences((prev) =>
      prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit]
    );
  };

  const handleContinue = () => {
    if (phase < 2) {
      setPhase((p) => (p + 1) as 0 | 1 | 2);
    } else {
      const data: OnboardingData = {
        heightFeet,
        heightInches,
        weightLbs,
        fitPreferences,
        budgetMin,
        budgetMax,
        completed: true,
      };
      setOnboardingData(data);
      setPhase(3);
    }
  };

  const canContinue = () => {
    if (phase === 0) return true;
    if (phase === 1) return fitPreferences.length > 0;
    return true;
  };

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    router.push("/");
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
      </div>
    );
  }

  const showWelcome = phase === -1;
  const showLoading = phase === -2;
  const showStep0 = phase === 0;
  const showStep1 = phase === 1;
  const showStep2 = phase === 2;
  const showHome = phase === 3;
  const waitingToStart = phase === -3;

  if (waitingToStart) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md flex flex-col min-h-[70vh]">
        {showWelcome && (
          <div
            key="welcome"
            className="flex flex-col items-center justify-center flex-1 text-center"
          >
            <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">
              Welcome to GEL
            </h1>
          </div>
        )}

        {showLoading && (
          <div
            key="loading"
            className="flex flex-col items-center justify-center flex-1 text-center"
          >
            <div
              className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-hidden
            />
            <p className="text-[#a1a1aa] text-[15px] mt-6 max-w-xs">
              Answer a few questions while we read your music
            </p>
          </div>
        )}

        {showStep0 && (
          <div key="step0" className="flex flex-col flex-1">
            <h2 className="text-[22px] font-bold tracking-[-0.3px] text-white mb-2">
              Height and weight
            </h2>
            <p className="text-[#a1a1aa] text-[15px] mb-6">
              We use this to recommend better fits.
            </p>
            <div className="space-y-6">
              <div>
                <p className="text-[#52525b] text-[13px] mb-2">Height</p>
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="sr-only">Feet</span>
                    <select
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(Number(e.target.value))}
                      className={selectClassName}
                      aria-label="Height (feet)"
                    >
                      {FEET_OPTIONS.map((ft) => (
                        <option key={ft} value={ft} className="bg-[#1c1c1c] text-white">
                          {ft} ft
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1">
                    <span className="sr-only">Inches</span>
                    <select
                      value={heightInches}
                      onChange={(e) => setHeightInches(Number(e.target.value))}
                      className={selectClassName}
                      aria-label="Height (inches)"
                    >
                      {INCHES_OPTIONS.map((inVal) => (
                        <option key={inVal} value={inVal} className="bg-[#1c1c1c] text-white">
                          {inVal} in
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-[#52525b] text-[13px] mb-2">Weight (lbs)</p>
                <label className="block">
                  <span className="sr-only">Weight in pounds</span>
                  <select
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(Number(e.target.value))}
                    className={selectClassName}
                    aria-label="Weight (lbs)"
                  >
                    {WEIGHT_OPTIONS.map((lbs) => (
                      <option key={lbs} value={lbs} className="bg-[#1c1c1c] text-white">
                        {lbs} lbs
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {showStep1 && (
          <div key="step1" className="flex flex-col flex-1">
            <h2 className="text-[22px] font-bold tracking-[-0.3px] text-white mb-2">
              Gender / fit preference
            </h2>
            <p className="text-[#a1a1aa] text-[15px] mb-8">
              Select all that apply. You can change this later.
            </p>
            <div className="flex flex-wrap gap-3">
              {FIT_OPTIONS.map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => toggleFit(fit)}
                  className={`px-6 py-3 rounded-xl font-semibold transition duration-200 ${
                    fitPreferences.includes(fit)
                      ? "bg-[#22c55e] text-black"
                      : "bg-[#141414] border border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c]"
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>
        )}

        {showStep2 && (
          <div key="step2" className="flex flex-col flex-1">
            <h2 className="text-[22px] font-bold tracking-[-0.3px] text-white mb-2">Budget</h2>
            <p className="text-[#a1a1aa] text-[15px] mb-8">
              What range do you usually spend per item?
            </p>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[13px] text-[#a1a1aa] mb-2">
                  <span>${budgetMin}</span>
                  <span>${budgetMax}</span>
                </div>
                <div className="relative h-8 flex items-center">
                  <div className="absolute left-0 right-0 h-1.5 bg-[rgba(255,255,255,0.08)] rounded-[3px]" />
                  <input
                    type="range"
                    min={0}
                    max={500}
                    value={budgetMin}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBudgetMin(Math.min(v, budgetMax - 10));
                    }}
                    className="absolute w-full h-8 appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22c55e] [&::-webkit-slider-thumb]:cursor-pointer z-10"
                  />
                  <input
                    type="range"
                    min={0}
                    max={500}
                    value={budgetMax}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBudgetMax(Math.max(v, budgetMin + 10));
                    }}
                    className="absolute w-full h-8 appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22c55e] [&::-webkit-slider-thumb]:cursor-pointer z-20"
                  />
                </div>
                <p className="text-[#52525b] text-xs mt-1">$0 – $500</p>
              </div>
            </div>
          </div>
        )}

        {showHome && spotifyTokensFailed && (
          <div key="home-error" className="flex flex-col items-center justify-center flex-1 text-center">
            <p className="text-red-400 mb-6 max-w-sm text-[15px]">
              Could not connect to Spotify. Please log out and try again.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.12)] px-6 py-3 text-white font-semibold hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c] transition duration-200"
            >
              Log out
            </button>
          </div>
        )}

        {showHome && !spotifyTokensFailed && (
          <div key="home" className={`${skippedToHome ? "" : ""} min-h-full pb-8`}>
            <header className="flex items-center justify-between px-0 py-2">
              <span className="text-[20px] font-extrabold tracking-tight text-white">GEL</span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
                aria-label="Profile"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </header>

            <section className="mt-8">
              <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-[#52525b] mb-4">
                YOUR VIBE THIS WEEK
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                {(() => {
                  const data = safeGetItem<SpotifyData>(SPOTIFY_DATA_STORAGE_KEY);
                  const artists = data?.topArtists?.short_term?.slice(0, 5) ?? [];
                  if (artists.length === 0) {
                    return ARTIST_FALLBACK_COLORS.map((_, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-[140px] h-[180px] rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton"
                        aria-hidden
                      />
                    ));
                  }
                  return artists.map((artist, i) => {
                    const imgUrl = artist.images?.[artist.images.length - 1]?.url ?? null;
                    const fallbackColor = ARTIST_FALLBACK_COLORS[i % ARTIST_FALLBACK_COLORS.length]!;
                    return (
                      <div
                        key={artist.id ?? i}
                        className="flex-shrink-0 w-[140px] h-[180px] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#141414] transition duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#1c1c1c] relative"
                      >
                        {imgUrl ? (
                          <>
                            <img
                              src={imgUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                            />
                            <div
                              className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[#0a0a0a]"
                              aria-hidden
                            />
                          </>
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: fallbackColor }}
                            aria-hidden
                          />
                        )}
                        <p className="absolute bottom-0 left-0 right-0 p-3 text-[13px] font-semibold text-white z-10">
                          {artist.name ?? "Unknown"}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>

            <section className="mt-10 pb-20">
              <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-[#52525b] mb-4">
                EXPLORE
              </h2>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/find-my-niche"
                  className="flex h-[72px] w-full items-center gap-4 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] px-[18px] transition duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white truncate">Find My Niche</p>
                    <p className="text-[13px] text-[#a1a1aa] truncate">Explore a genre from your listening</p>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/match-my-vibe"
                  className="flex h-[72px] w-full items-center gap-4 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] px-[18px] transition duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#3b82f6]" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white truncate">Match My Vibe</p>
                    <p className="text-[13px] text-[#a1a1aa] truncate">Analyse the mood of a playlist</p>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/build-my-closet"
                  className="flex h-[72px] w-full items-center gap-4 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] px-[18px] transition duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-[#1c1c1c]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#a855f7]" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white truncate">Build My Closet</p>
                    <p className="text-[13px] text-[#a1a1aa] truncate">Your full taste profile</p>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </section>
          </div>
        )}

        {(showStep0 || showStep1 || showStep2) && (
          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue()}
              className="w-full h-[52px] rounded-xl bg-[#22c55e] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#22c55e]/90 transition duration-200"
            >
              Continue
            </button>
          </div>
        )}
      </div>

      {showHome && !spotifyTokensFailed && <BottomNav />}
    </div>
  );
}
