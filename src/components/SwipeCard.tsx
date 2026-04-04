"use client";

import { useRef, useState, useCallback } from "react";
import type { FashionItem } from "@/lib/storage-utils";

export interface EnrichedItem extends FashionItem {
  aestheticLabel: string;
  buyingPush: string;
  artistInfluence: string[];
  colors: string[];
  genre: string;
  artistName: string;
  artistImageUrl: string | null;
}

interface SwipeCardProps {
  item: EnrichedItem;
  onLike: (item: EnrichedItem) => void;
  onDismiss: (item: EnrichedItem) => void;
  onTap: (item: EnrichedItem) => void;
}

const SWIPE_THRESHOLD = 80;

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function HangerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
    </svg>
  );
}

export function SwipeCard({ item, onLike, onDismiss, onTap }: SwipeCardProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [isExiting, setIsExiting] = useState<"left" | "right" | null>(null);

  const triggerExit = useCallback(
    (direction: "left" | "right") => {
      setIsExiting(direction);
      setTimeout(() => {
        if (direction === "right") onLike(item);
        else onDismiss(item);
        setIsExiting(null);
        setDragX(0);
      }, 300);
    },
    [item, onLike, onDismiss]
  );

  // Touch handlers
  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0]!.clientX;
    startY.current = e.touches[0]!.clientY;
    isDragging.current = true;
    hasMoved.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dx = e.touches[0]!.clientX - startX.current;
    const dy = e.touches[0]!.clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      hasMoved.current = true;
      setDragX(dx);
    }
  }

  function handleTouchEnd() {
    isDragging.current = false;
    if (!hasMoved.current) {
      onTap(item);
      return;
    }
    if (dragX > SWIPE_THRESHOLD) triggerExit("right");
    else if (dragX < -SWIPE_THRESHOLD) triggerExit("left");
    else setDragX(0);
  }

  // Mouse handlers (desktop)
  function handleMouseDown(e: React.MouseEvent) {
    startX.current = e.clientX;
    isDragging.current = true;
    hasMoved.current = false;
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 5) hasMoved.current = true;
    setDragX(dx);
  }

  function handleMouseUp() {
    isDragging.current = false;
    if (!hasMoved.current) {
      onTap(item);
      return;
    }
    if (dragX > SWIPE_THRESHOLD) triggerExit("right");
    else if (dragX < -SWIPE_THRESHOLD) triggerExit("left");
    else setDragX(0);
  }

  function handleMouseLeave() {
    if (isDragging.current) {
      isDragging.current = false;
      if (dragX > SWIPE_THRESHOLD) triggerExit("right");
      else if (dragX < -SWIPE_THRESHOLD) triggerExit("left");
      else setDragX(0);
    }
  }

  const rotation = isExiting
    ? isExiting === "right" ? 15 : -15
    : dragX * 0.06;

  const translateX = isExiting
    ? isExiting === "right" ? "120vw" : "-120vw"
    : `${dragX}px`;

  const likeOpacity = Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD));
  const dismissOpacity = Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD));

  const isTransitioning = dragX === 0 || !!isExiting;

  return (
    <div
      className="relative w-full h-full rounded-[24px] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        transform: `translateX(${translateX}) rotate(${rotation}deg)`,
        transition: isTransitioning ? "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Layer 1: Artist background */}
      {item.artistImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${item.artistImageUrl})`,
            opacity: 0.2,
            filter: "blur(8px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-[#0a0a0a]/60" />

      {/* Layer 2: gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

      {/* Layer 3: Item photo */}
      <div className="absolute inset-0 flex items-center justify-center pt-6 pb-[40%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={item.title}
          className="max-h-full max-w-full object-contain"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))" }}
          draggable={false}
        />
      </div>

      {/* Layer 4: Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
        {/* Artist influence badge */}
        {item.artistInfluence.length > 0 && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 backdrop-blur-sm">
            <span className="text-[11px] text-white/80 truncate max-w-[200px]">
              {item.artistInfluence[0]}
            </span>
          </div>
        )}

        {/* Buying push */}
        {item.buyingPush && (
          <p className="mb-3 text-[12px] italic text-white/60 leading-snug line-clamp-2">
            {item.buyingPush}
          </p>
        )}

        {/* Price + condition */}
        <div className="flex items-center justify-between">
          <span className="text-[20px] font-bold text-[#22c55e]">
            {formatPrice(item.price)}
          </span>
          <span className="text-[12px] text-white/50">{item.condition || "Pre-owned"}</span>
        </div>
      </div>

      {/* Like overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded-[24px] border-4 border-[#22c55e] pointer-events-none"
        style={{ opacity: likeOpacity, backgroundColor: `rgba(34,197,94,${likeOpacity * 0.3})` }}
      >
        <div className="flex flex-col items-center gap-2">
          <HangerIcon className="h-16 w-16 text-[#22c55e]" />
          <span className="text-[28px] font-extrabold tracking-widest text-[#22c55e]">SAVE</span>
        </div>
      </div>

      {/* Dismiss overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded-[24px] border-4 border-[#ef4444] pointer-events-none"
        style={{ opacity: dismissOpacity, backgroundColor: `rgba(239,68,68,${dismissOpacity * 0.3})` }}
      >
        <span className="text-[28px] font-extrabold tracking-widest text-[#ef4444]">PASS</span>
      </div>
    </div>
  );
}
