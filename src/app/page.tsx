"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SpotifyLoginButton } from "@/components/spotify-login-button";
import { TOKEN_STORAGE_KEY } from "@/lib/spotify-api";

const SPOTIFY_CONNECTED_KEY = "gel_spotify_connected";

export default function SplashPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const hasConnected = localStorage.getItem(SPOTIFY_CONNECTED_KEY) === "true";
    const hasTokens = !!localStorage.getItem(TOKEN_STORAGE_KEY);
    if (hasConnected && hasTokens) {
      router.replace("/home");
      return;
    }
    setShowSplash(true);
  }, [mounted, router]);

  if (!mounted || !showSplash) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-5">
        <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-5">
      <main className="flex max-w-md flex-col items-center text-center w-full">
        <span className="text-[48px] font-extrabold tracking-[-2px] text-white" aria-hidden>
          GEL
        </span>
        <div className="h-px w-10 bg-[#22c55e] mt-2" aria-hidden />
        <p className="mt-3 text-base text-[#a1a1aa]">Your music. Your aesthetic.</p>

        <div className="flex-1 min-h-[80px]" />

        <p className="text-[13px] text-[#52525b] text-center mb-6">
          Discover your style through your music
        </p>
        <SpotifyLoginButton />
        <p className="text-[12px] text-[#52525b] text-center mt-3">
          Your data is never sold or shared.
        </p>
      </main>
    </div>
  );
}
