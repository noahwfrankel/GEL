"use client";

import {
  generateRandomString,
  generateCodeChallenge,
  buildSpotifyAuthUrl,
} from "@/lib/spotify-auth";

const SPOTIFY_STORAGE_VERIFIER = "spotify_code_verifier";
const SPOTIFY_STORAGE_STATE = "spotify_state";

export function SpotifyLoginButton() {
  async function handleLogin() {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      console.error("NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not set");
      return;
    }

    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(SPOTIFY_STORAGE_VERIFIER, codeVerifier);
      sessionStorage.setItem(SPOTIFY_STORAGE_STATE, state);
    }

    const authUrl = buildSpotifyAuthUrl(clientId, state, codeChallenge);
    window.location.href = authUrl;
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-full bg-[#1DB954] font-semibold text-black transition hover:bg-[#1ed760] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2 focus:ring-offset-[#0d0d0d]"
      aria-label="Log in with Spotify"
    >
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
      Log in with Spotify
    </button>
  );
}

export { SPOTIFY_STORAGE_VERIFIER, SPOTIFY_STORAGE_STATE };
