"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SPOTIFY_DATA_STORAGE_KEY, type StoredArtist } from "@/lib/spotify-api";
import { safeGetItem } from "@/lib/storage-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenreNode = {
  id: string;
  genre: string;
  topArtist: string;
  count: number;
  x: number;
  y: number;
  r: number;
  color: string;
};

type SpotifyDataShape = {
  topArtists?: { short_term?: unknown; medium_term?: unknown; long_term?: unknown };
};

type SavedCounts = Record<string, number>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: "pants",       label: "Pants",       emoji: "👖" },
  { id: "shirts",      label: "Shirts",      emoji: "👕" },
  { id: "hoodies",     label: "Hoodies",     emoji: "🧥" },
  { id: "jackets",     label: "Jackets",     emoji: "🧣" },
  { id: "sweaters",    label: "Sweaters",    emoji: "🧶" },
  { id: "shoes",       label: "Shoes",       emoji: "👟" },
  { id: "shorts",      label: "Shorts",      emoji: "🩳" },
  { id: "accessories", label: "Accessories", emoji: "🕶️" },
] as const;

const GENRE_COLORS: Record<string, string> = {
  "hip-hop": "#7c3aed", "rap": "#7c3aed", "trap": "#5b21b6",
  "rock": "#dc2626", "punk": "#b91c1c", "metal": "#991b1b",
  "electronic": "#2563eb", "house": "#1d4ed8", "techno": "#1e40af",
  "jazz": "#d97706", "soul": "#b45309", "blues": "#92400e",
  "pop": "#059669", "indie": "#0d9488", "alternative": "#0f766e",
  "country": "#78350f", "folk": "#92400e", "americana": "#713f12",
  "r&b": "#7c2d12", "funk": "#c2410c",
};

function getGenreColor(genre: string): string {
  const g = genre.toLowerCase();
  for (const [key, color] of Object.entries(GENRE_COLORS)) {
    if (g.includes(key)) return color;
  }
  const hash = genre.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 35%)`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArtistArray(value: unknown): StoredArtist[] {
  if (Array.isArray(value)) return value as StoredArtist[];
  if (value && typeof value === "object" && "items" in value)
    return (value as { items: StoredArtist[] }).items ?? [];
  return [];
}

function getGenreNodes(data: SpotifyDataShape | null): GenreNode[] {
  if (!data) return [];
  const all = [
    ...toArtistArray(data.topArtists?.short_term),
    ...toArtistArray(data.topArtists?.medium_term),
  ];
  const map: Record<string, { count: number; topArtist: string }> = {};
  for (const a of all) {
    for (const g of (a.genres ?? [])) {
      if (!map[g]) map[g] = { count: 0, topArtist: a.name ?? "" };
      map[g].count += 1;
    }
  }
  const sorted = Object.entries(map)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);

  const W = 300, H = 200;
  const positions = [
    [W * 0.5, H * 0.5], [W * 0.2, H * 0.25], [W * 0.8, H * 0.25],
    [W * 0.15, H * 0.72], [W * 0.85, H * 0.72], [W * 0.5, H * 0.85],
  ];

  const maxCount = Math.max(...sorted.map(([, v]) => v.count), 1);

  return sorted.map(([genre, { count, topArtist }], i) => ({
    id: genre,
    genre,
    topArtist,
    count,
    x: positions[i]?.[0] ?? W * 0.5,
    y: positions[i]?.[1] ?? H * 0.5,
    r: 18 + (count / maxCount) * 18,
    color: getGenreColor(genre),
  }));
}

function formatGenre(g: string): string {
  return g.split(/[\s-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getSavedCountForCategory(cat: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`gel_closet_${cat}`);
    if (!raw) return 0;
    return (JSON.parse(raw) as unknown[]).length;
  } catch { return 0; }
}

// ---------------------------------------------------------------------------
// Network Graph component
// ---------------------------------------------------------------------------

function GenreNetworkGraph({ nodes, selectedGenre, onSelectGenre }: {
  nodes: GenreNode[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const edges = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.45) out.push([i, j]);
      }
    }
    return out;
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] overflow-hidden mb-6">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
          Your Music Taste
        </p>
        <p className="text-[12px] text-[#71717a] mt-0.5">Tap a genre to filter bins</p>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 300 220"
        className="w-full"
        style={{ height: 200 }}
      >
        {/* Edges */}
        {edges.map(([i, j]) => {
          const a = nodes[i]!, b = nodes[j]!;
          const isActive = selectedGenre === a.genre || selectedGenre === b.genre;
          return (
            <line
              key={`${i}-${j}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isActive ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.06)"}
              strokeWidth={isActive ? 1.5 : 1}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedGenre === node.genre;
          return (
            <g key={node.id} onClick={() => onSelectGenre(node.genre)} className="cursor-pointer">
              <circle
                cx={node.x} cy={node.y} r={node.r + (isSelected ? 3 : 0)}
                fill={node.color}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? "#22c55e" : "rgba(255,255,255,0.15)"}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={node.x} y={node.y - 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={node.r > 28 ? 9 : 8}
                fill="white"
                fontWeight="600"
              >
                {formatGenre(node.genre).split(" ")[0]}
              </text>
              <text
                x={node.x} y={node.y + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fill="rgba(255,255,255,0.6)"
              >
                {node.topArtist.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BuildMyClosetPage() {
  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes] = useState<GenreNode[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [savedCounts, setSavedCounts] = useState<SavedCounts>({});
  const [topGenre, setTopGenre] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const data = safeGetItem<SpotifyDataShape>(SPOTIFY_DATA_STORAGE_KEY);
    const genreNodes = getGenreNodes(data);
    setNodes(genreNodes);
    if (genreNodes[0]) setTopGenre(genreNodes[0].genre);

    const counts: SavedCounts = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = getSavedCountForCategory(cat.id);
    }
    setSavedCounts(counts);
  }, [mounted]);

  const activeGenre = selectedGenre ?? topGenre;

  function handleNodeClick(genre: string) {
    setSelectedGenre((prev) => (prev === genre ? null : genre));
  }

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

        {/* Network graph */}
        {mounted && nodes.length > 0 && (
          <GenreNetworkGraph
            nodes={nodes}
            selectedGenre={selectedGenre}
            onSelectGenre={handleNodeClick}
          />
        )}

        {/* Active genre label */}
        {mounted && activeGenre && (
          <p className="text-[13px] text-[#a1a1aa] mb-4">
            Showing picks for{" "}
            <span className="text-white font-medium">{formatGenre(activeGenre)}</span>
            {selectedGenre && (
              <button
                type="button"
                onClick={() => setSelectedGenre(null)}
                className="ml-2 text-[#52525b] hover:text-[#a1a1aa]"
              >
                ✕
              </button>
            )}
          </p>
        )}

        {/* Category bins grid */}
        {!mounted ? (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="h-[100px] rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.08)] animate-pulse-skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const count = savedCounts[cat.id] ?? 0;
              return (
                <Link
                  key={cat.id}
                  href={`/build-my-closet/bin/${cat.id}?genre=${encodeURIComponent(activeGenre)}`}
                  className="relative flex flex-col items-center justify-center h-[100px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141414] transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[#1c1c1c] duration-200"
                >
                  {count > 0 && (
                    <span className="absolute top-2 right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#22c55e] px-1 text-[10px] font-bold text-black">
                      {count}
                    </span>
                  )}
                  <span className="text-[28px] mb-1">{cat.emoji}</span>
                  <span className="text-[13px] font-medium text-white">{cat.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
