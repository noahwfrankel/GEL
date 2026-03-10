"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

const CLUSTER_COLORS = ["#1a0a2e", "#0a1a2e", "#0a1a12"] as const;
const CLUSTER_TITLES = ["Your Dominant Aesthetic", "Secondary Style", "Emerging Taste"] as const;

export default function BuildMyClosetPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-6">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white flex-1 text-center pr-10">
            Build My Closet
          </h1>
        </header>

        <p className="text-[15px] text-[#a1a1aa] mb-6">
          Your complete taste profile, built from your listening history
        </p>

        <div className="space-y-3">
          {CLUSTER_TITLES.map((title, i) => (
            <div
              key={title}
              className="flex h-[100px] w-full items-center gap-4 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] p-4 transition duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#1c1c1c]"
            >
              <div
                className="h-12 w-12 flex-shrink-0 rounded-[10px]"
                style={{ backgroundColor: CLUSTER_COLORS[i] ?? CLUSTER_COLORS[0] }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-white">{title}</p>
                <p className="text-[13px] text-[#52525b] mt-0.5">Analysis coming in your next session</p>
              </div>
              <svg className="h-5 w-5 flex-shrink-0 text-[#52525b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#141414] p-5">
          <h3 className="text-[15px] font-semibold text-white">
            Full profile unlocks after more listening
          </h3>
          <p className="mt-2 text-[13px] text-[#a1a1aa] leading-relaxed">
            GEL builds a richer picture of your style the more you use it.
          </p>
          <p className="mt-3 text-[12px] text-[#52525b]">Profile strength: 40%</p>
          <div className="mt-2 h-1.5 w-full rounded-[3px] bg-[rgba(255,255,255,0.08)] overflow-hidden">
            <div className="h-full w-[40%] rounded-[3px] bg-[#22c55e]" aria-hidden />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
