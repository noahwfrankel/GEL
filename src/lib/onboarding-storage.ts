export const ONBOARDING_STORAGE_KEY = "gel_onboarding";

/** Keys that may be cleared when resetting onboarding. Never clear spotify_tokens here. */
const ONBOARDING_CLEAR_KEYS = [
  ONBOARDING_STORAGE_KEY,
  "gel_spotify_connected",
] as const;

/**
 * Clears only onboarding-related data from localStorage.
 * Does NOT clear spotify_tokens — tokens must persist for API calls.
 */
export function clearOnboardingDataOnly(): void {
  if (typeof window === "undefined") return;
  ONBOARDING_CLEAR_KEYS.forEach((key) => localStorage.removeItem(key));
}

export type OnboardingData = {
  heightFeet: number;
  heightInches: number;
  weightLbs: number;
  fitPreferences: ("Menswear" | "Womenswear" | "Unisex")[];
  budgetMin: number;
  budgetMax: number;
  completed: boolean;
};

export function getOnboardingData(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

export function setOnboardingData(data: OnboardingData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
}

export function isOnboardingComplete(): boolean {
  const data = getOnboardingData();
  return data?.completed === true;
}
