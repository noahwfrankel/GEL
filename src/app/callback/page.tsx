import { Suspense } from "react";
import { CallbackContent } from "./callback-content";

function CallbackFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6">
      <main className="flex max-w-md flex-col items-center text-center">
        <p className="text-zinc-400">Logging you in with Spotify…</p>
      </main>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <CallbackContent />
    </Suspense>
  );
}
