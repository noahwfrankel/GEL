"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

export default function SavedPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">Saved</h1>
        <p className="mt-2 text-[15px] text-[#a1a1aa]">Your saved vibes from Find My Niche appear here.</p>
        <Link
          href="/find-my-niche"
          className="mt-6 inline-block rounded-xl bg-[#22c55e] h-[52px] px-6 flex items-center font-semibold text-black"
        >
          Find My Niche
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
