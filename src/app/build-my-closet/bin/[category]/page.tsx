"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  getSeenItemIds,
  addSeenItemIds,
  trackInteraction,
  toggleLikedItem,
  getLikedItemIds,
  setLastAestheticLabel,
  type FashionItem,
} from "@/lib/storage-utils";
import { ProductCard, itemStableId } from "@/components/ProductCard";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";
import type { StoredArtist } from "@/lib/spotify-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AestheticResponse = {
  aesthetic_label: string;
  description: string;
  ebay_search_keywords: string[];
  buying_push?: string;
};

type FashionSearchResponse = { items: FashionItem[]; total: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AESTHETIC_ENDPOINT = "https://web-production-78bf0.up.railway.app/aesthetic/from-genre";
const CATEGORY_SEARCH_ENDPOINT = "https://web-production-78bf0.up.railway.app/fashion/search-by-category";

const CATEGORY_LABELS: Record<string, string> = {
  pants: "Pants", shirts: "Shirts", hoodies: "Hoodies", jackets: "Jackets",
  sweaters: "Sweaters", shoes: "Shoes", shorts: "Shorts", accessories: "Accessories",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArtistArray(value: unknown): StoredArtist[] {
  if (Array.isArray(value)) return value as StoredArtist[];
  if (value && typeof value === "object" && "items" in value)
    return (value as { items: StoredArtist[] }).items ?? [];
  return [];
}

function getArtistsForGenre(genre: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { topArtists?: { short_term?: unknown } };
    const artists = toArtistArray(data.topArtists?.short_term);
    return artists
      .filter((a) => (a.genres ?? []).includes(genre))
      .map((a) => a.name ?? "")
      .filter(Boolean)
      .slice(0, 8);
  } catch { return []; }
}

function getOnboardingFilters(): { min: number; max: number; gender: "mens" | "womens" | "unisex" } {
  if (typeof window === "undefined") return { min: 0, max: 500, gender: "unisex" };
  try {
    const raw = localStorage.getItem("gel_onboarding");
    if (!raw) return { min: 0, max: 500, gender: "unisex" };
    const p = JSON.parse(raw) as { budgetMin?: unknown; budgetMax?: unknown; fitPreferences?: unknown };
    const v = String(p.fitPreferences ?? "").toLowerCase();
    return {
      min: Number.isFinite(Number(p.budgetMin)) ? Number(p.budgetMin) : 0,
      max: Number.isFinite(Number(p.budgetMax)) ? Number(p.budgetMax) : 500,
      gender: v.includes("menswear") ? "mens" : v.includes("womenswear") ? "womens" : "unisex",
    };
  } catch { return { min: 0, max: 500, gender: "unisex" }; }
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function BinContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const category = (params.category as string) ?? "";
  const genre = searchParams.get("genre") ?? "";

  const [items, setItems] = useState<FashionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aestheticLabel, setAestheticLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? new Set(getLikedItemIds()) : new Set()
  );

  const fetchItems = useCallback(async (forceRefresh = false) => {
    if (!category || !genre) {
      setError("Missing category or genre.");
      setIsLoading(false);
      return;
    }
    if (!forceRefresh) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const cacheKey = `gel_closet_${category}_${genre.replace(/\W+/g, "_")}`;
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { aesthetic: AestheticResponse; items: FashionItem[] };
          setAestheticLabel(parsed.aesthetic.aesthetic_label ?? "");
          setItems(parsed.items);
          setIsLoading(false);
          return;
        }
      }

      // Get aesthetic keywords first
      const artists = getArtistsForGenre(genre);
      const aestheticRes = await fetch(AESTHETIC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, artists }),
      });
      if (!aestheticRes.ok) throw new Error("Aesthetic failed");
      const aesthetic = (await aestheticRes.json()) as AestheticResponse;
      setAestheticLabel(aesthetic.aesthetic_label ?? "");
      setLastAestheticLabel(aesthetic.aesthetic_label ?? "");

      // Category search
      const budget = getOnboardingFilters();
      const seenIds = getSeenItemIds();
      const fashionRes = await fetch(CATEGORY_SEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          aesthetic_keywords: aesthetic.ebay_search_keywords ?? [],
          budget_min: budget.min,
          budget_max: budget.max,
          gender: budget.gender,
          excluded_item_ids: seenIds,
          limit: 12,
        }),
      });
      if (!fashionRes.ok) throw new Error("Category search failed");
      const fashionData = (await fashionRes.json()) as FashionSearchResponse;
      const newItems = fashionData.items ?? [];

      addSeenItemIds(newItems.map((i) => itemStableId(i)));
      newItems.forEach((item) => {
        trackInteraction({
          item_id: itemStableId(item), item_title: item.title,
          genre, action: "viewed", timestamp: Date.now(),
          price: item.price, source: "build_my_closet",
          image_url: item.image_url, item_url: item.item_url, condition: item.condition,
        });
      });

      setItems(newItems);

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify({ aesthetic, items: newItems }));
        // Save count for bin badge
        const savedRaw = localStorage.getItem(`gel_closet_${category}`);
        if (!savedRaw) localStorage.setItem(`gel_closet_${category}`, JSON.stringify([]));
      }
    } catch (err) {
      console.error("[Bin]", err);
      setError("Could not load items. Try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [category, genre]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const catLabel = CATEGORY_LABELS[category] ?? category;

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-12">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between mb-6">
          <Link
            href="/build-my-closet"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-[20px] font-bold text-white">{catLabel}</h1>
          <button
            type="button"
            onClick={() => void fetchItems(true)}
            disabled={isRefreshing}
            className="flex h-10 items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141414] px-3 text-[12px] text-[#a1a1aa] transition hover:text-white disabled:opacity-50"
          >
            <svg className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </header>

        {aestheticLabel && (
          <p className="text-[13px] text-[#a1a1aa] mb-4">
            Styled for <span className="text-white">{aestheticLabel}</span>
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-[260px] rounded-[14px] bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[15px] text-[#a1a1aa]">{error}</p>
            <button
              type="button"
              onClick={() => void fetchItems(true)}
              className="mt-4 h-10 rounded-xl bg-[#22c55e] px-5 font-semibold text-black text-[13px]"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-[15px] text-[#a1a1aa] py-12">No items found for this category.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ProductCard
                key={itemStableId(item)}
                item={item}
                genre={genre}
                source="build_my_closet"
                onLikeChange={(id, liked) => {
                  setSavedIds((prev) => {
                    const next = new Set(prev);
                    if (liked) next.add(id);
                    else next.delete(id);
                    return next;
                  });
                  // Track in category-specific storage
                  if (typeof window !== "undefined") {
                    try {
                      const key = `gel_closet_${category}`;
                      const raw = localStorage.getItem(key);
                      const ids: string[] = raw ? JSON.parse(raw) as string[] : [];
                      const updated = liked ? [...ids.filter(x => x !== id), id] : ids.filter(x => x !== id);
                      localStorage.setItem(key, JSON.stringify(updated));
                    } catch { /* ignore */ }
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
      </div>
    }>
      <BinContent />
    </Suspense>
  );
}
