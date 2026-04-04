"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { GenreSelector } from "@/components/GenreSelector";
import { SwipeCard, type EnrichedItem } from "@/components/SwipeCard";
import { ItemDetailSheet } from "@/components/ItemDetailSheet";
import { FilterDrawer, loadFiltersFromStorage, type Filters } from "@/components/FilterDrawer";
import { SaveFlash } from "@/components/SaveFlash";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";
import {
  getSeenItemIds,
  addSeenItemIds,
  trackInteraction,
  toggleLikedByKey,
  getLikedByKey,
  LIKED_NICHE_KEY,
  setLastAestheticLabel,
} from "@/lib/storage-utils";
import type { FashionItem } from "@/lib/storage-utils";

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

type FashionSearchResponse = { items: FashionItem[]; total: number };
type ArtistLike = { id?: string; name?: string; genres?: string[]; images?: { url: string }[] };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AESTHETIC_ENDPOINT = "https://web-production-78bf0.up.railway.app/aesthetic/from-genre";
const FASHION_ENDPOINT = "https://web-production-78bf0.up.railway.app/fashion/search";
const PREFETCH_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArtistArray(value: unknown): ArtistLike[] {
  if (Array.isArray(value)) return value as ArtistLike[];
  if (value && typeof value === "object" && "items" in value) {
    return (value as { items: ArtistLike[] }).items ?? [];
  }
  return [];
}

function getGenresFromStorage(): { genre: string; artists: ArtistLike[] }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as {
      topArtists?: { short_term?: unknown; medium_term?: unknown; long_term?: unknown };
    };

    const allArtists = [
      ...toArtistArray(data.topArtists?.short_term),
      ...toArtistArray(data.topArtists?.medium_term),
      ...toArtistArray(data.topArtists?.long_term),
    ];

    const genreMap: Record<string, ArtistLike[]> = {};
    for (const a of allArtists) {
      for (const g of (a.genres ?? [])) {
        if (!genreMap[g]) genreMap[g] = [];
        if (!genreMap[g].find((x) => x.id === a.id)) genreMap[g].push(a);
      }
    }

    return Object.entries(genreMap)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20)
      .map(([genre, artists]) => ({ genre, artists }));
  } catch {
    return [];
  }
}

function getArtistForGenre(genre: string): ArtistLike | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      topArtists?: { short_term?: unknown };
    };
    const artists = toArtistArray(data.topArtists?.short_term);
    return artists.find((a) => (a.genres ?? []).includes(genre)) ?? artists[0] ?? null;
  } catch {
    return null;
  }
}

function getGenderFromStorage(): "mens" | "womens" | "unisex" {
  if (typeof window === "undefined") return "unisex";
  try {
    const raw = localStorage.getItem("gel_onboarding");
    if (!raw) return "unisex";
    const parsed = JSON.parse(raw) as { fitPreferences?: unknown };
    const v = String(parsed.fitPreferences ?? "").toLowerCase();
    if (v.includes("menswear")) return "mens";
    if (v.includes("womenswear")) return "womens";
    return "unisex";
  } catch {
    return "unisex";
  }
}

function getBudget(): { min: number; max: number } {
  if (typeof window === "undefined") return { min: 0, max: 500 };
  try {
    const raw = localStorage.getItem("gel_onboarding");
    if (!raw) return { min: 0, max: 500 };
    const p = JSON.parse(raw) as { budgetMin?: unknown; budgetMax?: unknown };
    return {
      min: Number.isFinite(Number(p.budgetMin)) ? Number(p.budgetMin) : 0,
      max: Number.isFinite(Number(p.budgetMax)) ? Number(p.budgetMax) : 500,
    };
  } catch {
    return { min: 0, max: 500 };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FindMyNichePage() {
  const [mounted, setMounted] = useState(false);
  const [genreList, setGenreList] = useState<{ genre: string; artists: ArtistLike[] }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [cardQueue, setCardQueue] = useState<EnrichedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [detailItem, setDetailItem] = useState<EnrichedItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ priceMin: 0, priceMax: 500, sizes: [], types: [], colors: [] });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSaveFlash, setShowSaveFlash] = useState(false);
  const isFetchingRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const genres = getGenresFromStorage();
    setGenreList(genres);
    setFilters(loadFiltersFromStorage());
    setSavedIds(new Set(getLikedByKey(LIKED_NICHE_KEY)));
  }, [mounted]);

  const fetchBatch = useCallback(async (genre: string, append: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!append) setIsLoading(true);
    else setIsFetching(true);

    try {
      const genreData = genreList.find((g) => g.genre === genre);
      const artists = (genre === "all"
        ? genreList.flatMap((g) => g.artists)
        : genreData?.artists ?? []
      ).slice(0, 10).map((a) => a.name ?? "").filter(Boolean);

      const effectiveGenre = genre === "all"
        ? (genreList[0]?.genre ?? "alternative")
        : genre;

      const aestheticRes = await fetch(AESTHETIC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: effectiveGenre, artists }),
      });
      if (!aestheticRes.ok) throw new Error("Aesthetic failed");
      const aesthetic = (await aestheticRes.json()) as AestheticResponse;

      setLastAestheticLabel(aesthetic.aesthetic_label);

      const budget = getBudget();
      const seenIds = getSeenItemIds();
      const fashionRes = await fetch(FASHION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: aesthetic.ebay_search_keywords ?? [],
          budget_min: Math.max(budget.min, filters.priceMin),
          budget_max: Math.min(budget.max, filters.priceMax),
          gender: getGenderFromStorage(),
          limit: 10,
          excluded_item_ids: seenIds,
        }),
      });
      if (!fashionRes.ok) throw new Error("Fashion failed");
      const fashionData = (await fashionRes.json()) as FashionSearchResponse;
      const items = fashionData.items ?? [];

      const artistForGenre = getArtistForGenre(effectiveGenre);
      const enriched: EnrichedItem[] = items.map((item) => ({
        ...item,
        aestheticLabel: aesthetic.aesthetic_label,
        buyingPush: aesthetic.buying_push ?? "",
        artistInfluence: aesthetic.artist_influence ?? [],
        colors: aesthetic.colors ?? [],
        genre: effectiveGenre,
        artistName: artistForGenre?.name ?? "",
        artistImageUrl: artistForGenre?.images?.[0]?.url ?? null,
      }));

      addSeenItemIds(enriched.map((i) => i.item_id ?? i.item_url));

      if (append) {
        setCardQueue((prev) => [...prev, ...enriched]);
      } else {
        setCardQueue(enriched);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("[Find My Niche] Fetch failed:", err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [genreList, filters]);

  // Initial load when genres are available
  useEffect(() => {
    if (!mounted || genreList.length === 0) return;
    void fetchBatch(selectedGenre, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, genreList]);

  // Pre-fetch when queue is running low
  useEffect(() => {
    const remaining = cardQueue.length - currentIndex;
    if (remaining <= PREFETCH_THRESHOLD && !isFetchingRef.current && cardQueue.length > 0) {
      void fetchBatch(selectedGenre, true);
    }
  }, [cardQueue.length, currentIndex, selectedGenre, fetchBatch]);

  const handleGenreChange = useCallback((genre: string) => {
    setSelectedGenre(genre);
    setCardQueue([]);
    setCurrentIndex(0);
    void fetchBatch(genre, false);
  }, [fetchBatch]);

  const handleLike = useCallback((item: EnrichedItem) => {
    const id = item.item_id ?? item.item_url;
    toggleLikedByKey(id, LIKED_NICHE_KEY);
    setSavedIds((prev) => new Set([...prev, id]));
    trackInteraction({
      item_id: id,
      item_title: item.title,
      genre: item.genre,
      action: "liked",
      timestamp: Date.now(),
      price: item.price,
      source: "find_my_niche",
      image_url: item.image_url,
      item_url: item.item_url,
      condition: item.condition,
    });
    setShowSaveFlash(true);
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleDismiss = useCallback((item: EnrichedItem) => {
    const id = item.item_id ?? item.item_url;
    trackInteraction({
      item_id: id,
      item_title: item.title,
      genre: item.genre,
      action: "dismissed",
      timestamp: Date.now(),
      price: item.price,
      source: "find_my_niche",
      image_url: item.image_url,
      item_url: item.item_url,
      condition: item.condition,
    });
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleTap = useCallback((item: EnrichedItem) => {
    setDetailItem(item);
  }, []);

  const handleSaveFromDetail = useCallback((item: EnrichedItem) => {
    const id = item.item_id ?? item.item_url;
    const newSaved = toggleLikedByKey(id, LIKED_NICHE_KEY);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (newSaved) next.add(id);
      else next.delete(id);
      return next;
    });
    if (newSaved) setShowSaveFlash(true);
  }, []);

  const genres = useMemo(() => genreList.map((g) => g.genre), [genreList]);
  const currentCard = cardQueue[currentIndex] ?? null;
  const hasContent = cardQueue.length > currentIndex;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col pb-[60px]">
      <div className="mx-auto max-w-md w-full flex flex-col flex-1 px-5 pt-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-[18px] font-bold text-white">Find My Niche</h1>
          <div className="w-10" />
        </header>

        {/* Genre selector */}
        {mounted && genres.length > 0 && (
          <div className="mb-4">
            <GenreSelector
              genres={genres}
              selected={selectedGenre}
              onChange={handleGenreChange}
            />
          </div>
        )}

        {/* Card area */}
        <div className="relative flex-1" style={{ minHeight: "68vh" }}>
          {!mounted || isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <p className="mt-4 text-[14px] text-[#a1a1aa]">Digging through the crates...</p>
            </div>
          ) : !hasContent ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-[15px] text-[#a1a1aa]">
                {genreList.length === 0
                  ? "Connect Spotify to see your genre feed."
                  : "You've seen everything. Refreshing the feed..."}
              </p>
              {genreList.length > 0 && (
                <button
                  type="button"
                  onClick={() => void fetchBatch(selectedGenre, false)}
                  className="mt-4 h-10 rounded-xl bg-[#22c55e] px-5 font-semibold text-black text-[13px]"
                >
                  Refresh
                </button>
              )}
            </div>
          ) : currentCard ? (
            <SwipeCard
              key={`${currentCard.item_id ?? currentCard.item_url}-${currentIndex}`}
              item={currentCard}
              onLike={handleLike}
              onDismiss={handleDismiss}
              onTap={handleTap}
            />
          ) : null}
        </div>

        {/* Action buttons */}
        {hasContent && !isLoading && (
          <div className="flex items-center justify-center gap-6 py-4">
            {/* Dismiss */}
            <button
              type="button"
              onClick={() => currentCard && handleDismiss(currentCard)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.12)] text-[#ef4444] transition hover:border-[rgba(255,255,255,0.22)]"
              aria-label="Pass"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Info */}
            <button
              type="button"
              onClick={() => currentCard && setDetailItem(currentCard)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-[#a1a1aa] transition hover:border-[rgba(255,255,255,0.22)]"
              aria-label="Details"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Like */}
            <button
              type="button"
              onClick={() => currentCard && handleLike(currentCard)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.12)] text-[#22c55e] transition hover:border-[rgba(255,255,255,0.22)]"
              aria-label="Save"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
              </svg>
            </button>
          </div>
        )}

        {/* Background fetch indicator */}
        {isFetching && (
          <p className="text-center text-[11px] text-[#52525b] pb-2">Loading more...</p>
        )}
      </div>

      {/* Filters button */}
      <button
        type="button"
        onClick={() => setShowFilters(true)}
        className="fixed bottom-[68px] left-5 z-30 flex items-center gap-1.5 h-9 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141414] px-4 text-[12px] text-[#a1a1aa] transition hover:border-[rgba(255,255,255,0.22)] hover:text-white"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 10h10M11 16h2" />
        </svg>
        Filters
      </button>

      {/* Detail sheet */}
      <ItemDetailSheet
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onSave={handleSaveFromDetail}
        isSaved={detailItem ? savedIds.has(detailItem.item_id ?? detailItem.item_url) : false}
      />

      {/* Filter drawer */}
      {showFilters && (
        <FilterDrawer
          filters={filters}
          onApply={(f) => {
            setFilters(f);
            void fetchBatch(selectedGenre, false);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Save flash */}
      <SaveFlash show={showSaveFlash} onComplete={() => setShowSaveFlash(false)} />

      <BottomNav />
    </div>
  );
}
