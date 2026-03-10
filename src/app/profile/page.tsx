"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">Profile</h1>
        <p className="mt-2 text-[15px] text-[#a1a1aa]">Profile settings and account.</p>
        <Link
          href="/home"
          className="mt-6 inline-block rounded-xl border border-[rgba(255,255,255,0.12)] h-[52px] px-6 flex items-center font-semibold text-white"
        >
          Back to Home
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
