"use client";

import { useEffect } from "react";
import type { EnrichedItem } from "@/components/SwipeCard";

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function isCssColor(value: string): boolean {
  if (typeof window === "undefined") return false;
  const el = new Option().style;
  el.color = "";
  el.color = value;
  return el.color !== "";
}

interface ItemDetailSheetProps {
  item: EnrichedItem | null;
  onClose: () => void;
  onSave: (item: EnrichedItem) => void;
  isSaved: boolean;
}

export function ItemDetailSheet({ item, onClose, onSave, isSaved }: ItemDetailSheetProps) {
  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[24px] bg-[#141414] border-t border-[rgba(255,255,255,0.1)]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.1)] text-white"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Item photo */}
        <div className="relative w-full h-[260px] bg-[#0a0a0a] overflow-hidden rounded-t-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="px-5 pb-8 pt-5">
          {/* Aesthetic label */}
          <h2 className="text-[24px] font-extrabold tracking-[-0.5px] text-white leading-tight">
            {item.aestheticLabel}
          </h2>

          {/* Buying push */}
          {item.buyingPush && (
            <p className="mt-1 text-[14px] italic text-[#a1a1aa]">{item.buyingPush}</p>
          )}

          {/* Title */}
          <p className="mt-3 text-[15px] text-white leading-snug">{item.title}</p>

          {/* Price */}
          <p className="mt-2 text-[28px] font-bold text-[#22c55e]">{formatPrice(item.price)}</p>
          <p className="text-[12px] text-[#71717a]">{item.condition || "Pre-owned"}</p>

          {/* Artist influence */}
          {item.artistInfluence.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-2">
                Why this was picked for you
              </p>
              {item.artistInfluence.map((inf, i) => (
                <p key={i} className="text-[13px] text-[#a1a1aa] leading-relaxed mb-1">
                  • {inf}
                </p>
              ))}
            </div>
          )}

          {/* Color palette */}
          {item.colors.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-3">
                Palette
              </p>
              <div className="flex flex-wrap gap-3">
                {item.colors.map((color) => {
                  const valid = isCssColor(color);
                  return (
                    <div key={color} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-8 w-8 rounded-full border border-white/20 ${!valid ? "bg-[#1c1c1c]" : ""}`}
                        style={valid ? { backgroundColor: color } : undefined}
                      />
                      <span className="text-[10px] text-[#71717a] max-w-[52px] text-center leading-tight">{color}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <a
              href={item.item_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex h-12 items-center justify-center rounded-xl bg-[#22c55e] font-semibold text-black text-[15px] transition hover:bg-[#22c55e]/90"
            >
              View on eBay →
            </a>
            <button
              type="button"
              onClick={() => onSave(item)}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                isSaved
                  ? "border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]"
                  : "border-[rgba(255,255,255,0.12)] bg-[#1c1c1c] text-white hover:border-[rgba(255,255,255,0.22)]"
              }`}
              aria-label={isSaved ? "Remove from closet" : "Save to closet"}
            >
              <svg className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
