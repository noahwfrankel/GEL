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

/** Simple hanger SVG icon. */
function HangerIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5"
      />
    </svg>
  );
}

type Props = {
  item: FashionItem;
  genre: string;
  source: string;
  /** Which localStorage key to use for saving (defaults to gel_liked_items). */
  savedKey?: string;
  onLikeChange?: (itemId: string, liked: boolean) => void;
};

export function ProductCard({ item, genre, source, onLikeChange }: Props) {
  const id = itemStableId(item);
  const [saved, setSaved] = useState(() => getLikedItemIds().includes(id));

  function handleHangerClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newSaved = toggleLikedItem(id);
    setSaved(newSaved);
    trackInteraction({
      item_id: id,
      item_title: item.title,
      genre,
      action: newSaved ? "liked" : "dismissed",
      timestamp: Date.now(),
      price: item.price,
      source,
      image_url: item.image_url,
      item_url: item.item_url,
      condition: item.condition,
    });
    onLikeChange?.(id, newSaved);
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
      className="relative block overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] transition hover:border-[rgba(255,255,255,0.18)] hover:scale-[1.01] duration-200"
    >
      {/* Image + hanger overlay */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote eBay image URLs */}
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-[200px] object-cover"
        />
        <button
          type="button"
          onClick={handleHangerClick}
          className={`absolute top-2 right-2 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/55 transition hover:bg-black/75 duration-200 ${
            saved ? "text-[#22c55e]" : "text-white"
          }`}
          aria-label={saved ? "Remove from closet" : "Save to closet"}
        >
          <HangerIcon filled={saved} className="h-4 w-4" />
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
