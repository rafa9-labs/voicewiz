import React, { useState, useEffect, useRef } from "react";

interface RecordingHUDProps {
  isRecording: boolean;
  isProcessing: boolean;
  align?: "left" | "center" | "right";
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordingHUD({ isRecording, isProcessing, align = "right" }: RecordingHUDProps) {
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

  const alignClass =
    align === "left"
      ? "left-2"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-2";

  return (
    <div className={`fixed bottom-2 z-50 pointer-events-none ${alignClass}`}>
      <span className="text-[11px] font-mono tabular-nums text-white/40 min-w-[3ch] text-center block">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
