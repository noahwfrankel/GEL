"use client";

import { useState } from "react";

export type Filters = {
  priceMin: number;
  priceMax: number;
  sizes: string[];
  types: string[];
  colors: string[];
};

const DEFAULT_FILTERS: Filters = {
  priceMin: 0,
  priceMax: 500,
  sizes: [],
  types: [],
  colors: [],
};

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const TYPES = ["All", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"];
const COLORS = ["Black", "White", "Grey", "Brown", "Green", "Blue", "Red", "Yellow", "Orange", "Purple", "Pink", "Multi"];

const COLOR_SWATCHES: Record<string, string> = {
  Black: "#1a1a1a", White: "#f5f5f5", Grey: "#9ca3af", Brown: "#92400e",
  Green: "#16a34a", Blue: "#2563eb", Red: "#dc2626", Yellow: "#ca8a04",
  Orange: "#ea580c", Purple: "#7c3aed", Pink: "#ec4899", Multi: "conic-gradient(red, yellow, green, blue, red)",
};

export const FILTERS_STORAGE_KEY = "gel_filters";

export function loadFiltersFromStorage(): Filters {
  if (typeof window === "undefined") return { ...DEFAULT_FILTERS };
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<Filters>) } : { ...DEFAULT_FILTERS };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

function saveFiltersToStorage(f: Filters) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

interface FilterDrawerProps {
  filters: Filters;
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function FilterDrawer({ filters, onApply, onClose }: FilterDrawerProps) {
  const [local, setLocal] = useState<Filters>({ ...filters });

  function handleApply() {
    saveFiltersToStorage(local);
    onApply(local);
    onClose();
  }

  function handleReset() {
    setLocal({ ...DEFAULT_FILTERS });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[24px] bg-[#141414] border-t border-[rgba(255,255,255,0.1)] max-h-[85vh] overflow-y-auto">
        <div className="px-5 pb-8 pt-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[18px] font-bold text-white">Filters</h3>
            <button type="button" onClick={handleReset} className="text-[13px] text-[#a1a1aa] hover:text-white">
              Reset
            </button>
          </div>

          {/* Price range */}
          <div className="mb-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-3">
              Price Range
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-[#71717a] mb-1 block">Min</label>
                <input
                  type="number"
                  min={0}
                  max={local.priceMax}
                  value={local.priceMin}
                  onChange={(e) => setLocal({ ...local, priceMin: Math.min(Number(e.target.value), local.priceMax) })}
                  className="w-full h-10 rounded-xl bg-[#1c1c1c] border border-[rgba(255,255,255,0.1)] text-white text-[14px] px-3 outline-none focus:border-[rgba(255,255,255,0.25)]"
                />
              </div>
              <span className="text-[#52525b] mt-4">–</span>
              <div className="flex-1">
                <label className="text-[11px] text-[#71717a] mb-1 block">Max</label>
                <input
                  type="number"
                  min={local.priceMin}
                  max={500}
                  value={local.priceMax}
                  onChange={(e) => setLocal({ ...local, priceMax: Math.max(Number(e.target.value), local.priceMin) })}
                  className="w-full h-10 rounded-xl bg-[#1c1c1c] border border-[rgba(255,255,255,0.1)] text-white text-[14px] px-3 outline-none focus:border-[rgba(255,255,255,0.25)]"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="mb-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-3">Size</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => {
                const active = local.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setLocal({ ...local, sizes: toggle(local.sizes, size) })}
                    className={`h-10 w-14 rounded-xl border text-[13px] font-medium transition ${
                      active
                        ? "bg-[#22c55e] border-[#22c55e] text-black"
                        : "border-[rgba(255,255,255,0.12)] bg-[#1c1c1c] text-white hover:border-[rgba(255,255,255,0.22)]"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clothing type */}
          <div className="mb-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-3">Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((type) => {
                const active = type === "All" ? local.types.length === 0 : local.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (type === "All") setLocal({ ...local, types: [] });
                      else setLocal({ ...local, types: toggle(local.types, type) });
                    }}
                    className={`rounded-full px-4 py-1.5 text-[13px] border transition ${
                      active
                        ? "bg-[#22c55e] border-[#22c55e] text-black font-semibold"
                        : "border-[rgba(255,255,255,0.12)] bg-[#1c1c1c] text-white hover:border-[rgba(255,255,255,0.22)]"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div className="mb-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-3">Color</p>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((color) => {
                const active = local.colors.includes(color);
                const swatch = COLOR_SWATCHES[color] ?? "#555";
                const isMulti = color === "Multi";
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setLocal({ ...local, colors: toggle(local.colors, color) })}
                    className={`flex flex-col items-center gap-1.5 transition ${active ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
                    title={color}
                  >
                    <div
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        active ? "border-[#22c55e]" : "border-transparent"
                      }`}
                      style={isMulti ? { background: swatch } : { backgroundColor: swatch }}
                    />
                    <span className="text-[9px] text-[#71717a]">{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="w-full h-12 rounded-xl bg-[#22c55e] font-semibold text-black text-[15px] transition hover:bg-[#22c55e]/90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
