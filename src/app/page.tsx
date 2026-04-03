"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SpotifyLoginButton } from "@/components/spotify-login-button";
import { TOKEN_STORAGE_KEY, SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";
import type { SpotifyData } from "@/lib/spotify-api";

const SPOTIFY_CONNECTED_KEY = "gel_spotify_connected";
const LAST_VISIT_KEY = "gel_last_visit";
const WHATS_NEW_STALE_MS = 24 * 60 * 60 * 1000;

function getTopArtistNames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as SpotifyData;
    const artists = data.topArtists?.short_term ?? [];
    return (Array.isArray(artists) ? artists : [])
      .slice(0, 3)
      .map((a) => (a as { name?: string }).name ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function WhatsNewSplash({ onContinue }: { onContinue: () => void }) {
  const [visible, setVisible] = useState(true);
  const artists = getTopArtistNames();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onContinue, 400); // wait for fade-out
    }, 3000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  const artistText =
    artists.length >= 2
      ? `${artists.slice(0, -1).join(", ")} and ${artists[artists.length - 1]}`
      : artists[0] ?? "your top artists";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] px-8 text-center transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => {
        setVisible(false);
        setTimeout(onContinue, 400);
      }}
    >
      <span className="text-[13px] font-medium uppercase tracking-[0.15em] text-[#22c55e] mb-4">
        Welcome back
      </span>
      {artists.length > 0 ? (
        <p className="text-[22px] font-bold tracking-[-0.4px] text-white leading-[1.3] max-w-[300px]">
          You&apos;ve been listening to a lot of {artistText} lately. Your recommendations have been updated.
        </p>
      ) : (
        <p className="text-[22px] font-bold tracking-[-0.4px] text-white leading-[1.3] max-w-[300px]">
          Your recommendations have been updated.
        </p>
      )}
      <p className="mt-8 text-[13px] text-[#52525b]">Tap to continue</p>
    </div>
  );
}

export default function SplashPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const hasConnected = localStorage.getItem(SPOTIFY_CONNECTED_KEY) === "true";
    const hasTokens = !!localStorage.getItem(TOKEN_STORAGE_KEY);

    if (hasConnected && hasTokens) {
      // Check if last visit was more than 24h ago → show What's New
      const lastVisitRaw = localStorage.getItem(LAST_VISIT_KEY);
      const lastVisit = lastVisitRaw ? parseInt(lastVisitRaw, 10) : NaN;
      const shouldShowWhatsNew =
        Number.isFinite(lastVisit) &&
        Date.now() - lastVisit > WHATS_NEW_STALE_MS;

      // Update last visit timestamp
      localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());

      if (shouldShowWhatsNew) {
        setShowWhatsNew(true);
      } else {
        router.replace("/home");
      }
      return;
    }

    // First-time or logged-out user: record visit and show login splash
    localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
    setShowSplash(true);
  }, [mounted, router]);

  if (!mounted || (!showSplash && !showWhatsNew)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-5">
        <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
      </div>
    );
  }

  if (showWhatsNew) {
    return (
      <WhatsNewSplash
        onContinue={() => router.replace("/home")}
      />
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
