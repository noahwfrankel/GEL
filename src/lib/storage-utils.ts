/**
 * Safe localStorage read with JSON parse. Never throws — returns null on failure.
 */
export function safeGetItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared FashionItem type (used across results pages and ProductCard)
// ---------------------------------------------------------------------------

export type FashionItem = {
  item_id?: string;
  title: string;
  price: number;
  image_url: string;
  item_url: string;
  condition: string;
  source: string;
};

// ---------------------------------------------------------------------------
// Seen Items (dedup across fashion feeds)
// ---------------------------------------------------------------------------

const SEEN_ITEMS_KEY = "gel_seen_items";
const MAX_SEEN_ITEMS = 100;
const SEEN_ITEMS_PRUNE_TO = 25;

export function getSeenItemIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_ITEMS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSeenItemIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    let seen = getSeenItemIds();
    const newIds = ids.filter((id) => id && !seen.includes(id));
    seen = [...seen, ...newIds];
    if (seen.length > MAX_SEEN_ITEMS) {
      seen = seen.slice(seen.length - SEEN_ITEMS_PRUNE_TO);
    }
    localStorage.setItem(SEEN_ITEMS_KEY, JSON.stringify(seen));
  } catch {
    // silent fail
  }
}

// ---------------------------------------------------------------------------
// Liked Items
// ---------------------------------------------------------------------------

const LIKED_ITEMS_KEY = "gel_liked_items";

export function getLikedItemIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIKED_ITEMS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Toggles the liked state for an item. Returns the new liked state. */
export function toggleLikedItem(itemId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const liked = getLikedItemIds();
    const isLiked = liked.includes(itemId);
    const updated = isLiked
      ? liked.filter((id) => id !== itemId)
      : [...liked, itemId];
    localStorage.setItem(LIKED_ITEMS_KEY, JSON.stringify(updated));
    return !isLiked;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Interaction Tracking
// ---------------------------------------------------------------------------

export type ItemInteraction = {
  item_id: string;
  item_title: string;
  genre: string;
  action: "viewed" | "liked" | "dismissed" | "clicked";
  timestamp: number;
  price: number;
  source: string;
  image_url: string;
  item_url: string;
  condition: string;
};

const INTERACTIONS_KEY = "gel_interactions";
const MAX_INTERACTIONS = 500;

export function trackInteraction(interaction: ItemInteraction): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(INTERACTIONS_KEY);
    const interactions: ItemInteraction[] = raw
      ? (JSON.parse(raw) as ItemInteraction[])
      : [];
    interactions.push(interaction);
    const trimmed = interactions.slice(-MAX_INTERACTIONS);
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(trimmed));
  } catch {
    // silent fail
  }
}

export function getInteractions(): ItemInteraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INTERACTIONS_KEY);
    return raw ? (JSON.parse(raw) as ItemInteraction[]) : [];
  } catch {
    return [];
  }
}
