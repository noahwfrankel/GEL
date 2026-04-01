"use client";

import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { disconnectSpotify } from "@/lib/spotify-api";

export default function ProfilePage() {
  const router = useRouter();

  function handleDisconnect() {
    disconnectSpotify();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">Profile</h1>
        <p className="mt-2 text-[15px] text-[#a1a1aa]">Profile settings and account.</p>

        <div className="mt-10 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[#141414] p-5">
          <h2 className="text-[16px] font-semibold text-white">Spotify</h2>
          <p className="mt-1 text-[13px] text-[#a1a1aa]">
            Disconnect to re-authenticate and grant updated permissions.
          </p>
          <button
            type="button"
            onClick={handleDisconnect}
            className="mt-4 h-11 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#1c1c1c] text-[14px] font-semibold text-white transition hover:border-[rgba(255,255,255,0.25)] duration-200"
          >
            Disconnect Spotify
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
