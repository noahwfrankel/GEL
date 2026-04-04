"use client";

interface GenreSelectorProps {
  genres: string[];
  selected: string;
  onChange: (genre: string) => void;
}

function formatLabel(genre: string): string {
  if (genre === "all") return "All";
  return genre
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function GenreSelector({ genres, selected, onChange }: GenreSelectorProps) {
  const all = ["all", ...genres.filter((g) => g !== "all")];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
      {all.map((genre) => {
        const active = genre === selected;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onChange(genre)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition duration-200 ${
              active
                ? "bg-[#22c55e] border-[#22c55e] text-black font-semibold"
                : "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,255,255,0.22)]"
            }`}
          >
            {formatLabel(genre)}
          </button>
        );
      })}
    </div>
  );
}
