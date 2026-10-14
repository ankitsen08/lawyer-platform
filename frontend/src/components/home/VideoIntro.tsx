"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

export default function VideoIntro() {
  const [showIntro, setShowIntro] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishCalledRef = useRef(false);

  const finishIntro = useCallback(() => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;
    setIsFading(true);

    // Smooth 300ms fade transition to the live website
    setTimeout(() => {
      document.documentElement.classList.remove("show-intro");
      document.body.style.overflow = "unset";
      try {
        sessionStorage.setItem("introPlayed", "true");
      } catch (e) {}
      setShowIntro(false);
    }, 300);
  }, []);

  useEffect(() => {
    // If the pre-hydration check didn't flag show-intro, unmount immediately
    const shouldShow = document.documentElement.classList.contains("show-intro");
    if (!shouldShow) {
      setShowIntro(false);
      return;
    }

    document.body.style.overflow = "hidden";

    // Play safely with native hardware decoding
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0; // Native hardware 60fps clock (no fractional frame drop)
      videoRef.current.play().catch(() => {
        // Fallback for strict browser autoplay policies
        finishIntro();
      });
    }

    // Safety fallback: Never keep the user waiting more than 4.5s
    const maxTimer = setTimeout(() => {
      finishIntro();
    }, 4500);

    return () => clearTimeout(maxTimer);
  }, [finishIntro]);

  if (!showIntro) return null;

  return (
    <div
      id="intro-overlay"
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black transition-opacity duration-300 ease-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Skip Button */}
      <button
        type="button"
        onClick={finishIntro}
        className="absolute top-6 right-6 z-[100000] flex items-center gap-2 text-white/70 hover:text-white transition-colors text-xs tracking-widest uppercase font-bold bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
      >
        Skip <X className="h-3.5 w-3.5" />
      </button>

      {/* Hardware-Accelerated Video */}
      <video
        ref={videoRef}
        src="/intro-video.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        onEnded={finishIntro}
        className="w-full h-full object-cover transform-gpu will-change-transform"
      />
    </div>
  );
}
