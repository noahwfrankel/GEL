"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";

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

type ArtistLike = { name?: string; genres?: string[] };

const AESTHETIC_CACHE_PREFIX = "gel_niche_aesthetic_";
const AESTHETIC_ENDPOINT = "https://web-production-78bf0.up.railway.app/aesthetic/from-genre";
const FASHION_CACHE_PREFIX = "gel_niche_fashion_";
const FASHION_ENDPOINT = "https://web-production-78bf0.up.railway.app/fashion/search";
const FASHION_FETCHED_AT_PREFIX = "gel_niche_fashion_fetched_at_";
const STALE_MS = 24 * 60 * 60 * 1000;

function genreToStorageKey(genre: string): string {
  return genre.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "") || "unknown";
}

function getMatchingArtistsForGenre(genre: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw) as {
      topArtists?: {
        short_term?: ArtistLike[] | { items?: ArtistLike[] };
        medium_term?: ArtistLike[] | { items?: ArtistLike[] };
        long_term?: ArtistLike[] | { items?: ArtistLike[] };
      };
    };

    function toArtistArray(value: unknown): ArtistLike[] {
      if (Array.isArray(value)) return value as ArtistLike[];
      if (value && typeof value === "object" && "items" in value && Array.isArray((value as { items?: unknown[] }).items)) {
        return (value as { items: ArtistLike[] }).items;
      }
      return [];
    }

    const targetGenre = genre.trim().toLowerCase();
    if (!targetGenre) return [];

    const allArtists = [
      ...toArtistArray(data.topArtists?.short_term),
      ...toArtistArray(data.topArtists?.medium_term),
      ...toArtistArray(data.topArtists?.long_term),
    ];

    const uniqueNames = new Set<string>();

    for (const artist of allArtists) {
      const name = artist?.name?.trim();
      if (!name) continue;

      const artistGenres = (artist?.genres ?? []).map((g) => g.trim().toLowerCase()).filter(Boolean);
      if (artistGenres.includes(targetGenre)) {
        uniqueNames.add(name);
      }
    }

    return Array.from(uniqueNames);
  } catch {
    return [];
  }
}

function isCssColor(value: string): boolean {
  if (typeof window === "undefined") return false;
  const el = new Option().style;
  el.color = "";
  el.color = value;
  return el.color !== "";
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

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function getGenderFromFitPreferences(value: unknown): "mens" | "womens" | "unisex" {
  const normalizedValues = (Array.isArray(value) ? value : [value])
    .map((v) => String(v ?? "").toLowerCase());
  if (normalizedValues.some((v) => v.includes("menswear"))) return "mens";
  if (normalizedValues.some((v) => v.includes("womenswear"))) return "womens";
  return "unisex";
}

function getOnboardingFilters(): { budgetMin: number; budgetMax: number; gender: "mens" | "womens" | "unisex" } {
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
    const gender = getGenderFromFitPreferences(parsed.fitPreferences);

    return {
      budgetMin: Number.isFinite(budgetMin) ? budgetMin : 0,
      budgetMax: Number.isFinite(budgetMax) ? budgetMax : 500,
      gender,
    };
  } catch {
    return { budgetMin: 0, budgetMax: 500, gender: "unisex" };
  }
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const genre = searchParams.get("genre") ?? "";

  const [result, setResult] = useState<AestheticResponse | null>(null);
  const [fashionItems, setFashionItems] = useState<FashionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFashionLoading, setIsFashionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAesthetic = useCallback(
    async (forceRefresh = false) => {
      if (!genre) {
        setError("Could not load recommendations. Try again.");
        setIsLoading(false);
        return;
      }

      const cacheKey = `${AESTHETIC_CACHE_PREFIX}${genreToStorageKey(genre)}`;
      const fashionCacheKey = `${FASHION_CACHE_PREFIX}${genreToStorageKey(genre)}`;
      const fashionFetchedAtKey = `${FASHION_FETCHED_AT_PREFIX}${genreToStorageKey(genre)}`;

      setIsLoading(true);
      setError(null);

      const fetchFashion = async (keywords: string[]) => {
        setIsFashionLoading(true);
        try {
          if (!forceRefresh && typeof window !== "undefined") {
            const cached = localStorage.getItem(fashionCacheKey);
            const fetchedAtRaw = localStorage.getItem(fashionFetchedAtKey);
            const fetchedAt = fetchedAtRaw ? parseInt(fetchedAtRaw, 10) : NaN;
            const isFresh = Number.isFinite(fetchedAt) && Date.now() - fetchedAt <= STALE_MS;
            if (cached && isFresh) {
              const parsed = JSON.parse(cached) as FashionItem[];
              setFashionItems(parsed);
              return;
            }
          }

          const { budgetMin, budgetMax, gender } = getOnboardingFilters();
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

          if (!fashionRes.ok) throw new Error(`Fashion request failed: ${fashionRes.status}`);

          const fashionPayload = (await fashionRes.json()) as FashionSearchResponse;
          const items = fashionPayload.items ?? [];
          setFashionItems(items);

          if (typeof window !== "undefined") {
            localStorage.setItem(fashionCacheKey, JSON.stringify(items));
            localStorage.setItem(fashionFetchedAtKey, Date.now().toString());
          }
        } finally {
          setIsFashionLoading(false);
        }
      };

      if (!forceRefresh && typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as AestheticResponse;
            setResult(parsed);
            await fetchFashion(parsed.ebay_search_keywords ?? []);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore cache parse errors and fetch fresh data
        }
      }

      try {
        const artists = getMatchingArtistsForGenre(genre);
        const res = await fetch(AESTHETIC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ genre, artists }),
        });

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const payload = (await res.json()) as AestheticResponse;
        setResult(payload);
        await fetchFashion(payload.ebay_search_keywords ?? []);

        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(payload));
        }
      } catch {
        setError("Could not load recommendations. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [genre]
  );

  useEffect(() => {
    fetchAesthetic();
  }, [fetchAesthetic]);

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

        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="mt-4 text-[15px] text-[#a1a1aa]">Analysing your vibe...</p>
          </div>
        ) : error || !result ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <p className="text-[15px] text-[#a1a1aa]">Could not load recommendations. Try again.</p>
            <button
              type="button"
              onClick={() => fetchAesthetic(true)}
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
            <p className="mt-2 text-[15px] text-[#a1a1aa]">{result.description}</p>

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
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-[180px] object-cover"
                    />
                    <div className="p-3">
                      <p className="text-[14px] text-white leading-[1.35] line-clamp-2">{item.title}</p>
                      <p className="mt-2 text-[16px] font-semibold text-[#22c55e]">{formatPrice(item.price)}</p>
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
