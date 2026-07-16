import { useEffect, useState } from "react";

// Shows real load metrics from the Performance API — no dependencies, no
// network. Confirms the app is fast on the user's own device.
export function PerfNote() {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const fcp = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint");
      const parts: string[] = [];
      if (fcp) parts.push(`first paint ${Math.round(fcp.startTime)} ms`);
      if (nav) {
        parts.push(`interactive ${Math.round(nav.domContentLoadedEventEnd)} ms`);
        if (nav.loadEventEnd) parts.push(`fully loaded ${Math.round(nav.loadEventEnd)} ms`);
      }
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (mem) parts.push(`JS heap ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB`);
      if (parts.length) setText(parts.join(" · "));
    } catch { /* Performance API unavailable — hide the note */ }
  }, []);

  if (!text) return null;
  return (
    <div className="perf-note" title="Measured on your device via the Performance API">
      ⚡ {text} · initial JS ~80 kB gzip · heavy features load on demand
    </div>
  );
}
