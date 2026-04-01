/**
 * Spotify token storage and refresh. Tokens may be in localStorage or sessionStorage.
 * This key is the single source of truth — do not clear it when clearing onboarding data.
 */
export const TOKEN_STORAGE_KEY = "spotify_tokens";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export type StoredTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
};

export function getStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: StoredTokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export async function refreshAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) return null;

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) return null;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: clientId,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!res.ok || !data.access_token) return null;

  const newTokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? tokens.refresh_token,
    expires_in: data.expires_in ?? 3600,
  };
  setStoredTokens(newTokens);
  return newTokens.access_token;
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) return null;
  return tokens.access_token;
}

/**
 * Clear all Spotify tokens and cached data so the user is re-prompted for
 * OAuth consent on next login (required when scopes change).
 */
export function disconnectSpotify(): void {
  if (typeof window === "undefined") return;
  [
    TOKEN_STORAGE_KEY,
    SPOTIFY_DATA_STORAGE_KEY,
    SPOTIFY_FETCHED_AT_KEY,
    "gel_spotify_connected",
  ].forEach((key) => localStorage.removeItem(key));
}

/**
 * Call Spotify API; if 401, refresh token and retry once.
 */
export async function spotifyFetch<T>(
  url: string,
  accessToken: string
): Promise<{ data: T; newToken: string | null }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retry.ok) throw new Error(`Spotify API error: ${retry.status}`);
      const data = (await retry.json()) as T;
      return { data, newToken };
    }
  }

  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  const data = (await res.json()) as T;
  return { data, newToken: null };
}

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const TIME_RANGES = ["short_term", "medium_term", "long_term"] as const;

export type StoredPlaylistItem = {
  id: string;
  name: string;
  description: string | null;
  images: { url: string; height: number | null; width: number | null }[];
  tracks: { total: number };
  owner: { display_name: string };
};

/** Full artist object as returned by Spotify (e.g. /me/top/artists). Keep genres & popularity for Find My Niche. */
export type StoredArtist = {
  id: string;
  name: string;
  type: string;
  uri: string;
  href: string;
  external_urls: Record<string, string>;
  images: { url: string; height: number | null; width: number | null }[];
  genres?: string[];
  popularity?: number;
  followers?: { href: string | null; total: number };
};

export type SpotifyData = {
  topArtists: {
    short_term: StoredArtist[];
    medium_term: StoredArtist[];
    long_term: StoredArtist[];
  };
  topTracks: {
    short_term: unknown[];
    medium_term: unknown[];
    long_term: unknown[];
  };
  recentlyPlayed: unknown[];
  playlists: StoredPlaylistItem[];
};

export const SPOTIFY_DATA_STORAGE_KEY = "gel_spotify_data";
export const SPOTIFY_FETCHED_AT_KEY = "gel_spotify_fetched_at";

export async function fetchAndStoreSpotifyData(): Promise<SpotifyData | null> {
  let token = await getValidAccessToken();
  if (!token) return null;

  const topArtists = {
    short_term: [] as StoredArtist[],
    medium_term: [] as StoredArtist[],
    long_term: [] as StoredArtist[],
  };
  const topTracks = {
    short_term: [] as unknown[],
    medium_term: [] as unknown[],
    long_term: [] as unknown[],
  };
  let recentlyPlayed: unknown[] = [];
  let playlists: StoredPlaylistItem[] = [];

  for (const range of TIME_RANGES) {
    const url = `${SPOTIFY_API_BASE}/me/top/artists?time_range=${range}&limit=50`;
    const { data, newToken }: { data: { items: StoredArtist[] }; newToken: string | null } =
      await spotifyFetch<{ items: StoredArtist[] }>(url, token);
    if (newToken) token = newToken;
    const items = data.items ?? [];
    topArtists[range] = items.map((a) => ({
      ...a,
      genres: a.genres ?? [],
      popularity: a.popularity ?? 0,
    }));
  }

  for (const range of TIME_RANGES) {
    const url = `${SPOTIFY_API_BASE}/me/top/tracks?time_range=${range}&limit=50`;
    const { data, newToken }: { data: { items: unknown[] }; newToken: string | null } =
      await spotifyFetch<{ items: unknown[] }>(url, token);
    if (newToken) token = newToken;
    topTracks[range] = data.items ?? [];
  }

  const recentUrl = `${SPOTIFY_API_BASE}/me/player/recently-played?limit=50`;
  const { data: recentData, newToken: recentToken }: { data: { items: unknown[] }; newToken: string | null } =
    await spotifyFetch<{ items: unknown[] }>(recentUrl, token);
  if (recentToken) token = recentToken;
  recentlyPlayed = recentData.items ?? [];

  const playlistsUrl = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;
  type PlaylistsResponse = {
    items: {
      id: string;
      name: string;
      description: string | null;
      images: { url: string; height: number | null; width: number | null }[];
      tracks: { total: number };
      owner: { display_name: string };
    }[];
  };
  const { data: playlistsData, newToken: playlistsToken }: { data: PlaylistsResponse; newToken: string | null } =
    await spotifyFetch<PlaylistsResponse>(playlistsUrl, token);
  if (playlistsToken) token = playlistsToken;
  playlists = (playlistsData.items ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    images: p.images ?? [],
    tracks: { total: p.tracks?.total ?? 0 },
    owner: { display_name: p.owner?.display_name ?? "" },
  }));

  const result: SpotifyData = {
    topArtists,
    topTracks,
    recentlyPlayed,
    playlists,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SPOTIFY_DATA_STORAGE_KEY, JSON.stringify(result));
    localStorage.setItem(SPOTIFY_FETCHED_AT_KEY, Date.now().toString());
  }

  return result;
}
