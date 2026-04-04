"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  getLikedItemIds,
  getLikedByKey,
  getInteractions,
  LIKED_NICHE_KEY,
  LIKED_VIBE_KEY,
  type FashionItem,
} from "@/lib/storage-utils";
import { ProductCard, itemStableId } from "@/components/ProductCard";

type Tab = "niche" | "vibe" | "closet";

const CLOSET_CATS = ["pants","shirts","hoodies","jackets","sweaters","shoes","shorts","accessories"] as const;
const CLOSET_CAT_LABELS: Record<string, string> = {
  pants:"Pants",shirts:"Shirts",hoodies:"Hoodies",jackets:"Jackets",
  sweaters:"Sweaters",shoes:"Shoes",shorts:"Shorts",accessories:"Accessories",
};

function buildItemsFromIds(ids: string[]): FashionItem[] {
  const interactions = getInteractions();
  const result: FashionItem[] = [];
  for (const id of ids) {
    const hits = interactions.filter((i) => i.item_id === id);
    if (!hits.length) continue;
    const latest = hits[hits.length - 1]!;
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

function getClosetItems(cat: string): FashionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`gel_closet_${cat}`);
    if (!raw) return [];
    const ids = JSON.parse(raw) as string[];
    return buildItemsFromIds(ids);
  } catch { return []; }
}

function EmptyState({ label, href, linkLabel }: { label: string; href: string; linkLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="h-12 w-12 text-[#27272a] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
      </svg>
      <p className="text-[15px] text-[#a1a1aa] max-w-[220px]">{label}</p>
      <Link
        href={href}
        className="mt-6 inline-flex h-[52px] items-center rounded-xl bg-[#22c55e] px-6 font-semibold text-black transition hover:bg-[#22c55e]/90"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("niche");
  const [nicheItems, setNicheItems] = useState<FashionItem[]>([]);
  const [vibeItems, setVibeItems] = useState<FashionItem[]>([]);
  const [closetCat, setClosetCat] = useState<string>("pants");
  const [closetItems, setClosetItems] = useState<FashionItem[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    setNicheItems(buildItemsFromIds(getLikedByKey(LIKED_NICHE_KEY)));
    setVibeItems(buildItemsFromIds(getLikedByKey(LIKED_VIBE_KEY)));
    setClosetItems(getClosetItems(closetCat));
  }, [mounted, closetCat]);

  const totalCount = mounted ? nicheItems.length + vibeItems.length + closetItems.length : 0;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "niche", label: "My Niche", count: nicheItems.length },
    { id: "vibe",  label: "My Vibe",  count: vibeItems.length },
    { id: "closet",label: "My Closet",count: closetItems.length },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <header className="mb-5">
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">
            Closet{mounted && totalCount > 0 ? ` (${totalCount})` : ""}
          </h1>
        </header>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-10 text-[13px] font-medium transition duration-200 ${
                activeTab === tab.id
                  ? "bg-[#22c55e] text-black font-semibold"
                  : "bg-[#141414] text-[#a1a1aa] hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 text-[11px] ${activeTab === tab.id ? "text-black/70" : "text-[#52525b]"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {!mounted ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-[260px] rounded-[14px] bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton" />
            ))}
          </div>
        ) : activeTab === "niche" ? (
          nicheItems.length === 0 ? (
            <EmptyState
              label="No saved items from Find My Niche yet. Swipe right on pieces you love."
              href="/find-my-niche"
              linkLabel="Find My Niche"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {nicheItems.map((item) => (
                <ProductCard
                  key={itemStableId(item)}
                  item={item}
                  genre=""
                  source="find_my_niche"
                  onLikeChange={(id, liked) => {
                    if (!liked) setNicheItems((prev) => prev.filter((i) => itemStableId(i) !== id));
                  }}
                />
              ))}
            </div>
          )
        ) : activeTab === "vibe" ? (
          vibeItems.length === 0 ? (
            <EmptyState
              label="No saved items from Match My Vibe yet. Pick a playlist and save pieces."
              href="/match-my-vibe"
              linkLabel="Match My Vibe"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vibeItems.map((item) => (
                <ProductCard
                  key={itemStableId(item)}
                  item={item}
                  genre=""
                  source="match_my_vibe"
                  onLikeChange={(id, liked) => {
                    if (!liked) setVibeItems((prev) => prev.filter((i) => itemStableId(i) !== id));
                  }}
                />
              ))}
            </div>
          )
        ) : (
          // Closet tab — category sub-tabs
          <>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1 mb-4">
              {CLOSET_CATS.map((cat) => {
                const isActive = closetCat === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setClosetCat(cat)}
                    className={`flex-shrink-0 rounded-full px-4 py-1.5 text-[12px] font-medium border transition ${
                      isActive
                        ? "bg-[#22c55e] border-[#22c55e] text-black"
                        : "border-[rgba(255,255,255,0.12)] bg-[#141414] text-[#a1a1aa] hover:text-white"
                    }`}
                  >
                    {CLOSET_CAT_LABELS[cat]}
                  </button>
                );
              })}
            </div>
            {closetItems.length === 0 ? (
              <EmptyState
                label={`No ${CLOSET_CAT_LABELS[closetCat] ?? closetCat} saved yet. Browse the bins to save pieces.`}
                href="/build-my-closet"
                linkLabel="Build My Closet"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {closetItems.map((item) => (
                  <ProductCard
                    key={itemStableId(item)}
                    item={item}
                    genre=""
                    source="build_my_closet"
                    onLikeChange={(id, liked) => {
                      if (!liked) setClosetItems((prev) => prev.filter((i) => itemStableId(i) !== id));
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
