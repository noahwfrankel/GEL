"use client";

/**
 * Match My Vibe — results for a single playlist.
 * Spotify playlist tracks → top 5 unique artist names → aesthetic API → fashion search.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  getValidAccessToken,
  spotifyFetch,
  SPOTIFY_DATA_STORAGE_KEY,
} from "@/lib/spotify-api";
import type { SpotifyData } from "@/lib/spotify-api";
import {
  getSeenItemIds,
  addSeenItemIds,
  trackInteraction,
  toggleLikedByKey,
  getLikedByKey,
  LIKED_VIBE_KEY,
  setLastAestheticLabel,
  type FashionItem,
} from "@/lib/storage-utils";
import { itemStableId } from "@/components/ProductCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AestheticResponse = {
  aesthetic_label: string;
  description: string;
  colors: string[];
  key_garments: string[];
  ebay_search_keywords: string[];
  artist_influence: string[];
  buying_push: string;
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

/** Look up stored playlist owner ID from cached Spotify data. */
function getStoredPlaylistOwnerId(id: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SpotifyData;
    return data.playlists?.find((p) => p.id === id)?.owner_id ?? null;
  } catch {
    return null;
  }
}

function isCssColor(value: string): boolean {
  if (typeof window === "undefined") return false;
  const el = new Option().style;
  el.color = "";
  el.color = value;
  return el.color !== "";
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
          className="h-[160px] rounded-[14px] bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton flex items-center justify-center"
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

  const storageKey = useMemo(
    () => (playlistId ? playlistIdToStorageKey(playlistId) : ""),
    [playlistId]
  );
  const aestheticCacheKey = `${AESTHETIC_CACHE_PREFIX}${storageKey}`;
  const aestheticFetchedAtKey = `${AESTHETIC_FETCHED_AT_PREFIX}${storageKey}`;
  const fashionCacheKey = `${FASHION_CACHE_PREFIX}${storageKey}`;
  const fashionFetchedAtKey = `${FASHION_FETCHED_AT_PREFIX}${storageKey}`;

  const [result, setResult] = useState<AestheticResponse | null>(null);
  const [fashionItems, setFashionItems] = useState<FashionItem[]>([]);
  const [phase, setPhase] = useState<"playlist" | "aesthetic" | "done">(
    "playlist"
  );
  const [bootDone, setBootDone] = useState(false);
  const [isFashionLoading, setIsFashionLoading] = useState(false);
  const [isRefreshingFashion, setIsRefreshingFashion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedVibeIds, setSavedVibeIds] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? new Set(getLikedByKey(LIKED_VIBE_KEY)) : new Set()
  );

  const fetchFashion = useCallback(
    async (keywords: string[], forceRefresh: boolean) => {
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
        const seenIds = getSeenItemIds();
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
            excluded_item_ids: seenIds,
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

        // Track seen + viewed
        addSeenItemIds(items.map((i) => itemStableId(i)));
        items.forEach((item) => {
          trackInteraction({
            item_id: itemStableId(item),
            item_title: item.title,
            genre: playlistName,
            action: "viewed",
            timestamp: Date.now(),
            price: item.price,
            source: "match_my_vibe",
            image_url: item.image_url,
            item_url: item.item_url,
            condition: item.condition,
          });
        });

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
    },
    [fashionCacheKey, fashionFetchedAtKey, playlistName]
  );

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!playlistId) {
        setError("Could not load recommendations. Try again.");
        setPhase("done");
        setBootDone(true);
        return;
      }

      setError(null);
      setBootDone(false);
      setPhase("playlist");
      console.log("[Match My Vibe] Starting load for playlist:", playlistId, "| cache key:", playlistIdToStorageKey(playlistId));

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
              await fetchFashion(parsed.ebay_search_keywords ?? [], false);
              return;
            }
          } catch {
            /* continue to network */
          }
        }

        setPhase("playlist");
        const token = await getValidAccessToken();
        if (!token) throw new Error("No Spotify session — please reconnect Spotify");

        // Determine ownership from cached Spotify data
        const ownerId = getStoredPlaylistOwnerId(playlistId);
        const isSpotifyOwned = ownerId?.startsWith("spotify") ?? false;

        let artists: string[] = [];
        let genre = playlistName;

        if (isSpotifyOwned) {
          // Editorial/Spotify-curated: skip tracks endpoint (403), use metadata
          console.log("[Match My Vibe] Editorial playlist — fetching metadata, skipping tracks");
          try {
            const { data: plMeta } = await spotifyFetch<{ name: string }>(
              `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}`,
              token
            );
            genre = plMeta.name ?? playlistName;
            console.log("[Match My Vibe] Metadata genre:", genre);
          } catch {
            console.warn("[Match My Vibe] Could not fetch playlist metadata, using name from URL");
          }
          // artists stays [] — no track access for editorial playlists
        } else {
          const tracksUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`;
          console.log("[Match My Vibe] Fetching tracks for playlist:", playlistId);

          let tracksData: SpotifyPlaylistTracksPage | null = null;
          try {
            const result = await spotifyFetch<SpotifyPlaylistTracksPage>(tracksUrl, token);
            tracksData = result.data;
          } catch (spotifyErr) {
            const msg = spotifyErr instanceof Error ? spotifyErr.message : String(spotifyErr);
            console.error("[Match My Vibe] Tracks fetch error:", msg);
            // On any 403 — never error. Try playlist object for metadata, then proceed with what we have.
            if (msg.includes("403")) {
              console.log("[Match My Vibe] 403 on tracks — trying playlist object fallback");
              try {
                const { data: plMeta } = await spotifyFetch<{ name: string }>(
                  `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}`,
                  token
                );
                genre = plMeta.name ?? playlistName;
                console.log("[Match My Vibe] Fallback metadata loaded, genre:", genre);
              } catch {
                // Can't access even the playlist object — use name from URL and proceed
                console.warn("[Match My Vibe] Playlist object also inaccessible, using URL name as genre");
                genre = playlistName;
              }
              // artists stays [] — proceed to aesthetic with what we have
            } else {
              setError("Could not read this playlist. Try again.");
              setPhase("done");
              setBootDone(true);
              return;
            }
          }

          if (tracksData) {
            const trackCount = tracksData.items?.length ?? 0;
            console.log("[Match My Vibe] Tracks returned:", trackCount);
            if (trackCount === 0) {
              console.log("[Match My Vibe] Playlist is empty");
              setError("This playlist is empty — add some songs and come back.");
              setPhase("done");
              setBootDone(true);
              return;
            }
            artists = top5UniqueArtistNames(tracksData.items);
            console.log("[Match My Vibe] Artists extracted:", artists);
          }
        }

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
        setLastAestheticLabel(payload.aesthetic_label);
        setPhase("done");

        if (typeof window !== "undefined") {
          localStorage.setItem(aestheticCacheKey, JSON.stringify(payload));
          localStorage.setItem(aestheticFetchedAtKey, Date.now().toString());
        }

        await fetchFashion(payload.ebay_search_keywords ?? [], forceRefresh);
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
      fetchFashion,
    ]
  );

  const handleRefreshFashion = useCallback(async () => {
    if (!result) return;
    setIsRefreshingFashion(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem(fashionCacheKey);
      localStorage.removeItem(fashionFetchedAtKey);
    }
    await fetchFashion(result.ebay_search_keywords ?? [], true);
    setIsRefreshingFashion(false);
  }, [result, fashionCacheKey, fashionFetchedAtKey, fetchFashion]);

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
      {/* Sticky refresh button */}
      {result && !isLoading && (
        <button
          type="button"
          onClick={() => void handleRefreshFashion()}
          disabled={isRefreshingFashion}
          className="fixed top-4 right-4 z-30 flex items-center gap-1.5 h-9 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141414]/90 px-3 text-[12px] text-[#a1a1aa] backdrop-blur-sm transition hover:text-white disabled:opacity-50"
        >
          {isRefreshingFashion ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {isRefreshingFashion ? "Refreshing" : "Refresh"}
        </button>
      )}
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
            <button
              type="button"
              onClick={() => void load(true)}
              className="mt-4 h-11 rounded-xl bg-[#22c55e] px-5 font-semibold text-black transition hover:bg-[#22c55e]/90 duration-200"
            >
              Retry
            </button>
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
              <div className="space-y-3 mt-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[280px] rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 mt-8">
                {fashionItems.map((item) => {
                  const id = itemStableId(item);
                  const isSaved = savedVibeIds.has(id);
                  return (
                    <div
                      key={id}
                      className="flex h-[280px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141414] transition hover:border-[rgba(255,255,255,0.16)]"
                    >
                      {/* Left: photo */}
                      <div className="w-[40%] flex-shrink-0 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Right: details */}
                      <div className="flex flex-col flex-1 p-4 min-w-0">
                        <p className="text-[14px] font-medium text-white leading-snug line-clamp-3 flex-shrink-0">
                          {item.title}
                        </p>
                        <p className="mt-2 text-[20px] font-bold text-[#22c55e] flex-shrink-0">
                          ${item.price.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-[#71717a] flex-shrink-0">
                          {item.condition || "Pre-owned"}
                        </p>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2 mt-3">
                          <a
                            href={item.item_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackInteraction({
                              item_id: id, item_title: item.title,
                              genre: playlistName, action: "clicked",
                              timestamp: Date.now(), price: item.price,
                              source: "match_my_vibe", image_url: item.image_url,
                              item_url: item.item_url, condition: item.condition,
                            })}
                            className="flex-1 flex h-9 items-center justify-center rounded-lg bg-[#22c55e] text-[12px] font-semibold text-black"
                          >
                            View →
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const newSaved = toggleLikedByKey(id, LIKED_VIBE_KEY);
                              setSavedVibeIds((prev) => {
                                const next = new Set(prev);
                                if (newSaved) next.add(id);
                                else next.delete(id);
                                return next;
                              });
                              trackInteraction({
                                item_id: id, item_title: item.title,
                                genre: playlistName, action: newSaved ? "liked" : "dismissed",
                                timestamp: Date.now(), price: item.price,
                                source: "match_my_vibe", image_url: item.image_url,
                                item_url: item.item_url, condition: item.condition,
                              });
                            }}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                              isSaved
                                ? "border-[#22c55e] text-[#22c55e]"
                                : "border-[rgba(255,255,255,0.12)] text-white"
                            }`}
                            aria-label={isSaved ? "Remove" : "Save"}
                          >
                            <svg className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
