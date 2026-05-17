"use client";

import { useState, useEffect } from "react";

interface GaugeCircleProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}

export function GaugeCircle({
  value,
  size = 90,
  strokeWidth = 9,
  color,
  children,
}: GaugeCircleProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Start from 0 and animate to target on mount/value change via CSS transition
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDisplayValue(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const r = (size - strokeWidth) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const trackArc = circumference * 0.75;
  const valueArc = trackArc * Math.min(1, Math.max(0, displayValue / 100));

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${trackArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Value arc — animates via CSS transition from 0 */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${valueArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.85s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );
}
