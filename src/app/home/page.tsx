"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding-storage";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [mounted, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6">
      <main className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Welcome to GEL
        </h1>
      </main>
    </div>
  );
}
