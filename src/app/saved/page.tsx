"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  getLikedItemIds,
  getInteractions,
  type FashionItem,
} from "@/lib/storage-utils";
import { ProductCard, itemStableId } from "@/components/ProductCard";

function buildLikedItems(likedIds: string[]): FashionItem[] {
  const interactions = getInteractions();
  const result: FashionItem[] = [];
  for (const id of likedIds) {
    const itemInteractions = interactions.filter((i) => i.item_id === id);
    if (!itemInteractions.length) continue;
    const latest = itemInteractions[itemInteractions.length - 1]!;
    if (!latest.item_url) continue;
    result.push({
      item_id: id,
      title: latest.item_title,
      price: latest.price,
      image_url: latest.image_url,
      item_url: latest.item_url,
      condition: latest.condition,
      source: latest.source,
    });
  }
  return result;
}

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [items, setItems] = useState<FashionItem[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const ids = getLikedItemIds();
    setLikedIds(ids);
    setItems(buildLikedItems(ids));
  }, [mounted]);

  function handleUnlike(itemId: string) {
    const newIds = likedIds.filter((id) => id !== itemId);
    setLikedIds(newIds);
    setItems((prev) => prev.filter((item) => itemStableId(item) !== itemId));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">
            Saved{mounted && likedIds.length > 0 ? ` (${likedIds.length})` : ""}
          </h1>
        </header>

        {!mounted ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[260px] rounded-[14px] bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              className="h-12 w-12 text-[#27272a] mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <p className="text-[15px] text-[#a1a1aa] max-w-[220px]">
              No saved items yet. Start exploring to save pieces you love.
            </p>
            <Link
              href="/find-my-niche"
              className="mt-6 inline-flex h-[52px] items-center rounded-xl bg-[#22c55e] px-6 font-semibold text-black transition hover:bg-[#22c55e]/90 duration-200"
            >
              Find My Niche
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ProductCard
                key={itemStableId(item)}
                item={item}
                genre={
                  getInteractions().find((i) => i.item_id === itemStableId(item))
                    ?.genre ?? ""
                }
                source={item.source}
                onLikeChange={(id, liked) => {
                  if (!liked) handleUnlike(id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
