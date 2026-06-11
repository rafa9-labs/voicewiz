import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";

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

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex flex-col items-center pointer-events-none">
      <div className="relative flex items-center justify-center">
        {isRecording ? (
          <>
            <Mic className="size-8 text-white animate-pulse drop-shadow-lg" />
            <span className="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full shadow-md" />
          </>
        ) : (
          <Loader2 className="size-8 text-white/60 animate-spin drop-shadow-lg" />
        )}
      </div>
      <span className="text-[11px] font-mono tabular-nums text-white/40 mt-1.5 min-w-[3ch] text-center">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
