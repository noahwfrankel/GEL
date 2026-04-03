"use client";

import { useState } from "react";
import {
  toggleLikedItem,
  trackInteraction,
  getLikedItemIds,
  type FashionItem,
} from "@/lib/storage-utils";

export type { FashionItem };

/** Returns a stable dedup ID for an item. */
export function itemStableId(item: FashionItem): string {
  return item.item_id ?? item.item_url;
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

type Props = {
  item: FashionItem;
  genre: string;
  source: string;
  onLikeChange?: (itemId: string, liked: boolean) => void;
};

export function ProductCard({ item, genre, source, onLikeChange }: Props) {
  const id = itemStableId(item);
  const [liked, setLiked] = useState(() => getLikedItemIds().includes(id));

  function handleHeartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newLiked = toggleLikedItem(id);
    setLiked(newLiked);
    trackInteraction({
      item_id: id,
      item_title: item.title,
      genre,
      action: newLiked ? "liked" : "dismissed",
      timestamp: Date.now(),
      price: item.price,
      source,
      image_url: item.image_url,
      item_url: item.item_url,
      condition: item.condition,
    });
    onLikeChange?.(id, newLiked);
  }

  function handleCardClick() {
    trackInteraction({
      item_id: id,
      item_title: item.title,
      genre,
      action: "clicked",
      timestamp: Date.now(),
      price: item.price,
      source,
      image_url: item.image_url,
      item_url: item.item_url,
      condition: item.condition,
    });
  }

  return (
    <a
      href={item.item_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCardClick}
      className="relative block overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] transition hover:border-[rgba(255,255,255,0.15)]"
    >
      {/* Image + heart overlay */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote eBay image URLs */}
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-[200px] object-cover"
        />
        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 transition hover:bg-black/70"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <svg
            className="h-4 w-4"
            fill={liked ? "#ef4444" : "none"}
            stroke={liked ? "#ef4444" : "white"}
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Card body */}
      <div className="p-3">
        <p className="text-[14px] font-medium text-white leading-[1.35] line-clamp-2">
          {item.title}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[#22c55e]">
            {formatPrice(item.price)}
          </span>
          <span className="text-[11px] text-[#71717a]">
            {item.condition || "Pre-owned"}
          </span>
        </div>
        <span className="mt-2 inline-block text-[12px] text-[#52525b]">
          View on eBay →
        </span>
      </div>
    </a>
  );
}
