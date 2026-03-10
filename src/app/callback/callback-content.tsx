"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SPOTIFY_STORAGE_VERIFIER,
  SPOTIFY_STORAGE_STATE,
} from "@/components/spotify-login-button";
import { TOKEN_STORAGE_KEY } from "@/lib/spotify-api";

export function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      setMessage(error === "access_denied" ? "You denied access." : error);
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received.");
      return;
    }

    const storedState = typeof window !== "undefined" ? sessionStorage.getItem(SPOTIFY_STORAGE_STATE) : null;
    if (state && storedState && state !== storedState) {
      setStatus("error");
      setMessage("Invalid state (possible CSRF). Try logging in again.");
      return;
    }

    const codeVerifier = typeof window !== "undefined" ? sessionStorage.getItem(SPOTIFY_STORAGE_VERIFIER) : null;
    if (!codeVerifier) {
      setStatus("error");
      setMessage("Missing code verifier. Try logging in again.");
      return;
    }

    async function exchange() {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: codeVerifier }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Token exchange failed.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SPOTIFY_STORAGE_VERIFIER);
        sessionStorage.removeItem(SPOTIFY_STORAGE_STATE);
        const tokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          token_type: data.token_type ?? "Bearer",
        };
        const tokensJson = JSON.stringify(tokens);
        localStorage.setItem(TOKEN_STORAGE_KEY, tokensJson);
        localStorage.setItem("gel_spotify_connected", "true");
        setStatus("success");
        await new Promise((r) => setTimeout(r, 500));
        router.push("/home");
      } else {
        setStatus("success");
        router.push("/home");
      }
    }

    exchange();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6">
      <main className="flex max-w-md flex-col items-center text-center">
        {status === "loading" && (
          <p className="text-zinc-400">Logging you in with Spotify…</p>
        )}
        {status === "success" && (
          <p className="text-white">Success! Redirecting…</p>
        )}
        {status === "error" && (
          <>
            <p className="mb-4 text-red-400">{message}</p>
            <a
              href="/"
              className="rounded-full bg-white/10 px-6 py-3 text-white hover:bg-white/20"
            >
              Back to home
            </a>
          </>
        )}
      </main>
    </div>
  );
}
