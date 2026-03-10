"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPOTIFY_DATA_STORAGE_KEY } from "@/lib/spotify-api";

type ArtistWithGenres = { id: string; name: string; genres?: string[] };

type AestheticCard = {
  id: string;
  label: string;
  artists: { name: string }[];
  colorClass: string;
};

const AESTHETIC_DEFINITIONS: {
  id: string;
  label: string;
  keywords: string[];
  colorClass: string;
}[] = [
  {
    id: "skate",
    label: "Late 90s Skate",
    keywords: ["skate", "punk", "pop punk", "pop-punk", "alternative", "emo", "post-punk", "grunge"],
    colorClass: "from-amber-950/40 to-transparent",
  },
  {
    id: "minimal",
    label: "Dark Minimalist",
    keywords: ["minimal", "indie", "art pop", "ambient", "experimental", "dream pop", "shoegaze", "post-rock", "lo-fi"],
    colorClass: "from-slate-800/50 to-transparent",
  },
  {
    id: "harlem",
    label: "Harlem Soul",
    keywords: ["hip-hop", "hip hop", "r&b", "soul", "rap", "funk", "neo soul", "reggae", "dancehall"],
    colorClass: "from-rose-950/40 to-transparent",
  },
  {
    id: "pop",
    label: "Pop Maximalist",
    keywords: ["pop", "dance", "electropop", "dance pop", "synth pop", "europop", "indie pop"],
    colorClass: "from-violet-950/40 to-transparent",
  },
  {
    id: "jazz",
    label: "Jazz & Soul",
    keywords: ["jazz", "bebop", "soul", "funk", "blues", "fusion", "smooth jazz"],
    colorClass: "from-emerald-950/40 to-transparent",
  },
  {
    id: "americana",
    label: "Americana",
    keywords: ["country", "americana", "folk", "singer-songwriter", "alt-country", "bluegrass", "outlaw"],
    colorClass: "from-amber-900/30 to-transparent",
  },
  {
    id: "electronic",
    label: "Electronic",
    keywords: ["electronic", "techno", "house", "edm", "trance", "drum and bass", "dubstep", "ambient"],
    colorClass: "from-cyan-950/40 to-transparent",
  },
];

function getArtistsFromStorage(): ArtistWithGenres[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_DATA_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as {
      topArtists?: {
        short_term?: { id?: string; name?: string; genres?: string[] }[];
        medium_term?: { id?: string; name?: string; genres?: string[] }[];
        long_term?: { id?: string; name?: string; genres?: string[] }[];
      };
    };
    const seen = new Set<string>();
    const artists: ArtistWithGenres[] = [];
    const ranges = [
      data.topArtists?.short_term,
      data.topArtists?.medium_term,
      data.topArtists?.long_term,
    ].filter(Boolean) as { id?: string; name?: string; genres?: string[] }[][];

    for (const range of ranges) {
      for (const a of range) {
        const id = a?.id ?? a?.name ?? "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        artists.push({
          id,
          name: a?.name ?? "Unknown",
          genres: (a?.genres ?? []).map((g) => g.trim().toLowerCase()),
        });
      }
    }
    return artists;
  } catch {
    return [];
  }
}

function getAestheticCards(): AestheticCard[] {
  const artists = getArtistsFromStorage();
  if (artists.length === 0) {
    return AESTHETIC_DEFINITIONS.slice(0, 4).map((def) => ({
      id: def.id,
      label: def.label,
      artists: [],
      colorClass: def.colorClass,
    }));
  }

  const cards: AestheticCard[] = [];

  for (const def of AESTHETIC_DEFINITIONS) {
    const scored = artists
      .map((artist) => {
        const genres = artist.genres ?? [];
        let score = 0;
        for (const g of genres) {
          for (const kw of def.keywords) {
            if (g.includes(kw) || kw.includes(g)) {
              score += 1;
              break;
            }
          }
        }
        return { artist, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length > 0) {
      cards.push({
        id: def.id,
        label: def.label,
        artists: scored.map((s) => ({ name: s.artist.name })),
        colorClass: def.colorClass,
      });
    }
  }

  cards.sort((a, b) => b.artists.length - a.artists.length);
  return cards.slice(0, 5);
}

const FALLBACK_CARDS: AestheticCard[] = [
  { id: "indie", label: "Indie", artists: [], colorClass: "from-slate-800/50 to-transparent" },
  { id: "pop", label: "Pop", artists: [], colorClass: "from-violet-950/40 to-transparent" },
  { id: "soul", label: "Soul", artists: [], colorClass: "from-rose-950/40 to-transparent" },
];

export default function FindMyNichePage() {
  const router = useRouter();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const aestheticCards = useMemo(() => {
    if (!mounted) return FALLBACK_CARDS;
    const cards = getAestheticCards();
    return cards.length > 0 ? cards : FALLBACK_CARDS;
  }, [mounted]);

  const handleExplore = () => {
    if (!selectedCardId) return;
    router.push("/find-my-niche/results");
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Back to home"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        </header>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Find My Niche
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your taste, reflected — tap the vibe that feels most you
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {aestheticCards.map((card) => {
            const isSelected = selectedCardId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                className={`relative overflow-hidden rounded-2xl border text-left transition ${
                  isSelected
                    ? "border-[#1DB954] ring-2 ring-[#1DB954]/30"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.colorClass}`}
                  aria-hidden
                />
                <div className="relative p-5">
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    {card.label}
                  </h3>
                  {card.artists.length > 0 && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {card.artists.map((a) => a.name).join(" · ")}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={handleExplore}
            disabled={!selectedCardId}
            className="w-full rounded-xl py-4 font-semibold text-black transition disabled:opacity-50 disabled:cursor-not-allowed bg-[#1DB954] hover:bg-[#1ed760] disabled:hover:bg-[#1DB954]"
          >
            Explore This Vibe
          </button>
        </div>
      </div>
    </div>
  );
}
