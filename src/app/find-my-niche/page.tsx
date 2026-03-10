"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";
import { BottomNav } from "@/components/BottomNav";

const SEEN_GENRES_KEY = "gel_niche_seen_genres";
const SAVED_NICHES_KEY = "gel_saved_niches";

type GenreCard = {
  genre: string;
  artists: { name: string }[];
  description: string;
  aestheticLabel: string;
  gradient: { color1: string; color2: string };
};

type SavedNiche = {
  genre: string;
  artists: { name: string }[];
  savedAt: number;
};

function getGenreGradient(genre: string): { color1: string; color2: string } {
  const g = genre.toLowerCase();
  if (/hip-hop|rap|trap/.test(g)) return { color1: "#1a0a2e", color2: "#0a0a1a" };
  if (/rock|punk|metal/.test(g)) return { color1: "#2e0a0a", color2: "#0a0a0a" };
  if (/electronic|house|techno/.test(g)) return { color1: "#0a1a2e", color2: "#0a0a1a" };
  if (/jazz|soul|blues/.test(g)) return { color1: "#1a1200", color2: "#0a0a0a" };
  if (/pop|indie|alternative/.test(g)) return { color1: "#0a1a12", color2: "#0a0a0a" };
  if (/country|folk|americana/.test(g)) return { color1: "#1a1000", color2: "#0a0a0a" };
  return { color1: "#141414", color2: "#0a0a0a" };
}

function getAestheticLabel(genre: string): string {
  const g = genre.toLowerCase();
  if (/hip-hop|rap|trap/.test(g)) return "Street Culture";
  if (/rock|punk|metal/.test(g)) return "Raw Energy";
  if (/electronic|house|techno/.test(g)) return "Digital Minimalism";
  if (/jazz|soul|blues/.test(g)) return "Refined Cool";
  if (/pop/.test(g)) return "Modern Edge";
  if (/country|folk|americana/.test(g)) return "Worn-In Americana";
  if (/indie/.test(g)) return "Thoughtful Thrift";
  return genre.split(/[\s-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const AESTHETIC_DESCRIPTIONS: Record<string, string> = {
  "Street Culture": "Bold silhouettes, statement pieces, cultural currency",
  "Raw Energy": "Worn-in layers, vintage cuts, unapologetic attitude",
  "Digital Minimalism": "Clean lines, technical fabrics, future-forward",
  "Refined Cool": "Sharp tailoring, earth tones, effortless sophistication",
  "Modern Edge": "Trend-aware, expressive, always current",
  "Worn-In Americana": "Durable fabrics, workwear roots, lived-in warmth",
  "Thoughtful Thrift": "Curated vintage, unexpected combinations, individual",
};

function getAestheticDescription(aestheticLabel: string): string {
  return AESTHETIC_DESCRIPTIONS[aestheticLabel] ?? "Curated from your listening history";
}

function formatGenreLabel(genre: string): string {
  return genre
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getGenreCardsFromStorage(): GenreCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as {
      topArtists?: {
        short_term?: { id?: string; name?: string; genres?: string[] }[] | { items?: { id?: string; name?: string; genres?: string[] }[] };
        medium_term?: { id?: string; name?: string; genres?: string[] }[] | { items?: { id?: string; name?: string; genres?: string[] }[] };
        long_term?: { id?: string; name?: string; genres?: string[] }[] | { items?: { id?: string; name?: string; genres?: string[] }[] };
      };
    };
    type ArtistLike = { id?: string; name?: string; genres?: string[] };
    function toArtistArray(value: unknown): ArtistLike[] {
      if (Array.isArray(value)) return value as ArtistLike[];
      if (value && typeof value === "object" && "items" in value && Array.isArray((value as { items?: unknown[] }).items))
        return (value as { items: ArtistLike[] }).items;
      return [];
    }
    const genreToArtists: Record<string, Set<string>> = {};
    const ranges = [
      toArtistArray(data.topArtists?.short_term),
      toArtistArray(data.topArtists?.medium_term),
      toArtistArray(data.topArtists?.long_term),
    ].filter((arr) => arr.length > 0);

    const seenIds = new Set<string>();
    const allArtistsOrdered: ArtistLike[] = [];
    for (const range of ranges) {
      for (const a of range) {
        const id = a?.id ?? a?.name ?? "";
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          allArtistsOrdered.push(a);
        }
      }
    }

    for (const range of ranges) {
      for (const a of range) {
        const name = a?.name ?? "Unknown";
        const genres = (a?.genres ?? []).map((g) => g.trim().toLowerCase()).filter(Boolean);
        for (const g of genres) {
          if (!genreToArtists[g]) genreToArtists[g] = new Set();
          genreToArtists[g].add(name);
        }
      }
    }

    const genreCards: GenreCard[] = Object.entries(genreToArtists)
      .map(([genre, names], idx) => ({
        genre,
        artists: Array.from(names).slice(0, 3).map((name) => ({ name })),
        description: getAestheticDescription(getAestheticLabel(genre)),
        aestheticLabel: getAestheticLabel(genre),
        gradient: getGenreGradient(genre),
      }))
      .filter((c) => c.artists.length > 0)
      .sort((a, b) => a.genre.localeCompare(b.genre));

    const clusterSize = 3;
    const artistClusterCards: GenreCard[] = [];
    const clusterTitles = ["Heavy Rotation", "Your Top Picks", "From Your Library", "Your Vibe", "In Your Ears"];
    for (let i = 0; i < allArtistsOrdered.length; i += clusterSize) {
      const cluster = allArtistsOrdered.slice(i, i + clusterSize);
      if (cluster.length === 0) continue;
      const clusterTitle = clusterTitles[artistClusterCards.length % clusterTitles.length]!;
      artistClusterCards.push({
        genre: clusterTitle,
        artists: cluster.map((a) => ({ name: a?.name ?? "Unknown" })),
        description: "Artists from your recent listening",
        aestheticLabel: clusterTitle,
        gradient: { color1: "#141414", color2: "#0a0a0a" },
      });
    }

    return [...genreCards, ...artistClusterCards];
  } catch {
    return [];
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getSeenGenres(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_GENRES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function setSeenGenres(genres: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_GENRES_KEY, JSON.stringify(genres));
  } catch {
    // ignore
  }
}

function getSavedNiches(): SavedNiche[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_NICHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedNiche[];
  } catch {
    return [];
  }
}

function setSavedNiches(niches: SavedNiche[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_NICHES_KEY, JSON.stringify(niches));
  } catch {
    // ignore
  }
}

export default function FindMyNichePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [deck, setDeck] = useState<GenreCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedNiches, setSavedNichesState] = useState<SavedNiche[]>([]);
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"out" | "in" | null>(null);

  const fullDeck = useMemo(() => {
    if (!mounted) return [];
    return getGenreCardsFromStorage();
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || fullDeck.length === 0) return;
    const seen = getSeenGenres();
    if (seen.length >= fullDeck.length) {
      setSeenGenres([]);
      setDeck(shuffle([...fullDeck]));
      setCurrentIndex(0);
      return;
    }
    if (deck.length === 0) {
      const shuffled = shuffle([...fullDeck]);
      setDeck(shuffled);
      setCurrentIndex(0);
      if (shuffled[0]?.genre && !seen.includes(shuffled[0].genre)) {
        setSeenGenres([...seen, shuffled[0].genre]);
      }
    }
  }, [mounted, fullDeck]);

  useEffect(() => {
    if (!mounted || deck.length === 0) return;
    const g = deck[currentIndex]?.genre;
    if (!g) return;
    const seen = getSeenGenres();
    if (seen.includes(g)) return;
    const newSeen = [...seen, g];
    setSeenGenres(newSeen);
    if (newSeen.length >= deck.length) {
      setSeenGenres([]);
      setDeck(shuffle([...deck]));
    }
  }, [mounted, deck, currentIndex]);

  useEffect(() => {
    if (!mounted) return;
    setSavedNichesState(getSavedNiches());
  }, [mounted]);

  const currentCard = deck[currentIndex] ?? null;
  const currentGenre = currentCard?.genre ?? "";

  const goToNext = useCallback(() => {
    if (deck.length === 0 || leavingIndex !== null) return;
    const next = (currentIndex + 1) % deck.length;
    setLeavingIndex(currentIndex);
    setIncomingIndex(next);
    setSlideDirection("out");
    const timer = setTimeout(() => {
      setSlideDirection("in");
      setCurrentIndex(next);
      const timer2 = setTimeout(() => {
        setLeavingIndex(null);
        setIncomingIndex(null);
        setSlideDirection(null);
      }, 280);
      return () => clearTimeout(timer2);
    }, 280);
    return () => clearTimeout(timer);
  }, [deck, currentIndex, leavingIndex]);

  const isSaved = useMemo(() => {
    return savedNiches.some((s) => s.genre === currentGenre);
  }, [savedNiches, currentGenre]);

  const toggleSave = useCallback(() => {
    if (!currentCard) return;
    let next = getSavedNiches();
    if (isSaved) {
      next = next.filter((s) => s.genre !== currentGenre);
    } else {
      next = [
        ...next,
        { genre: currentGenre, artists: currentCard.artists, savedAt: Date.now() },
      ];
    }
    setSavedNiches(next);
    setSavedNichesState(next);
  }, [currentCard, currentGenre, isSaved]);

  const handleExplore = useCallback(() => {
    if (!currentGenre) return;
    router.push(`/find-my-niche/results?genre=${encodeURIComponent(currentGenre)}`);
  }, [currentGenre, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="h-10 w-48 animate-pulse-skeleton rounded bg-white/10" />
      </div>
    );
  }

  if (fullDeck.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-5 pb-12 pt-6">
        <div className="mx-auto max-w-md">
          <header className="mb-8">
            <Link
              href="/home"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white"
              aria-label="Back to home"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </header>
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-white">Find My Niche</h1>
          <p className="mt-4 text-[15px] text-[#a1a1aa]">Connect Spotify and listen to some music to see your genre cards here.</p>
        </div>
      </div>
    );
  }

  const showLeaving = leavingIndex !== null && deck[leavingIndex];
  const showIncoming = incomingIndex !== null && deck[incomingIndex];

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-6 pb-[180px] flex flex-col">
      <div className="mx-auto max-w-md w-full flex-1 flex flex-col">
        <header className="flex items-center justify-between mb-6">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-[18px] font-bold tracking-tight text-white">Find My Niche</h1>
          <div className="w-10" aria-hidden />
        </header>

        <div className="relative flex-1 min-h-[58vh] overflow-hidden">
          {showLeaving && (
            <div key={`leaving-${leavingIndex}`} className="absolute inset-0 animate-slide-out-left">
              <GenreCardContent
                card={deck[leavingIndex]!}
                isSaved={savedNiches.some((s) => s.genre === deck[leavingIndex]!.genre)}
                onToggleSave={() => {}}
                showHeart={false}
              />
            </div>
          )}
          {(showIncoming || currentCard) && (
            <div
              key={showIncoming ? `in-${incomingIndex}` : `cur-${currentIndex}`}
              className={`absolute inset-0 ${slideDirection === "in" ? "animate-slide-in-right" : ""}`}
            >
              <GenreCardContent
                card={showIncoming ? deck[incomingIndex!]! : currentCard!}
                isSaved={isSaved}
                onToggleSave={toggleSave}
                showHeart={true}
              />
            </div>
          )}
        </div>

        <p className="text-[13px] text-[#52525b] text-center my-3">
          {currentIndex + 1} of {deck.length}
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={goToNext}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1c1c1c] border border-[rgba(255,255,255,0.12)] text-white transition hover:border-[rgba(255,255,255,0.22)] duration-200"
            aria-label="Shuffle / Next genre"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 z-40 bg-[#0a0a0a] pt-4 pb-4 px-5 border-t border-[rgba(255,255,255,0.08)]">
        <button
          type="button"
          onClick={handleExplore}
          className="w-full h-[52px] rounded-xl bg-[#22c55e] font-semibold text-black transition hover:bg-[#22c55e]/90 duration-200"
        >
          Explore This Vibe
        </button>
        {savedNiches.length > 0 && (
          <section className="mt-4">
            <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-[#52525b] mb-3">
              SAVED VIBES
            </h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
              {savedNiches.map((saved) => (
                <Link
                  key={`${saved.genre}-${saved.savedAt}`}
                  href={`/find-my-niche/results?genre=${encodeURIComponent(saved.genre)}`}
                  className="flex-shrink-0 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#141414] px-4 py-2 text-[13px] text-white transition hover:border-[rgba(255,255,255,0.12)] hover:bg-[#1c1c1c] duration-200"
                >
                  {formatGenreLabel(saved.genre)}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function GenreCardContent({
  card,
  isSaved,
  onToggleSave,
  showHeart,
}: {
  card: GenreCard;
  isSaved: boolean;
  onToggleSave: () => void;
  showHeart: boolean;
}) {
  const { color1, color2 } = card.gradient;
  return (
    <div
      className="relative w-full h-[58vh] rounded-[20px] overflow-hidden flex flex-col border border-[rgba(255,255,255,0.08)]"
      style={{ background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)` }}
    >
      <div className="relative z-10 flex flex-col flex-1 p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-block rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.1)] px-3 py-1 text-[12px] text-white">
            {formatGenreLabel(card.genre)}
          </span>
          {showHeart && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onToggleSave(); }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] text-white transition hover:bg-[rgba(0,0,0,0.5)] duration-200"
              aria-label={isSaved ? "Unsave this vibe" : "Save this vibe"}
            >
              {isSaved ? (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h3 className="text-[32px] font-extrabold tracking-[-1px] text-white leading-[1.1]">
            {card.aestheticLabel}
          </h3>
          {card.artists.length > 0 && (
            <p className="mt-2 text-[15px] text-[#a1a1aa]">
              {card.artists.slice(0, 3).map((a) => a.name).join(" · ")}
            </p>
          )}
        </div>
        <p className="text-[13px] text-[#52525b] italic mt-auto pt-4">
          {card.description}
        </p>
      </div>
    </div>
  );
}

