"use client";

/**
 * Match My Vibe — results for a single playlist.
 * Spotify playlist tracks → top 5 unique artist names → aesthetic API → fashion search.
 * No placeholder UI; all logic lives in this file.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getValidAccessToken, spotifyFetch } from "@/lib/spotify-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AestheticResponse = {
  aesthetic_label: string;
  description: string;
  colors: string[];
  key_garments: string[];
  ebay_search_keywords: string[];
};

type FashionItem = {
  title: string;
  price: number;
  image_url: string;
  item_url: string;
  condition: string;
  source: string;
};

type FashionSearchResponse = {
  items: FashionItem[];
  total: number;
};

type SpotifyPlaylistTrackItem = {
  track: {
    artists?: { name?: string }[];
  } | null;
};

type SpotifyPlaylistTracksPage = {
  items: SpotifyPlaylistTrackItem[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AESTHETIC_ENDPOINT =
  "https://web-production-78bf0.up.railway.app/aesthetic/from-genre";
const FASHION_ENDPOINT =
  "https://web-production-78bf0.up.railway.app/fashion/search";

const AESTHETIC_CACHE_PREFIX = "gel_vibe_aesthetic_";
const AESTHETIC_FETCHED_AT_PREFIX = "gel_vibe_aesthetic_fetched_at_";
const FASHION_CACHE_PREFIX = "gel_vibe_fashion_";
const FASHION_FETCHED_AT_PREFIX = "gel_vibe_fashion_fetched_at_";

const STALE_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function playlistIdToStorageKey(id: string): string {
  return id.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "unknown";
}

/** First 5 unique artist names in playlist track order. */
function top5UniqueArtistNames(items: SpotifyPlaylistTrackItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const track = item?.track;
    if (!track?.artists?.length) continue;
    for (const a of track.artists) {
      const name = a?.name?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
      if (out.length >= 5) return out;
    }
  }
  return out;
}

function isCssColor(value: string): boolean {
  if (typeof window === "undefined") return false;
  const el = new Option().style;
  el.color = "";
  el.color = value;
  return el.color !== "";
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function getGenderFromFitPreferences(
  value: unknown
): "mens" | "womens" | "unisex" {
  const normalized = (Array.isArray(value) ? value : [value]).map((v) =>
    String(v ?? "").toLowerCase()
  );
  if (normalized.some((v) => v.includes("menswear"))) return "mens";
  if (normalized.some((v) => v.includes("womenswear"))) return "womens";
  return "unisex";
}

function getOnboardingFilters(): {
  budgetMin: number;
  budgetMax: number;
  gender: "mens" | "womens" | "unisex";
} {
  if (typeof window === "undefined") {
    return { budgetMin: 0, budgetMax: 500, gender: "unisex" };
  }
  try {
    const raw = localStorage.getItem("gel_onboarding");
    if (!raw) return { budgetMin: 0, budgetMax: 500, gender: "unisex" };
    const parsed = JSON.parse(raw) as {
      budgetMin?: unknown;
      budgetMax?: unknown;
      fitPreferences?: unknown;
    };
    const budgetMin = Number(parsed.budgetMin);
    const budgetMax = Number(parsed.budgetMax);
    return {
      budgetMin: Number.isFinite(budgetMin) ? budgetMin : 0,
      budgetMax: Number.isFinite(budgetMax) ? budgetMax : 500,
      gender: getGenderFromFitPreferences(parsed.fitPreferences),
    };
  } catch {
    return { budgetMin: 0, budgetMax: 500, gender: "unisex" };
  }
}

function ProductSkeletonGrid() {
  return (
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
  );
}

// ---------------------------------------------------------------------------
// Page content (needs Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function MatchMyVibeResultsContent() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get("playlist_id") ?? "";
  const playlistName = searchParams.get("playlist_name") ?? "Playlist";

  const [result, setResult] = useState<AestheticResponse | null>(null);
  const [fashionItems, setFashionItems] = useState<FashionItem[]>([]);
  const [phase, setPhase] = useState<"playlist" | "aesthetic" | "done">(
    "playlist"
  );
  const [bootDone, setBootDone] = useState(false);
  const [isFashionLoading, setIsFashionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);

  const storageKey = playlistId ? playlistIdToStorageKey(playlistId) : "";
  const aestheticCacheKey = `${AESTHETIC_CACHE_PREFIX}${storageKey}`;
  const aestheticFetchedAtKey = `${AESTHETIC_FETCHED_AT_PREFIX}${storageKey}`;
  const fashionCacheKey = `${FASHION_CACHE_PREFIX}${storageKey}`;
  const fashionFetchedAtKey = `${FASHION_FETCHED_AT_PREFIX}${storageKey}`;

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!playlistId) {
        setError("Could not load recommendations. Try again.");
        setPhase("done");
        setBootDone(true);
        return;
      }

      setError(null);
      setCanRetry(true);
      setBootDone(false);
      setPhase("playlist");
      console.log("[Match My Vibe] Starting load for playlist:", playlistId, "| cache key:", playlistIdToStorageKey(playlistId));

      const fetchFashion = async (keywords: string[]) => {
        setIsFashionLoading(true);
        try {
          if (!forceRefresh && typeof window !== "undefined") {
            const cached = localStorage.getItem(fashionCacheKey);
            const fetchedAtRaw = localStorage.getItem(fashionFetchedAtKey);
            const fetchedAt = fetchedAtRaw ? parseInt(fetchedAtRaw, 10) : NaN;
            const isFresh =
              Number.isFinite(fetchedAt) &&
              Date.now() - fetchedAt <= STALE_MS;
            if (cached && isFresh) {
              setFashionItems(JSON.parse(cached) as FashionItem[]);
              return;
            }
          }

          const { budgetMin, budgetMax, gender } = getOnboardingFilters();
          console.log("[Match My Vibe] Fetching fashion:", { keywords: keywords.slice(0, 3), budgetMin, budgetMax, gender });
          const fashionRes = await fetch(FASHION_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keywords,
              budget_min: budgetMin,
              budget_max: budgetMax,
              gender,
              limit: 12,
            }),
          });

          if (!fashionRes.ok) {
            throw new Error(`Fashion request failed: ${fashionRes.status}`);
          }

          const fashionPayload =
            (await fashionRes.json()) as FashionSearchResponse;
          const items = fashionPayload.items ?? [];
          console.log("[Match My Vibe] Fashion returned", items.length, "items");
          setFashionItems(items);

          if (typeof window !== "undefined") {
            localStorage.setItem(fashionCacheKey, JSON.stringify(items));
            localStorage.setItem(fashionFetchedAtKey, Date.now().toString());
          }
        } catch (fashionErr) {
          console.error("[Match My Vibe] Fashion fetch failed:", fashionErr);
          // Don't rethrow — aesthetic result should still display
        } finally {
          setIsFashionLoading(false);
        }
      };

      try {
        if (!forceRefresh && typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem(aestheticCacheKey);
            const fetchedAtRaw = localStorage.getItem(aestheticFetchedAtKey);
            const fetchedAt = fetchedAtRaw ? parseInt(fetchedAtRaw, 10) : NaN;
            const isFresh =
              Number.isFinite(fetchedAt) &&
              Date.now() - fetchedAt <= STALE_MS;
            if (cached && isFresh) {
              const parsed = JSON.parse(cached) as AestheticResponse;
              setResult(parsed);
              setPhase("done");
              await fetchFashion(parsed.ebay_search_keywords ?? []);
              return;
            }
          } catch {
            /* continue to network */
          }
        }

        setPhase("playlist");
        const token = await getValidAccessToken();
        if (!token) throw new Error("No Spotify session — please reconnect Spotify");

        const tracksUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`;
        console.log("[Match My Vibe] Fetching tracks for playlist:", playlistId, "name:", playlistName);

        let data: SpotifyPlaylistTracksPage;
        try {
          const result = await spotifyFetch<SpotifyPlaylistTracksPage>(tracksUrl, token);
          data = result.data;
        } catch (spotifyErr) {
          const msg = spotifyErr instanceof Error ? spotifyErr.message : String(spotifyErr);
          console.error("[Match My Vibe] Spotify tracks fetch error:", msg);
          if (msg.includes("403")) {
            setError("This playlist is private or unavailable.");
            setCanRetry(false);
          } else {
            setError("Could not read this playlist. Try again.");
          }
          setPhase("done");
          setBootDone(true);
          return;
        }

        const trackCount = data.items?.length ?? 0;
        console.log("[Match My Vibe] Tracks returned:", trackCount);

        if (trackCount === 0) {
          console.log("[Match My Vibe] Playlist is empty");
          setError("This playlist is empty — add some songs and come back.");
          setCanRetry(false);
          setPhase("done");
          setBootDone(true);
          return;
        }

        const artists = top5UniqueArtistNames(data.items);
        console.log("[Match My Vibe] Artists extracted:", artists);
        const genre = playlistName;

        setPhase("aesthetic");
        console.log("[Match My Vibe] Fetching aesthetic — genre:", genre, "artists:", artists);
        const aestheticRes = await fetch(AESTHETIC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ genre, artists }),
        });

        if (!aestheticRes.ok) {
          throw new Error(`Aesthetic request failed: ${aestheticRes.status}`);
        }

        const payload = (await aestheticRes.json()) as AestheticResponse;
        console.log("[Match My Vibe] Aesthetic loaded:", payload.aesthetic_label);
        setResult(payload);
        setPhase("done");

        if (typeof window !== "undefined") {
          localStorage.setItem(aestheticCacheKey, JSON.stringify(payload));
          localStorage.setItem(aestheticFetchedAtKey, Date.now().toString());
        }

        await fetchFashion(payload.ebay_search_keywords ?? []);
      } catch (err) {
        console.error("[Match My Vibe] Load failed:", err);
        setError("Could not load recommendations. Try again.");
        setPhase("done");
      } finally {
        setBootDone(true);
      }
    },
    [
      playlistId,
      playlistName,
      aestheticCacheKey,
      aestheticFetchedAtKey,
      fashionCacheKey,
      fashionFetchedAtKey,
    ]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const isLoading =
    !bootDone || phase === "playlist" || phase === "aesthetic";
  const loadingMessage =
    phase === "playlist"
      ? "Reading your playlist..."
      : "Decoding the vibe...";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/match-my-vibe"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Back to Match My Vibe"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="mt-4 text-[15px] text-[#a1a1aa]">
              {loadingMessage}
            </p>
          </div>
        ) : error || !result ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
            <p className="text-[15px] text-[#a1a1aa]">
              {error ?? "Could not load recommendations. Try again."}
            </p>
            {canRetry && (
              <button
                type="button"
                onClick={() => void load(true)}
                className="mt-4 h-11 rounded-xl bg-[#22c55e] px-5 font-semibold text-black transition hover:bg-[#22c55e]/90 duration-200"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-[32px] font-extrabold tracking-[-0.7px] text-white leading-[1.1]">
              {result.aesthetic_label}
            </h1>
            <p className="mt-2 text-[15px] text-[#a1a1aa]">
              {result.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {result.colors?.map((color) => {
                const valid = isCssColor(color);
                return (
                  <span
                    key={color}
                    className={`rounded-full px-3 py-1 text-[12px] border ${
                      valid
                        ? "border-white/20 text-black"
                        : "border-[rgba(255,255,255,0.12)] bg-[#1c1c1c] text-white"
                    }`}
                    style={valid ? { backgroundColor: color } : undefined}
                  >
                    {color}
                  </span>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {result.key_garments?.map((garment) => (
                <span
                  key={garment}
                  className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141414] px-3 py-2 text-[12px] text-white"
                >
                  {garment}
                </span>
              ))}
            </div>

            {result.ebay_search_keywords?.length > 0 && (
              <p className="mt-5 text-[12px] text-[#71717a]">
                Sourcing: {result.ebay_search_keywords.join(", ")}
              </p>
            )}

            {isFashionLoading ? (
              <ProductSkeletonGrid />
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-8">
                {fashionItems.map((item) => (
                  <a
                    key={`${item.item_url}-${item.title}`}
                    href={item.item_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141414] transition hover:border-[rgba(255,255,255,0.16)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote eBay URLs */}
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-[180px] object-cover rounded-t-xl"
                    />
                    <div className="p-3">
                      <p className="text-[14px] text-white leading-[1.35] line-clamp-2">
                        {item.title}
                      </p>
                      <p className="mt-2 text-[16px] font-semibold text-[#22c55e]">
                        {formatPrice(item.price)}
                      </p>
                      <span className="mt-1 inline-block text-[11px] text-[#71717a]">
                        {item.condition || "Pre-owned"}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

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
