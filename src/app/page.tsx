import { SpotifyLoginButton } from "@/components/spotify-login-button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6">
      <main className="flex max-w-md flex-col items-center text-center">
        {/* Logo placeholder */}
        <div
          className="mb-12 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/10 bg-white/5 text-2xl font-bold tracking-tight text-white/90"
          aria-hidden
        >
          GEL
        </div>

        <h1 className="mb-4 font-semibold tracking-tight text-white text-3xl sm:text-4xl">
          Discover your style through your music
        </h1>

        <p className="mb-14 max-w-sm text-base text-zinc-400">
          Connect your Spotify to get started.
        </p>

        <SpotifyLoginButton />
      </main>
    </div>
  );
}
