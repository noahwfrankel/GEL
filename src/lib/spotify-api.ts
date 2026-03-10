/**
 * Spotify token storage and refresh. Tokens may be in localStorage or sessionStorage.
 */

const TOKEN_STORAGE_KEY = "spotify_tokens";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export type StoredTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? window.sessionStorage;
}

export function getStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(TOKEN_STORAGE_KEY) ??
    sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: StoredTokens): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(tokens);
  localStorage.setItem(TOKEN_STORAGE_KEY, json);
  sessionStorage.setItem(TOKEN_STORAGE_KEY, json);
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

export type SpotifyData = {
  topArtists: {
    short_term: unknown[];
    medium_term: unknown[];
    long_term: unknown[];
  };
  topTracks: {
    short_term: unknown[];
    medium_term: unknown[];
    long_term: unknown[];
  };
  recentlyPlayed: unknown[];
};

export const SPOTIFY_DATA_STORAGE_KEY = "gel_spotify_data";

export async function fetchAndStoreSpotifyData(): Promise<SpotifyData | null> {
  let token = await getValidAccessToken();
  if (!token) return null;

  const topArtists = {
    short_term: [] as unknown[],
    medium_term: [] as unknown[],
    long_term: [] as unknown[],
  };
  const topTracks = {
    short_term: [] as unknown[],
    medium_term: [] as unknown[],
    long_term: [] as unknown[],
  };
  let recentlyPlayed: unknown[] = [];

  for (const range of TIME_RANGES) {
    const url = `${SPOTIFY_API_BASE}/me/top/artists?time_range=${range}&limit=50`;
    const { data, newToken } = await spotifyFetch<{ items: unknown[] }>(
      url,
      token
    );
    if (newToken) token = newToken;
    topArtists[range] = data.items ?? [];
  }

  for (const range of TIME_RANGES) {
    const url = `${SPOTIFY_API_BASE}/me/top/tracks?time_range=${range}&limit=50`;
    const { data, newToken } = await spotifyFetch<{ items: unknown[] }>(
      url,
      token
    );
    if (newToken) token = newToken;
    topTracks[range] = data.items ?? [];
  }

  const recentUrl = `${SPOTIFY_API_BASE}/me/player/recently-played?limit=50`;
  const { data: recentData } = await spotifyFetch<{ items: unknown[] }>(
    recentUrl,
    token
  );
  recentlyPlayed = recentData.items ?? [];

  const result: SpotifyData = {
    topArtists,
    topTracks,
    recentlyPlayed,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SPOTIFY_DATA_STORAGE_KEY, JSON.stringify(result));
  }

  return result;
}
