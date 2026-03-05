"use client";

import { useState, useRef, useEffect } from "react";
import {
  isOnboardingComplete,
  setOnboardingData,
  type OnboardingData,
} from "@/lib/onboarding-storage";

const FEET_OPTIONS = [4, 5, 6, 7];
const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i);
const WEIGHT_OPTIONS = Array.from({ length: 351 }, (_, i) => i + 50);
const FIT_OPTIONS = ["Menswear", "Womenswear", "Unisex"] as const;
const WELCOME_DURATION_MS = 2000;

function ScrollPicker<T>({
  options,
  value,
  onChange,
  format = (v) => String(v),
  itemHeight = 44,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  itemHeight?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = options.indexOf(value);
    if (idx >= 0) el.scrollTop = idx * itemHeight;
  }, [options, value, itemHeight]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(idx, options.length - 1));
    if (options[clamped] !== value) onChange(options[clamped]);
  };

  return (
    <div className="relative flex-1" style={{ maxHeight: itemHeight * 5 }}>
      <div
        className="absolute left-0 right-0 rounded-lg bg-white/10 pointer-events-none z-0"
        style={{ top: itemHeight * 2, height: itemHeight }}
      />
      <div
        ref={scrollRef}
        className="relative z-10 overflow-y-auto snap-y snap-mandatory scrollbar-hide h-full"
        onScroll={handleScroll}
      >
        <div style={{ height: itemHeight * 2 }} className="shrink-0" />
        {options.map((opt) => (
          <div
            key={format(opt)}
            className="snap-center flex items-center justify-center text-white text-lg py-2"
            style={{ height: itemHeight }}
          >
            {format(opt)}
          </div>
        ))}
        <div style={{ height: itemHeight * 2 }} className="shrink-0" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<-1 | 0 | 1 | 2 | 3>(-1);

  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(8);
  const [weightLbs, setWeightLbs] = useState(160);
  const [fitPreferences, setFitPreferences] = useState<
    ("Menswear" | "Womenswear" | "Unisex")[]
  >([]);
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(150);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isOnboardingComplete()) {
      setPhase(3);
      return;
    }
    setPhase(-1);
  }, [mounted]);

  useEffect(() => {
    if (phase !== -1) return;
    const t = setTimeout(() => setPhase(0), WELCOME_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const toggleFit = (fit: (typeof FIT_OPTIONS)[number]) => {
    setFitPreferences((prev) =>
      prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit]
    );
  };

  const handleContinue = () => {
    if (phase < 2) {
      setPhase((p) => (p + 1) as 0 | 1 | 2);
    } else {
      const data: OnboardingData = {
        heightFeet,
        heightInches,
        weightLbs,
        fitPreferences,
        budgetMin,
        budgetMax,
        completed: true,
      };
      setOnboardingData(data);
      setPhase(3);
    }
  };

  const canContinue = () => {
    if (phase === 0) return true;
    if (phase === 1) return fitPreferences.length > 0;
    return true;
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d]">
        <div className="h-10 w-48 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  const showWelcome = phase === -1;
  const showStep0 = phase === 0;
  const showStep1 = phase === 1;
  const showStep2 = phase === 2;
  const showHome = phase === 3;

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-6 pb-12 pt-16">
      <div className="mx-auto max-w-md flex flex-col min-h-[70vh]">
        {showWelcome && (
          <div
            key="welcome"
            className="flex flex-col items-center justify-center flex-1 text-center animate-fade-in"
          >
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome to GEL
            </h1>
          </div>
        )}

        {showStep0 && (
          <div key="step0" className="animate-fade-in flex flex-col flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">
              Height and weight
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              We use this to recommend better fits.
            </p>
            <div className="flex gap-6 flex-1">
              <div className="flex-1">
                <p className="text-zinc-500 text-sm mb-1">Height</p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <div className="relative flex gap-1">
                      <ScrollPicker
                        options={FEET_OPTIONS}
                        value={heightFeet}
                        onChange={setHeightFeet}
                        format={(v) => `${v} ft`}
                      />
                      <ScrollPicker
                        options={INCHES_OPTIONS}
                        value={heightInches}
                        onChange={setHeightInches}
                        format={(v) => `${v} in`}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-zinc-500 text-sm mb-1">Weight (lbs)</p>
                <div className="relative">
                  <ScrollPicker
                    options={WEIGHT_OPTIONS}
                    value={weightLbs}
                    onChange={setWeightLbs}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {showStep1 && (
          <div key="step1" className="animate-fade-in flex flex-col flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">
              Gender / fit preference
            </h2>
            <p className="text-zinc-400 text-sm mb-8">
              Select all that apply. You can change this later.
            </p>
            <div className="flex flex-wrap gap-3">
              {FIT_OPTIONS.map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => toggleFit(fit)}
                  className={`px-6 py-3 rounded-full font-medium transition ${
                    fitPreferences.includes(fit)
                      ? "bg-[#1DB954] text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>
        )}

        {showStep2 && (
          <div key="step2" className="animate-fade-in flex flex-col flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Budget</h2>
            <p className="text-zinc-400 text-sm mb-8">
              What range do you usually spend per item?
            </p>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>${budgetMin}</span>
                  <span>${budgetMax}</span>
                </div>
                <div className="relative h-8 flex items-center">
                  <div className="absolute left-0 right-0 h-2 bg-white/10 rounded-full" />
                  <input
                    type="range"
                    min={0}
                    max={500}
                    value={budgetMin}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBudgetMin(Math.min(v, budgetMax - 10));
                    }}
                    className="absolute w-full h-8 appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1DB954] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1DB954] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer z-10"
                  />
                  <input
                    type="range"
                    min={0}
                    max={500}
                    value={budgetMax}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBudgetMax(Math.max(v, budgetMin + 10));
                    }}
                    className="absolute w-full h-8 appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1DB954] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1DB954] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer z-20"
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-1">$0 – $500</p>
              </div>
            </div>
          </div>
        )}

        {showHome && (
          <div
            key="home"
            className="flex flex-col items-center justify-center flex-1 text-center animate-fade-in"
          >
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome to GEL
            </h1>
          </div>
        )}

        {(showStep0 || showStep1 || showStep2) && (
          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue()}
              className="w-full py-4 rounded-full bg-[#1DB954] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1ed760] transition"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
