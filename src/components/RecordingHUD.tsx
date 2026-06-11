import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2, Clock } from "lucide-react";

interface RecordingHUDProps {
  isRecording: boolean;
  isProcessing: boolean;
}

export default function RecordingHUD({ isRecording, isProcessing }: RecordingHUDProps) {
  const [duration, setDuration] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRef.current = performance.now();
      const tick = () => {
        if (startRef.current) {
          setDuration((performance.now() - startRef.current) / 1000);
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      startRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDuration(0);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRecording]);

  if (!isRecording && !isProcessing) return null;

  const isActive = isRecording;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-1.5 rounded-b-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${
        isActive
          ? "bg-primary/90 border-primary text-primary-foreground"
          : "bg-accent/90 border-accent text-accent-foreground"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {isActive ? (
          <>
            <Mic size={14} className="animate-pulse" />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </>
        ) : (
          <Loader2 size={14} className="animate-spin" />
        )}
      </div>

      <span className="text-xs font-semibold tracking-wide">
        {isActive ? "Recording" : "Processing"}
      </span>

      {isActive && (
        <span className="flex items-center gap-1 text-[11px] font-mono opacity-80">
          <Clock size={10} />
          {formatDuration(duration)}
        </span>
      )}

      <div className="flex items-center gap-0.5">
        {isActive
          ? [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-primary-foreground/70 rounded-full"
                style={{
                  height: `${8 + Math.random() * 8}px`,
                  animation: `pulse 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))
          : [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-accent-foreground/50"
                style={{
                  animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
      </div>
    </div>
  );
}
