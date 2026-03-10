"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SpotifyLoginButton } from "@/components/spotify-login-button";
import { TOKEN_STORAGE_KEY } from "@/lib/spotify-api";

const SPOTIFY_CONNECTED_KEY = "gel_spotify_connected";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const hasConnected =
      localStorage.getItem(SPOTIFY_CONNECTED_KEY) === "true";
    const hasTokens = !!localStorage.getItem(TOKEN_STORAGE_KEY);
    if (hasConnected && hasTokens) {
      router.replace("/home");
      return;
    }
    setShowSplash(true);
  }, [mounted, router]);

  if (!mounted || !showSplash) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6">
        <main className="flex max-w-md flex-col items-center text-center">
          <div className="mb-12 h-24 w-24 rounded-2xl border-2 border-white/10 bg-white/5" />
          <div className="mb-4 h-9 w-64 animate-pulse rounded bg-white/10" />
          <div className="mb-14 h-5 w-48 animate-pulse rounded bg-white/5" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6">
      <main className="flex max-w-md flex-col items-center text-center">
        <div
          className="mb-12 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/10 bg-white/5 text-2xl font-bold tracking-tight text-white/90"
          aria-hidden
        >
          GEL
        </div>

        <h1 className="mb-4 font-semibold tracking-tight text-white text-3xl sm:text-4xl">
          Discover your style through your music
        </h1>

        <p className="mb-14 max-w-sm text-base text-zinc-400">
          Connect your Spotify to get started.
        </p>

        <SpotifyLoginButton />
      </main>
    </div>
  );
}
