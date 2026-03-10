"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";

const SEEN_GENRES_KEY = "gel_niche_seen_genres";
const SAVED_NICHES_KEY = "gel_saved_niches";

type GenreCard = { genre: string; artists: { name: string }[] };

type SavedNiche = {
  genre: string;
  artists: { name: string }[];
  savedAt: number;
};

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
      .map(([genre, names]) => ({
        genre,
        artists: Array.from(names)
          .slice(0, 3)
          .map((name) => ({ name })),
      }))
      .filter((c) => c.artists.length > 0)
      .sort((a, b) => a.genre.localeCompare(b.genre));

    const clusterSize = 3;
    const artistClusterCards: GenreCard[] = [];
    for (let i = 0; i < allArtistsOrdered.length; i += clusterSize) {
      const cluster = allArtistsOrdered.slice(i, i + clusterSize);
      if (cluster.length === 0) continue;
      const title = cluster[0]?.name ?? "Unknown";
      artistClusterCards.push({
        genre: title,
        artists: cluster.map((a) => ({ name: a?.name ?? "Unknown" })),
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
  localStorage.setItem(SEEN_GENRES_KEY, JSON.stringify(genres));
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
  localStorage.setItem(SAVED_NICHES_KEY, JSON.stringify(niches));
}

function formatGenreLabel(genre: string): string {
  return genre
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
      }, 320);
      return () => clearTimeout(timer2);
    }, 320);
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
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="h-10 w-48 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  if (fullDeck.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-6">
        <div className="mx-auto max-w-md">
          <header className="mb-8">
            <Link
              href="/home"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white"
              aria-label="Back to home"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </header>
          <h1 className="text-2xl font-semibold text-white">Find My Niche</h1>
          <p className="mt-4 text-zinc-500">Connect Spotify and listen to some music to see your genre cards here.</p>
        </div>
      </div>
    );
  }

  const showLeaving = leavingIndex !== null && deck[leavingIndex];
  const showIncoming = incomingIndex !== null && deck[incomingIndex];

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-6 flex flex-col">
      <div className="mx-auto max-w-md w-full flex-1 flex flex-col">
        <header className="flex items-center gap-4 mb-6">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </header>

        <h1 className="text-2xl font-semibold tracking-tight text-white">Find My Niche</h1>
        <p className="mt-1 text-sm text-zinc-500">Swipe through your genres — save the vibes you love</p>

        <div className="relative mt-8 flex-1 min-h-[280px] overflow-hidden">
          {showLeaving && (
            <div
              key={`leaving-${leavingIndex}`}
              className="absolute inset-0 animate-slide-out-left"
            >
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

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={goToNext}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Next genre"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleExplore}
            className="w-full rounded-xl py-4 font-semibold text-black bg-[#1DB954] hover:bg-[#1ed760] transition"
          >
            Explore This Vibe
          </button>
        </div>

        {savedNiches.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-3">
              Your Saved Vibes
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              {savedNiches.map((saved) => (
                <Link
                  key={`${saved.genre}-${saved.savedAt}`}
                  href={`/find-my-niche/results?genre=${encodeURIComponent(saved.genre)}`}
                  className="flex-shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 min-w-[140px] transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {formatGenreLabel(saved.genre)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 truncate">
                    {saved.artists.map((a) => a.name).join(", ")}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
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
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-white leading-tight">
          {formatGenreLabel(card.genre)}
        </h3>
        {showHeart && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onToggleSave(); }}
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
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
      {card.artists.length > 0 && (
        <p className="mt-4 text-sm text-zinc-400">
          {card.artists.map((a) => a.name).join(" · ")}
        </p>
      )}
    </div>
  );
}
