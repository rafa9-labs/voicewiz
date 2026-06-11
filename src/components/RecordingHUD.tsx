import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "./lib/utils";

interface RecordingHUDProps {
  isRecording: boolean;
  isProcessing: boolean;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDuration(0);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRecording]);

  if (!isRecording && !isProcessing) return null;

  const isActive = isRecording;

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full px-4 py-1.5 border shadow-lg backdrop-blur-md",
          "transition-all duration-300 ease-out",
          isActive
            ? "bg-red-950/90 border-red-500/30"
            : "bg-neutral-900/90 border-white/10"
        )}
      >
        <div className="relative flex items-center">
          {isActive ? (
            <>
              <Mic className="size-3.5 text-red-300 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 size-1.5 bg-red-500 rounded-full" />
            </>
          ) : (
            <Loader2 className="size-3.5 text-white/60 animate-spin" />
          )}
        </div>

        <span className={cn(
          "text-xs font-medium",
          isActive ? "text-red-100" : "text-white/70"
        )}>
          {isActive ? "Recording" : "Processing"}
        </span>

        {isActive && (
          <span className="text-[11px] font-mono tabular-nums text-red-200/70 min-w-[3ch]">
            {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  );
}
