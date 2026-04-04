"use client";

import { useEffect, useState } from "react";

interface SaveFlashProps {
  show: boolean;
  onComplete: () => void;
}

export function SaveFlash({ show, onComplete }: SaveFlashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 1000);
    return () => clearTimeout(t);
  }, [show, onComplete]);

  if (!show && !visible) return null;

  return (
    <div
      className={`fixed bottom-[100px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.12)] px-5 py-3 backdrop-blur-sm transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {/* Hanger icon */}
      <svg className="h-4 w-4 text-[#22c55e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2 2 0 012 2c0 .74-.4 1.38-1 1.73V8l7 5.5H4L11 8V6.73A2 2 0 0112 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V17a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
      </svg>
      <span className="text-[13px] font-medium text-[#22c55e]">Saved to your Closet</span>
    </div>
  );
}
